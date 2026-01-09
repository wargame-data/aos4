/**
 * Configuration
 *
 * Constants and configuration for the parser.
 */

import { join } from "path";

// Project paths
export const ROOT_DIR = process.cwd();
export const DATA_DIR = join(ROOT_DIR, "data");
export const FACTIONS_DIR = join(DATA_DIR, "factions"); // Legacy
export const SCHEMA_DIR = join(ROOT_DIR, "schema");
export const CACHE_DIR = join(ROOT_DIR, ".cache");
export const PATCHES_DIR = join(CACHE_DIR, "patches");

// New catalog structure paths
export const CATALOG_DIR = join(DATA_DIR, "catalog");
export const WARSCROLLS_DIR = join(CATALOG_DIR, "warscrolls");
export const CATALOG_ENHANCEMENTS_DIR = join(CATALOG_DIR, "enhancements");
export const CATALOG_TERRAIN_DIR = join(CATALOG_DIR, "terrain");
export const CATALOG_LORES_DIR = join(CATALOG_DIR, "lores");
export const MANIFESTS_DIR = join(CATALOG_DIR, "manifests");
export const POINTS_DIR = join(DATA_DIR, "points");
export const NEW_FACTIONS_DIR = join(DATA_DIR, "factions");

// BSData repository
export const BSDATA_REPO_URL =
  "https://github.com/BSData/age-of-sigmar-4th.git";
export const BSDATA_REPO_NAME = "age-of-sigmar-4th";

// Grand Alliance mappings by faction name (underscore format)
export const FACTION_GRAND_ALLIANCE: Record<string, string> = {
  // Order
  stormcast_eternals: "order",
  cities_of_sigmar: "order",
  daughters_of_khaine: "order",
  fyreslayers: "order",
  idoneth_deepkin: "order",
  kharadron_overlords: "order",
  lumineth_realm_lords: "order",
  seraphon: "order",
  sylvaneth: "order",

  // Chaos
  blades_of_khorne: "chaos",
  disciples_of_tzeentch: "chaos",
  hedonites_of_slaanesh: "chaos",
  maggotkin_of_nurgle: "chaos",
  beasts_of_chaos: "chaos",
  skaven: "chaos",
  slaves_to_darkness: "chaos",

  // Death
  flesh_eater_courts: "death",
  nighthaunt: "death",
  ossiarch_bonereapers: "death",
  soulblight_gravelords: "death",

  // Destruction
  gloomspite_gitz: "destruction",
  ogor_mawtribes: "destruction",
  orruk_warclans: "destruction",
  sons_of_behemat: "destruction",
  ironjawz: "destruction",
  kruleboyz: "destruction",
  bonesplitterz: "destruction",

  // Additional Chaos
  helsmiths_of_hashut: "chaos",
};

// Keyword to faction ID mapping (for cross-catalogue units)
export const KEYWORD_TO_FACTION: Record<string, string> = {
  "STORMCAST ETERNALS": "stormcast_eternals",
  "IDONETH DEEPKIN": "idoneth_deepkin",
  "DAUGHTERS OF KHAINE": "daughters_of_khaine",
  "FYRESLAYERS": "fyreslayers",
  "KHARADRON OVERLORDS": "kharadron_overlords",
  "LUMINETH REALM-LORDS": "lumineth_realm_lords",
  "CITIES OF SIGMAR": "cities_of_sigmar",
  "SERAPHON": "seraphon",
  "SYLVANETH": "sylvaneth",
  "BLADES OF KHORNE": "blades_of_khorne",
  "DISCIPLES OF TZEENTCH": "disciples_of_tzeentch",
  "HEDONITES OF SLAANESH": "hedonites_of_slaanesh",
  "MAGGOTKIN OF NURGLE": "maggotkin_of_nurgle",
  "BEASTS OF CHAOS": "beasts_of_chaos",
  "SKAVEN": "skaven",
  "SLAVES TO DARKNESS": "slaves_to_darkness",
  "FLESH-EATER COURTS": "flesh_eater_courts",
  "NIGHTHAUNT": "nighthaunt",
  "OSSIARCH BONEREAPERS": "ossiarch_bonereapers",
  "SOULBLIGHT GRAVELORDS": "soulblight_gravelords",
  "GLOOMSPITE GITZ": "gloomspite_gitz",
  "OGOR MAWTRIBES": "ogor_mawtribes",
  "ORRUK WARCLANS": "orruk_warclans",
  "SONS OF BEHEMAT": "sons_of_behemat",
  "IRONJAWZ": "ironjawz",
  "KRULEBOYZ": "kruleboyz",
  "BONESPLITTERZ": "bonesplitterz",
  "HELSMITHS OF HASHUT": "helsmiths_of_hashut",
};

/**
 * Detect the correct faction from unit keywords.
 * Used when units appear in cross-faction catalogues.
 */
export function detectFactionFromKeywords(
  keywords: string[],
  catalogueFactionId: string
): string {
  for (const keyword of keywords) {
    const factionId = KEYWORD_TO_FACTION[keyword];
    if (factionId && factionId !== catalogueFactionId) {
      return factionId;
    }
  }
  return catalogueFactionId;
}

// File patterns for BSData
export const BSDATA_CAT_PATTERN = "*.cat";
export const BSDATA_GST_PATTERN = "*.gst";

// Files to skip in BSData
export const BSDATA_SKIP_FILES = [
  "Regiments of Renown.cat",
  "Path to Glory",
];

// Only parse library catalogues (they contain the actual unit definitions)
export const BSDATA_PARSE_LIBRARIES_ONLY = true;

// Default cache expiry (hours)
export const DEFAULT_CACHE_EXPIRY_HOURS = 24;

// Schema URLs (legacy)
export const SCHEMA_URLS = {
  unit: "https://aos-data.org/schema/unit.schema.json",
  hero: "https://aos-data.org/schema/hero.schema.json",
  weapon: "https://aos-data.org/schema/weapon.schema.json",
  ability: "https://aos-data.org/schema/ability.schema.json",
  faction: "https://aos-data.org/schema/faction.schema.json",
  battleFormation: "https://aos-data.org/schema/battle-formation.schema.json",
  lore: "https://aos-data.org/schema/lore.schema.json",
};

// New schema URLs
export const NEW_SCHEMA_URLS = {
  warscroll: "https://aos-data.org/schema/warscroll.schema.json",
  spell: "https://aos-data.org/schema/spell.schema.json",
  prayer: "https://aos-data.org/schema/prayer.schema.json",
  pointsPack: "https://aos-data.org/schema/points-pack.schema.json",
  faction: "https://aos-data.org/schema/faction.schema.json",
};

// Universal manifestation lores (available to all factions)
// These are endless spells and incarnates that any army can use
export const UNIVERSAL_MANIFESTATION_LORES = [
  { id: "aetherwrought_machineries", name: "Aetherwrought Machineries" },
  { id: "forbidden_power", name: "Forbidden Power" },
  { id: "krondspine_incarnate", name: "Krondspine Incarnate" },
  { id: "morbid_conjuration", name: "Morbid Conjuration" },
  { id: "twilit_sorceries", name: "Twilit Sorceries" },
  { id: "primal_energy", name: "Primal Energy" },
];

/**
 * Get faction ID from catalogue name or filename
 * Strips " - Library" suffix and normalizes to underscore_case
 */
export function catalogueNameToFactionId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.cat$/i, "") // Remove .cat extension
    .replace(/\s*-\s*library$/i, "") // Remove " - Library" suffix
    .replace(/\s*\[legends\]$/i, "") // Remove "[LEGENDS]" suffix
    .replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscores
    .replace(/(^_|_$)/g, ""); // Remove leading/trailing underscores
}

/**
 * Get grand alliance for a faction
 */
export function getGrandAlliance(factionId: string): string | undefined {
  return FACTION_GRAND_ALLIANCE[factionId];
}

/**
 * Check if a catalogue should be skipped
 */
export function shouldSkipCatalogue(filename: string): boolean {
  // Skip specific files
  if (BSDATA_SKIP_FILES.some((skip) => filename.includes(skip))) {
    return true;
  }

  // Skip legends files
  if (filename.toLowerCase().includes("legends")) {
    return true;
  }

  // If configured to only parse libraries, skip non-library files
  if (BSDATA_PARSE_LIBRARIES_ONLY) {
    if (!filename.toLowerCase().includes("library")) {
      return true;
    }
  }

  return false;
}
