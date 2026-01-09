/**
 * Enhancement Mapper
 *
 * Maps BSData enhancement entries (artefacts, command traits, mount traits)
 * to the catalog enhancement format.
 */

import type {
  BSProfile,
  BSSelectionEntry,
  BSCatalogue,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic, findAttribute, type CatalogueInfo } from "../xml/reader.js";
import { findEnhancementGroupsWithInfo, buildEnhancementGroupToSubfactionMap } from "../xml/traverser.js";
import { toUnderscoreId, toQualifiedId } from "../transformers/id.js";
import { SCHEMA_URLS } from "../config.js";
import type { Enhancement } from "../../schemas/schemas/enhancement.schema.js";

// Valid colors from BSData
type AbilityColor = "Black" | "Blue" | "Gray" | "Green" | "Orange" | "Purple" | "Red" | "Yellow";

// Valid ability categories from BSData
type AbilityCategory = "Offensive" | "Defensive" | "Movement" | "Control" | "Special" | "Rallying" | "Shooting";

/**
 * Input for enhancement mapping
 */
export interface EnhancementMapperInput {
  entry: BSSelectionEntry;
  profile: BSProfile;
  parentGroupName: string;
  subGroupName: string;
  restrictions?: string;
  /** Subfaction ID if this enhancement belongs to a subfaction */
  subfactionId?: string;
}

/**
 * Maps BSData enhancement entries to catalog format
 */
export class EnhancementMapper extends BaseMapper<EnhancementMapperInput, Enhancement> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(input: EnhancementMapperInput): Enhancement {
    const { entry, profile, parentGroupName, subGroupName, restrictions, subfactionId } = input;

    const name = entry.$.name;
    const bsdataId = entry.$.id;

    // Extract effect text
    const effect = findCharacteristic(profile, "Effect");
    if (!effect) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Enhancement missing Effect characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: name,
          path: "Effect",
        },
      });
    }

    // Build keywords
    const keywords = this.buildKeywords(parentGroupName, subGroupName, subfactionId);

    // Parse requirements from restrictions text
    const requirements = this.parseRequirements(restrictions);

    // Build the enhancement object
    const enhancement: Enhancement = {
      $schema: SCHEMA_URLS.enhancement,
      id: toQualifiedId("enhancement", this.options.factionId, name),
      bsdataId,
      type: "enhancement",
      name,
      keywords,
      effect: effect || "",
      _meta: this.generateMeta(),
    };

    // Add optional fields
    if (requirements && (requirements.targetRequiresKeywords || requirements.targetForbidsKeywords)) {
      enhancement.requirements = requirements;
    }

    const timing = findCharacteristic(profile, "Timing");
    if (timing && timing !== "-" && timing.trim() !== "") {
      enhancement.timing = timing;
    }

    const declare = findCharacteristic(profile, "Declare");
    if (declare && declare !== "-" && declare.trim() !== "") {
      enhancement.declare = declare;
    }

    const color = this.extractColor(profile);
    if (color) {
      enhancement.color = color;
    }

    const category = this.extractAbilityCategory(profile);
    if (category) {
      enhancement.abilityCategory = category;
    }

    return enhancement;
  }

  /**
   * Build keywords from group names
   */
  private buildKeywords(parentGroupName: string, subGroupName: string, subfactionId?: string): string[] {
    const keywords: string[] = [];

    // Determine enhancement type from parent/sub group name
    const enhancementType = this.determineEnhancementType(parentGroupName, subGroupName);
    keywords.push(enhancementType);

    // Add faction keyword
    keywords.push(`faction:${this.options.factionId}`);

    // Add subfaction keyword if applicable
    if (subfactionId) {
      keywords.push(`subfaction:${subfactionId}`);
    }

    return keywords;
  }

  /**
   * Determine enhancement type keyword from group names
   */
  private determineEnhancementType(parentGroupName: string, subGroupName: string): string {
    const combined = `${parentGroupName} ${subGroupName}`.toLowerCase();

    // Artefacts
    if (
      combined.includes("artefact") ||
      combined.includes("relic") ||
      combined.includes("treasure") ||
      combined.includes("heirloom") ||
      combined.includes("plunder") ||
      combined.includes("device") ||
      combined.includes("machiner") ||
      combined.includes("invention") ||
      combined.includes("gift") ||
      combined.includes("boon") ||
      combined.includes("blessing") && !combined.includes("trait")
    ) {
      return "artefact";
    }

    // Mount/Monstrous traits
    if (
      combined.includes("monstrous trait") ||
      combined.includes("mount trait") ||
      combined.includes("bond-beast") ||
      combined.includes("beast trait") ||
      combined.includes("endless hunger")
    ) {
      return "mount_trait";
    }

    // Command traits (heroic traits)
    if (
      combined.includes("heroic trait") ||
      combined.includes("command trait") ||
      combined.includes("aspect") ||
      combined.includes("warlord") ||
      combined.includes("leader") ||
      combined.includes("lord") ||
      combined.includes("commander") ||
      combined.includes("overlord") ||
      combined.includes("tyrant") ||
      combined.includes("big name") ||
      combined.includes("title")
    ) {
      return "command_trait";
    }

    // Faction-specific types
    if (combined.includes("ensorcelled banner")) {
      return "ensorcelled_banner";
    }

    if (combined.includes("endrinwork")) {
      return "endrinwork";
    }

    if (combined.includes("warbeat") || combined.includes("prayer") || combined.includes("rite")) {
      return "prayer";
    }

    // Default to artefact for unknowns
    return "artefact";
  }

  /**
   * Parse requirements from restriction text
   * Looks for patterns like **^^Hero^^** only
   */
  private parseRequirements(restrictions?: string): { targetRequiresKeywords?: string[]; targetForbidsKeywords?: string[] } | undefined {
    // Handle undefined, null, or non-string restrictions
    if (!restrictions || typeof restrictions !== "string") {
      return undefined;
    }

    const requirements: { targetRequiresKeywords?: string[]; targetForbidsKeywords?: string[] } = {};

    // Pattern to match **^^keyword^^**
    const keywordPattern = /\*\*\^\^([^*^]+)\^\^\*\*/g;
    const matches = [...restrictions.matchAll(keywordPattern)];

    if (matches.length > 0) {
      requirements.targetRequiresKeywords = matches
        .map((m) => toUnderscoreId(m[1].trim()))
        .filter((k) => k.length > 0);
    }

    // Check for "not" or "except" patterns for forbidden keywords
    const lowerRestrictions = restrictions.toLowerCase();
    if (lowerRestrictions.includes("not") || lowerRestrictions.includes("except")) {
      // Look for unique restriction
      if (lowerRestrictions.includes("unique")) {
        requirements.targetForbidsKeywords = requirements.targetForbidsKeywords || [];
        if (!requirements.targetForbidsKeywords.includes("unique")) {
          requirements.targetForbidsKeywords.push("unique");
        }
      }
    }

    // Most enhancements implicitly forbid unique heroes
    // Only add if we found required keywords (meaning there are restrictions)
    if (requirements.targetRequiresKeywords && requirements.targetRequiresKeywords.length > 0) {
      // Check if restrictions mention anything about unique
      if (!lowerRestrictions.includes("unique")) {
        // Implicitly add unique to forbidden if hero is required
        if (requirements.targetRequiresKeywords.includes("hero")) {
          requirements.targetForbidsKeywords = requirements.targetForbidsKeywords || [];
          if (!requirements.targetForbidsKeywords.includes("unique")) {
            requirements.targetForbidsKeywords.push("unique");
          }
        }
      }
    }

    return requirements;
  }

  /**
   * Extract color attribute
   */
  private extractColor(profile: BSProfile): AbilityColor | undefined {
    const color = findAttribute(profile, "Color");
    if (!color) return undefined;

    const validColors: AbilityColor[] = [
      "Black", "Blue", "Gray", "Green", "Orange", "Purple", "Red", "Yellow",
    ];

    const normalized = color === "Grey" ? "Gray" : color;
    if (validColors.includes(normalized as AbilityColor)) {
      return normalized as AbilityColor;
    }

    return undefined;
  }

  /**
   * Extract ability category attribute
   */
  private extractAbilityCategory(profile: BSProfile): AbilityCategory | undefined {
    const category = findAttribute(profile, "Type") || findAttribute(profile, "Parent Node");
    if (!category) return undefined;

    const validCategories: AbilityCategory[] = [
      "Offensive", "Defensive", "Movement", "Control", "Special", "Rallying", "Shooting",
    ];

    if (validCategories.includes(category as AbilityCategory)) {
      return category as AbilityCategory;
    }

    return undefined;
  }
}

/**
 * Extract faction ID from keywords
 */
function extractFactionFromKeywords(keywords: string[]): string | undefined {
  for (const keyword of keywords) {
    if (keyword.startsWith("faction:")) {
      return keyword.substring(8);
    }
  }
  return undefined;
}

/**
 * Map all enhancements from a catalogue
 */
export function mapEnhancements(
  catalogue: BSCatalogue,
  options: MapperOptions,
  catalogueInfoMap?: Map<string, CatalogueInfo>
): Enhancement[] {
  const enhancementGroups = findEnhancementGroupsWithInfo(catalogue);
  const groupToSubfactionMap = buildEnhancementGroupToSubfactionMap(catalogue);
  const mapper = new EnhancementMapper(options);
  const enhancements: Enhancement[] = [];
  const seenIds = new Set<string>();

  for (const groupInfo of enhancementGroups) {
    const { parentGroupName, subGroupName, subGroupId, restrictions, entries } = groupInfo;

    // Determine if this group belongs to a subfaction
    let subfactionId: string | undefined;
    if (catalogueInfoMap) {
      const catalogueId = groupToSubfactionMap.get(subGroupId);
      if (catalogueId) {
        const catalogueInfo = catalogueInfoMap.get(catalogueId);
        if (catalogueInfo?.isSubfaction && catalogueInfo.subfactionName) {
          subfactionId = toUnderscoreId(catalogueInfo.subfactionName);
        }
      }
    }

    for (const entry of entries) {
      // Skip hidden entries
      if (entry.$.hidden === "true") {
        continue;
      }

      // Find the ability profile
      const profile = entry.profiles?.find((p) =>
        p.$.typeName?.toLowerCase().includes("ability")
      );

      if (!profile) {
        // Some entries might not have profiles, skip them
        continue;
      }

      try {
        const enhancement = mapper.map({
          entry,
          profile,
          parentGroupName,
          subGroupName,
          restrictions,
          subfactionId,
        });

        // Avoid duplicates (same BSData ID)
        if (!seenIds.has(enhancement.bsdataId)) {
          seenIds.add(enhancement.bsdataId);
          enhancements.push(enhancement);
        }
      } catch (error) {
        // Log error but continue processing
        console.error(`Error mapping enhancement ${entry.$.name}:`, error);
      }
    }
  }

  return enhancements;
}

/**
 * Get the faction ID for an enhancement (for output path)
 */
export function getEnhancementFaction(enhancement: Enhancement): string {
  const factionKeyword = enhancement.keywords.find((k) => k.startsWith("faction:"));
  if (factionKeyword) {
    return factionKeyword.substring(8);
  }

  // Fallback: extract from ID
  const parts = enhancement.id.split(".");
  if (parts.length >= 2) {
    return parts[1];
  }

  return "shared";
}

/**
 * Get the subfaction ID for an enhancement (for output path)
 * Returns undefined if the enhancement doesn't belong to a subfaction
 */
export function getEnhancementSubfaction(enhancement: Enhancement): string | undefined {
  const subfactionKeyword = enhancement.keywords.find((k) => k.startsWith("subfaction:"));
  if (subfactionKeyword) {
    return subfactionKeyword.substring(11);
  }
  return undefined;
}
