/**
 * Army Data Loader
 *
 * Load faction data from JSON files into ArmyData structure for validation.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { Unit } from "../schemas/schemas/unit.schema.js";
import type { Hero } from "../schemas/schemas/hero.schema.js";
import type { Faction } from "../schemas/schemas/faction.schema.js";
import type { RegimentOfRenown } from "../schemas/schemas/regiment-of-renown.schema.js";
import type { ArmyData } from "../schemas/army-validator.js";

// Get directory paths (using process.cwd() like the parser)
const ROOT_DIR = process.cwd();
const DATA_DIR = join(ROOT_DIR, "data");
const FACTIONS_DIR = join(DATA_DIR, "factions");
const SHARED_DIR = join(DATA_DIR, "_shared");

/**
 * Load a JSON file and parse it.
 */
function loadJson<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Load all JSON files from a directory.
 */
function loadJsonDir<T>(dirPath: string): T[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
  const results: T[] = [];

  for (const file of files) {
    const data = loadJson<T>(join(dirPath, file));
    if (data) {
      results.push(data);
    }
  }

  return results;
}

/**
 * Load all factions from data/factions/.
 */
export function loadFactions(): Faction[] {
  const factions: Faction[] = [];

  if (!existsSync(FACTIONS_DIR)) {
    return factions;
  }

  const factionDirs = readdirSync(FACTIONS_DIR).filter((d) =>
    existsSync(join(FACTIONS_DIR, d, "_index.json"))
  );

  for (const factionId of factionDirs) {
    const indexPath = join(FACTIONS_DIR, factionId, "_index.json");
    const faction = loadJson<Faction>(indexPath);
    if (faction) {
      factions.push(faction);
    }
  }

  return factions;
}

/**
 * Load all heroes from a faction.
 */
export function loadHeroes(factionId: string): Hero[] {
  const heroesDir = join(FACTIONS_DIR, factionId, "heroes");
  return loadJsonDir<Hero>(heroesDir);
}

/**
 * Load all units from a faction.
 */
export function loadUnits(factionId: string): Unit[] {
  const unitsDir = join(FACTIONS_DIR, factionId, "units");
  return loadJsonDir<Unit>(unitsDir);
}

/**
 * Load all regiments of renown from shared data.
 */
export function loadRegimentsOfRenown(): RegimentOfRenown[] {
  const rorDir = join(SHARED_DIR, "regiments-of-renown");
  return loadJsonDir<RegimentOfRenown>(rorDir);
}

/**
 * Load all army data from the data directory.
 */
export function loadArmyData(): ArmyData {
  const factions = loadFactions();
  const heroes: Hero[] = [];
  const units: Unit[] = [];

  // Load heroes and units from each faction
  for (const faction of factions) {
    heroes.push(...loadHeroes(faction.id));
    units.push(...loadUnits(faction.id));
  }

  const regimentsOfRenown = loadRegimentsOfRenown();

  return {
    factions: new Map(factions.map((f) => [f.id, f])),
    heroes: new Map(heroes.map((h) => [h.id, h])),
    units: new Map(units.map((u) => [u.id, u])),
    regimentsOfRenown: new Map(regimentsOfRenown.map((r) => [r.id, r])),
  };
}

/**
 * Load army data for a specific faction only.
 */
export function loadFactionArmyData(factionId: string): ArmyData {
  const factionPath = join(FACTIONS_DIR, factionId, "_index.json");
  const faction = loadJson<Faction>(factionPath);

  if (!faction) {
    throw new Error(`Faction not found: ${factionId}`);
  }

  const heroes = loadHeroes(factionId);
  const units = loadUnits(factionId);
  const regimentsOfRenown = loadRegimentsOfRenown();

  return {
    factions: new Map([[faction.id, faction]]),
    heroes: new Map(heroes.map((h) => [h.id, h])),
    units: new Map(units.map((u) => [u.id, u])),
    regimentsOfRenown: new Map(regimentsOfRenown.map((r) => [r.id, r])),
  };
}
