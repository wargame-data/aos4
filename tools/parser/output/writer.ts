/**
 * Output Writer
 *
 * Writes parsed data to JSON files.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import type { Unit, Hero } from "../mappers/unit.mapper.js";
import type { Lore } from "../mappers/lore.mapper.js";
import type { Manifestation } from "../mappers/manifestation.mapper.js";
import type { FactionTerrain } from "../mappers/terrain.mapper.js";
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
  ensureDir(join(factionDir, "manifestations"));
  ensureDir(join(factionDir, "battle-formations"));
  ensureDir(join(factionDir, "lores"));
  ensureDir(join(factionDir, "terrain"));
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

/**
 * Get regiments of renown directory path
 */
export function getRegimentsOfRenownDir(baseDir?: string): string {
  const dir = baseDir || DATA_DIR;
  return join(dir, "_shared", "regiments-of-renown");
}

/**
 * Ensure regiments of renown directory exists
 */
export function ensureRegimentsOfRenownDir(baseDir?: string): void {
  ensureDir(getRegimentsOfRenownDir(baseDir));
}

/**
 * Determine output path for a regiment of renown
 */
export function getRegimentOfRenownOutputPath(
  regiment: { id: string },
  baseDir?: string
): string {
  return join(getRegimentsOfRenownDir(baseDir), `${regiment.id}.json`);
}

/**
 * Write a regiment of renown
 */
export function writeRegimentOfRenown<T extends { id: string }>(
  regiment: T,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getRegimentOfRenownOutputPath(regiment, baseDir);
  return writeJson(path, regiment, options);
}

/**
 * Write multiple regiments of renown
 */
export function writeRegimentsOfRenown<T extends { id: string }>(
  regiments: T[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return regiments.map((regiment) => writeRegimentOfRenown(regiment, options, baseDir));
}

/**
 * Determine output path for a manifestation
 */
export function getManifestationOutputPath(
  manifestation: Manifestation,
  baseDir?: string
): string {
  const dir = baseDir || FACTIONS_DIR;
  return join(dir, manifestation.faction, "manifestations", `${manifestation.id}.json`);
}

/**
 * Write a manifestation to its appropriate location
 */
export function writeManifestation(
  manifestation: Manifestation,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getManifestationOutputPath(manifestation, baseDir);
  return writeJson(path, manifestation, options);
}

/**
 * Write multiple manifestations
 */
export function writeManifestations(
  manifestations: Manifestation[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return manifestations.map((manifestation) => writeManifestation(manifestation, options, baseDir));
}

/**
 * Get battle tactics directory path
 */
export function getBattleTacticsDir(baseDir?: string): string {
  const dir = baseDir || DATA_DIR;
  return join(dir, "_shared", "battle-tactics");
}

/**
 * Ensure battle tactics directory exists
 */
export function ensureBattleTacticsDir(baseDir?: string): void {
  ensureDir(getBattleTacticsDir(baseDir));
}

/**
 * Determine output path for a battle tactic card
 */
export function getBattleTacticOutputPath(
  card: { id: string },
  baseDir?: string
): string {
  return join(getBattleTacticsDir(baseDir), `${card.id}.json`);
}

/**
 * Write a battle tactic card
 */
export function writeBattleTacticCard<T extends { id: string }>(
  card: T,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getBattleTacticOutputPath(card, baseDir);
  return writeJson(path, card, options);
}

/**
 * Write multiple battle tactic cards
 */
export function writeBattleTacticCards<T extends { id: string }>(
  cards: T[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return cards.map((card) => writeBattleTacticCard(card, options, baseDir));
}

/**
 * Get blood tithe directory path
 */
export function getBloodTitheDir(baseDir?: string): string {
  const dir = baseDir || FACTIONS_DIR;
  return join(dir, "blades-of-khorne", "blood-tithe");
}

/**
 * Ensure blood tithe directory exists
 */
export function ensureBloodTitheDir(baseDir?: string): void {
  ensureDir(getBloodTitheDir(baseDir));
}

/**
 * Determine output path for a blood tithe ability
 */
export function getBloodTitheOutputPath(
  ability: { id: string },
  baseDir?: string
): string {
  return join(getBloodTitheDir(baseDir), `${ability.id}.json`);
}

/**
 * Write a blood tithe ability
 */
export function writeBloodTitheAbility<T extends { id: string }>(
  ability: T,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getBloodTitheOutputPath(ability, baseDir);
  return writeJson(path, ability, options);
}

/**
 * Write multiple blood tithe abilities
 */
export function writeBloodTitheAbilities<T extends { id: string }>(
  abilities: T[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return abilities.map((ability) => writeBloodTitheAbility(ability, options, baseDir));
}

/**
 * Determine output path for faction terrain
 */
export function getTerrainOutputPath(
  terrain: FactionTerrain,
  baseDir?: string
): string {
  const dir = baseDir || FACTIONS_DIR;
  return join(dir, terrain.faction, "terrain", `${terrain.id}.json`);
}

/**
 * Write a terrain piece to its appropriate location
 */
export function writeTerrain(
  terrain: FactionTerrain,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getTerrainOutputPath(terrain, baseDir);
  return writeJson(path, terrain, options);
}

/**
 * Write multiple terrain pieces
 */
export function writeTerrains(
  terrains: FactionTerrain[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return terrains.map((terrain) => writeTerrain(terrain, options, baseDir));
}
