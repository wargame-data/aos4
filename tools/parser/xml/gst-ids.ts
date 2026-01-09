/**
 * GST ID Constants
 *
 * All IDs are from the Age of Sigmar 4.0.gst game system file.
 * These IDs are used for type detection throughout the parser.
 *
 * IMPORTANT: Never guess entity types based on names.
 * All type information comes from IDs referencing the GST file.
 */

// ============================================================================
// Profile Type IDs
// ============================================================================
// These IDs identify what kind of data a <profile> element contains

export const PROFILE_TYPES = {
  // Combat profiles
  UNIT: "ff03-376e-972f-8ab2", // Move, Health, Save, Control
  MELEE_WEAPON: "9074-76b6-9e2f-81e3", // Atk, Hit, Wnd, Rnd, Dmg, Ability
  RANGED_WEAPON: "1fd-a42f-41d3-fe05", // Rng, Atk, Hit, Wnd, Rnd, Dmg, Ability
  MANIFESTATION: "1287-3a-9799-7e40", // Move, Health, Save, Banishment

  // Ability profiles
  ABILITY_PASSIVE: "907f-a48-6a04-f788", // Keywords, Effect (+ Color, Type attributes)
  ABILITY_ACTIVATED: "59b6-d47a-a68a-5dcc", // Timing, Declare, Effect, Keywords, Used By
  ABILITY_SPELL: "7312-8367-c171-f2ef", // Timing, Casting Value, Declare, Effect, Keywords
  ABILITY_PRAYER: "5946-234-d7b4-6195", // Timing, Chanting Value, Declare, Effect, Keywords
  ABILITY_COMMAND: "55ac-f837-dded-5872", // Timing, Cost, Declare, Effect, Keywords
  ABILITY_BLOOD_TITHE: "5453-37d7-6d37-db1b", // Khorne-specific ability type

  // Other profiles
  BATTLE_TACTIC_CARD: "abf8-a239-9e66-54c1", // Battle Tactic objectives
} as const;

export type ProfileTypeId = (typeof PROFILE_TYPES)[keyof typeof PROFILE_TYPES];

// All ability profile type IDs for convenience
export const ABILITY_PROFILE_TYPE_IDS = [
  PROFILE_TYPES.ABILITY_PASSIVE,
  PROFILE_TYPES.ABILITY_ACTIVATED,
  PROFILE_TYPES.ABILITY_SPELL,
  PROFILE_TYPES.ABILITY_PRAYER,
  PROFILE_TYPES.ABILITY_COMMAND,
  PROFILE_TYPES.ABILITY_BLOOD_TITHE,
] as const;

// ============================================================================
// Category IDs
// ============================================================================
// These IDs identify unit types via <categoryLink> elements

export const CATEGORIES = {
  // Primary unit types
  HERO: "6e72-1656-d554-528a",
  INFANTRY: "75d6-6995-dfcc-3898",
  CAVALRY: "926c-df8c-6841-d49e",
  MONSTER: "6d54-625c-d063-13e2",
  BEAST: "b224-8c8e-ca93-9860",
  WAR_MACHINE: "f7bc-b618-4b5d-2bae",
  MANIFESTATION: "bff0-8be9-719f-4afc",

  // Special properties
  FLY: "b979-4c3e-7d0e-6921",
  UNIQUE: "72ce-2188-70bf-2dbd",
  WARMASTER: "c203-51a0-3d44-6b07",
  FACTION_TERRAIN: "cdd6-ffa1-9b32-4cb8",

  // Wizard levels (only 1, 2, 3, 4, 9 exist in AOS 4th)
  WIZARD_1: "6f28-c3f6-4b1b-8aff",
  WIZARD_2: "8179-697a-9f4c-91d4",
  WIZARD_3: "8bc-6d63-e37f-9239",
  WIZARD_4: "1c0-eb0b-bbd5-4731",
  WIZARD_9: "5a9b-95b7-c807-341f",

  // Priest levels (only 1, 2 exist in AOS 4th)
  PRIEST_1: "3fe-84f4-cec6-a1c1",
  PRIEST_2: "e692-853d-6db8-fdbe",

  // Ward values
  WARD_6: "70a4-383f-421f-52cd",
  WARD_5: "52cc-95fd-6cd3-8f72",
  WARD_4: "f99f-98ee-909f-57cd",
  WARD_3: "70eb-9b87-b57a-f9f6",

  // Grand Alliances
  ORDER: "ee22-3575-6590-25c",
  CHAOS: "319b-38ee-d10d-e800",
  DEATH: "d484-a2d7-cf4f-c4a0",
  DESTRUCTION: "9057-5a29-dda5-3c28",
} as const;

export type CategoryId = (typeof CATEGORIES)[keyof typeof CATEGORIES];

// Wizard category IDs mapped to levels for detection
// Note: Only levels 1, 2, 3, 4, 9 exist in AOS 4th edition
export const WIZARD_LEVEL_MAP = {
  [CATEGORIES.WIZARD_1]: 1,
  [CATEGORIES.WIZARD_2]: 2,
  [CATEGORIES.WIZARD_3]: 3,
  [CATEGORIES.WIZARD_4]: 4,
  [CATEGORIES.WIZARD_9]: 9,
} as const;

export const WIZARD_CATEGORY_IDS = Object.keys(WIZARD_LEVEL_MAP) as (keyof typeof WIZARD_LEVEL_MAP)[];

// Priest category IDs mapped to levels for detection
// Note: Only levels 1, 2 exist in AOS 4th edition
export const PRIEST_LEVEL_MAP = {
  [CATEGORIES.PRIEST_1]: 1,
  [CATEGORIES.PRIEST_2]: 2,
} as const;

export const PRIEST_CATEGORY_IDS = Object.keys(PRIEST_LEVEL_MAP) as (keyof typeof PRIEST_LEVEL_MAP)[];

// Ward category IDs mapped to values
export const WARD_CATEGORY_MAP = {
  [CATEGORIES.WARD_6]: "6+",
  [CATEGORIES.WARD_5]: "5+",
  [CATEGORIES.WARD_4]: "4+",
  [CATEGORIES.WARD_3]: "3+",
} as const;

// ============================================================================
// Characteristic Type IDs
// ============================================================================
// IMPORTANT: Characteristic IDs are DIFFERENT per profile type!
// The "Move" characteristic in a Unit profile has a different ID than in a Manifestation profile.

// Unit Profile (ff03-376e-972f-8ab2) characteristics
export const UNIT_CHARACTERISTICS = {
  MOVE: "fed0-d1b3-1bb8-c501",
  HEALTH: "96be-54ae-ce7b-10b7",
  SAVE: "1981-ef09-96f6-7aa9",
  CONTROL: "6c6f-8510-9ce1-fc6e",
} as const;

// Melee Weapon (9074-76b6-9e2f-81e3) characteristics
export const MELEE_WEAPON_CHARACTERISTICS = {
  ATK: "60e-35aa-31ed-e488",
  HIT: "26dc-168-b2fd-cb93",
  WND: "61c1-22cc-40af-2847",
  RND: "eccc-10fa-6958-fb73",
  DMG: "e948-9c71-12a6-6be4",
  ABILITY: "eda3-7332-5db1-4159",
} as const;

// Ranged Weapon (1fd-a42f-41d3-fe05) characteristics
export const RANGED_WEAPON_CHARACTERISTICS = {
  RNG: "c6b5-908c-a604-1a98",
  ATK: "aa17-4296-2887-e05d",
  HIT: "194d-aeb6-5ba7-83b4",
  WND: "d3d5-9dc6-13de-8d1",
  RND: "d03f-a9ae-3eec-755",
  DMG: "96c2-d0a5-ea1e-653b",
  ABILITY: "d793-3dd7-9c13-741e",
} as const;

// Manifestation (1287-3a-9799-7e40) characteristics
export const MANIFESTATION_CHARACTERISTICS = {
  MOVE: "c28a-6000-2a0b-e7cf",
  HEALTH: "d1b9-3068-515-131e",
  SAVE: "80c7-7691-b6ed-d6a6",
  BANISHMENT: "97a2-d412-9ac-6a37",
} as const;

// Ability (Passive) (907f-a48-6a04-f788) characteristics
export const PASSIVE_ABILITY_CHARACTERISTICS = {
  KEYWORDS: "b977-7c5e-33b2-428e",
  EFFECT: "fd7f-888d-3257-a12b",
} as const;

// Ability (Passive) attributes
export const PASSIVE_ABILITY_ATTRIBUTES = {
  COLOR: "50fe-4f29-6bc3-dcc6",
  TYPE: "bf11-4e10-3ab1-06f4",
} as const;

// Ability (Activated) (59b6-d47a-a68a-5dcc) characteristics
export const ACTIVATED_ABILITY_CHARACTERISTICS = {
  TIMING: "652c-3d84-4e7-14f4",
  DECLARE: "bad3-f9c5-ba46-18cb",
  EFFECT: "b6f1-ba36-6cd-3b03",
  KEYWORDS: "12e8-3214-7d8f-1d0f",
  USED_BY: "1b32-c9d6-3106-166b",
} as const;

// Ability (Activated) attributes
export const ACTIVATED_ABILITY_ATTRIBUTES = {
  COLOR: "5a11-eab3-180c-ddf5",
  TYPE: "6d16-c86b-2698-85a4",
} as const;

// Ability (Spell) (7312-8367-c171-f2ef) characteristics
export const SPELL_CHARACTERISTICS = {
  TIMING: "de6f-d57b-248a-83be",
  CASTING_VALUE: "9fc7-b0f6-d018-a608",
  DECLARE: "24f8-3803-4ab1-3b6c",
  EFFECT: "1cb9-a-1345-907f",
  KEYWORDS: "353f-565e-c351-1cf2",
} as const;

// Ability (Prayer) (5946-234-d7b4-6195) characteristics
export const PRAYER_CHARACTERISTICS = {
  TIMING: "76bf-8126-64d4-c709",
  CHANTING_VALUE: "f192-6780-8138-9cef",
  DECLARE: "284c-90b2-245b-adf3",
  EFFECT: "6219-6fcc-5ae2-a6b7",
  KEYWORDS: "e3d8-f58b-e4e0-8e9d",
} as const;

// Ability (Command) (55ac-f837-dded-5872) characteristics
export const COMMAND_ABILITY_CHARACTERISTICS = {
  TIMING: "736-6e3a-d0b5-a1b0",
  COST: "a49e-3082-e2a6-e802",
  DECLARE: "b77f-7548-840e-c086",
  EFFECT: "2111-3ca8-61dd-a5f0",
  KEYWORDS: "445d-f443-5448-e7ce",
} as const;

// ============================================================================
// Faction Category IDs
// ============================================================================
// These IDs identify factions via <categoryLink> elements

export const FACTION_CATEGORIES = {
  // Order
  STORMCAST_ETERNALS: "a437-a8f0-67ba-c674",
  CITIES_OF_SIGMAR: "4999-8ae2-e1bb-ba5",
  DAUGHTERS_OF_KHAINE: "abd7-c4f9-cd1-a6f8",
  FYRESLAYERS: "6a02-a995-fd92-d806",
  IDONETH_DEEPKIN: "c8fc-7a72-6665-2f34",
  KHARADRON_OVERLORDS: "9c8d-276-b7d2-f1fd",
  LUMINETH_REALM_LORDS: "879-a29f-5c33-2e92",
  SERAPHON: "9554-d069-a0dd-4f2d",
  SYLVANETH: "9190-23b-eab9-9904",

  // Chaos
  BLADES_OF_KHORNE: "34e2-3c11-76bc-a2e",
  DISCIPLES_OF_TZEENTCH: "d64d-ec64-3cf-cc4",
  HEDONITES_OF_SLAANESH: "67df-cdfb-d83f-3197",
  MAGGOTKIN_OF_NURGLE: "ca3c-6c3b-4887-3a9d",
  BEASTS_OF_CHAOS: "e902-e0b8-b5ea-d527",
  SKAVEN: "cce6-9e5a-dd33-a755",
  SLAVES_TO_DARKNESS: "94d9-cc36-9083-1bea",
  HELSMITHS_OF_HASHUT: "905e-30fb-4d0f-4685",

  // Death
  FLESH_EATER_COURTS: "8d10-dc24-7ece-50df",
  NIGHTHAUNT: "e3a4-4581-9f76-4215",
  OSSIARCH_BONEREAPERS: "5603-d1-a021-331e",
  SOULBLIGHT_GRAVELORDS: "f7c2-3a00-4ae6-667",

  // Destruction
  GLOOMSPITE_GITZ: "ce45-cc36-d92e-ef70",
  OGOR_MAWTRIBES: "743-1bd8-e3d-ced2",
  SONS_OF_BEHEMAT: "482b-a44e-ffc6-df0a",
  IRONJAWZ: "c1ca-4b17-3512-89f",
  KRULEBOYZ: "6e42-3c75-4cb5-337a",
  BONESPLITTERZ: "dcf6-0115-279f-7a80",
} as const;

export type FactionCategoryId = (typeof FACTION_CATEGORIES)[keyof typeof FACTION_CATEGORIES];

// Map faction category IDs to faction IDs (underscore format)
export const FACTION_CATEGORY_TO_FACTION_ID: Record<string, string> = {
  [FACTION_CATEGORIES.STORMCAST_ETERNALS]: "stormcast_eternals",
  [FACTION_CATEGORIES.CITIES_OF_SIGMAR]: "cities_of_sigmar",
  [FACTION_CATEGORIES.DAUGHTERS_OF_KHAINE]: "daughters_of_khaine",
  [FACTION_CATEGORIES.FYRESLAYERS]: "fyreslayers",
  [FACTION_CATEGORIES.IDONETH_DEEPKIN]: "idoneth_deepkin",
  [FACTION_CATEGORIES.KHARADRON_OVERLORDS]: "kharadron_overlords",
  [FACTION_CATEGORIES.LUMINETH_REALM_LORDS]: "lumineth_realm_lords",
  [FACTION_CATEGORIES.SERAPHON]: "seraphon",
  [FACTION_CATEGORIES.SYLVANETH]: "sylvaneth",
  [FACTION_CATEGORIES.BLADES_OF_KHORNE]: "blades_of_khorne",
  [FACTION_CATEGORIES.DISCIPLES_OF_TZEENTCH]: "disciples_of_tzeentch",
  [FACTION_CATEGORIES.HEDONITES_OF_SLAANESH]: "hedonites_of_slaanesh",
  [FACTION_CATEGORIES.MAGGOTKIN_OF_NURGLE]: "maggotkin_of_nurgle",
  [FACTION_CATEGORIES.BEASTS_OF_CHAOS]: "beasts_of_chaos",
  [FACTION_CATEGORIES.SKAVEN]: "skaven",
  [FACTION_CATEGORIES.SLAVES_TO_DARKNESS]: "slaves_to_darkness",
  [FACTION_CATEGORIES.HELSMITHS_OF_HASHUT]: "helsmiths_of_hashut",
  [FACTION_CATEGORIES.FLESH_EATER_COURTS]: "flesh_eater_courts",
  [FACTION_CATEGORIES.NIGHTHAUNT]: "nighthaunt",
  [FACTION_CATEGORIES.OSSIARCH_BONEREAPERS]: "ossiarch_bonereapers",
  [FACTION_CATEGORIES.SOULBLIGHT_GRAVELORDS]: "soulblight_gravelords",
  [FACTION_CATEGORIES.GLOOMSPITE_GITZ]: "gloomspite_gitz",
  [FACTION_CATEGORIES.OGOR_MAWTRIBES]: "ogor_mawtribes",
  [FACTION_CATEGORIES.SONS_OF_BEHEMAT]: "sons_of_behemat",
  [FACTION_CATEGORIES.IRONJAWZ]: "ironjawz",
  [FACTION_CATEGORIES.KRULEBOYZ]: "kruleboyz",
  [FACTION_CATEGORIES.BONESPLITTERZ]: "bonesplitterz",
};

// ============================================================================
// Helper Types
// ============================================================================

// Map of profile type ID to its characteristic IDs
export const PROFILE_CHARACTERISTICS_MAP = {
  [PROFILE_TYPES.UNIT]: UNIT_CHARACTERISTICS,
  [PROFILE_TYPES.MELEE_WEAPON]: MELEE_WEAPON_CHARACTERISTICS,
  [PROFILE_TYPES.RANGED_WEAPON]: RANGED_WEAPON_CHARACTERISTICS,
  [PROFILE_TYPES.MANIFESTATION]: MANIFESTATION_CHARACTERISTICS,
  [PROFILE_TYPES.ABILITY_PASSIVE]: PASSIVE_ABILITY_CHARACTERISTICS,
  [PROFILE_TYPES.ABILITY_ACTIVATED]: ACTIVATED_ABILITY_CHARACTERISTICS,
  [PROFILE_TYPES.ABILITY_SPELL]: SPELL_CHARACTERISTICS,
  [PROFILE_TYPES.ABILITY_PRAYER]: PRAYER_CHARACTERISTICS,
  [PROFILE_TYPES.ABILITY_COMMAND]: COMMAND_ABILITY_CHARACTERISTICS,
} as const;

// ============================================================================
// Profile Type Detection Helpers
// ============================================================================

/**
 * Check if a profile type ID is a weapon profile
 */
export function isWeaponProfileType(typeId: string): boolean {
  return (
    typeId === PROFILE_TYPES.MELEE_WEAPON ||
    typeId === PROFILE_TYPES.RANGED_WEAPON
  );
}

/**
 * Check if a profile type ID is an ability profile
 */
export function isAbilityProfileType(typeId: string): boolean {
  return (ABILITY_PROFILE_TYPE_IDS as readonly string[]).includes(typeId);
}

/**
 * Get the ability type from a profile type ID
 */
export function getAbilityTypeFromProfileId(
  typeId: string
): "passive" | "activated" | "spell" | "prayer" | "command" | "blood_tithe" | null {
  switch (typeId) {
    case PROFILE_TYPES.ABILITY_PASSIVE:
      return "passive";
    case PROFILE_TYPES.ABILITY_ACTIVATED:
      return "activated";
    case PROFILE_TYPES.ABILITY_SPELL:
      return "spell";
    case PROFILE_TYPES.ABILITY_PRAYER:
      return "prayer";
    case PROFILE_TYPES.ABILITY_COMMAND:
      return "command";
    case PROFILE_TYPES.ABILITY_BLOOD_TITHE:
      return "blood_tithe";
    default:
      return null;
  }
}

// ============================================================================
// Faction Detection Helpers
// ============================================================================

/**
 * Detect faction from category link target IDs.
 * Returns the first matching faction ID, or the fallback if none match.
 *
 * @param targetIds - Array of category link targetId values
 * @param fallbackFactionId - Faction ID to return if no match found
 * @returns The detected faction ID (underscore format)
 */
export function detectFactionFromCategoryIds(
  targetIds: string[],
  fallbackFactionId: string
): string {
  for (const targetId of targetIds) {
    const factionId = FACTION_CATEGORY_TO_FACTION_ID[targetId];
    if (factionId && factionId !== fallbackFactionId) {
      return factionId;
    }
  }
  return fallbackFactionId;
}
