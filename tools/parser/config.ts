/**
 * Configuration
 *
 * Constants and configuration for the parser.
 */

import { join } from "path";

// Project paths
export const ROOT_DIR = process.cwd();
export const DATA_DIR = join(ROOT_DIR, "data");
export const FACTIONS_DIR = join(DATA_DIR, "factions");
export const SCHEMA_DIR = join(ROOT_DIR, "schema");
export const CACHE_DIR = join(ROOT_DIR, ".cache");
export const PATCHES_DIR = join(CACHE_DIR, "patches");

// BSData repository
export const BSDATA_REPO_URL =
  "https://github.com/BSData/age-of-sigmar-4th.git";
export const BSDATA_REPO_NAME = "age-of-sigmar-4th";

// Grand Alliance mappings by faction name
export const FACTION_GRAND_ALLIANCE: Record<string, string> = {
  // Order
  "stormcast-eternals": "order",
  "cities-of-sigmar": "order",
  "daughters-of-khaine": "order",
  "fyreslayers": "order",
  "idoneth-deepkin": "order",
  "kharadron-overlords": "order",
  "lumineth-realm-lords": "order",
  "seraphon": "order",
  "sylvaneth": "order",

  // Chaos
  "blades-of-khorne": "chaos",
  "disciples-of-tzeentch": "chaos",
  "hedonites-of-slaanesh": "chaos",
  "maggotkin-of-nurgle": "chaos",
  "beasts-of-chaos": "chaos",
  "skaven": "chaos",
  "slaves-to-darkness": "chaos",

  // Death
  "flesh-eater-courts": "death",
  "nighthaunt": "death",
  "ossiarch-bonereapers": "death",
  "soulblight-gravelords": "death",

  // Destruction
  "gloomspite-gitz": "destruction",
  "ogor-mawtribes": "destruction",
  "orruk-warclans": "destruction",
  "sons-of-behemat": "destruction",
};

// File patterns for BSData
export const BSDATA_CAT_PATTERN = "*.cat";
export const BSDATA_GST_PATTERN = "*.gst";

// Files to skip in BSData
export const BSDATA_SKIP_FILES = [
  "Lores.cat",
  "Regiments of Renown.cat",
  "Path to Glory",
];

// Only parse library catalogues (they contain the actual unit definitions)
export const BSDATA_PARSE_LIBRARIES_ONLY = true;

// Default cache expiry (hours)
export const DEFAULT_CACHE_EXPIRY_HOURS = 24;

// Schema URLs
export const SCHEMA_URLS = {
  unit: "https://aos-data.org/schema/unit.schema.json",
  hero: "https://aos-data.org/schema/hero.schema.json",
  weapon: "https://aos-data.org/schema/weapon.schema.json",
  ability: "https://aos-data.org/schema/ability.schema.json",
  faction: "https://aos-data.org/schema/faction.schema.json",
  battleFormation: "https://aos-data.org/schema/battle-formation.schema.json",
};

/**
 * Get faction ID from catalogue name or filename
 * Strips " - Library" suffix and normalizes to kebab-case
 */
export function catalogueNameToFactionId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.cat$/i, "") // Remove .cat extension
    .replace(/\s*-\s*library$/i, "") // Remove " - Library" suffix
    .replace(/\s*\[legends\]$/i, "") // Remove "[LEGENDS]" suffix
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/(^-|-$)/g, ""); // Remove leading/trailing hyphens
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
