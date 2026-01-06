/**
 * Unit Mapper
 *
 * Maps BSData selection entries (units) to aos-data unit/hero schema format.
 */

import type {
  BSCatalogue,
  BSSelectionEntry,
  BSProfile,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic } from "../xml/reader.js";
import {
  findProfilesRecursive,
  getAllProfiles,
  getCategoryLinks,
  getPointsCost,
  getConstraint,
  hasCategory,
} from "../xml/traverser.js";
import { transformStats, type TransformedStats } from "../transformers/stats.js";
import { toKebabCase } from "../transformers/id.js";
import {
  extractKeywords,
  extractGrandAlliance,
  extractRole,
  isHero,
  isUnique,
  isWizard,
  isPriest,
  extractRegimentKeywords,
  parseWizardLevel,
  parsePriestLevel,
} from "../transformers/keywords.js";
import { WeaponMapper, type Weapon, isWeaponProfile } from "./weapon.mapper.js";
import {
  AbilityMapper,
  type Ability,
  isAbilityProfile,
} from "./ability.mapper.js";

/**
 * aos-data Unit type
 */
export interface Unit {
  $schema?: string;
  id: string;
  name: string;
  faction: string;
  grandAlliance?: string;
  points: number;
  stats: TransformedStats;
  role: "battleline" | "other" | "artillery" | "behemoth";
  keywords: string[];
  regimentKeywords?: string[];
  baseSize: number;
  maxSize?: number;
  canReinforce?: boolean;
  reinforcementCost?: number;
  weapons: Weapon[];
  abilities?: Ability[];
  notes?: string;
  _meta?: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * aos-data Hero type (extends Unit)
 */
export interface Hero extends Unit {
  isWizard: number | null;
  isPriest: number | null;
  isUnique: boolean;
  regimentAllows?: Array<{
    keywords: string[];
    description: string;
  }>;
  canJoinRegiment: {
    keywords: string[];
    description?: string;
  } | null;
}

/**
 * Input for unit mapping
 */
export interface UnitMapperInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData selection entries to aos-data unit/hero format
 */
export class UnitMapper extends BaseMapper<UnitMapperInput, Unit | Hero> {
  private weaponMapper: WeaponMapper;
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.weaponMapper = new WeaponMapper(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: UnitMapperInput): Unit | Hero {
    const { entry, catalogue } = input;
    const keywords = extractKeywords(getCategoryLinks(entry));
    const isHeroUnit = isHero(keywords);

    // Get unit profile for stats
    const unitProfile = this.findUnitProfile(entry, catalogue);
    const stats = this.extractStats(unitProfile, entry);

    // Get weapons and abilities
    const weaponProfiles = this.findWeaponProfiles(entry, catalogue);
    const abilityProfiles = this.findAbilityProfiles(entry, catalogue);

    const weapons = weaponProfiles.map((p) => this.weaponMapper.map(p));
    const abilities = abilityProfiles.map((p) => this.abilityMapper.map(p));

    // Build base unit
    const unit: Unit = {
      $schema: "https://aos-data.org/schema/unit.schema.json",
      id: toKebabCase(entry.$.name),
      name: entry.$.name,
      faction: this.options.factionId,
      points: getPointsCost(entry),
      stats,
      role: extractRole(keywords),
      keywords,
      baseSize: this.extractBaseSize(entry),
      weapons,
      _meta: this.generateMeta(),
    };

    // Add optional fields
    const grandAlliance = extractGrandAlliance(keywords) || this.options.grandAlliance;
    if (grandAlliance) {
      unit.grandAlliance = grandAlliance;
    }

    const regimentKeywords = extractRegimentKeywords(keywords);
    if (regimentKeywords.length > 0) {
      unit.regimentKeywords = regimentKeywords;
    }

    const maxSize = this.extractMaxSize(entry);
    if (maxSize && maxSize > unit.baseSize) {
      unit.maxSize = maxSize;
      unit.canReinforce = true;
    }

    if (abilities.length > 0) {
      unit.abilities = abilities;
    }

    // If hero, add hero-specific fields
    if (isHeroUnit) {
      return this.buildHero(unit, entry, keywords);
    }

    // Change schema for non-heroes
    unit.$schema = "https://aos-data.org/schema/unit.schema.json";

    return unit;
  }

  private buildHero(
    base: Unit,
    entry: BSSelectionEntry,
    keywords: string[]
  ): Hero {
    const hero: Hero = {
      ...base,
      $schema: "https://aos-data.org/schema/hero.schema.json",
      isWizard: this.extractWizardLevel(entry, keywords),
      isPriest: this.extractPriestLevel(entry, keywords),
      isUnique: isUnique(keywords),
      canJoinRegiment: null, // Default - can be overridden by BSData data
    };

    // Extract regiment allows from BSData constraints/modifiers
    const regimentAllows = this.extractRegimentAllows(entry);
    if (regimentAllows.length > 0) {
      hero.regimentAllows = regimentAllows;
    }

    return hero;
  }

  private findUnitProfile(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile | null {
    // First check direct profiles
    const allProfiles = getAllProfiles(catalogue, entry);
    const unitProfile = allProfiles.find(
      (p) => p.$.typeName.toLowerCase() === "unit"
    );

    if (unitProfile) return unitProfile;

    // Check recursive profiles
    const recursiveProfiles = findProfilesRecursive(entry, "Unit");
    if (recursiveProfiles.length > 0) return recursiveProfiles[0];

    return null;
  }

  private extractStats(
    profile: BSProfile | null,
    entry: BSSelectionEntry
  ): TransformedStats {
    if (!profile) {
      this.recordUnmapped({
        type: "missing_profile",
        message: "No Unit profile found for stats",
        location: {
          catalogue: this.options.catalogueName,
          entryId: entry.$.id,
          entryName: entry.$.name,
        },
        suggestion: "Check BSData entry for Unit profile type",
      });

      // Return defaults
      return {
        move: '5"',
        health: 1,
        save: "4+",
        control: 1,
      };
    }

    const characteristics = {
      Move: findCharacteristic(profile, "Move"),
      Health: findCharacteristic(profile, "Health"),
      Save: findCharacteristic(profile, "Save"),
      Control: findCharacteristic(profile, "Control"),
      Banishment: findCharacteristic(profile, "Banishment"),
    };

    return transformStats(characteristics);
  }

  private findWeaponProfiles(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile[] {
    const allProfiles = getAllProfiles(catalogue, entry);
    const directWeapons = allProfiles.filter(isWeaponProfile);

    // Also get weapons from child entries (weapon options)
    const recursiveWeapons = findProfilesRecursive(entry).filter(isWeaponProfile);

    // Deduplicate by name
    const seen = new Set<string>();
    const weapons: BSProfile[] = [];

    for (const weapon of [...directWeapons, ...recursiveWeapons]) {
      if (!seen.has(weapon.$.name)) {
        seen.add(weapon.$.name);
        weapons.push(weapon);
      }
    }

    return weapons;
  }

  private findAbilityProfiles(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile[] {
    const allProfiles = getAllProfiles(catalogue, entry);
    const directAbilities = allProfiles.filter(isAbilityProfile);

    // Also get abilities from child entries
    const recursiveAbilities = findProfilesRecursive(entry).filter(isAbilityProfile);

    // Deduplicate by name
    const seen = new Set<string>();
    const abilities: BSProfile[] = [];

    for (const ability of [...directAbilities, ...recursiveAbilities]) {
      if (!seen.has(ability.$.name)) {
        seen.add(ability.$.name);
        abilities.push(ability);
      }
    }

    return abilities;
  }

  private extractBaseSize(entry: BSSelectionEntry): number {
    // Check min constraint on selections
    const minConstraint = getConstraint(entry, "min", "selections");
    if (minConstraint && minConstraint >= 1) {
      return minConstraint;
    }

    // Check for model count in child entries
    const modelEntries = entry.selectionEntries?.filter(
      (e) => e.$.type === "model"
    );
    if (modelEntries && modelEntries.length > 0) {
      // Sum up min constraints from model entries
      let total = 0;
      for (const model of modelEntries) {
        const min = getConstraint(model, "min", "selections");
        if (min) total += min;
      }
      if (total > 0) return total;
    }

    // Default to 1 (heroes, single models)
    return 1;
  }

  private extractMaxSize(entry: BSSelectionEntry): number | undefined {
    // Check max constraint on selections
    const maxConstraint = getConstraint(entry, "max", "selections");
    if (maxConstraint && maxConstraint >= 1) {
      return maxConstraint;
    }

    // Check for model count in child entries
    const modelEntries = entry.selectionEntries?.filter(
      (e) => e.$.type === "model"
    );
    if (modelEntries && modelEntries.length > 0) {
      // Sum up max constraints from model entries
      let total = 0;
      for (const model of modelEntries) {
        const max = getConstraint(model, "max", "selections");
        if (max) total += max;
      }
      if (total > 0) return total;
    }

    return undefined;
  }

  private extractWizardLevel(
    entry: BSSelectionEntry,
    keywords: string[]
  ): number | null {
    if (!isWizard(keywords)) {
      return null;
    }

    // Try to parse from entry name or keywords
    const levelFromName = parseWizardLevel(entry.$.name);
    if (levelFromName) return levelFromName;

    // Check keywords for level indication
    for (const keyword of keywords) {
      const level = parseWizardLevel(keyword);
      if (level) return level;
    }

    // Default wizard level is 1
    return 1;
  }

  private extractPriestLevel(
    entry: BSSelectionEntry,
    keywords: string[]
  ): number | null {
    if (!isPriest(keywords)) {
      return null;
    }

    // Try to parse from entry name or keywords
    const levelFromName = parsePriestLevel(entry.$.name);
    if (levelFromName) return levelFromName;

    // Check keywords for level indication
    for (const keyword of keywords) {
      const level = parsePriestLevel(keyword);
      if (level) return level;
    }

    // Default priest level is 1
    return 1;
  }

  private extractRegimentAllows(
    entry: BSSelectionEntry
  ): Array<{ keywords: string[]; description: string }> {
    // Regiment allows would be derived from BSData constraints
    // This is complex to extract automatically - for now return empty
    // and let the user fill in manually or from a separate mapping

    // Look for category links that might indicate regiment restrictions
    const regimentKeywords = getCategoryLinks(entry)
      .filter(
        (link) =>
          link.$.name.toUpperCase().includes("CHAMBER") ||
          link.$.name.toUpperCase().includes("CLAN") ||
          link.$.name.toUpperCase().includes("HOST")
      )
      .map((link) => link.$.name.toUpperCase());

    if (regimentKeywords.length > 0) {
      return [
        {
          keywords: regimentKeywords,
          description: `Units with ${regimentKeywords.join(" or ")} keyword`,
        },
      ];
    }

    return [];
  }
}

/**
 * Map a single unit entry
 */
export function mapUnit(
  entry: BSSelectionEntry,
  catalogue: BSCatalogue,
  options: MapperOptions
): Unit | Hero {
  const mapper = new UnitMapper(options);
  return mapper.map({ entry, catalogue });
}

/**
 * Map all units in a catalogue
 */
export function mapAllUnits(
  entries: BSSelectionEntry[],
  catalogue: BSCatalogue,
  options: MapperOptions
): (Unit | Hero)[] {
  const mapper = new UnitMapper(options);
  return entries.map((entry) => mapper.map({ entry, catalogue }));
}
