/**
 * Weapon Mapper
 *
 * Maps BSData weapon profiles to aos-data weapon schema format.
 * Uses profile type IDs from the GST file for reliable detection.
 */

import type { BSProfile } from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic, findCharacteristicById } from "../xml/reader.js";
import {
  transformRange,
  transformRollValue,
  transformRend,
} from "../transformers/stats.js";
import { transformDiceValue } from "../transformers/dice.js";
import {
  PROFILE_TYPES,
  MELEE_WEAPON_CHARACTERISTICS,
  RANGED_WEAPON_CHARACTERISTICS,
} from "../xml/gst-ids.js";

/**
 * aos-data Weapon type
 */
export interface Weapon {
  name: string;
  type: "melee" | "ranged";
  range?: string;
  attacks: number | string;
  hit: string;
  wound: string;
  rend: number;
  damage: number | string;
  abilities?: string[];
}

/**
 * Maps BSData weapon profiles to aos-data format
 */
export class WeaponMapper extends BaseMapper<BSProfile, Weapon> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(profile: BSProfile): Weapon {
    // Use typeId for reliable detection instead of typeName
    const isRanged = profile.$.typeId === PROFILE_TYPES.RANGED_WEAPON;
    const isMelee = profile.$.typeId === PROFILE_TYPES.MELEE_WEAPON;

    // Fallback to name-based detection if typeId doesn't match
    const typeByName = !isMelee && !isRanged
      ? profile.$.typeName.toLowerCase().includes("ranged")
      : isRanged;

    const weapon: Weapon = {
      name: profile.$.name,
      type: typeByName ? "ranged" : "melee",
      attacks: this.extractAttacks(profile, typeByName),
      hit: this.extractHit(profile, typeByName),
      wound: this.extractWound(profile, typeByName),
      rend: this.extractRend(profile, typeByName),
      damage: this.extractDamage(profile, typeByName),
    };

    // Add range for ranged weapons
    if (typeByName) {
      weapon.range = this.extractRange(profile);
    }

    // Extract weapon abilities
    const abilities = this.extractAbilities(profile, typeByName);
    if (abilities.length > 0) {
      weapon.abilities = abilities;
    }

    return weapon;
  }

  private extractAttacks(profile: BSProfile, isRanged: boolean): number | string {
    // Try ID-based extraction first
    const charId = isRanged
      ? RANGED_WEAPON_CHARACTERISTICS.ATK
      : MELEE_WEAPON_CHARACTERISTICS.ATK;
    let value = findCharacteristicById(profile, charId);

    // Fallback to name-based extraction
    if (!value) {
      value = findCharacteristic(profile, "Attacks") ||
        findCharacteristic(profile, "Atk");
    }

    if (!value) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Missing 'Attacks' characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Attacks",
        },
        suggestion: "Check BSData profile for attacks value",
      });
      return 1;
    }
    return transformDiceValue(value);
  }

  private extractHit(profile: BSProfile, isRanged: boolean): string {
    // Try ID-based extraction first
    const charId = isRanged
      ? RANGED_WEAPON_CHARACTERISTICS.HIT
      : MELEE_WEAPON_CHARACTERISTICS.HIT;
    let value = findCharacteristicById(profile, charId);

    // Fallback to name-based extraction
    if (!value) {
      value = findCharacteristic(profile, "To Hit") ||
        findCharacteristic(profile, "Hit");
    }

    if (!value) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Missing 'To Hit' characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "To Hit",
        },
        suggestion: "Check BSData profile for hit value",
      });
      return "4+";
    }
    return transformRollValue(value);
  }

  private extractWound(profile: BSProfile, isRanged: boolean): string {
    // Try ID-based extraction first
    const charId = isRanged
      ? RANGED_WEAPON_CHARACTERISTICS.WND
      : MELEE_WEAPON_CHARACTERISTICS.WND;
    let value = findCharacteristicById(profile, charId);

    // Fallback to name-based extraction
    if (!value) {
      value = findCharacteristic(profile, "To Wound") ||
        findCharacteristic(profile, "Wound") ||
        findCharacteristic(profile, "Wnd");
    }

    if (!value) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Missing 'To Wound' characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "To Wound",
        },
        suggestion: "Check BSData profile for wound value",
      });
      return "4+";
    }
    return transformRollValue(value);
  }

  private extractRend(profile: BSProfile, isRanged: boolean): number {
    // Try ID-based extraction first
    const charId = isRanged
      ? RANGED_WEAPON_CHARACTERISTICS.RND
      : MELEE_WEAPON_CHARACTERISTICS.RND;
    let value = findCharacteristicById(profile, charId);

    // Fallback to name-based extraction
    if (!value) {
      value = findCharacteristic(profile, "Rend") ||
        findCharacteristic(profile, "Rnd");
    }

    if (!value && value !== "0" && value !== "-") {
      // Rend can legitimately be 0 or "-"
      return 0;
    }
    return transformRend(value);
  }

  private extractDamage(profile: BSProfile, isRanged: boolean): number | string {
    // Try ID-based extraction first
    const charId = isRanged
      ? RANGED_WEAPON_CHARACTERISTICS.DMG
      : MELEE_WEAPON_CHARACTERISTICS.DMG;
    let value = findCharacteristicById(profile, charId);

    // Fallback to name-based extraction
    if (!value) {
      value = findCharacteristic(profile, "Damage") ||
        findCharacteristic(profile, "Dmg");
    }

    if (!value) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Missing 'Damage' characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Damage",
        },
        suggestion: "Check BSData profile for damage value",
      });
      return 1;
    }
    return transformDiceValue(value);
  }

  private extractRange(profile: BSProfile): string {
    // Try ID-based extraction first (only for ranged weapons)
    let value = findCharacteristicById(profile, RANGED_WEAPON_CHARACTERISTICS.RNG);

    // Fallback to name-based extraction
    if (!value) {
      value = findCharacteristic(profile, "Range") ||
        findCharacteristic(profile, "Rng");
    }

    if (!value) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Missing 'Range' characteristic for ranged weapon",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Range",
        },
        suggestion: "Check BSData profile for range value",
      });
      return '12"';
    }
    return transformRange(value);
  }

  private extractAbilities(profile: BSProfile, isRanged: boolean): string[] {
    // Try ID-based extraction first
    const charId = isRanged
      ? RANGED_WEAPON_CHARACTERISTICS.ABILITY
      : MELEE_WEAPON_CHARACTERISTICS.ABILITY;
    let value = findCharacteristicById(profile, charId);

    // Fallback to name-based extraction
    if (!value) {
      value = findCharacteristic(profile, "Ability") ||
        findCharacteristic(profile, "Abilities");
    }

    if (!value || value === "-" || value === "–" || value.trim() === "") {
      return [];
    }

    // Split by comma, semicolon, or newline
    return value
      .split(/[,;\n]+/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && a !== "-");
  }
}

/**
 * Map multiple weapon profiles
 */
export function mapWeapons(
  profiles: BSProfile[],
  options: MapperOptions
): Weapon[] {
  const mapper = new WeaponMapper(options);
  return profiles.map((p) => mapper.map(p));
}

/**
 * Check if a profile is a weapon profile using type ID.
 * Falls back to name-based detection if typeId doesn't match.
 */
export function isWeaponProfile(profile: BSProfile): boolean {
  // Primary: Check by typeId
  if (
    profile.$.typeId === PROFILE_TYPES.MELEE_WEAPON ||
    profile.$.typeId === PROFILE_TYPES.RANGED_WEAPON
  ) {
    return true;
  }

  // Fallback: Check by typeName for backwards compatibility
  const typeName = profile.$.typeName.toLowerCase();
  return typeName.includes("weapon") || typeName.includes("attack");
}

/**
 * Check if a profile is a melee weapon profile using type ID.
 */
export function isMeleeWeaponProfile(profile: BSProfile): boolean {
  return profile.$.typeId === PROFILE_TYPES.MELEE_WEAPON;
}

/**
 * Check if a profile is a ranged weapon profile using type ID.
 */
export function isRangedWeaponProfile(profile: BSProfile): boolean {
  return profile.$.typeId === PROFILE_TYPES.RANGED_WEAPON;
}
