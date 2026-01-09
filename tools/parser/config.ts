/**
 * Configuration
 *
 * Constants and configuration for the parser.
 */

import { join } from "path";

// Project paths
export const ROOT_DIR = process.cwd();
export const DATA_DIR = join(ROOT_DIR, "data");
export const CATALOG_DIR = join(DATA_DIR, "catalog");
export const WARSCROLLS_DIR = join(CATALOG_DIR, "warscrolls");
export const CATALOG_LORES_DIR = join(CATALOG_DIR, "lores");
export const ENHANCEMENTS_DIR = join(CATALOG_DIR, "enhancements");
export const BATTLE_FORMATIONS_DIR = join(CATALOG_DIR, "battle-formations");
export const TERRAIN_DIR = join(CATALOG_DIR, "terrain");
export const MANIFESTATIONS_DIR = join(CATALOG_DIR, "manifestations");
export const POINTS_DIR = join(DATA_DIR, "points");

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
  helsmiths_of_hashut: "chaos",

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

// Schema URLs
export const SCHEMA_URLS = {
  warscroll: "https://wargamedata.com/aos4/schema/warscroll.schema.json",
  spell: "https://wargamedata.com/aos4/schema/spell.schema.json",
  prayer: "https://wargamedata.com/aos4/schema/prayer.schema.json",
  enhancement: "https://wargamedata.com/aos4/schema/enhancement.schema.json",
  battleFormation: "https://wargamedata.com/aos4/schema/battle-formation.schema.json",
  terrain: "https://wargamedata.com/aos4/schema/terrain.schema.json",
  manifestation: "https://wargamedata.com/aos4/schema/manifestation.schema.json",
  pointsPack: "https://wargamedata.com/aos4/schema/points-pack.schema.json",
  faction: "https://wargamedata.com/aos4/schema/faction.schema.json",
};

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
