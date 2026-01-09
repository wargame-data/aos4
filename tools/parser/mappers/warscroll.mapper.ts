/**
 * Warscroll Mapper
 *
 * Maps BSData selection entries (units/heroes) to unified warscroll format.
 * This replaces the separate unit/hero mappers with a single unified mapper.
 */

import type {
  BSCatalogue,
  BSSelectionEntry,
  BSProfile,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { detectFactionFromKeywords, SCHEMA_URLS } from "../config.js";
import { findCharacteristic } from "../xml/reader.js";
import {
  findProfilesRecursive,
  getAllProfiles,
  getCategoryLinks,
  getConstraint,
  extractConstraintModifiers,
  type ExtractedConstraintModifier,
} from "../xml/traverser.js";
import { transformStats, type TransformedStats } from "../transformers/stats.js";
import { toUnderscoreId, toQualifiedId } from "../transformers/id.js";
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
import type { Warscroll, Sizes, WarscrollStats } from "../../schemas/schemas/warscroll.schema.js";

/**
 * Non-ability rule attached to a warscroll
 */
export interface Rule {
  name: string;
  description: string;
}

/**
 * Regiment allows schema
 */
interface RegimentAllows {
  keywords: string[];
  description: string;
}

/**
 * Can join regiment schema
 */
interface CanJoinRegiment {
  keywords: string[];
  description?: string;
}

/**
 * Input for warscroll mapping
 */
export interface WarscrollMapperInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData selection entries to unified warscroll format
 */
export class WarscrollMapper extends BaseMapper<WarscrollMapperInput, Warscroll> {
  private weaponMapper: WeaponMapper;
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.weaponMapper = new WeaponMapper(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: WarscrollMapperInput): Warscroll {
    const { entry, catalogue } = input;
    const keywords = extractKeywords(getCategoryLinks(entry));
    const isHeroUnit = isHero(keywords);

    // Detect faction from keywords (may differ from catalogue faction for cross-faction units)
    const detectedFaction = detectFactionFromKeywords(keywords, this.options.factionId);

    // Get unit profile for stats
    const unitProfile = this.findUnitProfile(entry, catalogue);
    const stats = this.extractStats(unitProfile, entry);

    // Get weapons and abilities
    const weaponProfiles = this.findWeaponProfiles(entry, catalogue);
    const abilityProfiles = this.findAbilityProfiles(entry, catalogue);

    const weapons = weaponProfiles.map((p) => this.weaponMapper.map(p));
    const abilities = abilityProfiles.map((p) => this.abilityMapper.map(p));

    // Extract sizes
    const sizes = this.extractSizes(entry);

    // Transform keywords to lowercase format with faction tag
    const transformedKeywords = this.transformKeywords(keywords, detectedFaction, isHeroUnit);

    // Build warscroll
    const warscroll: Warscroll = {
      $schema: SCHEMA_URLS.warscroll,
      id: toQualifiedId("warscroll", detectedFaction, entry.$.name),
      bsdataId: entry.$.id, // Original BSData ID for cross-referencing
      type: "warscroll",
      name: entry.$.name,
      faction: toUnderscoreId(detectedFaction),
      keywords: transformedKeywords,
      sizes,
      // Note: We don't include points here - they go in the points pack
      stats: stats as WarscrollStats,
      role: extractRole(keywords),
      weapons,
      _meta: this.generateMeta(),
    };

    // Add optional fields
    const grandAlliance = extractGrandAlliance(keywords) || this.options.grandAlliance;
    if (grandAlliance) {
      warscroll.grandAlliance = grandAlliance as "order" | "chaos" | "death" | "destruction";
    }

    const regimentKeywords = extractRegimentKeywords(keywords);
    if (regimentKeywords.length > 0) {
      warscroll.regimentKeywords = regimentKeywords;
    }

    // Reinforcement
    if (sizes.max && sizes.max > sizes.default) {
      warscroll.canReinforce = true;
    }

    // Extract constraint modifiers with repeat rules (for dynamic scaling)
    const constraintMods = extractConstraintModifiers(entry);
    if (constraintMods.length > 0) {
      warscroll.constraintModifiers = constraintMods;
    }

    if (abilities.length > 0) {
      warscroll.abilities = abilities;
    }

    // Check if this is a collective/swarm unit
    if (this.isCollectiveUnit(entry)) {
      warscroll.isCollective = true;
    }

    // Extract non-ability rules
    const rules = this.extractRules(entry);
    if (rules.length > 0) {
      warscroll.rules = rules;
    }

    // Extract publication reference
    const publication = this.extractPublication(entry);
    if (publication) {
      warscroll.publication = publication;
    }

    // Add hero-specific fields if this is a hero
    if (isHeroUnit) {
      this.addHeroFields(warscroll, entry, keywords);
    }

    return warscroll;
  }

  /**
   * Transform keywords to new format with faction tag
   */
  private transformKeywords(
    originalKeywords: string[],
    faction: string,
    isHeroUnit: boolean
  ): string[] {
    const keywords: string[] = [];

    // Add lowercase versions of keywords
    for (const kw of originalKeywords) {
      const lower = kw.toLowerCase();
      // Skip faction keywords - we'll add a standardized one
      if (!lower.includes("stormcast") && !lower.includes("skaven") &&
          !this.isFactionKeyword(kw)) {
        keywords.push(lower);
      }
    }

    // Add standardized faction tag
    keywords.push(`faction:${toUnderscoreId(faction)}`);

    // Ensure hero keyword is present for heroes
    if (isHeroUnit && !keywords.includes("hero")) {
      keywords.push("hero");
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Check if a keyword is a faction keyword
   */
  private isFactionKeyword(keyword: string): boolean {
    const factionKeywords = [
      "STORMCAST ETERNALS", "IDONETH DEEPKIN", "DAUGHTERS OF KHAINE",
      "FYRESLAYERS", "KHARADRON OVERLORDS", "LUMINETH REALM-LORDS",
      "CITIES OF SIGMAR", "SERAPHON", "SYLVANETH", "BLADES OF KHORNE",
      "DISCIPLES OF TZEENTCH", "HEDONITES OF SLAANESH", "MAGGOTKIN OF NURGLE",
      "BEASTS OF CHAOS", "SKAVEN", "SLAVES TO DARKNESS", "FLESH-EATER COURTS",
      "NIGHTHAUNT", "OSSIARCH BONEREAPERS", "SOULBLIGHT GRAVELORDS",
      "GLOOMSPITE GITZ", "OGOR MAWTRIBES", "ORRUK WARCLANS", "SONS OF BEHEMAT",
      "IRONJAWZ", "KRULEBOYZ", "BONESPLITTERZ", "HELSMITHS OF HASHUT",
    ];
    return factionKeywords.includes(keyword.toUpperCase());
  }

  /**
   * Add hero-specific fields to the warscroll
   */
  private addHeroFields(
    warscroll: Warscroll,
    entry: BSSelectionEntry,
    keywords: string[]
  ): void {
    warscroll.wizard = this.extractWizardLevel(entry, keywords);
    warscroll.priest = this.extractPriestLevel(entry, keywords);
    warscroll.unique = isUnique(keywords);

    // Extract regiment allows from BSData constraints/modifiers
    const regimentAllows = this.extractRegimentAllows(entry);
    if (regimentAllows.length > 0) {
      warscroll.regimentAllows = regimentAllows;
    }

    // Default canJoinRegiment to null
    warscroll.canJoinRegiment = null;
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

  private extractSizes(entry: BSSelectionEntry): Sizes {
    const minSize = this.extractMinSize(entry);
    const maxSize = this.extractMaxSize(entry);

    return {
      min: minSize,
      default: minSize, // Default is usually the min
      max: maxSize,
    };
  }

  private extractMinSize(entry: BSSelectionEntry): number {
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
      let total = 0;
      for (const model of modelEntries) {
        const min = getConstraint(model, "min", "selections");
        if (min) total += min;
      }
      if (total > 0) return total;
    }

    // Default to 1
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
      let total = 0;
      for (const model of modelEntries) {
        const max = getConstraint(model, "max", "selections");
        if (max) total += max;
      }
      if (total > 0) return total;
    }

    return undefined;
  }

  private findWeaponProfiles(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile[] {
    const allProfiles = getAllProfiles(catalogue, entry);
    const directWeapons = allProfiles.filter(isWeaponProfile);

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

  private extractWizardLevel(
    entry: BSSelectionEntry,
    keywords: string[]
  ): number | null {
    if (!isWizard(keywords)) {
      return null;
    }

    const levelFromName = parseWizardLevel(entry.$.name);
    if (levelFromName) return levelFromName;

    for (const keyword of keywords) {
      const level = parseWizardLevel(keyword);
      if (level) return level;
    }

    return 1;
  }

  private extractPriestLevel(
    entry: BSSelectionEntry,
    keywords: string[]
  ): number | null {
    if (!isPriest(keywords)) {
      return null;
    }

    const levelFromName = parsePriestLevel(entry.$.name);
    if (levelFromName) return levelFromName;

    for (const keyword of keywords) {
      const level = parsePriestLevel(keyword);
      if (level) return level;
    }

    return 1;
  }

  private extractRegimentAllows(
    entry: BSSelectionEntry
  ): RegimentAllows[] {
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

  private isCollectiveUnit(entry: BSSelectionEntry): boolean {
    if (entry.$.collective === "true") {
      return true;
    }

    if (entry.selectionEntries) {
      for (const child of entry.selectionEntries) {
        if (child.$.type === "model" && child.$.collective === "true") {
          return true;
        }
      }
    }

    return false;
  }

  private extractRules(entry: BSSelectionEntry): Rule[] {
    if (!entry.rules) {
      return [];
    }

    return entry.rules
      .filter((rule) => rule.$.hidden !== "true")
      .map((rule) => ({
        name: rule.$.name,
        description: rule.description?.[0] || "",
      }))
      .filter((rule) => rule.description.length > 0);
  }

  private extractPublication(
    entry: BSSelectionEntry
  ): { name: string; shortName?: string; page?: string } | undefined {
    const publicationId = entry.$.publicationId;
    const page = entry.$.page;

    if (!publicationId) {
      return undefined;
    }

    if (this.options.publicationResolver) {
      const resolved = this.options.publicationResolver.resolve(publicationId, page);
      if (resolved) {
        return resolved;
      }
    }

    const result: { name: string; shortName?: string; page?: string } = {
      name: publicationId,
    };
    if (page) {
      result.page = page;
    }
    return result;
  }
}

/**
 * Map a single entry to warscroll
 */
export function mapWarscroll(
  entry: BSSelectionEntry,
  catalogue: BSCatalogue,
  options: MapperOptions
): Warscroll {
  const mapper = new WarscrollMapper(options);
  return mapper.map({ entry, catalogue });
}

/**
 * Map all entries to warscrolls
 */
export function mapAllWarscrolls(
  entries: BSSelectionEntry[],
  catalogue: BSCatalogue,
  options: MapperOptions
): Warscroll[] {
  const mapper = new WarscrollMapper(options);
  return entries.map((entry) => mapper.map({ entry, catalogue }));
}
