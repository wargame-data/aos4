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
import { parseCat } from "./xml/reader.js";
import { findUnits, getFactionId, isLibrary } from "./xml/traverser.js";
import { UnitMapper, type Unit, type Hero } from "./mappers/unit.mapper.js";
import type { MapperOptions } from "./mappers/base.js";
import {
  writeUnit,
  readExistingUnit,
  ensureFactionStructure,
} from "./output/writer.js";
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

  // Parse all factions
  const results = await parseAllFactions(catalogueFiles, options, log);

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
  } else {
    log.info("\nDry run - no files written");
  }

  // Summary
  printSummary(results, log);
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

  const results = await parseAllFactions([matchingFile], options, log);

  if (!options.skipValidate) {
    const valid = await validateResults(results, log);
    if (!valid && options.strict) {
      process.exit(1);
    }
  }

  if (!options.dryRun) {
    await writeResults(results, options, log);
  }

  printSummary(results, log);
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
 * Parse all factions from catalogue files
 */
async function parseAllFactions(
  files: string[],
  options: CLIOptions,
  log: Logger
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

      const mapperOptions: MapperOptions = {
        strict: options.strict,
        factionId,
        grandAlliance,
        catalogueName: catalogue.$.name,
      };

      const unitEntries = findUnits(catalogue);
      log.verbose(`  Found ${unitEntries.length} units`);

      const mapper = new UnitMapper(mapperOptions);
      const units: (Unit | Hero)[] = [];
      const errors: string[] = [];

      for (const entry of unitEntries) {
        try {
          const unit = mapper.map({ entry, catalogue });
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

      results.push({
        factionId,
        factionName: catalogue.$.name,
        units,
        errors,
      });

      log.info(`  ${factionId}: ${units.length} units parsed`);
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

    for (const unit of result.units) {
      const writeResult = writeUnit(unit, { dryRun: false }, outputDir);
      log.verbose(
        `  ${writeResult.created ? "Created" : "Updated"}: ${writeResult.path}`
      );
    }

    log.info(`  ${result.factionId}: ${result.units.length} files written`);
  }
}

/**
 * Print summary
 */
function printSummary(results: FactionParseResult[], log: Logger): void {
  log.info("\n" + "=".repeat(40));
  log.info("Summary");
  log.info("=".repeat(40));

  let totalUnits = 0;
  let totalErrors = 0;

  for (const result of results) {
    totalUnits += result.units.length;
    totalErrors += result.errors.length;
  }

  log.info(`Factions: ${results.length}`);
  log.info(`Units: ${totalUnits}`);
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
