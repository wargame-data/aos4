/**
 * Output Writer
 *
 * Writes parsed data to JSON files.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import type { Unit, Hero } from "../mappers/unit.mapper.js";
import { FACTIONS_DIR } from "../config.js";

/**
 * Write options
 */
export interface WriteOptions {
  dryRun?: boolean;
  pretty?: boolean;
}

/**
 * Write result
 */
export interface WriteResult {
  path: string;
  written: boolean;
  created: boolean;
  dryRun: boolean;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write JSON to file
 */
function writeJson(
  path: string,
  data: unknown,
  options: WriteOptions
): WriteResult {
  const content = options.pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data, null, 2); // Always pretty for our use case

  const fileExists = existsSync(path);

  if (options.dryRun) {
    return {
      path,
      written: false,
      created: !fileExists,
      dryRun: true,
    };
  }

  ensureDir(dirname(path));
  writeFileSync(path, content + "\n");

  return {
    path,
    written: true,
    created: !fileExists,
    dryRun: false,
  };
}

/**
 * Determine output path for a unit
 */
export function getUnitOutputPath(unit: Unit | Hero, baseDir?: string): string {
  const dir = baseDir || FACTIONS_DIR;
  const isHero = "isWizard" in unit;
  const subDir = isHero ? "heroes" : "units";

  return join(dir, unit.faction, subDir, `${unit.id}.json`);
}

/**
 * Write a unit to its appropriate location
 */
export function writeUnit(
  unit: Unit | Hero,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getUnitOutputPath(unit, baseDir);
  return writeJson(path, unit, options);
}

/**
 * Write multiple units
 */
export function writeUnits(
  units: (Unit | Hero)[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return units.map((unit) => writeUnit(unit, options, baseDir));
}

/**
 * Read existing unit file
 */
export function readExistingUnit(
  unit: Unit | Hero,
  baseDir?: string
): (Unit | Hero) | null {
  const path = getUnitOutputPath(unit, baseDir);

  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as Unit | Hero;
  } catch {
    return null;
  }
}

/**
 * Get faction directory path
 */
export function getFactionDir(factionId: string, baseDir?: string): string {
  const dir = baseDir || FACTIONS_DIR;
  return join(dir, factionId);
}

/**
 * Ensure faction directory structure exists
 */
export function ensureFactionStructure(
  factionId: string,
  baseDir?: string
): void {
  const factionDir = getFactionDir(factionId, baseDir);

  ensureDir(join(factionDir, "heroes"));
  ensureDir(join(factionDir, "units"));
  ensureDir(join(factionDir, "battle-formations"));
}

/**
 * Write faction index file
 */
export function writeFactionIndex(
  factionId: string,
  factionData: {
    id: string;
    name: string;
    grandAlliance: string;
    [key: string]: unknown;
  },
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const factionDir = getFactionDir(factionId, baseDir);
  const path = join(factionDir, "_index.json");

  return writeJson(path, factionData, options);
}
