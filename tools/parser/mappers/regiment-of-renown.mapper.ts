/**
 * Regiment of Renown Mapper
 *
 * Maps BSData regiment of renown entries to aos-data format.
 *
 * Regiments of Renown data is split across multiple files:
 * - Game System (gst): forceEntry elements with regiment names, points, and faction restrictions
 * - Regiments of Renown.cat: sharedSelectionEntries with abilities, entryLinks with unit composition
 */

import type {
  BSCatalogue,
  BSGameSystem,
  BSForceEntry,
  BSSelectionEntry,
  BSEntryLink,
  BSModifier,
  BSModifierGroup,
  BSCondition,
  BSConditionGroup,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { AbilityMapper, type Ability } from "./ability.mapper.js";
import { toKebabCase } from "../transformers/id.js";

/**
 * Unit in a Regiment of Renown
 */
export interface RegimentUnit {
  name: string;
  count: number;
  required: boolean;
}

/**
 * aos-data Regiment of Renown type
 */
export interface RegimentOfRenown {
  $schema?: string;
  id: string;
  name: string;
  points: number;
  allowedFactions: string[];
  units: RegimentUnit[];
  abilities: Ability[];
  _meta: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Input for regiment mapping
 */
export interface RegimentInput {
  forceEntry: BSForceEntry;
  abilityEntry?: BSSelectionEntry;
  unitLinks: BSEntryLink[];
  factionCatalogueMap: Map<string, string>; // catalogue ID -> faction name
}

/**
 * Maps BSData regiment of renown entries to aos-data format
 */
export class RegimentOfRenownMapper extends BaseMapper<RegimentInput, RegimentOfRenown> {
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: RegimentInput): RegimentOfRenown {
    const { forceEntry, abilityEntry, unitLinks, factionCatalogueMap } = input;

    // Extract display name (remove "Regiment of Renown: " prefix if present)
    const rawName = forceEntry.$.name;
    const displayName = rawName.startsWith("Regiment of Renown:")
      ? rawName.replace("Regiment of Renown:", "").trim()
      : rawName;

    const regiment: RegimentOfRenown = {
      $schema: "https://aos-data.org/schema/regiment-of-renown.schema.json",
      id: toKebabCase(displayName),
      name: displayName,
      points: this.extractPoints(forceEntry),
      allowedFactions: this.extractAllowedFactions(forceEntry, factionCatalogueMap),
      units: this.extractUnits(unitLinks, forceEntry.$.id),
      abilities: this.extractAbilities(abilityEntry),
      _meta: this.generateMeta(),
    };

    return regiment;
  }

  private extractPoints(forceEntry: BSForceEntry): number {
    if (!forceEntry.costs) return 0;

    for (const cost of forceEntry.costs) {
      if (cost.$.name === "pts" || cost.$.typeId === "points") {
        return parseInt(cost.$.value, 10) || 0;
      }
    }

    return 0;
  }

  private extractAllowedFactions(
    forceEntry: BSForceEntry,
    factionCatalogueMap: Map<string, string>
  ): string[] {
    const factions: Set<string> = new Set();

    if (!forceEntry.modifiers) return [];

    // Parse modifiers to find faction conditions
    for (const modifier of forceEntry.modifiers) {
      this.extractFactionsFromConditions(modifier, factionCatalogueMap, factions);
    }

    return Array.from(factions).sort();
  }

  private extractFactionsFromConditions(
    modifier: BSModifier,
    factionCatalogueMap: Map<string, string>,
    factions: Set<string>
  ): void {
    // Check direct conditions
    if (modifier.conditions) {
      for (const condition of modifier.conditions) {
        this.extractFactionFromCondition(condition, factionCatalogueMap, factions);
      }
    }

    // Check condition groups
    if (modifier.conditionGroups) {
      for (const group of modifier.conditionGroups) {
        this.extractFactionsFromConditionGroup(group, factionCatalogueMap, factions);
      }
    }
  }

  private extractFactionsFromConditionGroup(
    group: BSConditionGroup,
    factionCatalogueMap: Map<string, string>,
    factions: Set<string>
  ): void {
    // Check direct conditions in group
    if (group.conditions) {
      for (const condition of group.conditions) {
        this.extractFactionFromCondition(condition, factionCatalogueMap, factions);
      }
    }

    // Check nested condition groups
    if (group.conditionGroups) {
      for (const nestedGroup of group.conditionGroups) {
        this.extractFactionsFromConditionGroup(nestedGroup, factionCatalogueMap, factions);
      }
    }
  }

  private extractFactionFromCondition(
    condition: BSCondition,
    factionCatalogueMap: Map<string, string>,
    factions: Set<string>
  ): void {
    // Look for instanceOf conditions with scope="parent" which reference catalogue IDs
    if (condition.$.type === "instanceOf" && condition.$.scope === "parent" && condition.$.childId) {
      const factionName = factionCatalogueMap.get(condition.$.childId);
      if (factionName) {
        factions.add(factionName);
      }
    }
  }

  private extractUnits(unitLinks: BSEntryLink[], regimentId: string): RegimentUnit[] {
    const units: RegimentUnit[] = [];

    for (const link of unitLinks) {
      // Check if this unit belongs to this regiment
      const unitInfo = this.getUnitInfoForRegiment(link, regimentId);
      if (unitInfo) {
        units.push(unitInfo);
      }
    }

    return units;
  }

  private getUnitInfoForRegiment(link: BSEntryLink, regimentId: string): RegimentUnit | null {
    // Check modifierGroups (primary structure for regiment units)
    if (link.modifierGroups) {
      for (const modifierGroup of link.modifierGroups) {
        // Check if this modifierGroup's conditions reference the regiment
        if (modifierGroup.conditions && this.conditionsReferenceRegiment(modifierGroup.conditions, regimentId)) {
          const count = this.extractUnitCountFromModifierGroup(modifierGroup);
          return {
            name: link.$.name,
            count,
            required: count > 0,
          };
        }
        // Check nested condition groups
        if (modifierGroup.conditionGroups) {
          for (const group of modifierGroup.conditionGroups) {
            if (this.conditionGroupReferencesRegiment(group, regimentId)) {
              const count = this.extractUnitCountFromModifierGroup(modifierGroup);
              return {
                name: link.$.name,
                count,
                required: count > 0,
              };
            }
          }
        }
      }
    }

    // Fallback: check direct modifiers (legacy structure)
    if (link.modifiers) {
      for (const modifier of link.modifiers) {
        if (modifier.conditionGroups) {
          for (const group of modifier.conditionGroups) {
            if (this.conditionGroupReferencesRegiment(group, regimentId)) {
              const count = this.extractUnitCount(link, modifier);
              return {
                name: link.$.name,
                count,
                required: count > 0,
              };
            }
          }
        }
        if (modifier.conditions) {
          if (this.conditionsReferenceRegiment(modifier.conditions, regimentId)) {
            const count = this.extractUnitCount(link, modifier);
            return {
              name: link.$.name,
              count,
              required: count > 0,
            };
          }
        }
      }
    }

    return null;
  }

  private extractUnitCountFromModifierGroup(modifierGroup: BSModifierGroup): number {
    if (!modifierGroup.modifiers) return 1;

    // Look for min/max constraint modifiers
    for (const modifier of modifierGroup.modifiers) {
      // The value is typically set for -min or -max fields
      if (modifier.$.field?.endsWith("-min") || modifier.$.field?.endsWith("-max")) {
        const value = parseInt(modifier.$.value, 10);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }

    return 1;
  }

  private conditionGroupReferencesRegiment(group: BSConditionGroup, regimentId: string): boolean {
    // Check direct conditions
    if (group.conditions && this.conditionsReferenceRegiment(group.conditions, regimentId)) {
      return true;
    }

    // Check nested groups
    if (group.conditionGroups) {
      for (const nestedGroup of group.conditionGroups) {
        if (this.conditionGroupReferencesRegiment(nestedGroup, regimentId)) {
          return true;
        }
      }
    }

    return false;
  }

  private conditionsReferenceRegiment(conditions: BSCondition[], regimentId: string): boolean {
    for (const condition of conditions) {
      if (condition.$.type === "instanceOf" && condition.$.childId === regimentId) {
        return true;
      }
    }
    return false;
  }

  private extractUnitCount(link: BSEntryLink, modifier: BSModifier): number {
    // The count is in the modifier value for min/max constraints
    const value = parseInt(modifier.$.value, 10);
    if (!isNaN(value) && value > 0) {
      return value;
    }

    // Default to 1 if unit is in regiment but count not specified
    return 1;
  }

  private extractAbilities(abilityEntry?: BSSelectionEntry): Ability[] {
    if (!abilityEntry || !abilityEntry.profiles) return [];

    const abilities: Ability[] = [];

    for (const profile of abilityEntry.profiles) {
      if (!profile || !profile.$) continue;

      const typeName = profile.$.typeName?.toLowerCase() || "";
      if (typeName.includes("ability") || typeName.includes("spell") || typeName.includes("prayer")) {
        abilities.push(this.abilityMapper.map(profile));
      }
    }

    return abilities;
  }
}

/**
 * Find regiment force entries in a game system
 */
export function findRegimentForceEntries(gameSystem: BSGameSystem): BSForceEntry[] {
  const regiments: BSForceEntry[] = [];

  if (!gameSystem.forceEntries) return regiments;

  for (const entry of gameSystem.forceEntries) {
    // Check if this is a regiment (they have specific naming patterns and are hidden)
    if (entry.$.hidden === "true" && entry.costs && entry.costs.length > 0) {
      // Regiment entries have costs and are initially hidden
      // They are made visible via modifiers when Regiment of Renown catalogue is selected
      regiments.push(entry);
    }

    // Check nested force entries
    if (entry.forceEntries) {
      regiments.push(...findRegimentForceEntries({ ...gameSystem, forceEntries: entry.forceEntries }));
    }
  }

  return regiments;
}

/**
 * Find regiment ability entries in the Regiments of Renown catalogue
 * These are in sharedSelectionEntries with names like "Regiment of Renown: <Name>"
 */
export function findRegimentAbilityEntries(catalogue: BSCatalogue): Map<string, BSSelectionEntry> {
  const abilityMap = new Map<string, BSSelectionEntry>();

  if (!catalogue.sharedSelectionEntries) return abilityMap;

  for (const entry of catalogue.sharedSelectionEntries) {
    if (entry.$.name.startsWith("Regiment of Renown:")) {
      abilityMap.set(entry.$.id, entry);
    }
  }

  return abilityMap;
}

/**
 * Get unit entry links from the Regiments of Renown catalogue
 */
export function getRegimentUnitLinks(catalogue: BSCatalogue): BSEntryLink[] {
  // Top-level entryLinks contain unit references with regiment conditions
  return catalogue.entryLinks || [];
}

/**
 * Build a map of catalogue IDs to faction names from all faction catalogues
 */
export function buildFactionCatalogueMap(catalogues: BSCatalogue[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const catalogue of catalogues) {
    // Skip library catalogues and the Regiments of Renown catalogue
    if (catalogue.$.library === "true") continue;
    if (catalogue.$.name.includes("Regiments of Renown")) continue;

    map.set(catalogue.$.id, catalogue.$.name);
  }

  return map;
}

/**
 * Extract all regiments of renown by combining data from game system and catalogue
 */
export function mapRegimentsOfRenown(
  gameSystem: BSGameSystem,
  regimentsCatalogue: BSCatalogue,
  factionCatalogues: BSCatalogue[],
  options: MapperOptions
): RegimentOfRenown[] {
  const regiments: RegimentOfRenown[] = [];
  const mapper = new RegimentOfRenownMapper(options);

  // Build faction catalogue map
  const factionCatalogueMap = buildFactionCatalogueMap(factionCatalogues);

  // Get regiment definitions from game system
  const regimentForceEntries = findRegimentForceEntries(gameSystem);

  // Get ability entries from Regiments of Renown catalogue
  const abilityEntries = findRegimentAbilityEntries(regimentsCatalogue);

  // Get unit links from Regiments of Renown catalogue
  const unitLinks = getRegimentUnitLinks(regimentsCatalogue);

  // Map each regiment
  for (const forceEntry of regimentForceEntries) {
    // Find matching ability entry (by name)
    let abilityEntry: BSSelectionEntry | undefined;
    for (const [, entry] of abilityEntries) {
      // Match by name - ability entries have "Regiment of Renown: <Name>"
      const abilityName = entry.$.name.replace("Regiment of Renown:", "").trim();
      if (abilityName === forceEntry.$.name || entry.$.name === `Regiment of Renown: ${forceEntry.$.name}`) {
        abilityEntry = entry;
        break;
      }
    }

    try {
      const regiment = mapper.map({
        forceEntry,
        abilityEntry,
        unitLinks,
        factionCatalogueMap,
      });
      regiments.push(regiment);
    } catch (error) {
      console.error(`Failed to map regiment ${forceEntry.$.name}: ${error}`);
    }
  }

  return regiments;
}
