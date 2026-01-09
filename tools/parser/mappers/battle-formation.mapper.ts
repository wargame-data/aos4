/**
 * Battle Formation Mapper
 *
 * Maps BSData battle formation entries to the catalog battle formation format.
 * Battle formations are found in [Faction].cat files under "Battle Formations: [Faction]".
 */

import type {
  BSProfile,
  BSSelectionEntry,
  BSCatalogue,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic, findAttribute } from "../xml/reader.js";
import { findBattleFormationEntries } from "../xml/traverser.js";
import { toUnderscoreId, toQualifiedId } from "../transformers/id.js";
import { SCHEMA_URLS } from "../config.js";
import { PROFILE_TYPES, isAbilityProfileType, getAbilityTypeFromProfileId } from "../xml/gst-ids.js";
import type { BattleFormation, BattleFormationAbility } from "../../schemas/schemas/battle-formation.schema.js";
import type { AbilityColor, AbilityCategory } from "./ability.mapper.js";

/**
 * Input for battle formation mapping
 */
export interface BattleFormationMapperInput {
  entry: BSSelectionEntry;
}

/**
 * Maps BSData battle formation entries to catalog format
 */
export class BattleFormationMapper extends BaseMapper<BattleFormationMapperInput, BattleFormation> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(input: BattleFormationMapperInput): BattleFormation {
    const { entry } = input;

    const name = entry.$.name;
    const bsdataId = entry.$.id;

    // Find the ability profile
    const abilityProfile = this.findAbilityProfile(entry);
    if (!abilityProfile) {
      this.recordUnmapped({
        type: "missing_profile",
        message: "Battle formation missing ability profile",
        location: {
          catalogue: this.options.catalogueName,
          entryName: name,
          path: "profiles",
        },
      });
    }

    const ability = abilityProfile
      ? this.mapAbility(abilityProfile)
      : this.createDefaultAbility(name);

    const battleFormation: BattleFormation = {
      $schema: SCHEMA_URLS.battleFormation,
      id: toQualifiedId("formation", this.options.factionId, name),
      bsdataId,
      type: "battle-formation",
      name,
      faction: toUnderscoreId(this.options.factionId),
      ability,
      _meta: this.generateMeta(),
    };

    return battleFormation;
  }

  /**
   * Find the ability profile for a battle formation entry.
   * Uses ID-based detection with name-based fallback.
   */
  private findAbilityProfile(entry: BSSelectionEntry): BSProfile | null {
    if (!entry.profiles) {
      return null;
    }

    // Primary: Find by typeId (ID-based detection)
    const abilityByTypeId = entry.profiles.find((p) =>
      isAbilityProfileType(p.$.typeId)
    );
    if (abilityByTypeId) {
      return abilityByTypeId;
    }

    // Fallback: Find by typeName (name-based detection)
    const abilityByName = entry.profiles.find((p) =>
      p.$.typeName?.toLowerCase().includes("ability")
    );

    return abilityByName || null;
  }

  /**
   * Map a BSProfile to a BattleFormationAbility
   */
  private mapAbility(profile: BSProfile): BattleFormationAbility {
    const effect = findCharacteristic(profile, "Effect");
    if (!effect) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Battle formation ability missing Effect characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Effect",
        },
      });
    }

    // Determine ability type from profile typeId
    const typeFromId = getAbilityTypeFromProfileId(profile.$.typeId);
    let abilityType: BattleFormationAbility["type"] = "passive";
    if (typeFromId === "activated") {
      abilityType = "once-per-turn"; // Default for activated abilities
    } else if (typeFromId === "spell") {
      abilityType = "spell";
    } else if (typeFromId === "prayer") {
      abilityType = "prayer";
    } else if (typeFromId === "command") {
      abilityType = "command";
    }

    // Check timing characteristic for more specific type
    const timing = findCharacteristic(profile, "Timing") || "";
    const timingLower = timing.toLowerCase();
    if (timingLower.includes("passive")) {
      abilityType = "passive";
    } else if (timingLower.includes("reaction")) {
      abilityType = "reaction";
    } else if (timingLower.includes("once per battle")) {
      abilityType = "once-per-battle";
    } else if (timingLower.includes("once per turn")) {
      abilityType = "once-per-turn";
    }

    const ability: BattleFormationAbility = {
      name: profile.$.name,
      type: abilityType,
      effect: effect || "",
    };

    // Add phase if determinable
    const phase = this.extractPhase(profile);
    if (phase) {
      ability.phase = phase;
    }

    // Add declare if present
    const declare = findCharacteristic(profile, "Declare");
    if (declare && declare !== "-" && declare.trim() !== "") {
      ability.declare = declare;
    }

    // Add keywords if present
    const keywords = this.extractKeywords(profile);
    if (keywords.length > 0) {
      ability.keywords = keywords;
    }

    // Add color if present
    const color = this.extractColor(profile);
    if (color) {
      ability.color = color;
    }

    // Add ability category if present
    const category = this.extractAbilityCategory(profile);
    if (category) {
      ability.abilityCategory = category;
    }

    return ability;
  }

  /**
   * Create a default ability when no profile is found
   */
  private createDefaultAbility(name: string): BattleFormationAbility {
    return {
      name: `${name} Ability`,
      type: "passive",
      effect: "",
    };
  }

  /**
   * Extract phase from timing characteristic
   */
  private extractPhase(profile: BSProfile): BattleFormationAbility["phase"] | undefined {
    const timing =
      findCharacteristic(profile, "Timing") ||
      findCharacteristic(profile, "Phase") ||
      "";
    const timingLower = timing.toLowerCase();

    const phaseMappings: Record<string, BattleFormationAbility["phase"]> = {
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

  /**
   * Extract keywords from profile
   */
  private extractKeywords(profile: BSProfile): string[] {
    const keywords = findCharacteristic(profile, "Keywords");
    if (!keywords || keywords === "-" || keywords.trim() === "") {
      return [];
    }

    return keywords
      .split(/[,;\n]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0 && k !== "-");
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
 * Map all battle formations from a catalogue
 */
export function mapBattleFormations(
  catalogue: BSCatalogue,
  options: MapperOptions
): BattleFormation[] {
  const entries = findBattleFormationEntries(catalogue);
  const mapper = new BattleFormationMapper(options);
  const formations: BattleFormation[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    // Skip hidden entries
    if (entry.$.hidden === "true") {
      continue;
    }

    try {
      const formation = mapper.map({ entry });

      // Avoid duplicates (same BSData ID)
      if (!seenIds.has(formation.bsdataId)) {
        seenIds.add(formation.bsdataId);
        formations.push(formation);
      }
    } catch (error) {
      // Log error but continue processing
      console.error(`Error mapping battle formation ${entry.$.name}:`, error);
    }
  }

  return formations;
}

/**
 * Get the faction ID for a battle formation (for output path)
 */
export function getBattleFormationFaction(formation: BattleFormation): string {
  return formation.faction;
}
