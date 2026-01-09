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
  POINTS_DIR,
} from "../config.js";
import type { Warscroll } from "../../schemas/schemas/warscroll.schema.js";
import type { Spell, Prayer } from "../../schemas/schemas/spell.schema.js";
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
