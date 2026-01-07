/**
 * Enhancement Mapper
 *
 * Maps BSData Heroic Traits and Artefacts of Power to aos-data format.
 */

import type {
  BSCatalogue,
  BSSelectionEntry,
  BSSelectionEntryGroup,
  BSRule,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { AbilityMapper, type Ability } from "./ability.mapper.js";
import { toKebabCase } from "../transformers/id.js";
import {
  findHeroicTraitGroups,
  findArtefactGroups,
  findEnhancementGroups,
  getEntriesFromGroup,
  isHidden,
  getPointsCost,
  ENHANCEMENT_CATEGORIES,
} from "../xml/traverser.js";

/**
 * Enhancement type - now a flexible string to support all enhancement categories
 * Examples: "heroic-trait", "artefact", "great-endrinworks", "big-names", etc.
 */
export type EnhancementType = string;

/**
 * Individual enhancement entry
 */
export interface Enhancement {
  name: string;
  restrictions?: string;
  ability: Ability;
  points?: number;
}

/**
 * Collection of enhancements of a specific type
 */
export interface EnhancementCollection {
  $schema?: string;
  id: string;
  name: string;
  faction: string;
  type: EnhancementType;
  enhancements: Enhancement[];
  _meta: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Input for enhancement mapping
 */
export interface EnhancementInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
  groupName?: string;
}

/**
 * Maps BSData enhancement entries to aos-data format
 */
export class EnhancementMapper extends BaseMapper<EnhancementInput, Enhancement> {
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: EnhancementInput): Enhancement {
    const { entry } = input;

    const enhancement: Enhancement = {
      name: entry.$.name,
      ability: this.extractAbility(entry),
    };

    // Extract restrictions from rules
    const restrictions = this.extractRestrictions(entry);
    if (restrictions) {
      enhancement.restrictions = restrictions;
    }

    // Extract points cost if present
    const points = getPointsCost(entry);
    if (points > 0) {
      enhancement.points = points;
    }

    return enhancement;
  }

  private extractAbility(entry: BSSelectionEntry): Ability {
    // First profile that's an ability
    if (entry.profiles && entry.profiles.length > 0) {
      for (const profile of entry.profiles) {
        if (!profile || !profile.$) continue;

        const typeName = profile.$.typeName?.toLowerCase() || "";
        if (typeName.includes("ability")) {
          return this.abilityMapper.map(profile);
        }
      }
    }

    // If no ability profile, create a minimal ability
    return {
      name: entry.$.name,
      type: "passive",
      effect: "",
    };
  }

  private extractRestrictions(entry: BSSelectionEntry): string | undefined {
    // Look for rules with restriction info
    if (entry.rules) {
      for (const rule of entry.rules) {
        if (!rule || !rule.$) continue;

        const name = rule.$.name?.toLowerCase() || "";
        if (name.includes("restriction") || name.includes("requirement")) {
          const description = rule.description?.[0] || "";
          if (description) {
            return description;
          }
        }
      }
    }

    // Check parent group for restrictions
    return undefined;
  }
}

/**
 * Extract all heroic traits from a catalogue
 */
export function mapHeroicTraits(
  catalogue: BSCatalogue,
  options: MapperOptions
): EnhancementCollection | null {
  const heroicTraitGroups = findHeroicTraitGroups(catalogue);

  if (heroicTraitGroups.length === 0) {
    return null;
  }

  const mapper = new EnhancementMapper(options);
  const enhancements: Enhancement[] = [];

  for (const group of heroicTraitGroups) {
    // Get entries from the group (including nested sub-groups)
    const entries = collectEnhancementEntries(group);

    for (const entry of entries) {
      if (isHidden(entry)) continue;
      if (!entry.profiles || entry.profiles.length === 0) continue;

      try {
        const enhancement = mapper.map({ entry, catalogue, groupName: group.$.name });
        enhancements.push(enhancement);
      } catch (error) {
        console.error(`Failed to map heroic trait ${entry.$.name}: ${error}`);
      }
    }
  }

  if (enhancements.length === 0) {
    return null;
  }

  return {
    $schema: "https://aos-data.org/schema/enhancement.schema.json",
    id: "heroic-traits",
    name: "Heroic Traits",
    faction: options.factionId,
    type: "heroic-trait",
    enhancements,
    _meta: {
      lastUpdated: new Date().toISOString().split("T")[0],
      source: "BSData import",
    },
  };
}

/**
 * Extract all artefacts of power from a catalogue
 */
export function mapArtefactsOfPower(
  catalogue: BSCatalogue,
  options: MapperOptions
): EnhancementCollection | null {
  const artefactGroups = findArtefactGroups(catalogue);

  if (artefactGroups.length === 0) {
    return null;
  }

  const mapper = new EnhancementMapper(options);
  const enhancements: Enhancement[] = [];

  for (const group of artefactGroups) {
    // Get entries from the group (including nested sub-groups)
    const entries = collectEnhancementEntries(group);

    for (const entry of entries) {
      if (isHidden(entry)) continue;
      if (!entry.profiles || entry.profiles.length === 0) continue;

      try {
        const enhancement = mapper.map({ entry, catalogue, groupName: group.$.name });
        enhancements.push(enhancement);
      } catch (error) {
        console.error(`Failed to map artefact ${entry.$.name}: ${error}`);
      }
    }
  }

  if (enhancements.length === 0) {
    return null;
  }

  return {
    $schema: "https://aos-data.org/schema/enhancement.schema.json",
    id: "artefacts-of-power",
    name: "Artefacts of Power",
    faction: options.factionId,
    type: "artefact",
    enhancements,
    _meta: {
      lastUpdated: new Date().toISOString().split("T")[0],
      source: "BSData import",
    },
  };
}

/**
 * Collect all enhancement entries from a group, including nested groups.
 * Enhancement groups often have sub-groups for different enhancement categories.
 */
function collectEnhancementEntries(group: BSSelectionEntryGroup): BSSelectionEntry[] {
  const entries: BSSelectionEntry[] = [];

  // Direct entries
  if (group.selectionEntries) {
    entries.push(...group.selectionEntries);
  }

  // Nested groups (e.g., "Aspects of Azyr" sub-groups)
  if (group.selectionEntryGroups) {
    for (const nestedGroup of group.selectionEntryGroups) {
      entries.push(...collectEnhancementEntries(nestedGroup));
    }
  }

  return entries;
}

/**
 * Get restriction text from an enhancement group's rules
 */
export function getGroupRestrictions(group: BSSelectionEntryGroup): string | undefined {
  if (!group.rules || group.rules.length === 0) {
    return undefined;
  }

  for (const rule of group.rules) {
    if (!rule || !rule.$) continue;

    const name = rule.$.name?.toLowerCase() || "";
    if (name.includes("restriction") || name.includes("requirement")) {
      return rule.description?.[0];
    }
  }

  return undefined;
}

/**
 * Extract the base category name from a potentially faction-suffixed name.
 * E.g., "Heroic Traits: Stormcast Eternals" -> "Heroic Traits"
 *       "Great Endrinworks" -> "Great Endrinworks"
 */
function extractBaseCategoryName(groupName: string): string {
  // Check if this matches any known category with a faction suffix
  for (const category of ENHANCEMENT_CATEGORIES) {
    if (groupName.toLowerCase().startsWith(category.toLowerCase())) {
      return category;
    }
  }
  // Return as-is if no match (shouldn't happen with our whitelist)
  return groupName.split(":")[0].trim();
}

/**
 * Convert a category name to its type ID (kebab-case).
 * E.g., "Heroic Traits" -> "heroic-traits"
 *       "Artefacts of Power" -> "artefacts-of-power"
 *       "Great Endrinworks" -> "great-endrinworks"
 */
function categoryNameToType(categoryName: string): string {
  // Special cases for backward compatibility
  if (categoryName.toLowerCase() === "heroic traits") {
    return "heroic-trait";
  }
  if (categoryName.toLowerCase() === "artefacts of power") {
    return "artefact";
  }
  // Convert to kebab-case
  return toKebabCase(categoryName);
}

/**
 * Convert a category name to its file ID (kebab-case, plural form where appropriate).
 * E.g., "Heroic Traits" -> "heroic-traits"
 *       "Artefacts of Power" -> "artefacts-of-power"
 *       "Great Endrinworks" -> "great-endrinworks"
 */
function categoryNameToId(categoryName: string): string {
  return toKebabCase(categoryName);
}

/**
 * Map a single enhancement category group to an EnhancementCollection.
 */
function mapEnhancementCategory(
  catalogue: BSCatalogue,
  group: BSSelectionEntryGroup,
  options: MapperOptions
): EnhancementCollection | null {
  const mapper = new EnhancementMapper(options);
  const enhancements: Enhancement[] = [];

  // Get entries from the group (including nested sub-groups)
  const entries = collectEnhancementEntries(group);

  for (const entry of entries) {
    if (isHidden(entry)) continue;
    if (!entry.profiles || entry.profiles.length === 0) continue;

    try {
      const enhancement = mapper.map({ entry, catalogue, groupName: group.$.name });
      enhancements.push(enhancement);
    } catch (error) {
      const baseName = extractBaseCategoryName(group.$.name);
      console.error(`Failed to map ${baseName} enhancement ${entry.$.name}: ${error}`);
    }
  }

  if (enhancements.length === 0) {
    return null;
  }

  const baseCategoryName = extractBaseCategoryName(group.$.name);

  return {
    $schema: "https://aos-data.org/schema/enhancement.schema.json",
    id: categoryNameToId(baseCategoryName),
    name: baseCategoryName,
    faction: options.factionId,
    type: categoryNameToType(baseCategoryName),
    enhancements,
    _meta: {
      lastUpdated: new Date().toISOString().split("T")[0],
      source: "BSData import",
    },
  };
}

/**
 * Extract all enhancement categories from a catalogue.
 * This is the main function that discovers and maps all enhancement types.
 */
export function mapAllEnhancements(
  catalogue: BSCatalogue,
  options: MapperOptions
): EnhancementCollection[] {
  const enhancementGroups = findEnhancementGroups(catalogue);
  const collections: EnhancementCollection[] = [];
  const seenTypes = new Set<string>();

  for (const group of enhancementGroups) {
    const baseCategoryName = extractBaseCategoryName(group.$.name);
    const typeId = categoryNameToType(baseCategoryName);

    // Skip if we've already processed this enhancement type
    // (can happen if both base and faction-specific groups exist)
    if (seenTypes.has(typeId)) {
      continue;
    }

    const collection = mapEnhancementCategory(catalogue, group, options);
    if (collection) {
      collections.push(collection);
      seenTypes.add(typeId);
    }
  }

  return collections;
}
