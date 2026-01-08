/**
 * Lore Mapper
 *
 * Maps BSData spell/prayer lores to aos-data lore schema format.
 */

import type {
  BSProfile,
  BSSelectionEntry,
  BSSelectionEntryGroup,
  BSCatalogue,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic, findAttribute } from "../xml/reader.js";
import { findLoreGroups, findUniversalManifestationLores, type UniversalManifestationLore } from "../xml/traverser.js";
import {
  type AbilityColor,
  type AbilityCategory,
} from "./ability.mapper.js";
import { SCHEMA_URLS } from "../config.js";

// Profile type IDs for spells and prayers
const SPELL_PROFILE_TYPE_ID = "7312-8367-c171-f2ef";
const PRAYER_PROFILE_TYPE_ID = "5946-234-d7b4-6195";

/**
 * Spell within a lore
 */
export interface Spell {
  name: string;
  castingValue: number;
  timing: string;
  declare?: string;
  effect: string;
  keywords: string[];
  color?: AbilityColor;
  abilityCategory?: AbilityCategory;
}

/**
 * Prayer within a lore
 */
export interface Prayer {
  name: string;
  chantingValue: number;
  timing: string;
  declare?: string;
  effect: string;
  keywords: string[];
  color?: AbilityColor;
  abilityCategory?: AbilityCategory;
}

/**
 * Lore structure (spell lore, prayer lore, or manifestation lore)
 */
export interface Lore {
  $schema?: string;
  id: string;
  name: string;
  loreType: "spell" | "prayer" | "manifestation";
  shared?: boolean;
  factionId?: string;
  spells?: Spell[];
  prayers?: Prayer[];
  _meta?: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Input for LoreMapper
 */
export interface LoreMapperInput {
  group: BSSelectionEntryGroup;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData spell/prayer lores to aos-data format
 */
export class LoreMapper extends BaseMapper<LoreMapperInput, Lore> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(input: LoreMapperInput): Lore {
    const { group } = input;
    const loreType = this.determineLoreType(group);

    const lore: Lore = {
      $schema: SCHEMA_URLS.lore,
      id: this.toKebabCase(group.$.name),
      name: group.$.name,
      loreType,
      _meta: this.generateMeta(),
    };

    // Extract spells or prayers based on lore type
    if (loreType === "spell" || loreType === "manifestation") {
      const spells = this.extractSpells(group);
      if (spells.length > 0) {
        lore.spells = spells;
      }
    }

    if (loreType === "prayer") {
      const prayers = this.extractPrayers(group);
      if (prayers.length > 0) {
        lore.prayers = prayers;
      }
    }

    return lore;
  }

  private determineLoreType(group: BSSelectionEntryGroup): Lore["loreType"] {
    // Check for prayers first
    if (this.hasPrayerProfiles(group)) {
      return "prayer";
    }

    // Manifestation lores have entryLinks (references to endless spell models)
    // in addition to spell profiles for summoning
    if (group.entryLinks && group.entryLinks.length > 0) {
      return "manifestation";
    }

    // Regular spell lore
    if (this.hasSpellProfiles(group)) {
      return "spell";
    }

    // Fallback: Check by name for manifestations or when no profiles found
    const name = group.$.name.toLowerCase();

    if (name.includes("prayer") || name.includes("blessing") || name.includes("rites")) {
      return "prayer";
    }

    if (name.includes("manifestation") || name.includes("invocation") || name.includes("judgement")) {
      return "manifestation";
    }

    return "spell";
  }

  private hasPrayerProfiles(group: BSSelectionEntryGroup): boolean {
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

  private hasSpellProfiles(group: BSSelectionEntryGroup): boolean {
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

  private extractSpells(group: BSSelectionEntryGroup): Spell[] {
    const spells: Spell[] = [];

    // Look through selection entries for spell profiles
    if (group.selectionEntries) {
      for (const entry of group.selectionEntries) {
        const entrySpells = this.extractSpellsFromEntry(entry);
        spells.push(...entrySpells);
      }
    }

    // Also check nested selection entry groups
    if (group.selectionEntryGroups) {
      for (const subGroup of group.selectionEntryGroups) {
        const subSpells = this.extractSpells(subGroup);
        spells.push(...subSpells);
      }
    }

    return spells;
  }

  private extractSpellsFromEntry(entry: BSSelectionEntry): Spell[] {
    const spells: Spell[] = [];

    if (!entry.profiles) return spells;

    for (const profile of entry.profiles) {
      // Check if this is a spell profile by type ID or type name
      const isSpell =
        profile.$.typeId === SPELL_PROFILE_TYPE_ID ||
        profile.$.typeName.toLowerCase().includes("spell");

      if (isSpell) {
        const spell = this.mapSpellProfile(profile);
        if (spell) {
          spells.push(spell);
        }
      }
    }

    return spells;
  }

  private mapSpellProfile(profile: BSProfile): Spell | null {
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
      return null;
    }

    const castingValueStr = findCharacteristic(profile, "Casting Value");
    const castingValue = castingValueStr ? parseInt(castingValueStr, 10) : 0;

    if (isNaN(castingValue) || castingValue < 2 || castingValue > 12) {
      this.recordUnmapped({
        type: "invalid_casting_value",
        message: `Invalid casting value: ${castingValueStr}`,
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Casting Value",
        },
      });
    }

    const spell: Spell = {
      name: profile.$.name,
      castingValue: castingValue || 5, // Default to 5 if invalid
      timing: findCharacteristic(profile, "Timing") || "Your Hero Phase",
      effect,
      keywords: this.extractKeywords(profile),
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

  private extractPrayers(group: BSSelectionEntryGroup): Prayer[] {
    const prayers: Prayer[] = [];

    // Look through selection entries for prayer profiles
    if (group.selectionEntries) {
      for (const entry of group.selectionEntries) {
        const entryPrayers = this.extractPrayersFromEntry(entry);
        prayers.push(...entryPrayers);
      }
    }

    // Also check nested selection entry groups
    if (group.selectionEntryGroups) {
      for (const subGroup of group.selectionEntryGroups) {
        const subPrayers = this.extractPrayers(subGroup);
        prayers.push(...subPrayers);
      }
    }

    return prayers;
  }

  private extractPrayersFromEntry(entry: BSSelectionEntry): Prayer[] {
    const prayers: Prayer[] = [];

    if (!entry.profiles) return prayers;

    for (const profile of entry.profiles) {
      // Check if this is a prayer profile by type ID or type name
      const isPrayer =
        profile.$.typeId === PRAYER_PROFILE_TYPE_ID ||
        profile.$.typeName.toLowerCase().includes("prayer");

      if (isPrayer) {
        const prayer = this.mapPrayerProfile(profile);
        if (prayer) {
          prayers.push(prayer);
        }
      }
    }

    return prayers;
  }

  private mapPrayerProfile(profile: BSProfile): Prayer | null {
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
      return null;
    }

    const chantingValueStr = findCharacteristic(profile, "Chanting Value");
    const chantingValue = chantingValueStr ? parseInt(chantingValueStr, 10) : 0;

    if (isNaN(chantingValue) || chantingValue < 2 || chantingValue > 6) {
      this.recordUnmapped({
        type: "invalid_chanting_value",
        message: `Invalid chanting value: ${chantingValueStr}`,
        location: {
          catalogue: this.options.catalogueName,
          entryName: profile.$.name,
          path: "Chanting Value",
        },
      });
    }

    const prayer: Prayer = {
      name: profile.$.name,
      chantingValue: chantingValue || 4, // Default to 4 if invalid
      timing: findCharacteristic(profile, "Timing") || "Your Hero Phase",
      effect,
      keywords: this.extractKeywords(profile),
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

  private toKebabCase(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}

/**
 * Map all lores in a catalogue
 */
export function mapLores(
  catalogue: BSCatalogue,
  options: MapperOptions
): Lore[] {
  const loreGroups = findLoreGroups(catalogue);
  const mapper = new LoreMapper(options);

  return loreGroups.map((group) =>
    mapper.map({ group, catalogue })
  );
}

/**
 * Map universal manifestation lores from Lores.cat
 * These are the endless spells and incarnates available to all factions.
 */
export function mapUniversalManifestationLores(
  catalogue: BSCatalogue,
  options: MapperOptions
): Lore[] {
  const universalLores = findUniversalManifestationLores(catalogue);
  const mapper = new LoreMapper(options);

  return universalLores.map((ulore) => {
    const lore: Lore = {
      $schema: SCHEMA_URLS.lore,
      id: toKebabCase(ulore.name),
      name: ulore.name,
      loreType: "manifestation",
      shared: true,
      _meta: {
        lastUpdated: new Date().toISOString().split("T")[0],
        source: options.catalogueName || "Lores.cat",
      },
    };

    // Extract spells from the spell entries
    const spells: Spell[] = [];
    for (const entry of ulore.spellEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          // Check if this is a spell profile
          const isSpell =
            profile.$.typeId === SPELL_PROFILE_TYPE_ID ||
            profile.$.typeName?.toLowerCase().includes("spell");

          if (isSpell) {
            const spell = mapSpellProfile(profile, mapper);
            if (spell) {
              spells.push(spell);
            }
          }
        }
      }
    }

    if (spells.length > 0) {
      lore.spells = spells;
    }

    return lore;
  });
}

/**
 * Helper to map a spell profile (extracted for reuse)
 */
function mapSpellProfile(profile: BSProfile, mapper: LoreMapper): Spell | null {
  const effect = findCharacteristic(profile, "Effect");
  if (!effect) {
    return null;
  }

  const castingValueStr = findCharacteristic(profile, "Casting Value");
  const castingValue = castingValueStr ? parseInt(castingValueStr, 10) : 0;

  const spell: Spell = {
    name: profile.$.name,
    castingValue: castingValue || 5,
    timing: findCharacteristic(profile, "Timing") || "Your Hero Phase",
    effect,
    keywords: extractSpellKeywords(profile),
  };

  const declare = findCharacteristic(profile, "Declare");
  if (declare && declare !== "-" && declare.trim() !== "") {
    spell.declare = declare;
  }

  const color = extractSpellColor(profile);
  if (color) {
    spell.color = color;
  }

  const category = extractSpellCategory(profile);
  if (category) {
    spell.abilityCategory = category;
  }

  return spell;
}

function extractSpellKeywords(profile: BSProfile): string[] {
  const keywords = findCharacteristic(profile, "Keywords");
  if (!keywords || keywords === "-" || keywords.trim() === "") {
    return [];
  }

  return keywords
    .split(/[,;\n]+/)
    .map((k) => k.trim().toUpperCase().replace(/\*+/g, "").replace(/\^+/g, ""))
    .filter((k) => k.length > 0 && k !== "-");
}

function extractSpellColor(profile: BSProfile): AbilityColor | undefined {
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

function extractSpellCategory(profile: BSProfile): AbilityCategory | undefined {
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

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
