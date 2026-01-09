/**
 * Individual Spell/Prayer Mapper
 *
 * Maps BSData spell and prayer profiles to individual catalog items.
 * Unlike the lore mapper which produces lore collections, this produces
 * individual spell/prayer files for the catalog.
 */

import type {
  BSProfile,
  BSSelectionEntry,
  BSSelectionEntryGroup,
  BSCatalogue,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic, findAttribute } from "../xml/reader.js";
import { findLoreGroups, findUniversalManifestationLores } from "../xml/traverser.js";
import { toUnderscoreId, toQualifiedId } from "../transformers/id.js";
import { SCHEMA_URLS } from "../config.js";
import type { Spell, Prayer } from "../../schemas/schemas/spell.schema.js";
import type { AbilityColor, AbilityCategory } from "./ability.mapper.js";

// Profile type IDs for spells and prayers
const SPELL_PROFILE_TYPE_ID = "7312-8367-c171-f2ef";
const PRAYER_PROFILE_TYPE_ID = "5946-234-d7b4-6195";

/**
 * Input for spell mapping
 */
export interface SpellMapperInput {
  profile: BSProfile;
  loreName: string;
  factionId: string;
}

/**
 * Input for prayer mapping
 */
export interface PrayerMapperInput {
  profile: BSProfile;
  loreName: string;
  factionId: string;
}

/**
 * Maps BSData spell profiles to individual catalog spell format
 */
export class IndividualSpellMapper extends BaseMapper<SpellMapperInput, Spell> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(input: SpellMapperInput): Spell {
    const { profile, loreName, factionId } = input;

    const effect = findCharacteristic(profile, "Effect");
    if (!effect) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Spell missing Effect characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Effect",
        },
      });
    }

    const castingValueStr = findCharacteristic(profile, "Casting Value");
    const castingValue = castingValueStr ? parseInt(castingValueStr, 10) : 5;

    const spell: Spell = {
      $schema: SCHEMA_URLS.spell,
      id: toQualifiedId("spell", factionId, profile.$.name),
      type: "spell",
      name: profile.$.name,
      faction: toUnderscoreId(factionId),
      lore: toUnderscoreId(loreName),
      keywords: this.extractKeywords(profile),
      castingValue: castingValue >= 2 && castingValue <= 12 ? castingValue : 5,
      timing: findCharacteristic(profile, "Timing") || "Your Hero Phase",
      effect: effect || "",
      _meta: this.generateMeta(),
    };

    const declare = findCharacteristic(profile, "Declare");
    if (declare && declare !== "-" && declare.trim() !== "") {
      spell.declare = declare;
    }

    const color = this.extractColor(profile);
    if (color) {
      spell.color = color;
    }

    const category = this.extractAbilityCategory(profile);
    if (category) {
      spell.abilityCategory = category;
    }

    return spell;
  }

  private extractKeywords(profile: BSProfile): string[] {
    const keywords = findCharacteristic(profile, "Keywords");
    if (!keywords || keywords === "-" || keywords.trim() === "") {
      return [];
    }

    return keywords
      .split(/[,;\n]+/)
      .map((k) => k.trim().toLowerCase().replace(/\*+/g, "").replace(/\^+/g, ""))
      .filter((k) => k.length > 0 && k !== "-");
  }

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
 * Maps BSData prayer profiles to individual catalog prayer format
 */
export class IndividualPrayerMapper extends BaseMapper<PrayerMapperInput, Prayer> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(input: PrayerMapperInput): Prayer {
    const { profile, loreName, factionId } = input;

    const effect = findCharacteristic(profile, "Effect");
    if (!effect) {
      this.recordUnmapped({
        type: "missing_characteristic",
        message: "Prayer missing Effect characteristic",
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Effect",
        },
      });
    }

    const chantingValueStr = findCharacteristic(profile, "Chanting Value");
    const chantingValue = chantingValueStr ? parseInt(chantingValueStr, 10) : 4;

    const prayer: Prayer = {
      $schema: SCHEMA_URLS.prayer,
      id: toQualifiedId("prayer", factionId, profile.$.name),
      type: "prayer",
      name: profile.$.name,
      faction: toUnderscoreId(factionId),
      lore: toUnderscoreId(loreName),
      keywords: this.extractKeywords(profile),
      chantingValue: chantingValue >= 2 && chantingValue <= 6 ? chantingValue : 4,
      timing: findCharacteristic(profile, "Timing") || "Your Hero Phase",
      effect: effect || "",
      _meta: this.generateMeta(),
    };

    const declare = findCharacteristic(profile, "Declare");
    if (declare && declare !== "-" && declare.trim() !== "") {
      prayer.declare = declare;
    }

    const color = this.extractColor(profile);
    if (color) {
      prayer.color = color;
    }

    const category = this.extractAbilityCategory(profile);
    if (category) {
      prayer.abilityCategory = category;
    }

    return prayer;
  }

  private extractKeywords(profile: BSProfile): string[] {
    const keywords = findCharacteristic(profile, "Keywords");
    if (!keywords || keywords === "-" || keywords.trim() === "") {
      return [];
    }

    return keywords
      .split(/[,;\n]+/)
      .map((k) => k.trim().toLowerCase().replace(/\*+/g, "").replace(/\^+/g, ""))
      .filter((k) => k.length > 0 && k !== "-");
  }

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
 * Determine the faction ID from a lore name
 * Maps lore names like "Lore of Ruination (Slaves to Darkness)" to "slaves_to_darkness"
 */
function extractFactionFromLoreName(loreName: string): string {
  // Check for parenthetical faction name
  const parenMatch = loreName.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    return toUnderscoreId(parenMatch[1]);
  }

  // Default to shared if no faction specified
  return "shared";
}

/**
 * Check if a lore group contains spell profiles
 */
function hasSpellProfiles(group: BSSelectionEntryGroup): boolean {
  if (group.selectionEntries) {
    for (const entry of group.selectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (
            profile.$.typeId === SPELL_PROFILE_TYPE_ID ||
            profile.$.typeName?.toLowerCase().includes("spell")
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Check if a lore group contains prayer profiles
 */
function hasPrayerProfiles(group: BSSelectionEntryGroup): boolean {
  if (group.selectionEntries) {
    for (const entry of group.selectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (
            profile.$.typeId === PRAYER_PROFILE_TYPE_ID ||
            profile.$.typeName?.toLowerCase().includes("prayer")
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Extract spell profiles from a lore group recursively
 */
function extractSpellProfilesFromGroup(group: BSSelectionEntryGroup): { profile: BSProfile; entry: BSSelectionEntry }[] {
  const results: { profile: BSProfile; entry: BSSelectionEntry }[] = [];

  if (group.selectionEntries) {
    for (const entry of group.selectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (
            profile.$.typeId === SPELL_PROFILE_TYPE_ID ||
            profile.$.typeName?.toLowerCase().includes("spell")
          ) {
            results.push({ profile, entry });
          }
        }
      }
    }
  }

  // Recurse into nested groups
  if (group.selectionEntryGroups) {
    for (const subGroup of group.selectionEntryGroups) {
      results.push(...extractSpellProfilesFromGroup(subGroup));
    }
  }

  return results;
}

/**
 * Extract prayer profiles from a lore group recursively
 */
function extractPrayerProfilesFromGroup(group: BSSelectionEntryGroup): { profile: BSProfile; entry: BSSelectionEntry }[] {
  const results: { profile: BSProfile; entry: BSSelectionEntry }[] = [];

  if (group.selectionEntries) {
    for (const entry of group.selectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (
            profile.$.typeId === PRAYER_PROFILE_TYPE_ID ||
            profile.$.typeName?.toLowerCase().includes("prayer")
          ) {
            results.push({ profile, entry });
          }
        }
      }
    }
  }

  // Recurse into nested groups
  if (group.selectionEntryGroups) {
    for (const subGroup of group.selectionEntryGroups) {
      results.push(...extractPrayerProfilesFromGroup(subGroup));
    }
  }

  return results;
}

/**
 * Map all individual spells from Lores.cat
 */
export function mapIndividualSpells(
  catalogue: BSCatalogue,
  options: MapperOptions
): Spell[] {
  const loreGroups = findLoreGroups(catalogue);
  const spellMapper = new IndividualSpellMapper(options);
  const spells: Spell[] = [];

  for (const group of loreGroups) {
    if (!hasSpellProfiles(group)) continue;

    const loreName = group.$.name;
    const factionId = extractFactionFromLoreName(loreName);
    const profiles = extractSpellProfilesFromGroup(group);

    for (const { profile } of profiles) {
      const spell = spellMapper.map({
        profile,
        loreName,
        factionId,
      });
      spells.push(spell);
    }
  }

  // Also map universal manifestation lores
  const universalLores = findUniversalManifestationLores(catalogue);
  for (const ulore of universalLores) {
    for (const entry of ulore.spellEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (
            profile.$.typeId === SPELL_PROFILE_TYPE_ID ||
            profile.$.typeName?.toLowerCase().includes("spell")
          ) {
            const spell = spellMapper.map({
              profile,
              loreName: ulore.name,
              factionId: "shared",
            });
            spells.push(spell);
          }
        }
      }
    }
  }

  return spells;
}

/**
 * Map all individual prayers from Lores.cat
 */
export function mapIndividualPrayers(
  catalogue: BSCatalogue,
  options: MapperOptions
): Prayer[] {
  const loreGroups = findLoreGroups(catalogue);
  const prayerMapper = new IndividualPrayerMapper(options);
  const prayers: Prayer[] = [];

  for (const group of loreGroups) {
    if (!hasPrayerProfiles(group)) continue;

    const loreName = group.$.name;
    const factionId = extractFactionFromLoreName(loreName);
    const profiles = extractPrayerProfilesFromGroup(group);

    for (const { profile } of profiles) {
      const prayer = prayerMapper.map({
        profile,
        loreName,
        factionId,
      });
      prayers.push(prayer);
    }
  }

  return prayers;
}
