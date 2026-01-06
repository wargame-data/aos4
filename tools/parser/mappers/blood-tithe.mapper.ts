/**
 * Blood Tithe Ability Mapper
 *
 * Maps BSData Blood Tithe ability profiles to aos-data format.
 * Blood Tithe is a faction mechanic for Blades of Khorne where players
 * accumulate points and spend them to unlock powerful abilities.
 */

import type { BSProfile } from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic, findAttribute } from "../xml/reader.js";
import { toKebabCase } from "../transformers/id.js";

/**
 * Ability color type
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
 * Ability category type
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
 * aos-data Blood Tithe Ability type
 */
export interface BloodTitheAbility {
  $schema?: string;
  id: string;
  name: string;
  faction: "blades-of-khorne";
  bloodTithePoints: number;
  unlockCondition?: string;
  parentAbilityId?: string;
  usedBy?: string;
  timing?: string;
  declare?: string;
  effect: string;
  keywords?: string[];
  color?: AbilityColor;
  abilityCategory?: AbilityCategory;
  _meta?: {
    lastUpdated: string;
    source: string;
  };
}

// Map to track profile IDs to ability IDs for parent resolution
const profileIdToAbilityId = new Map<string, string>();

/**
 * Maps BSData Blood Tithe ability profiles to aos-data format
 */
export class BloodTitheMapper extends BaseMapper<BSProfile, BloodTitheAbility> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(profile: BSProfile): BloodTitheAbility {
    const abilityId = toKebabCase(profile.$.name);

    // Store mapping for parent resolution
    profileIdToAbilityId.set(profile.$.id, abilityId);

    const ability: BloodTitheAbility = {
      $schema: "https://aos-data.org/schema/blood-tithe-ability.schema.json",
      id: abilityId,
      name: profile.$.name,
      faction: "blades-of-khorne",
      bloodTithePoints: this.extractBloodTithePoints(profile),
      effect: this.extractEffect(profile),
      _meta: this.generateMeta(),
    };

    // Optional fields
    const unlockCondition = findCharacteristic(profile, "Unlock Condition");
    if (unlockCondition && unlockCondition.trim() !== "" && unlockCondition !== "-") {
      // Clean up the unlock condition text if it says "already unlocked"
      if (!unlockCondition.toLowerCase().includes("already unlocked")) {
        ability.unlockCondition = this.cleanText(unlockCondition);
      }
    }

    // Extract parent ability from "Parent Node" attribute
    const parentNode = findAttribute(profile, "Parent Node");
    if (parentNode && parentNode.trim() !== "") {
      // The parent node contains a profile ID - we'll resolve it after all profiles are mapped
      // For now, store the raw ID
      ability.parentAbilityId = parentNode;
    }

    const usedBy = findCharacteristic(profile, "Used By");
    if (usedBy && usedBy.trim() !== "" && usedBy !== "-") {
      ability.usedBy = this.cleanText(usedBy);
    }

    const timing = findCharacteristic(profile, "Timing");
    if (timing && timing.trim() !== "") {
      ability.timing = this.cleanText(timing);
    }

    const declare = findCharacteristic(profile, "Declare");
    if (declare && declare.trim() !== "" && declare !== "-") {
      ability.declare = this.cleanText(declare);
    }

    const keywords = this.extractKeywords(profile);
    if (keywords.length > 0) {
      ability.keywords = keywords;
    }

    const color = this.extractColor(profile);
    if (color) {
      ability.color = color;
    }

    const abilityCategory = this.extractAbilityCategory(profile);
    if (abilityCategory) {
      ability.abilityCategory = abilityCategory;
    }

    return ability;
  }

  /**
   * Extract Blood Tithe points cost from the profile
   */
  private extractBloodTithePoints(profile: BSProfile): number {
    const value = findCharacteristic(profile, "Blood Tithe Points");
    if (!value) return 1;

    const num = parseInt(value, 10);
    return isNaN(num) ? 1 : num;
  }

  /**
   * Extract the effect text from the profile
   */
  private extractEffect(profile: BSProfile): string {
    const effect = findCharacteristic(profile, "Effect");
    if (effect) return this.cleanText(effect);

    this.recordUnmapped({
      type: "missing_effect",
      message: "Missing Effect characteristic for Blood Tithe ability",
      location: {
        catalogue: this.options.catalogueName,
        entryName: profile.$.name,
        path: "Effect",
      },
      suggestion: "Check BSData profile for effect text",
    });

    return "";
  }

  /**
   * Extract keywords from the Keywords characteristic
   */
  private extractKeywords(profile: BSProfile): string[] {
    const keywords = findCharacteristic(profile, "Keywords");
    if (!keywords || keywords === "-" || keywords.trim() === "") {
      return [];
    }

    return keywords
      .split(/[,;\n]+/)
      .map((k) => this.cleanText(k).toUpperCase())
      .filter((k) => k.length > 0 && k !== "-");
  }

  /**
   * Extract color attribute
   */
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

  /**
   * Extract ability category from Type attribute
   */
  private extractAbilityCategory(profile: BSProfile): AbilityCategory | undefined {
    const category = findAttribute(profile, "Type");
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

  /**
   * Clean up text by removing BSData formatting markers
   */
  private cleanText(text: string): string {
    return text
      .replace(/\*\*\^\^/g, "") // Remove BSData bold markers start
      .replace(/\^\^\*\*/g, "") // Remove BSData bold markers end
      .replace(/\^\^/g, "") // Remove any remaining markers
      .trim();
  }
}

/**
 * Map multiple blood tithe ability profiles
 */
export function mapBloodTitheAbilities(
  profiles: BSProfile[],
  options: MapperOptions
): BloodTitheAbility[] {
  const mapper = new BloodTitheMapper(options);
  const abilities = profiles.map((p) => mapper.map(p));

  // Resolve parent ability IDs from profile IDs to ability IDs
  for (const ability of abilities) {
    if (ability.parentAbilityId) {
      const resolvedId = profileIdToAbilityId.get(ability.parentAbilityId);
      if (resolvedId) {
        ability.parentAbilityId = resolvedId;
      } else {
        // If we can't resolve, try to convert the ID directly to kebab-case
        // This handles cases where the ID might be a name
        ability.parentAbilityId = toKebabCase(ability.parentAbilityId);
      }
    }
  }

  return abilities;
}

/**
 * Clear the profile ID to ability ID mapping
 * Call this between parsing different catalogues
 */
export function clearBloodTitheMapping(): void {
  profileIdToAbilityId.clear();
}
