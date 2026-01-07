/**
 * Weapon Mapper
 *
 * Maps BSData weapon profiles to aos-data weapon schema format.
 */

import type { BSProfile } from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic } from "../xml/reader.js";
import {
  transformRange,
  transformRollValue,
  transformRend,
} from "../transformers/stats.js";
import { transformDiceValue } from "../transformers/dice.js";

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
    const typeName = profile.$.typeName;
    const isRanged = typeName.toLowerCase().includes("ranged");

    const weapon: Weapon = {
      name: profile.$.name,
      type: isRanged ? "ranged" : "melee",
      attacks: this.extractAttacks(profile),
      hit: this.extractHit(profile),
      wound: this.extractWound(profile),
      rend: this.extractRend(profile),
      damage: this.extractDamage(profile),
    };

    // Add range for ranged weapons
    if (isRanged) {
      weapon.range = this.extractRange(profile);
    }

    // Extract weapon abilities
    const abilities = this.extractAbilities(profile);
    if (abilities.length > 0) {
      weapon.abilities = abilities;
    }

    return weapon;
  }

  private extractAttacks(profile: BSProfile): number | string {
    const value =
      findCharacteristic(profile, "Attacks") ||
      findCharacteristic(profile, "Atk");
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

  private extractHit(profile: BSProfile): string {
    const value =
      findCharacteristic(profile, "To Hit") ||
      findCharacteristic(profile, "Hit");
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

  private extractWound(profile: BSProfile): string {
    const value =
      findCharacteristic(profile, "To Wound") ||
      findCharacteristic(profile, "Wound") ||
      findCharacteristic(profile, "Wnd");
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

  private extractRend(profile: BSProfile): number {
    const value =
      findCharacteristic(profile, "Rend") ||
      findCharacteristic(profile, "Rnd");
    if (!value && value !== "0" && value !== "-") {
      // Rend can legitimately be 0 or "-"
      return 0;
    }
    return transformRend(value);
  }

  private extractDamage(profile: BSProfile): number | string {
    const value =
      findCharacteristic(profile, "Damage") ||
      findCharacteristic(profile, "Dmg");
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
    const value =
      findCharacteristic(profile, "Range") ||
      findCharacteristic(profile, "Rng");
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

  private extractAbilities(profile: BSProfile): string[] {
    const value =
      findCharacteristic(profile, "Ability") ||
      findCharacteristic(profile, "Abilities");

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
 * Check if a profile is a weapon profile
 */
export function isWeaponProfile(profile: BSProfile): boolean {
  const typeName = profile.$.typeName.toLowerCase();
  return typeName.includes("weapon") || typeName.includes("attack");
}
