/**
 * Output Writer
 *
 * Writes parsed data to JSON files.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import type { Unit, Hero } from "../mappers/unit.mapper.js";
import type { Lore } from "../mappers/lore.mapper.js";
import { FACTIONS_DIR, DATA_DIR } from "../config.js";

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
  ensureDir(join(factionDir, "lores"));
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

/**
 * Get shared lores directory path
 */
export function getSharedLoresDir(baseDir?: string): string {
  const dir = baseDir || DATA_DIR;
  return join(dir, "_shared", "lores");
}

/**
 * Ensure shared lores directory exists
 */
export function ensureSharedLoresDir(baseDir?: string): void {
  ensureDir(getSharedLoresDir(baseDir));
}

/**
 * Determine output path for a lore
 * Shared lores (from Lores.cat) go to _shared/lores/
 * Faction-specific lores go to {faction}/lores/
 */
export function getLoreOutputPath(
  lore: Lore,
  factionId?: string,
  baseDir?: string
): string {
  if (factionId) {
    // Faction-specific lore
    const dir = baseDir || FACTIONS_DIR;
    return join(dir, factionId, "lores", `${lore.id}.json`);
  } else {
    // Shared lore (from Lores.cat)
    return join(getSharedLoresDir(baseDir), `${lore.id}.json`);
  }
}

/**
 * Write a lore to its appropriate location
 */
export function writeLore(
  lore: Lore,
  options: WriteOptions = {},
  factionId?: string,
  baseDir?: string
): WriteResult {
  const path = getLoreOutputPath(lore, factionId, baseDir);
  return writeJson(path, lore, options);
}

/**
 * Write multiple lores
 */
export function writeLores(
  lores: Lore[],
  options: WriteOptions = {},
  factionId?: string,
  baseDir?: string
): WriteResult[] {
  return lores.map((lore) => writeLore(lore, options, factionId, baseDir));
}

/**
 * Determine output path for a battle formation
 */
export function getBattleFormationOutputPath(
  formation: { id: string; faction: string },
  baseDir?: string
): string {
  const dir = baseDir || FACTIONS_DIR;
  return join(dir, formation.faction, "battle-formations", `${formation.id}.json`);
}

/**
 * Write a battle formation
 */
export function writeBattleFormation<T extends { id: string; faction: string }>(
  formation: T,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getBattleFormationOutputPath(formation, baseDir);
  return writeJson(path, formation, options);
}

/**
 * Write multiple battle formations
 */
export function writeBattleFormations<T extends { id: string; faction: string }>(
  formations: T[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return formations.map((formation) => writeBattleFormation(formation, options, baseDir));
}

/**
 * Determine output path for an enhancement collection
 */
export function getEnhancementOutputPath(
  enhancement: { id: string; faction: string },
  baseDir?: string
): string {
  const dir = baseDir || FACTIONS_DIR;
  return join(dir, enhancement.faction, "enhancements", `${enhancement.id}.json`);
}

/**
 * Write an enhancement collection
 */
export function writeEnhancement<T extends { id: string; faction: string }>(
  enhancement: T,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getEnhancementOutputPath(enhancement, baseDir);
  return writeJson(path, enhancement, options);
}

/**
 * Ensure enhancements directory exists
 */
export function ensureEnhancementsDir(factionId: string, baseDir?: string): void {
  const factionDir = getFactionDir(factionId, baseDir);
  ensureDir(join(factionDir, "enhancements"));
}
