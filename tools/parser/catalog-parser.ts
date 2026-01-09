/**
 * Catalog Parser
 *
 * Standalone parser that generates catalog data from BSData Library files and Lores.cat.
 * This is separate from the faction parser and focuses only on catalog items.
 *
 * Usage:
 *   npm run catalog:sync
 *
 * Output:
 *   data/catalog/warscrolls/{faction}/*.json
 *   data/catalog/lores/{faction}/*.json
 */

import { glob } from "glob";
import { join, basename } from "path";
import { existsSync } from "fs";

import { parseCat, buildCatalogueIdMap, buildCatalogueInfoMap, type CatalogueInfo } from "./xml/reader.js";
import { findUnits, getFactionId } from "./xml/traverser.js";
import { PublicationResolver } from "./xml/publications.js";
import { WarscrollMapper } from "./mappers/warscroll.mapper.js";
import { mapIndividualSpells, mapIndividualPrayers } from "./mappers/spell.mapper.js";
import { mapEnhancements } from "./mappers/enhancement.mapper.js";
import { mapBattleFormations } from "./mappers/battle-formation.mapper.js";
import { loadGstIds, validateGstIds, printValidationResult } from "./xml/gst-loader.js";
import {
  ensureCatalogStructure,
  writeWarscrolls,
  writeIndividualSpells,
  writeIndividualPrayers,
  writeEnhancements,
  writeBattleFormations,
} from "./output/writer.js";
import {
  getGrandAlliance,
  catalogueNameToFactionId,
} from "./config.js";
import type { MapperOptions } from "./mappers/base.js";
import type { Warscroll } from "../schemas/schemas/warscroll.schema.js";
import type { Spell, Prayer } from "../schemas/schemas/spell.schema.js";
import type { Enhancement } from "../schemas/schemas/enhancement.schema.js";
import type { BattleFormation } from "../schemas/schemas/battle-formation.schema.js";

// Default BSData cache path
const DEFAULT_BSDATA_PATH = ".cache/bsdata/age-of-sigmar-4th";

interface ParseOptions {
  bsdataPath: string;
  verbose: boolean;
  dryRun: boolean;
}

interface CatalogResult {
  warscrolls: Warscroll[];
  spells: Spell[];
  prayers: Prayer[];
  enhancements: Enhancement[];
  battleFormations: BattleFormation[];
  factionCounts: Map<string, number>;
  errors: string[];
}

/**
 * Find all Library catalogue files
 */
async function findLibraryFiles(bsdataPath: string): Promise<string[]> {
  const pattern = join(bsdataPath, "*- Library.cat");
  const files = await glob(pattern);

  // Filter out legends files
  return files.filter((f) => !f.toLowerCase().includes("legends"));
}

/**
 * Parse all Library files into warscrolls
 */
async function parseWarscrolls(
  bsdataPath: string,
  options: ParseOptions
): Promise<{ warscrolls: Warscroll[]; factionCounts: Map<string, number>; errors: string[] }> {
  const libraryFiles = await findLibraryFiles(bsdataPath);
  const allWarscrolls: Warscroll[] = [];
  const factionCounts = new Map<string, number>();
  const errors: string[] = [];

  console.log(`Found ${libraryFiles.length} Library files\n`);

  for (const file of libraryFiles) {
    try {
      const catalogue = await parseCat(file);
      const factionId = getFactionId(catalogue);
      const grandAlliance = getGrandAlliance(factionId);

      if (options.verbose) {
        console.log(`Parsing ${basename(file)}...`);
      }

      const mapperOptions: MapperOptions = {
        strict: false,
        factionId,
        grandAlliance,
        catalogueName: catalogue.$.name,
      };

      const mapper = new WarscrollMapper(mapperOptions);
      const unitEntries = findUnits(catalogue);
      const warscrolls: Warscroll[] = [];

      for (const entry of unitEntries) {
        try {
          const warscroll = mapper.map({ entry, catalogue });
          warscrolls.push(warscroll);
        } catch (error) {
          const msg = `Failed to map ${entry.$.name}: ${error}`;
          errors.push(msg);
          if (options.verbose) {
            console.error(`  Error: ${msg}`);
          }
        }
      }

      allWarscrolls.push(...warscrolls);
      factionCounts.set(factionId, warscrolls.length);

      console.log(`  ${factionId}: ${warscrolls.length} warscrolls`);
    } catch (error) {
      const msg = `Failed to parse ${file}: ${error}`;
      errors.push(msg);
      console.error(msg);
    }
  }

  return { warscrolls: allWarscrolls, factionCounts, errors };
}

/**
 * Parse Lores.cat into individual spells and prayers
 */
async function parseSpellsAndPrayers(
  bsdataPath: string,
  options: ParseOptions
): Promise<{ spells: Spell[]; prayers: Prayer[]; errors: string[] }> {
  const loresFile = join(bsdataPath, "Lores.cat");
  const errors: string[] = [];

  if (!existsSync(loresFile)) {
    console.log("No Lores.cat found, skipping spells/prayers");
    return { spells: [], prayers: [], errors: [] };
  }

  console.log("\nParsing Lores.cat...");

  try {
    // Build catalogue ID → faction name map from all .cat files
    // This maps IDs like "1bd9-ad7d-68ee-3b53" → "Stormcast Eternals"
    const catalogueIdMap = await buildCatalogueIdMap(bsdataPath);

    if (options.verbose) {
      console.log(`  Built catalogue ID map with ${catalogueIdMap.size} factions`);
    }

    const catalogue = await parseCat(loresFile);

    const mapperOptions: MapperOptions = {
      strict: false,
      factionId: "shared",
      grandAlliance: undefined,
      catalogueName: catalogue.$.name,
    };

    const spells = mapIndividualSpells(catalogue, mapperOptions, catalogueIdMap);
    const prayers = mapIndividualPrayers(catalogue, mapperOptions, catalogueIdMap);

    console.log(`  Spells: ${spells.length}`);
    console.log(`  Prayers: ${prayers.length}`);

    // Count spells/prayers by faction for verbose output
    if (options.verbose) {
      const factionSpellCounts = new Map<string, number>();
      const factionPrayerCounts = new Map<string, number>();

      for (const spell of spells) {
        const count = factionSpellCounts.get(spell.faction) || 0;
        factionSpellCounts.set(spell.faction, count + 1);
      }

      for (const prayer of prayers) {
        const count = factionPrayerCounts.get(prayer.faction) || 0;
        factionPrayerCounts.set(prayer.faction, count + 1);
      }

      console.log("  Spells by faction:");
      for (const [faction, count] of factionSpellCounts.entries()) {
        console.log(`    ${faction}: ${count}`);
      }

      console.log("  Prayers by faction:");
      for (const [faction, count] of factionPrayerCounts.entries()) {
        console.log(`    ${faction}: ${count}`);
      }
    }

    return { spells, prayers, errors };
  } catch (error) {
    const msg = `Failed to parse Lores.cat: ${error}`;
    errors.push(msg);
    console.error(msg);
    return { spells: [], prayers: [], errors };
  }
}

/**
 * Find all faction catalogue files (non-Library, non-Legends)
 * These contain enhancements
 */
async function findFactionCatalogueFiles(bsdataPath: string): Promise<string[]> {
  const pattern = join(bsdataPath, "*.cat");
  const allFiles = await glob(pattern);

  // Filter to only include main faction files (not Library, Legends, or Lores)
  return allFiles.filter((f) => {
    const name = basename(f).toLowerCase();
    return (
      !name.includes("library") &&
      !name.includes("legends") &&
      !name.includes("lores") &&
      !name.includes("game system") &&
      !name.includes("regiment") &&
      !name.endsWith(".gst")
    );
  });
}

/**
 * Parse all faction catalogues for enhancements
 * Subfaction-specific enhancements are detected via primary-catalogue conditions
 */
async function parseEnhancements(
  bsdataPath: string,
  options: ParseOptions
): Promise<{ enhancements: Enhancement[]; errors: string[] }> {
  const factionFiles = await findFactionCatalogueFiles(bsdataPath);
  const allEnhancements: Enhancement[] = [];
  const errors: string[] = [];

  // Build catalogue info map for subfaction detection
  const catalogueInfoMap = await buildCatalogueInfoMap(bsdataPath);

  console.log(`\nParsing ${factionFiles.length} faction files for enhancements...`);

  for (const file of factionFiles) {
    try {
      const catalogue = await parseCat(file);
      const factionId = catalogueNameToFactionId(catalogue.$.name);
      const grandAlliance = getGrandAlliance(factionId);

      if (options.verbose) {
        console.log(`  Parsing ${basename(file)} for enhancements...`);
      }

      const mapperOptions: MapperOptions = {
        strict: false,
        factionId,
        grandAlliance,
        catalogueName: catalogue.$.name,
      };

      const enhancements = mapEnhancements(catalogue, mapperOptions, catalogueInfoMap);

      if (enhancements.length > 0) {
        allEnhancements.push(...enhancements);
        console.log(`  ${factionId}: ${enhancements.length} enhancements`);
      }
    } catch (error) {
      const msg = `Failed to parse enhancements from ${file}: ${error}`;
      errors.push(msg);
      if (options.verbose) {
        console.error(`  Error: ${msg}`);
      }
    }
  }

  return { enhancements: allEnhancements, errors };
}

/**
 * Parse all faction catalogues for battle formations
 */
async function parseBattleFormations(
  bsdataPath: string,
  options: ParseOptions
): Promise<{ battleFormations: BattleFormation[]; errors: string[] }> {
  const factionFiles = await findFactionCatalogueFiles(bsdataPath);
  const allBattleFormations: BattleFormation[] = [];
  const errors: string[] = [];

  console.log(`\nParsing ${factionFiles.length} faction files for battle formations...`);

  for (const file of factionFiles) {
    try {
      const catalogue = await parseCat(file);
      const factionId = catalogueNameToFactionId(catalogue.$.name);
      const grandAlliance = getGrandAlliance(factionId);

      if (options.verbose) {
        console.log(`  Parsing ${basename(file)} for battle formations...`);
      }

      const mapperOptions: MapperOptions = {
        strict: false,
        factionId,
        grandAlliance,
        catalogueName: catalogue.$.name,
      };

      const battleFormations = mapBattleFormations(catalogue, mapperOptions);

      if (battleFormations.length > 0) {
        allBattleFormations.push(...battleFormations);
        console.log(`  ${factionId}: ${battleFormations.length} battle formations`);
      }
    } catch (error) {
      const msg = `Failed to parse battle formations from ${file}: ${error}`;
      errors.push(msg);
      if (options.verbose) {
        console.error(`  Error: ${msg}`);
      }
    }
  }

  return { battleFormations: allBattleFormations, errors };
}

/**
 * Write catalog results to disk
 */
function writeCatalogResults(result: CatalogResult, options: ParseOptions): void {
  if (options.dryRun) {
    console.log("\nDry run - no files written");
    return;
  }

  console.log("\nWriting catalog files...");

  // Ensure directory structure exists
  ensureCatalogStructure();

  // Write warscrolls
  const warscrollResults = writeWarscrolls(result.warscrolls);
  console.log(`  Warscrolls: ${warscrollResults.length} files`);

  // Write spells
  if (result.spells.length > 0) {
    const spellResults = writeIndividualSpells(result.spells);
    console.log(`  Spells: ${spellResults.length} files`);
  }

  // Write prayers
  if (result.prayers.length > 0) {
    const prayerResults = writeIndividualPrayers(result.prayers);
    console.log(`  Prayers: ${prayerResults.length} files`);
  }

  // Write enhancements
  if (result.enhancements.length > 0) {
    const enhancementResults = writeEnhancements(result.enhancements);
    console.log(`  Enhancements: ${enhancementResults.length} files`);
  }

  // Write battle formations
  if (result.battleFormations.length > 0) {
    const battleFormationResults = writeBattleFormations(result.battleFormations);
    console.log(`  Battle Formations: ${battleFormationResults.length} files`);
  }
}

/**
 * Print summary
 */
function printSummary(result: CatalogResult): void {
  console.log("\n" + "=".repeat(40));
  console.log("Summary");
  console.log("=".repeat(40));

  console.log(`Warscrolls: ${result.warscrolls.length}`);
  console.log(`  Factions: ${result.factionCounts.size}`);

  // Count heroes vs non-heroes
  const heroes = result.warscrolls.filter((w) => w.keywords.includes("hero"));
  console.log(`  Heroes: ${heroes.length}`);
  console.log(`  Units: ${result.warscrolls.length - heroes.length}`);

  console.log(`Spells: ${result.spells.length}`);
  console.log(`Prayers: ${result.prayers.length}`);
  console.log(`Enhancements: ${result.enhancements.length}`);
  console.log(`Battle Formations: ${result.battleFormations.length}`);
  console.log(`Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of result.errors.slice(0, 10)) {
      console.log(`  - ${error}`);
    }
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse command line args
  const args = process.argv.slice(2);
  const options: ParseOptions = {
    bsdataPath: DEFAULT_BSDATA_PATH,
    verbose: args.includes("-v") || args.includes("--verbose"),
    dryRun: args.includes("--dry-run"),
  };

  // Check for custom BSData path
  const pathIndex = args.findIndex((a) => a === "--bsdata-path");
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    options.bsdataPath = args[pathIndex + 1];
  }

  console.log("Catalog Parser - Parsing BSData to catalog format\n");

  // Validate BSData path
  if (!existsSync(options.bsdataPath)) {
    console.error(`BSData path not found: ${options.bsdataPath}`);
    console.error("Run 'npm run parser:sync' first to fetch BSData");
    process.exit(1);
  }

  // Validate GST IDs at startup
  const gstPath = join(options.bsdataPath, "Age of Sigmar 4.0.gst");
  if (existsSync(gstPath)) {
    console.log("Validating GST IDs...");
    try {
      const gstIds = await loadGstIds(gstPath);
      const validation = validateGstIds(gstIds);

      if (!validation.valid) {
        console.error("\nGST ID validation failed:");
        printValidationResult(validation);
        console.error("\nSome IDs in gst-ids.ts may need to be updated.");
        // Continue anyway but warn
      } else {
        console.log("GST ID validation passed");
        if (validation.warnings.length > 0 && options.verbose) {
          console.log(`  ${validation.warnings.length} warnings (new IDs in GST)`);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not validate GST IDs: ${error}`);
    }
    console.log("");
  }

  // Parse warscrolls from Library files
  const { warscrolls, factionCounts, errors: warscrollErrors } = await parseWarscrolls(
    options.bsdataPath,
    options
  );

  // Parse spells and prayers from Lores.cat
  const { spells, prayers, errors: loreErrors } = await parseSpellsAndPrayers(
    options.bsdataPath,
    options
  );

  // Parse enhancements from faction catalogues
  const { enhancements, errors: enhancementErrors } = await parseEnhancements(
    options.bsdataPath,
    options
  );

  // Parse battle formations from faction catalogues
  const { battleFormations, errors: battleFormationErrors } = await parseBattleFormations(
    options.bsdataPath,
    options
  );

  // Combine results
  const result: CatalogResult = {
    warscrolls,
    spells,
    prayers,
    enhancements,
    battleFormations,
    factionCounts,
    errors: [...warscrollErrors, ...loreErrors, ...enhancementErrors, ...battleFormationErrors],
  };

  // Write results
  writeCatalogResults(result, options);

  // Print summary
  printSummary(result);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
