/**
 * Ability Mapper
 *
 * Maps BSData ability profiles to aos-data ability schema format.
 */

import type {
  BSProfile,
  BSRule,
  BSModifier,
  BSCondition,
  BSConditionGroup,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic, findAttribute } from "../xml/reader.js";

/**
 * Color values for abilities (from BSData attributes)
 */
export type AbilityColor =
  | "Black"
  | "Blue"
  | "Gray"
  | "Green"
  | "Orange"
  | "Purple"
  | "Red"
  | "Yellow";

/**
 * Category values for abilities (from BSData Type attribute)
 */
export type AbilityCategory =
  | "Offensive"
  | "Defensive"
  | "Movement"
  | "Control"
  | "Special"
  | "Rallying"
  | "Shooting";

/**
 * Condition for modifier output
 */
export interface OutputCondition {
  type: BSCondition["$"]["type"];
  value: string;
  field: string;
  scope?: string;
  childId?: string;
}

/**
 * Condition group with AND/OR logic
 */
export interface OutputConditionGroup {
  logic: "and" | "or";
  conditions?: OutputCondition[];
  groups?: OutputConditionGroup[];
}

/**
 * Modifier in output format
 */
export interface OutputModifier {
  type: BSModifier["$"]["type"];
  field: string;
  value: string;
  conditions?: OutputConditionGroup;
}

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
  color?: AbilityColor;
  abilityCategory?: AbilityCategory;
  modifiers?: OutputModifier[];
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

    // Extract color attribute
    const color = this.extractColor(profile);
    if (color) {
      ability.color = color;
    }

    // Extract ability category (Type attribute)
    const abilityCategory = this.extractAbilityCategory(profile);
    if (abilityCategory) {
      ability.abilityCategory = abilityCategory;
    }

    // Extract modifiers if present
    const modifiers = this.extractModifiers(profile);
    if (modifiers.length > 0) {
      ability.modifiers = modifiers;
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

  private extractColor(profile: BSProfile): AbilityColor | undefined {
    const color = findAttribute(profile, "Color");
    if (!color) return undefined;

    const validColors: AbilityColor[] = [
      "Black",
      "Blue",
      "Gray",
      "Green",
      "Orange",
      "Purple",
      "Red",
      "Yellow",
    ];

    // Handle "Grey" variant
    const normalized = color === "Grey" ? "Gray" : color;
    if (validColors.includes(normalized as AbilityColor)) {
      return normalized as AbilityColor;
    }

    return undefined;
  }

  private extractAbilityCategory(profile: BSProfile): AbilityCategory | undefined {
    // Try "Type" first, then "Parent Node" as fallback
    const category = findAttribute(profile, "Type") || findAttribute(profile, "Parent Node");
    if (!category) return undefined;

    const validCategories: AbilityCategory[] = [
      "Offensive",
      "Defensive",
      "Movement",
      "Control",
      "Special",
      "Rallying",
      "Shooting",
    ];

    if (validCategories.includes(category as AbilityCategory)) {
      return category as AbilityCategory;
    }

    return undefined;
  }

  private extractModifiers(profile: BSProfile): OutputModifier[] {
    if (!profile.modifiers || profile.modifiers.length === 0) {
      return [];
    }

    return profile.modifiers
      .filter((mod) => this.isRelevantModifier(mod))
      .map((mod) => this.mapModifier(mod));
  }

  private isRelevantModifier(mod: BSModifier): boolean {
    const field = mod.$.field.toLowerCase();
    // Filter out visibility/constraint modifiers - keep only game-relevant ones
    // Skip "hidden" field modifiers (visibility)
    // Skip modifiers that look like constraint IDs (usually hex-like strings)
    if (field === "hidden") return false;
    if (/^[a-f0-9-]{8,}$/i.test(mod.$.field)) return false;
    return true;
  }

  private mapModifier(mod: BSModifier): OutputModifier {
    const output: OutputModifier = {
      type: mod.$.type,
      field: mod.$.field,
      value: mod.$.value,
    };

    // Map conditions if present
    if (mod.conditions || mod.conditionGroups) {
      const conditionGroup = this.buildConditionGroup(
        mod.conditions,
        mod.conditionGroups
      );
      if (conditionGroup) {
        output.conditions = conditionGroup;
      }
    }

    return output;
  }

  private buildConditionGroup(
    conditions?: BSCondition[],
    conditionGroups?: BSConditionGroup[]
  ): OutputConditionGroup | undefined {
    const hasConditions = conditions && conditions.length > 0;
    const hasGroups = conditionGroups && conditionGroups.length > 0;

    if (!hasConditions && !hasGroups) {
      return undefined;
    }

    const result: OutputConditionGroup = {
      logic: "and", // Default to AND when combining conditions and groups
    };

    if (hasConditions) {
      result.conditions = conditions!.map((c) => this.mapCondition(c));
    }

    if (hasGroups) {
      result.groups = conditionGroups!
        .map((g) => this.mapConditionGroup(g))
        .filter((g): g is OutputConditionGroup => g !== undefined);
    }

    return result;
  }

  private mapCondition(condition: BSCondition): OutputCondition {
    const output: OutputCondition = {
      type: condition.$.type,
      value: condition.$.value,
      field: condition.$.field,
    };

    if (condition.$.scope) {
      output.scope = condition.$.scope;
    }

    if (condition.$.childId) {
      output.childId = condition.$.childId;
    }

    return output;
  }

  private mapConditionGroup(group: BSConditionGroup): OutputConditionGroup | undefined {
    const hasConditions = group.conditions && group.conditions.length > 0;
    const hasGroups = group.conditionGroups && group.conditionGroups.length > 0;

    if (!hasConditions && !hasGroups) {
      return undefined;
    }

    const result: OutputConditionGroup = {
      logic: group.$.type,
    };

    if (hasConditions) {
      result.conditions = group.conditions!.map((c) => this.mapCondition(c));
    }

    if (hasGroups) {
      result.groups = group.conditionGroups!
        .map((g) => this.mapConditionGroup(g))
        .filter((g): g is OutputConditionGroup => g !== undefined);
    }

    return result;
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
