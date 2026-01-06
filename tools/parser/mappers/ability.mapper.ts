/**
 * Ability Mapper
 *
 * Maps BSData ability profiles to aos-data ability schema format.
 */

import type { BSProfile, BSRule } from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic } from "../xml/reader.js";

/**
 * aos-data Ability type
 */
export interface Ability {
  name: string;
  type:
    | "passive"
    | "reaction"
    | "once-per-turn"
    | "once-per-battle"
    | "spell"
    | "prayer"
    | "command";
  phase?: "any" | "hero" | "movement" | "shooting" | "charge" | "combat" | "end";
  castingValue?: number;
  chantingValue?: number;
  declare?: string;
  effect: string;
  keywords?: string[];
}

/**
 * Maps BSData ability profiles to aos-data format
 */
export class AbilityMapper extends BaseMapper<BSProfile | BSRule, Ability> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(input: BSProfile | BSRule): Ability {
    if (this.isRule(input)) {
      return this.mapRule(input);
    }
    return this.mapProfile(input);
  }

  private isRule(input: BSProfile | BSRule): input is BSRule {
    return "description" in input;
  }

  private mapRule(rule: BSRule): Ability {
    const description = rule.description?.[0] || "";

    return {
      name: rule.$.name,
      type: "passive", // Rules are typically passive
      effect: description,
    };
  }

  private mapProfile(profile: BSProfile): Ability {
    const typeName = profile.$.typeName.toLowerCase();
    const type = this.determineAbilityType(profile, typeName);

    const ability: Ability = {
      name: profile.$.name,
      type,
      effect: this.extractEffect(profile),
    };

    // Add phase if determinable
    const phase = this.extractPhase(profile);
    if (phase) {
      ability.phase = phase;
    }

    // Add declare text if present
    const declare = this.extractDeclare(profile);
    if (declare) {
      ability.declare = declare;
    }

    // Add casting value for spells
    if (type === "spell") {
      const castingValue = this.extractCastingValue(profile);
      if (castingValue) {
        ability.castingValue = castingValue;
      }
    }

    // Add chanting value for prayers
    if (type === "prayer") {
      const chantingValue = this.extractChantingValue(profile);
      if (chantingValue) {
        ability.chantingValue = chantingValue;
      }
    }

    // Add keywords if present
    const keywords = this.extractKeywords(profile);
    if (keywords.length > 0) {
      ability.keywords = keywords;
    }

    return ability;
  }

  private determineAbilityType(
    profile: BSProfile,
    typeName: string
  ): Ability["type"] {
    // Check profile type name
    if (typeName.includes("spell")) return "spell";
    if (typeName.includes("prayer")) return "prayer";
    if (typeName.includes("command")) return "command";

    // Check timing characteristic
    const timing =
      findCharacteristic(profile, "Timing") ||
      findCharacteristic(profile, "Type") ||
      "";
    const timingLower = timing.toLowerCase();

    if (timingLower.includes("passive")) return "passive";
    if (timingLower.includes("reaction")) return "reaction";
    if (timingLower.includes("once per battle")) return "once-per-battle";
    if (timingLower.includes("once per turn")) return "once-per-turn";
    if (timingLower.includes("command")) return "command";

    // Check for spell/prayer indicators
    if (findCharacteristic(profile, "Casting Value")) return "spell";
    if (findCharacteristic(profile, "Chanting Value")) return "prayer";

    // Default to passive
    return "passive";
  }

  private extractPhase(profile: BSProfile): Ability["phase"] | undefined {
    const timing =
      findCharacteristic(profile, "Timing") ||
      findCharacteristic(profile, "Phase") ||
      "";
    const timingLower = timing.toLowerCase();

    const phaseMappings: Record<string, Ability["phase"]> = {
      "hero phase": "hero",
      "your hero phase": "hero",
      "movement phase": "movement",
      "shooting phase": "shooting",
      "charge phase": "charge",
      "combat phase": "combat",
      "end of turn": "end",
      "end phase": "end",
      any: "any",
    };

    for (const [key, phase] of Object.entries(phaseMappings)) {
      if (timingLower.includes(key)) {
        return phase;
      }
    }

    return undefined;
  }

  private extractEffect(profile: BSProfile): string {
    const effect = findCharacteristic(profile, "Effect");
    if (effect) return effect;

    // Try alternative names
    const description = findCharacteristic(profile, "Description");
    if (description) return description;

    const text = findCharacteristic(profile, "Text");
    if (text) return text;

    // If no effect found, this is an error
    this.recordUnmapped({
      type: "missing_characteristic",
      message: "Missing 'Effect' characteristic for ability",
      location: {
        catalogue: this.options.catalogueName,
        entryName: profile.$.name,
        path: "Effect",
      },
      suggestion: "Check BSData profile for effect/description text",
    });

    return "";
  }

  private extractDeclare(profile: BSProfile): string | undefined {
    const declare = findCharacteristic(profile, "Declare");
    if (declare && declare !== "-" && declare.trim() !== "") {
      return declare;
    }
    return undefined;
  }

  private extractCastingValue(profile: BSProfile): number | undefined {
    const value = findCharacteristic(profile, "Casting Value");
    if (!value) return undefined;

    const num = parseInt(value, 10);
    if (isNaN(num) || num < 2 || num > 12) return undefined;

    return num;
  }

  private extractChantingValue(profile: BSProfile): number | undefined {
    const value = findCharacteristic(profile, "Chanting Value");
    if (!value) return undefined;

    const num = parseInt(value, 10);
    if (isNaN(num) || num < 2 || num > 6) return undefined;

    return num;
  }

  private extractKeywords(profile: BSProfile): string[] {
    const keywords = findCharacteristic(profile, "Keywords");
    if (!keywords || keywords === "-" || keywords.trim() === "") {
      return [];
    }

    return keywords
      .split(/[,;\n]+/)
      .map((k) => k.trim().toUpperCase())
      .filter((k) => k.length > 0 && k !== "-");
  }
}

/**
 * Map multiple ability profiles
 */
export function mapAbilities(
  profiles: (BSProfile | BSRule)[],
  options: MapperOptions
): Ability[] {
  const mapper = new AbilityMapper(options);
  return profiles.map((p) => mapper.map(p));
}

/**
 * Check if a profile is an ability profile
 */
export function isAbilityProfile(profile: BSProfile): boolean {
  const typeName = profile.$.typeName.toLowerCase();
  return (
    typeName.includes("ability") ||
    typeName.includes("spell") ||
    typeName.includes("prayer") ||
    typeName.includes("command")
  );
}

/**
 * Check if a profile is a spell profile
 */
export function isSpellProfile(profile: BSProfile): boolean {
  const typeName = profile.$.typeName.toLowerCase();
  return typeName.includes("spell");
}

/**
 * Check if a profile is a prayer profile
 */
export function isPrayerProfile(profile: BSProfile): boolean {
  const typeName = profile.$.typeName.toLowerCase();
  return typeName.includes("prayer");
}
