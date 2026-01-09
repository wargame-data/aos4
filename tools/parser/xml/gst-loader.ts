/**
 * GST Loader
 *
 * Loads the Age of Sigmar 4.0.gst game system file and extracts all IDs.
 * Provides runtime validation that our defined constants match the actual GST.
 */

import { parseGst } from "./reader.js";
import type { BSGameSystem } from "./types.js";
import {
  PROFILE_TYPES,
  CATEGORIES,
  UNIT_CHARACTERISTICS,
  MELEE_WEAPON_CHARACTERISTICS,
  RANGED_WEAPON_CHARACTERISTICS,
  MANIFESTATION_CHARACTERISTICS,
  PASSIVE_ABILITY_CHARACTERISTICS,
  ACTIVATED_ABILITY_CHARACTERISTICS,
  SPELL_CHARACTERISTICS,
  PRAYER_CHARACTERISTICS,
  COMMAND_ABILITY_CHARACTERISTICS,
} from "./gst-ids.js";

/**
 * Extracted IDs from the GST file
 */
export interface GstIds {
  /** Map of profile type ID -> name */
  profileTypes: Map<string, string>;
  /** Map of category ID -> name */
  categories: Map<string, string>;
  /** Map of profile type ID -> (characteristic ID -> name) */
  characteristics: Map<string, Map<string, string>>;
  /** The raw parsed GST for advanced queries */
  raw: BSGameSystem;
}

/**
 * Validation result
 */
export interface GstValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Load and extract all IDs from the GST file
 */
export async function loadGstIds(gstPath: string): Promise<GstIds> {
  const gst = await parseGst(gstPath);

  const profileTypes = new Map<string, string>();
  const categories = new Map<string, string>();
  const characteristics = new Map<string, Map<string, string>>();

  // Extract profile types and their characteristics
  if (gst.profileTypes) {
    for (const profileType of gst.profileTypes) {
      const id = profileType.$.id;
      const name = profileType.$.name;
      profileTypes.set(id, name);

      // Extract characteristic types for this profile type
      const charMap = new Map<string, string>();
      if (profileType.characteristicTypes) {
        for (const charType of profileType.characteristicTypes) {
          charMap.set(charType.$.id, charType.$.name);
        }
      }
      characteristics.set(id, charMap);
    }
  }

  // Extract category entries
  if (gst.categoryEntries) {
    for (const category of gst.categoryEntries) {
      categories.set(category.$.id, category.$.name);
    }
  }

  return {
    profileTypes,
    categories,
    characteristics,
    raw: gst,
  };
}

/**
 * Validate that our defined constants match the actual GST
 */
export function validateGstIds(gstIds: GstIds): GstValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate profile type IDs
  validateProfileTypes(gstIds, errors, warnings);

  // Validate category IDs
  validateCategories(gstIds, errors, warnings);

  // Validate characteristic IDs
  validateCharacteristics(gstIds, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate profile type IDs
 */
function validateProfileTypes(
  gstIds: GstIds,
  errors: string[],
  warnings: string[]
): void {
  const profileTypeEntries = Object.entries(PROFILE_TYPES) as [string, string][];

  for (const [key, expectedId] of profileTypeEntries) {
    const actualName = gstIds.profileTypes.get(expectedId);

    if (!actualName) {
      errors.push(
        `Profile type ${key} (${expectedId}) not found in GST`
      );
    }
  }

  // Check for profile types in GST that we don't have constants for
  for (const [id, name] of gstIds.profileTypes) {
    const hasConstant = Object.values(PROFILE_TYPES).includes(id as typeof PROFILE_TYPES[keyof typeof PROFILE_TYPES]);
    if (!hasConstant) {
      warnings.push(
        `GST profile type "${name}" (${id}) has no constant defined`
      );
    }
  }
}

/**
 * Validate category IDs
 */
function validateCategories(
  gstIds: GstIds,
  errors: string[],
  warnings: string[]
): void {
  // Validate main category IDs
  const categoryEntries = Object.entries(CATEGORIES) as [string, string][];

  for (const [key, expectedId] of categoryEntries) {
    // Skip wizard and priest levels for now - they may have different IDs in different versions
    if (key.startsWith("WIZARD_") || key.startsWith("PRIEST_")) {
      // Just check if the ID exists
      if (!gstIds.categories.has(expectedId)) {
        warnings.push(
          `Category ${key} (${expectedId}) not found in GST - may have different ID`
        );
      }
      continue;
    }

    const actualName = gstIds.categories.get(expectedId);
    if (!actualName) {
      errors.push(
        `Category ${key} (${expectedId}) not found in GST`
      );
    }
  }
}

/**
 * Validate characteristic IDs for each profile type
 */
function validateCharacteristics(
  gstIds: GstIds,
  errors: string[],
  warnings: string[]
): void {
  // Validate Unit characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.UNIT,
    UNIT_CHARACTERISTICS,
    "UNIT_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Melee Weapon characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.MELEE_WEAPON,
    MELEE_WEAPON_CHARACTERISTICS,
    "MELEE_WEAPON_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Ranged Weapon characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.RANGED_WEAPON,
    RANGED_WEAPON_CHARACTERISTICS,
    "RANGED_WEAPON_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Manifestation characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.MANIFESTATION,
    MANIFESTATION_CHARACTERISTICS,
    "MANIFESTATION_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Passive Ability characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.ABILITY_PASSIVE,
    PASSIVE_ABILITY_CHARACTERISTICS,
    "PASSIVE_ABILITY_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Activated Ability characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.ABILITY_ACTIVATED,
    ACTIVATED_ABILITY_CHARACTERISTICS,
    "ACTIVATED_ABILITY_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Spell characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.ABILITY_SPELL,
    SPELL_CHARACTERISTICS,
    "SPELL_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Prayer characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.ABILITY_PRAYER,
    PRAYER_CHARACTERISTICS,
    "PRAYER_CHARACTERISTICS",
    errors,
    warnings
  );

  // Validate Command Ability characteristics
  validateCharacteristicSet(
    gstIds,
    PROFILE_TYPES.ABILITY_COMMAND,
    COMMAND_ABILITY_CHARACTERISTICS,
    "COMMAND_ABILITY_CHARACTERISTICS",
    errors,
    warnings
  );
}

/**
 * Validate a set of characteristic IDs for a specific profile type
 */
function validateCharacteristicSet(
  gstIds: GstIds,
  profileTypeId: string,
  characteristicSet: Record<string, string>,
  setName: string,
  errors: string[],
  warnings: string[]
): void {
  const charMap = gstIds.characteristics.get(profileTypeId);

  if (!charMap) {
    errors.push(
      `Profile type ${profileTypeId} not found in GST for ${setName} validation`
    );
    return;
  }

  for (const [key, expectedId] of Object.entries(characteristicSet)) {
    const actualName = charMap.get(expectedId);
    if (!actualName) {
      errors.push(
        `${setName}.${key} (${expectedId}) not found in GST profile type ${profileTypeId}`
      );
    }
  }

  // Check for characteristics in GST that we don't have constants for
  for (const [id, name] of charMap) {
    const hasConstant = Object.values(characteristicSet).includes(id);
    if (!hasConstant) {
      warnings.push(
        `GST characteristic "${name}" (${id}) in profile type ${profileTypeId} has no constant in ${setName}`
      );
    }
  }
}

/**
 * Get the name of a profile type by ID
 */
export function getProfileTypeName(gstIds: GstIds, typeId: string): string | undefined {
  return gstIds.profileTypes.get(typeId);
}

/**
 * Get the name of a category by ID
 */
export function getCategoryName(gstIds: GstIds, categoryId: string): string | undefined {
  return gstIds.categories.get(categoryId);
}

/**
 * Get the name of a characteristic by profile type ID and characteristic ID
 */
export function getCharacteristicName(
  gstIds: GstIds,
  profileTypeId: string,
  characteristicId: string
): string | undefined {
  const charMap = gstIds.characteristics.get(profileTypeId);
  return charMap?.get(characteristicId);
}

/**
 * Print a summary of the GST IDs for debugging
 */
export function printGstIdsSummary(gstIds: GstIds): void {
  console.log("\n=== GST IDs Summary ===\n");

  console.log(`Profile Types: ${gstIds.profileTypes.size}`);
  for (const [id, name] of gstIds.profileTypes) {
    const charCount = gstIds.characteristics.get(id)?.size ?? 0;
    console.log(`  ${name}: ${id} (${charCount} characteristics)`);
  }

  console.log(`\nCategories: ${gstIds.categories.size}`);
  for (const [id, name] of gstIds.categories) {
    console.log(`  ${name}: ${id}`);
  }
}

/**
 * Print validation results
 */
export function printValidationResult(result: GstValidationResult): void {
  if (result.valid) {
    console.log("GST ID validation: PASSED");
  } else {
    console.log("GST ID validation: FAILED");
  }

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
  }
}
