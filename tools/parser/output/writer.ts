/**
 * Output Writer
 *
 * Writes parsed catalog data to JSON files.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import {
  WARSCROLLS_DIR,
  CATALOG_LORES_DIR,
  ENHANCEMENTS_DIR,
  BATTLE_FORMATIONS_DIR,
  TERRAIN_DIR,
  MANIFESTATIONS_DIR,
  POINTS_DIR,
} from "../config.js";
import type { Warscroll } from "../../schemas/schemas/warscroll.schema.js";
import type { Spell, Prayer } from "../../schemas/schemas/spell.schema.js";
import type { Enhancement } from "../../schemas/schemas/enhancement.schema.js";
import type { BattleFormation } from "../../schemas/schemas/battle-formation.schema.js";
import type { Terrain } from "../../schemas/schemas/terrain.schema.js";
import type { Manifestation } from "../../schemas/schemas/manifestation.schema.js";
import type { PointsPack } from "../../schemas/schemas/points-pack.schema.js";

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
  const content = JSON.stringify(data, null, 2);
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
 * Ensure catalog directory structure exists
 */
export function ensureCatalogStructure(): void {
  ensureDir(WARSCROLLS_DIR);
  ensureDir(CATALOG_LORES_DIR);
  ensureDir(ENHANCEMENTS_DIR);
  ensureDir(BATTLE_FORMATIONS_DIR);
  ensureDir(TERRAIN_DIR);
  ensureDir(MANIFESTATIONS_DIR);
  ensureDir(POINTS_DIR);
}

/**
 * Extract the simple name from a qualified ID
 * "warscroll.stormcast.knight_arcanum" -> "knight_arcanum"
 */
function extractNameFromQualifiedId(qualifiedId: string): string {
  const parts = qualifiedId.split(".");
  return parts[parts.length - 1];
}

/**
 * Determine output path for a warscroll
 * data/catalog/warscrolls/{faction}/{name}.json
 */
export function getWarscrollOutputPath(warscroll: Warscroll, baseDir?: string): string {
  const dir = baseDir || WARSCROLLS_DIR;
  const name = extractNameFromQualifiedId(warscroll.id);
  return join(dir, warscroll.faction, `${name}.json`);
}

/**
 * Write a warscroll to the catalog
 */
export function writeWarscroll(
  warscroll: Warscroll,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getWarscrollOutputPath(warscroll, baseDir);
  return writeJson(path, warscroll, options);
}

/**
 * Write multiple warscrolls
 */
export function writeWarscrolls(
  warscrolls: Warscroll[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return warscrolls.map((ws) => writeWarscroll(ws, options, baseDir));
}

/**
 * Determine output path for a spell
 * data/catalog/lores/{faction}/{name}.json
 */
export function getSpellOutputPath(spell: Spell, baseDir?: string): string {
  const dir = baseDir || CATALOG_LORES_DIR;
  const name = extractNameFromQualifiedId(spell.id);
  return join(dir, spell.faction, `${name}.json`);
}

/**
 * Write a spell to the catalog
 */
export function writeIndividualSpell(
  spell: Spell,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getSpellOutputPath(spell, baseDir);
  return writeJson(path, spell, options);
}

/**
 * Write multiple spells
 */
export function writeIndividualSpells(
  spells: Spell[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return spells.map((spell) => writeIndividualSpell(spell, options, baseDir));
}

/**
 * Determine output path for a prayer
 * data/catalog/lores/{faction}/{name}.json
 */
export function getPrayerOutputPath(prayer: Prayer, baseDir?: string): string {
  const dir = baseDir || CATALOG_LORES_DIR;
  const name = extractNameFromQualifiedId(prayer.id);
  return join(dir, prayer.faction, `${name}.json`);
}

/**
 * Write a prayer to the catalog
 */
export function writeIndividualPrayer(
  prayer: Prayer,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getPrayerOutputPath(prayer, baseDir);
  return writeJson(path, prayer, options);
}

/**
 * Write multiple prayers
 */
export function writeIndividualPrayers(
  prayers: Prayer[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return prayers.map((prayer) => writeIndividualPrayer(prayer, options, baseDir));
}

/**
 * Determine output path for a points pack
 * data/points/{id}.json
 */
export function getPointsPackOutputPath(pack: PointsPack, baseDir?: string): string {
  const dir = baseDir || POINTS_DIR;
  const name = pack.id.replace(/^points\./, "");
  return join(dir, `${name}.json`);
}

/**
 * Write a points pack
 */
export function writePointsPack(
  pack: PointsPack,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getPointsPackOutputPath(pack, baseDir);
  return writeJson(path, pack, options);
}

/**
 * Extract faction from enhancement keywords
 */
function getEnhancementFaction(enhancement: Enhancement): string {
  const factionKeyword = enhancement.keywords.find((k) => k.startsWith("faction:"));
  if (factionKeyword) {
    return factionKeyword.substring(8);
  }

  // Fallback: extract from ID
  const parts = enhancement.id.split(".");
  if (parts.length >= 2) {
    return parts[1];
  }

  return "shared";
}

/**
 * Extract subfaction from enhancement keywords
 * Returns undefined if the enhancement doesn't belong to a subfaction
 */
function getEnhancementSubfaction(enhancement: Enhancement): string | undefined {
  const subfactionKeyword = enhancement.keywords.find((k) => k.startsWith("subfaction:"));
  if (subfactionKeyword) {
    return subfactionKeyword.substring(11);
  }
  return undefined;
}

/**
 * Determine output path for an enhancement
 * data/catalog/enhancements/{faction}/{name}.json
 * or data/catalog/enhancements/{faction}/{subfaction}/{name}.json for subfaction-specific
 */
export function getEnhancementOutputPath(enhancement: Enhancement, baseDir?: string): string {
  const dir = baseDir || ENHANCEMENTS_DIR;
  const name = extractNameFromQualifiedId(enhancement.id);
  const faction = getEnhancementFaction(enhancement);
  const subfaction = getEnhancementSubfaction(enhancement);

  if (subfaction) {
    return join(dir, faction, subfaction, `${name}.json`);
  }
  return join(dir, faction, `${name}.json`);
}

/**
 * Write an enhancement to the catalog
 */
export function writeEnhancement(
  enhancement: Enhancement,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getEnhancementOutputPath(enhancement, baseDir);
  return writeJson(path, enhancement, options);
}

/**
 * Write multiple enhancements
 */
export function writeEnhancements(
  enhancements: Enhancement[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return enhancements.map((enhancement) => writeEnhancement(enhancement, options, baseDir));
}

/**
 * Determine output path for a battle formation
 * data/catalog/battle-formations/{faction}/{name}.json
 */
export function getBattleFormationOutputPath(formation: BattleFormation, baseDir?: string): string {
  const dir = baseDir || BATTLE_FORMATIONS_DIR;
  const name = extractNameFromQualifiedId(formation.id);
  return join(dir, formation.faction, `${name}.json`);
}

/**
 * Write a battle formation to the catalog
 */
export function writeBattleFormation(
  formation: BattleFormation,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getBattleFormationOutputPath(formation, baseDir);
  return writeJson(path, formation, options);
}

/**
 * Write multiple battle formations
 */
export function writeBattleFormations(
  formations: BattleFormation[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return formations.map((formation) => writeBattleFormation(formation, options, baseDir));
}

/**
 * Determine output path for a terrain
 * data/catalog/terrain/{faction}/{name}.json
 */
export function getTerrainOutputPath(terrain: Terrain, baseDir?: string): string {
  const dir = baseDir || TERRAIN_DIR;
  const name = extractNameFromQualifiedId(terrain.id);
  return join(dir, terrain.faction, `${name}.json`);
}

/**
 * Write a terrain to the catalog
 */
export function writeTerrain(
  terrain: Terrain,
  options: WriteOptions = {},
  baseDir?: string
): WriteResult {
  const path = getTerrainOutputPath(terrain, baseDir);
  return writeJson(path, terrain, options);
}

/**
 * Write multiple terrains
 */
export function writeTerrains(
  terrains: Terrain[],
  options: WriteOptions = {},
  baseDir?: string
): WriteResult[] {
  return terrains.map((terrain) => writeTerrain(terrain, options, baseDir));
}

/**
 * Determine output path for a manifestation
 * data/catalog/manifestations/{faction}/{name}.json
 */
export function getManifestationOutputPath(manifestation: Manifestation, baseDir?: string): string {
  const dir = baseDir || MANIFESTATIONS_DIR;
  const name = extractNameFromQualifiedId(manifestation.id);
  return join(dir, manifestation.faction, `${name}.json`);
}

/**
 * Write a manifestation to the catalog
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
