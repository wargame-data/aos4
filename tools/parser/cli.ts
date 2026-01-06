/**
 * CLI Implementation
 *
 * Command-line interface for the BSData parser.
 */

import { Command } from "commander";
import { glob } from "glob";
import { join, basename } from "path";
import { existsSync } from "fs";

// Import modules
import {
  cloneOrUpdate,
  BSDATA_AOS_REPO,
  BSDATA_AOS_NAME,
} from "./github/clone.js";
import { getRepoCachePath, isCacheValid, getCacheAge } from "./github/cache.js";
import { parseCat, parseGst } from "./xml/reader.js";
import { findUnits, findManifestations, getFactionId, isLibrary, extractPointsFromEntryLinks } from "./xml/traverser.js";
import { PublicationResolver } from "./xml/publications.js";
import { UnitMapper, type Unit, type Hero } from "./mappers/unit.mapper.js";
import { ManifestationMapper, type Manifestation } from "./mappers/manifestation.mapper.js";
import { mapBattleFormations, type BattleFormation } from "./mappers/battle-formation.mapper.js";
import { mapHeroicTraits, mapArtefactsOfPower, type EnhancementCollection } from "./mappers/enhancement.mapper.js";
import { mapRegimentsOfRenown, type RegimentOfRenown } from "./mappers/regiment-of-renown.mapper.js";
import type { MapperOptions } from "./mappers/base.js";
import {
  writeUnit,
  readExistingUnit,
  ensureFactionStructure,
  ensureSharedLoresDir,
  writeLores,
  writeBattleFormations,
  writeEnhancement,
  ensureEnhancementsDir,
  ensureRegimentsOfRenownDir,
  writeRegimentsOfRenown,
  writeManifestations,
} from "./output/writer.js";
import { mapLores, type Lore } from "./mappers/lore.mapper.js";
import {
  generateBatchPatches,
  formatPatchSummary,
  readExistingJson,
} from "./diff/patch-generator.js";
import { createValidator, validateUnit, formatValidationErrors } from "./validators/schema.js";
import {
  FACTIONS_DIR,
  PATCHES_DIR,
  catalogueNameToFactionId,
  getGrandAlliance,
  shouldSkipCatalogue,
} from "./config.js";

/**
 * CLI options interface
 */
export interface CLIOptions {
  strict: boolean;
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
  force: boolean;
  offline: boolean;
  faction?: string;
  output?: string;
  bsdataPath?: string;
  patchDir?: string;
  skipValidate: boolean;
}

/**
 * Parse result for a faction
 */
interface FactionParseResult {
  factionId: string;
  factionName: string;
  units: (Unit | Hero)[];
  manifestations: Manifestation[];
  battleFormations: BattleFormation[];
  heroicTraits: EnhancementCollection | null;
  artefacts: EnhancementCollection | null;
  errors: string[];
}

/**
 * Create the CLI program
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("aos-parser")
    .description("Parse BSData XML files to aos-data JSON format")
    .version("0.1.0");

  // Sync command
  program
    .command("sync")
    .description("Clone/update BSData and parse all factions")
    .option("--strict", "Fail on unmappable BSData elements", false)
    .option("--dry-run", "Parse without writing files", false)
    .option("-v, --verbose", "Show detailed output", false)
    .option("-q, --quiet", "Minimal output", false)
    .option("--force", "Force re-clone BSData repository", false)
    .option("--offline", "Use cached BSData (no network)", false)
    .option("--output <dir>", "Output directory", FACTIONS_DIR)
    .option("--bsdata-path <path>", "Path to local BSData files")
    .option("--skip-validate", "Skip JSON Schema validation", false)
    .action(syncCommand);

  // Parse command
  program
    .command("parse")
    .description("Parse specific faction(s) from BSData")
    .option("--faction <id>", "Parse single faction")
    .option("--strict", "Fail on unmappable BSData elements", false)
    .option("--dry-run", "Parse without writing files", false)
    .option("-v, --verbose", "Show detailed output", false)
    .option("--output <dir>", "Output directory", FACTIONS_DIR)
    .option("--bsdata-path <path>", "Path to local BSData files")
    .option("--skip-validate", "Skip JSON Schema validation", false)
    .action(parseCommand);

  // Diff command
  program
    .command("diff")
    .description("Compare parsed data with existing JSON")
    .option("--faction <id>", "Diff single faction")
    .option("--patch-dir <dir>", "Output directory for patch files", PATCHES_DIR)
    .option("--bsdata-path <path>", "Path to local BSData files")
    .option("-v, --verbose", "Show detailed output", false)
    .action(diffCommand);

  // List command
  program
    .command("list")
    .description("List available factions in BSData")
    .option("--bsdata-path <path>", "Path to local BSData files")
    .action(listCommand);

  return program;
}

/**
 * Sync command implementation
 */
async function syncCommand(options: CLIOptions): Promise<void> {
  const log = createLogger(options);

  log.info("aos-data BSData Parser - Sync\n");

  // Get BSData path
  const bsdataPath = await getBsdataPath(options, log);
  if (!bsdataPath) {
    process.exit(3);
  }

  // Find all catalogue files
  const catalogueFiles = await findCatalogueFiles(bsdataPath);
  log.info(`Found ${catalogueFiles.length} catalogue files\n`);

  // Load publication resolver from game system
  const publicationResolver = await loadPublicationResolver(bsdataPath, log);

  // Parse all factions
  const results = await parseAllFactions(catalogueFiles, options, log, publicationResolver);

  // Parse lores from Lores.cat
  const lores = await parseLores(bsdataPath, options, log);

  // Parse regiments of renown
  const regiments = await parseRegimentsOfRenown(bsdataPath, catalogueFiles, options, log);

  // Validate if not skipped
  if (!options.skipValidate) {
    log.info("\nValidating parsed data...");
    const valid = await validateResults(results, log);
    if (!valid && options.strict) {
      log.error("Validation failed in strict mode");
      process.exit(1);
    }
  }

  // Write results
  if (!options.dryRun) {
    await writeResults(results, options, log);

    // Write lores
    if (lores.length > 0) {
      const outputDir = options.output || FACTIONS_DIR;
      ensureSharedLoresDir(join(outputDir, ".."));
      const loreResults = writeLores(lores, { dryRun: false }, undefined, join(outputDir, ".."));
      log.info(`  shared lores: ${loreResults.length} files written`);
    }

    // Write regiments of renown
    if (regiments.length > 0) {
      const outputDir = options.output || FACTIONS_DIR;
      ensureRegimentsOfRenownDir(join(outputDir, ".."));
      const regimentResults = writeRegimentsOfRenown(regiments, { dryRun: false }, join(outputDir, ".."));
      log.info(`  regiments of renown: ${regimentResults.length} files written`);
    }
  } else {
    log.info("\nDry run - no files written");
  }

  // Summary
  printSummary(results, lores.length, regiments.length, log);
}

/**
 * Parse command implementation
 */
async function parseCommand(options: CLIOptions): Promise<void> {
  const log = createLogger(options);

  if (!options.faction) {
    log.error("Error: --faction is required for parse command");
    process.exit(4);
  }

  log.info(`aos-data BSData Parser - Parse ${options.faction}\n`);

  const bsdataPath = await getBsdataPath(options, log);
  if (!bsdataPath) {
    process.exit(3);
  }

  // Find matching catalogue file
  const catalogueFiles = await findCatalogueFiles(bsdataPath);
  const matchingFile = catalogueFiles.find((f) => {
    const factionId = catalogueNameToFactionId(basename(f, ".cat"));
    return factionId === options.faction;
  });

  if (!matchingFile) {
    log.error(`Faction not found: ${options.faction}`);
    log.info("\nAvailable factions:");
    for (const file of catalogueFiles) {
      const id = catalogueNameToFactionId(basename(file, ".cat"));
      log.info(`  - ${id}`);
    }
    process.exit(4);
  }

  // Load publication resolver from game system
  const publicationResolver = await loadPublicationResolver(bsdataPath, log);

  const results = await parseAllFactions([matchingFile], options, log, publicationResolver);

  if (!options.skipValidate) {
    const valid = await validateResults(results, log);
    if (!valid && options.strict) {
      process.exit(1);
    }
  }

  if (!options.dryRun) {
    await writeResults(results, options, log);
  }

  printSummary(results, 0, 0, log);
}

/**
 * Diff command implementation
 */
async function diffCommand(options: CLIOptions): Promise<void> {
  const log = createLogger(options);

  log.info("aos-data BSData Parser - Diff\n");

  const bsdataPath = await getBsdataPath(options, log);
  if (!bsdataPath) {
    process.exit(3);
  }

  const catalogueFiles = await findCatalogueFiles(bsdataPath);

  // Filter by faction if specified
  const filesToProcess = options.faction
    ? catalogueFiles.filter((f) => {
        const id = catalogueNameToFactionId(basename(f, ".cat"));
        return id === options.faction;
      })
    : catalogueFiles;

  // Parse all and collect for diff
  const allFiles: Array<{
    path: string;
    existing: unknown | null;
    parsed: unknown;
  }> = [];

  for (const file of filesToProcess) {
    try {
      const catalogue = await parseCat(file);
      if (isLibrary(catalogue)) continue;

      const factionId = getFactionId(catalogue);
      const grandAlliance = getGrandAlliance(factionId);

      const mapperOptions: MapperOptions = {
        strict: false,
        factionId,
        grandAlliance,
        catalogueName: catalogue.$.name,
      };

      const units = findUnits(catalogue);
      const mapper = new UnitMapper(mapperOptions);

      for (const entry of units) {
        const parsed = mapper.map({ entry, catalogue });
        const existingPath = join(
          options.output || FACTIONS_DIR,
          factionId,
          "isWizard" in parsed ? "heroes" : "units",
          `${parsed.id}.json`
        );

        allFiles.push({
          path: existingPath,
          existing: readExistingJson(existingPath),
          parsed,
        });
      }
    } catch (error) {
      log.warn(`Failed to parse ${file}: ${error}`);
    }
  }

  // Generate patches
  const patchResult = generateBatchPatches(allFiles, {
    outputDir: options.patchDir || PATCHES_DIR,
  });

  log.info(formatPatchSummary(patchResult));
}

/**
 * List command implementation
 */
async function listCommand(options: CLIOptions): Promise<void> {
  const log = createLogger({ ...options, verbose: false, quiet: false });

  const bsdataPath = await getBsdataPath(
    { ...options, offline: true } as CLIOptions,
    log
  );
  if (!bsdataPath) {
    log.info("BSData not cached. Run sync first.");
    process.exit(0);
  }

  const catalogueFiles = await findCatalogueFiles(bsdataPath);

  log.info("Available factions:\n");

  for (const file of catalogueFiles) {
    const name = basename(file, ".cat");
    const id = catalogueNameToFactionId(name);
    const ga = getGrandAlliance(id) || "unknown";
    log.info(`  ${id.padEnd(30)} (${ga})`);
  }

  log.info(`\nTotal: ${catalogueFiles.length} factions`);
}

/**
 * Get BSData path (from cache or local)
 */
async function getBsdataPath(
  options: CLIOptions,
  log: Logger
): Promise<string | null> {
  if (options.bsdataPath) {
    if (!existsSync(options.bsdataPath)) {
      log.error(`BSData path not found: ${options.bsdataPath}`);
      return null;
    }
    log.info(`Using local BSData: ${options.bsdataPath}`);
    return options.bsdataPath;
  }

  if (options.offline) {
    const cachePath = getRepoCachePath(BSDATA_AOS_NAME);
    if (!existsSync(cachePath)) {
      log.error("BSData not cached. Run without --offline first.");
      return null;
    }
    const age = getCacheAge(BSDATA_AOS_NAME);
    log.info(`Using cached BSData (${age?.toFixed(1) || "?"} hours old)`);
    return cachePath;
  }

  log.info("Fetching BSData from GitHub...");
  try {
    const result = await cloneOrUpdate({
      repoUrl: BSDATA_AOS_REPO,
      repoName: BSDATA_AOS_NAME,
      force: options.force,
    });

    if (result.fromCache) {
      log.info(`Using cached BSData (up to date)`);
    } else {
      log.info(`BSData updated (commit: ${result.commit?.slice(0, 7) || "?"})`);
    }

    return result.path;
  } catch (error) {
    log.error(`Failed to fetch BSData: ${error}`);
    return null;
  }
}

/**
 * Find catalogue files in BSData directory
 */
async function findCatalogueFiles(bsdataPath: string): Promise<string[]> {
  const pattern = join(bsdataPath, "*.cat");
  const files = await glob(pattern);

  return files.filter((f) => !shouldSkipCatalogue(basename(f)));
}

/**
 * Find Lores.cat file in BSData directory
 */
function findLoresFile(bsdataPath: string): string | null {
  const loresPath = join(bsdataPath, "Lores.cat");
  if (existsSync(loresPath)) {
    return loresPath;
  }
  return null;
}

/**
 * Load publication resolver from game system
 */
async function loadPublicationResolver(
  bsdataPath: string,
  log: Logger
): Promise<PublicationResolver> {
  const resolver = new PublicationResolver();
  const gameSystemFile = join(bsdataPath, "Age of Sigmar 4.0.gst");

  if (existsSync(gameSystemFile)) {
    try {
      const gameSystem = await parseGst(gameSystemFile);
      resolver.loadFromGameSystem(gameSystem);
      log.verbose(`Loaded ${resolver.size} publications from game system`);
    } catch (error) {
      log.warn(`Failed to load publications from game system: ${error}`);
    }
  }

  return resolver;
}

/**
 * Parse all factions from catalogue files
 */
async function parseAllFactions(
  files: string[],
  options: CLIOptions,
  log: Logger,
  publicationResolver?: PublicationResolver
): Promise<FactionParseResult[]> {
  const results: FactionParseResult[] = [];

  for (const file of files) {
    try {
      log.verbose(`Parsing ${basename(file)}...`);

      const catalogue = await parseCat(file);

      // Now we only process library catalogues (they contain unit definitions)
      // Non-library catalogues just reference units via entry links

      const factionId = getFactionId(catalogue);
      const grandAlliance = getGrandAlliance(factionId);

      // Try to load points from the corresponding non-library catalogue
      const pointsMap = await loadPointsForFaction(file, log);
      log.verbose(`  Loaded ${pointsMap.size} point costs`);

      // Load publications from this catalogue too (may have additional ones)
      if (publicationResolver) {
        publicationResolver.loadFromCatalogue(catalogue);
      }

      const mapperOptions: MapperOptions = {
        strict: options.strict,
        factionId,
        grandAlliance,
        catalogueName: catalogue.$.name,
        publicationResolver,
      };

      const unitEntries = findUnits(catalogue);
      log.verbose(`  Found ${unitEntries.length} units`);

      const mapper = new UnitMapper(mapperOptions);
      const units: (Unit | Hero)[] = [];
      const errors: string[] = [];

      for (const entry of unitEntries) {
        try {
          const unit = mapper.map({ entry, catalogue });
          // Apply points from the non-library catalogue
          const entryId = entry.$.id;
          if (pointsMap.has(entryId)) {
            unit.points = pointsMap.get(entryId)!;
          }
          units.push(unit);
        } catch (error) {
          const msg = `Failed to map ${entry.$.name}: ${error}`;
          errors.push(msg);
          if (options.strict) {
            throw error;
          }
        }
      }

      // Collect mapper warnings
      if (mapper.hasUnmappedData()) {
        for (const err of mapper.getUnmappedData()) {
          errors.push(`${err.type}: ${err.message}`);
        }
      }

      // Extract manifestations (endless spells)
      const manifestationEntries = findManifestations(catalogue);
      log.verbose(`  Found ${manifestationEntries.length} manifestations`);

      const manifestationMapper = new ManifestationMapper(mapperOptions);
      const manifestations: Manifestation[] = [];

      for (const entry of manifestationEntries) {
        try {
          const manifestation = manifestationMapper.map({ entry, catalogue });
          // Apply points from the non-library catalogue
          const entryId = entry.$.id;
          if (pointsMap.has(entryId)) {
            manifestation.points = pointsMap.get(entryId)!;
          }
          manifestations.push(manifestation);
        } catch (error) {
          const msg = `Failed to map manifestation ${entry.$.name}: ${error}`;
          errors.push(msg);
          if (options.strict) {
            throw error;
          }
        }
      }

      // Load battle formations and enhancements from non-library catalogue
      const { battleFormations, heroicTraits, artefacts } = await loadFormationsAndEnhancements(file, mapperOptions, log);

      results.push({
        factionId,
        factionName: catalogue.$.name,
        units,
        manifestations,
        battleFormations,
        heroicTraits,
        artefacts,
        errors,
      });

      const enhancementCount = (heroicTraits?.enhancements.length || 0) + (artefacts?.enhancements.length || 0);
      log.info(`  ${factionId}: ${units.length} units, ${manifestations.length} manifestations, ${battleFormations.length} formations, ${enhancementCount} enhancements`);
    } catch (error) {
      log.error(`Failed to parse ${file}: ${error}`);
      if (options.strict) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Parse lores from Lores.cat
 */
async function parseLores(
  bsdataPath: string,
  options: CLIOptions,
  log: Logger
): Promise<Lore[]> {
  const loresFile = findLoresFile(bsdataPath);
  if (!loresFile) {
    log.verbose("No Lores.cat found");
    return [];
  }

  log.info("Parsing spell/prayer lores from Lores.cat...");

  try {
    const catalogue = await parseCat(loresFile);

    const mapperOptions: MapperOptions = {
      strict: options.strict,
      factionId: "shared",
      grandAlliance: undefined,
      catalogueName: catalogue.$.name,
    };

    const lores = mapLores(catalogue, mapperOptions);
    log.info(`  Found ${lores.length} lores`);

    return lores;
  } catch (error) {
    log.error(`Failed to parse Lores.cat: ${error}`);
    if (options.strict) {
      throw error;
    }
    return [];
  }
}

/**
 * Parse regiments of renown from game system and Regiments of Renown.cat
 */
async function parseRegimentsOfRenown(
  bsdataPath: string,
  _catalogueFiles: string[],
  options: CLIOptions,
  log: Logger
): Promise<RegimentOfRenown[]> {
  const gameSystemFile = join(bsdataPath, "Age of Sigmar 4.0.gst");
  const regimentsCatFile = join(bsdataPath, "Regiments of Renown.cat");

  if (!existsSync(gameSystemFile)) {
    log.verbose("No game system file found");
    return [];
  }

  if (!existsSync(regimentsCatFile)) {
    log.verbose("No Regiments of Renown.cat found");
    return [];
  }

  log.info("Parsing regiments of renown...");

  try {
    // Parse game system (contains regiment forceEntries with points)
    const gameSystem = await parseGst(gameSystemFile);

    // Parse Regiments of Renown catalogue (contains abilities and unit links)
    const regimentsCatalogue = await parseCat(regimentsCatFile);

    // Find and parse all NON-library faction catalogues (for ID -> name mapping)
    // These have the catalogue IDs that regiment conditions reference
    const allCatFiles = await glob(join(bsdataPath, "*.cat"));
    const nonLibraryCatFiles = allCatFiles.filter(
      (f) =>
        !f.includes("Library") &&
        !f.includes("Regiments of Renown") &&
        !f.includes("Lores") &&
        !f.toLowerCase().includes("legends")
    );

    const factionCatalogues = await Promise.all(nonLibraryCatFiles.map((f) => parseCat(f)));
    log.verbose(`  Found ${factionCatalogues.length} faction catalogues for ID mapping`);

    const mapperOptions: MapperOptions = {
      strict: options.strict,
      factionId: "shared",
      grandAlliance: undefined,
      catalogueName: "Regiments of Renown",
    };

    const regiments = mapRegimentsOfRenown(gameSystem, regimentsCatalogue, factionCatalogues, mapperOptions);
    log.info(`  Found ${regiments.length} regiments of renown`);

    return regiments;
  } catch (error) {
    log.error(`Failed to parse Regiments of Renown: ${error}`);
    if (options.strict) {
      throw error;
    }
    return [];
  }
}

/**
 * Load points from the non-library catalogue corresponding to a library file
 */
async function loadPointsForFaction(
  libraryFile: string,
  log: Logger
): Promise<Map<string, number>> {
  // Library file: "Stormcast Eternals - Library.cat"
  // Non-library file: "Stormcast Eternals.cat"
  const nonLibraryFile = libraryFile.replace(/ - Library\.cat$/i, ".cat");

  if (nonLibraryFile === libraryFile) {
    // Not a library file pattern
    return new Map();
  }

  if (!existsSync(nonLibraryFile)) {
    log.verbose(`  No non-library catalogue found: ${basename(nonLibraryFile)}`);
    return new Map();
  }

  try {
    const catalogue = await parseCat(nonLibraryFile);
    return extractPointsFromEntryLinks(catalogue);
  } catch (error) {
    log.verbose(`  Failed to load points from ${basename(nonLibraryFile)}: ${error}`);
    return new Map();
  }
}

/**
 * Load battle formations and enhancements from the non-library catalogue
 */
async function loadFormationsAndEnhancements(
  libraryFile: string,
  mapperOptions: MapperOptions,
  log: Logger
): Promise<{
  battleFormations: BattleFormation[];
  heroicTraits: EnhancementCollection | null;
  artefacts: EnhancementCollection | null;
}> {
  // Library file: "Stormcast Eternals - Library.cat"
  // Non-library file: "Stormcast Eternals.cat"
  const nonLibraryFile = libraryFile.replace(/ - Library\.cat$/i, ".cat");

  if (nonLibraryFile === libraryFile || !existsSync(nonLibraryFile)) {
    return { battleFormations: [], heroicTraits: null, artefacts: null };
  }

  try {
    const catalogue = await parseCat(nonLibraryFile);

    // Extract battle formations
    const battleFormations = mapBattleFormations(catalogue, mapperOptions);
    log.verbose(`  Found ${battleFormations.length} battle formations`);

    // Extract heroic traits
    const heroicTraits = mapHeroicTraits(catalogue, mapperOptions);
    if (heroicTraits) {
      log.verbose(`  Found ${heroicTraits.enhancements.length} heroic traits`);
    }

    // Extract artefacts of power
    const artefacts = mapArtefactsOfPower(catalogue, mapperOptions);
    if (artefacts) {
      log.verbose(`  Found ${artefacts.enhancements.length} artefacts`);
    }

    return { battleFormations, heroicTraits, artefacts };
  } catch (error) {
    log.verbose(`  Failed to load formations/enhancements from ${basename(nonLibraryFile)}: ${error}`);
    return { battleFormations: [], heroicTraits: null, artefacts: null };
  }
}

/**
 * Validate parsed results
 */
async function validateResults(
  results: FactionParseResult[],
  log: Logger
): Promise<boolean> {
  const ajv = createValidator();
  let allValid = true;

  for (const result of results) {
    for (const unit of result.units) {
      const isHero = "isWizard" in unit;
      const validation = validateUnit(ajv, unit, isHero);

      if (!validation.valid) {
        allValid = false;
        log.error(`Validation failed for ${unit.id}:`);
        for (const err of validation.errors || []) {
          log.error(`  - ${err}`);
        }
      }
    }
  }

  return allValid;
}

/**
 * Write parsed results to files
 */
async function writeResults(
  results: FactionParseResult[],
  options: CLIOptions,
  log: Logger
): Promise<void> {
  const outputDir = options.output || FACTIONS_DIR;

  for (const result of results) {
    ensureFactionStructure(result.factionId, outputDir);

    // Write units
    for (const unit of result.units) {
      const writeResult = writeUnit(unit, { dryRun: false }, outputDir);
      log.verbose(
        `  ${writeResult.created ? "Created" : "Updated"}: ${writeResult.path}`
      );
    }

    // Write manifestations
    if (result.manifestations.length > 0) {
      const manifestationResults = writeManifestations(result.manifestations, { dryRun: false }, outputDir);
      log.verbose(`  Wrote ${manifestationResults.length} manifestations`);
    }

    // Write battle formations
    if (result.battleFormations.length > 0) {
      const formationResults = writeBattleFormations(result.battleFormations, { dryRun: false }, outputDir);
      log.verbose(`  Wrote ${formationResults.length} battle formations`);
    }

    // Write enhancements
    if (result.heroicTraits || result.artefacts) {
      ensureEnhancementsDir(result.factionId, outputDir);

      if (result.heroicTraits) {
        writeEnhancement(result.heroicTraits, { dryRun: false }, outputDir);
        log.verbose(`  Wrote heroic traits (${result.heroicTraits.enhancements.length} traits)`);
      }

      if (result.artefacts) {
        writeEnhancement(result.artefacts, { dryRun: false }, outputDir);
        log.verbose(`  Wrote artefacts (${result.artefacts.enhancements.length} artefacts)`);
      }
    }

    const formationCount = result.battleFormations.length;
    const enhancementCount = (result.heroicTraits?.enhancements.length || 0) + (result.artefacts?.enhancements.length || 0);
    log.info(`  ${result.factionId}: ${result.units.length} units, ${result.manifestations.length} manifestations, ${formationCount} formations, ${enhancementCount} enhancements written`);
  }
}

/**
 * Print summary
 */
function printSummary(results: FactionParseResult[], loresCount: number, regimentsCount: number, log: Logger): void {
  log.info("\n" + "=".repeat(40));
  log.info("Summary");
  log.info("=".repeat(40));

  let totalUnits = 0;
  let totalManifestations = 0;
  let totalFormations = 0;
  let totalEnhancements = 0;
  let totalErrors = 0;

  for (const result of results) {
    totalUnits += result.units.length;
    totalManifestations += result.manifestations.length;
    totalFormations += result.battleFormations.length;
    totalEnhancements += (result.heroicTraits?.enhancements.length || 0) + (result.artefacts?.enhancements.length || 0);
    totalErrors += result.errors.length;
  }

  log.info(`Factions: ${results.length}`);
  log.info(`Units: ${totalUnits}`);
  log.info(`Manifestations: ${totalManifestations}`);
  log.info(`Battle Formations: ${totalFormations}`);
  log.info(`Enhancements: ${totalEnhancements}`);
  log.info(`Lores: ${loresCount}`);
  log.info(`Regiments of Renown: ${regimentsCount}`);
  log.info(`Errors: ${totalErrors}`);
}

/**
 * Logger interface
 */
interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  verbose: (msg: string) => void;
}

/**
 * Create logger based on options
 */
function createLogger(options: CLIOptions): Logger {
  return {
    info: (msg: string) => {
      if (!options.quiet) console.log(msg);
    },
    warn: (msg: string) => {
      if (!options.quiet) console.warn(msg);
    },
    error: (msg: string) => {
      console.error(msg);
    },
    verbose: (msg: string) => {
      if (options.verbose && !options.quiet) console.log(msg);
    },
  };
}
