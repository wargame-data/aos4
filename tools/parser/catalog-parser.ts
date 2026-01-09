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

import { parseCat } from "./xml/reader.js";
import { findUnits, getFactionId } from "./xml/traverser.js";
import { PublicationResolver } from "./xml/publications.js";
import { WarscrollMapper } from "./mappers/warscroll.mapper.js";
import { mapIndividualSpells, mapIndividualPrayers } from "./mappers/spell.mapper.js";
import {
  ensureCatalogStructure,
  writeWarscrolls,
  writeIndividualSpells,
  writeIndividualPrayers,
} from "./output/writer.js";
import {
  getGrandAlliance,
  catalogueNameToFactionId,
} from "./config.js";
import type { MapperOptions } from "./mappers/base.js";
import type { Warscroll } from "../schemas/schemas/warscroll.schema.js";
import type { Spell, Prayer } from "../schemas/schemas/spell.schema.js";

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
    const catalogue = await parseCat(loresFile);

    const mapperOptions: MapperOptions = {
      strict: false,
      factionId: "shared",
      grandAlliance: undefined,
      catalogueName: catalogue.$.name,
    };

    const spells = mapIndividualSpells(catalogue, mapperOptions);
    const prayers = mapIndividualPrayers(catalogue, mapperOptions);

    console.log(`  Spells: ${spells.length}`);
    console.log(`  Prayers: ${prayers.length}`);

    return { spells, prayers, errors };
  } catch (error) {
    const msg = `Failed to parse Lores.cat: ${error}`;
    errors.push(msg);
    console.error(msg);
    return { spells: [], prayers: [], errors };
  }
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

  // Combine results
  const result: CatalogResult = {
    warscrolls,
    spells,
    prayers,
    factionCounts,
    errors: [...warscrollErrors, ...loreErrors],
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
