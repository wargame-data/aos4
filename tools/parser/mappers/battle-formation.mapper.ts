/**
 * Battle Formation Mapper
 *
 * Maps BSData battle formation entries to aos-data format.
 */

import type {
  BSCatalogue,
  BSSelectionEntry,
  BSSelectionEntryGroup,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { AbilityMapper, type Ability } from "./ability.mapper.js";
import { toKebabCase } from "../transformers/id.js";
import { findBattleFormationGroups, getEntriesFromGroup, isHidden } from "../xml/traverser.js";

/**
 * aos-data Battle Formation type
 */
export interface BattleFormation {
  $schema?: string;
  id: string;
  name: string;
  faction: string;
  abilities: Ability[];
  _meta: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Input for battle formation mapping
 */
export interface BattleFormationInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData battle formation entries to aos-data format
 */
export class BattleFormationMapper extends BaseMapper<BattleFormationInput, BattleFormation> {
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: BattleFormationInput): BattleFormation {
    const { entry } = input;

    const formation: BattleFormation = {
      $schema: "https://aos-data.org/schema/battle-formation.schema.json",
      id: toKebabCase(entry.$.name),
      name: entry.$.name,
      faction: this.options.factionId,
      abilities: this.extractAbilities(entry),
      _meta: this.generateMeta(),
    };

    return formation;
  }

  private extractAbilities(entry: BSSelectionEntry): Ability[] {
    const abilities: Ability[] = [];

    // Extract abilities from profiles
    if (entry.profiles) {
      for (const profile of entry.profiles) {
        if (!profile || !profile.$) continue;

        const typeName = profile.$.typeName?.toLowerCase() || "";
        // Battle formation abilities are typically Ability (Passive) or Ability (Activated)
        if (typeName.includes("ability")) {
          abilities.push(this.abilityMapper.map(profile));
        }
      }
    }

    return abilities;
  }
}

/**
 * Extract all battle formations from a non-library catalogue
 */
export function mapBattleFormations(
  catalogue: BSCatalogue,
  options: MapperOptions
): BattleFormation[] {
  const formations: BattleFormation[] = [];
  const mapper = new BattleFormationMapper(options);

  // Find all battle formation groups
  const battleFormationGroups = findBattleFormationGroups(catalogue);

  for (const group of battleFormationGroups) {
    // Get all entries from the group
    const entries = getEntriesFromGroup(group);

    for (const entry of entries) {
      // Skip hidden entries
      if (isHidden(entry)) continue;

      // Skip entries without profiles (they might be container entries)
      if (!entry.profiles || entry.profiles.length === 0) continue;

      try {
        const formation = mapper.map({ entry, catalogue });
        formations.push(formation);
      } catch (error) {
        // Record error but continue
        console.error(`Failed to map battle formation ${entry.$.name}: ${error}`);
      }
    }
  }

  return formations;
}

/**
 * Get all battle formation names from a catalogue (for reference)
 */
export function getBattleFormationNames(catalogue: BSCatalogue): string[] {
  const names: string[] = [];
  const battleFormationGroups = findBattleFormationGroups(catalogue);

  for (const group of battleFormationGroups) {
    const entries = getEntriesFromGroup(group);
    for (const entry of entries) {
      if (!isHidden(entry)) {
        names.push(entry.$.name);
      }
    }
  }

  return names;
}
