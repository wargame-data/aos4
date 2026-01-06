/**
 * Manifestation Mapper
 *
 * Maps BSData selection entries (manifestations/endless spells) to aos-data manifestation schema format.
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
  getAllCosts,
  type AllCosts,
} from "../xml/traverser.js";
import { toKebabCase } from "../transformers/id.js";
import { extractKeywords, extractGrandAlliance } from "../transformers/keywords.js";
import { WeaponMapper, type Weapon, isWeaponProfile } from "./weapon.mapper.js";
import { AbilityMapper, type Ability, isAbilityProfile } from "./ability.mapper.js";

/**
 * Manifestation stats
 */
export interface ManifestationStats {
  move: string;
  health: number;
  save: string;
  banishment: number;
}

/**
 * aos-data Manifestation type
 */
export interface Manifestation {
  $schema?: string;
  id: string;
  name: string;
  faction: string;
  grandAlliance?: string;
  points: number;
  stats: ManifestationStats;
  keywords: string[];
  baseSize?: string;
  costs?: {
    destinyPoints?: number;
    ptgCategory?: number;
    ghbCategory?: number;
  };
  publication?: {
    name: string;
    shortName?: string;
    page?: string;
  };
  weapons?: Weapon[];
  abilities?: Ability[];
  _meta?: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Input for manifestation mapping
 */
export interface ManifestationMapperInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData selection entries to aos-data manifestation format
 */
export class ManifestationMapper extends BaseMapper<ManifestationMapperInput, Manifestation> {
  private weaponMapper: WeaponMapper;
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.weaponMapper = new WeaponMapper(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: ManifestationMapperInput): Manifestation {
    const { entry, catalogue } = input;
    const keywords = extractKeywords(getCategoryLinks(entry));

    // Get manifestation profile for stats
    const manifestationProfile = this.findManifestationProfile(entry, catalogue);
    const stats = this.extractStats(manifestationProfile, entry);

    // Get weapons and abilities
    const weaponProfiles = this.findWeaponProfiles(entry, catalogue);
    const abilityProfiles = this.findAbilityProfiles(entry, catalogue);

    const weapons = weaponProfiles.map((p) => this.weaponMapper.map(p));
    const abilities = abilityProfiles.map((p) => this.abilityMapper.map(p));

    // Build manifestation
    const manifestation: Manifestation = {
      $schema: "https://aos-data.org/schema/manifestation.schema.json",
      id: toKebabCase(entry.$.name),
      name: entry.$.name,
      faction: this.options.factionId,
      points: getPointsCost(entry),
      stats,
      keywords,
      _meta: this.generateMeta(),
    };

    // Add optional fields
    const grandAlliance = extractGrandAlliance(keywords) || this.options.grandAlliance;
    if (grandAlliance) {
      manifestation.grandAlliance = grandAlliance;
    }

    // Extract alternative costs
    const allCosts = getAllCosts(entry);
    if (allCosts.destinyPoints || allCosts.ptgCategory || allCosts.ghbCategory) {
      manifestation.costs = {};
      if (allCosts.destinyPoints) manifestation.costs.destinyPoints = allCosts.destinyPoints;
      if (allCosts.ptgCategory) manifestation.costs.ptgCategory = allCosts.ptgCategory;
      if (allCosts.ghbCategory) manifestation.costs.ghbCategory = allCosts.ghbCategory;
    }

    // Extract publication reference
    const publication = this.extractPublication(entry);
    if (publication) {
      manifestation.publication = publication;
    }

    // Extract base size from rules
    const baseSize = this.extractBaseSize(entry);
    if (baseSize) {
      manifestation.baseSize = baseSize;
    }

    if (weapons.length > 0) {
      manifestation.weapons = weapons;
    }

    if (abilities.length > 0) {
      manifestation.abilities = abilities;
    }

    return manifestation;
  }

  private findManifestationProfile(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile | null {
    // First check direct profiles
    const allProfiles = getAllProfiles(catalogue, entry);
    const manifestationProfile = allProfiles.find(
      (p) => p.$.typeName.toLowerCase() === "manifestation"
    );

    if (manifestationProfile) return manifestationProfile;

    // Check recursive profiles
    const recursiveProfiles = findProfilesRecursive(entry, "Manifestation");
    if (recursiveProfiles.length > 0) return recursiveProfiles[0];

    return null;
  }

  private extractStats(
    profile: BSProfile | null,
    entry: BSSelectionEntry
  ): ManifestationStats {
    if (!profile) {
      this.recordUnmapped({
        type: "missing_profile",
        message: "No Manifestation profile found for stats",
        location: {
          catalogue: this.options.catalogueName,
          entryId: entry.$.id,
          entryName: entry.$.name,
        },
        suggestion: "Check BSData entry for Manifestation profile type",
      });

      // Return defaults
      return {
        move: '8"',
        health: 5,
        save: "-",
        banishment: 7,
      };
    }

    const rawMove = findCharacteristic(profile, "Move") || '8"';
    const health = parseInt(findCharacteristic(profile, "Health") || "5", 10);
    const save = findCharacteristic(profile, "Save") || "-";
    const banishment = parseInt(findCharacteristic(profile, "Banishment") || "7", 10);

    // Normalize move value: "-" means immobile, otherwise ensure it ends with "
    let move: string;
    const cleanMove = rawMove.replace(/"/g, "").trim();
    if (cleanMove === "-" || cleanMove === "") {
      move = "-";
    } else {
      move = `${cleanMove}"`;
    }

    return {
      move,
      health: isNaN(health) ? 5 : health,
      save,
      banishment: isNaN(banishment) ? 7 : banishment,
    };
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

  private extractBaseSize(entry: BSSelectionEntry): string | undefined {
    // Look for Base Size rule
    if (entry.rules) {
      for (const rule of entry.rules) {
        if (rule.$.name.toLowerCase().includes("base size") && rule.description?.[0]) {
          // Handle both string and object with _ property (xml2js format)
          const desc = rule.description[0];
          if (typeof desc === "string") {
            return desc;
          } else if (typeof desc === "object" && "_" in desc) {
            return (desc as { _: string })._;
          }
        }
      }
    }
    return undefined;
  }
}

/**
 * Map a single manifestation entry
 */
export function mapManifestation(
  entry: BSSelectionEntry,
  catalogue: BSCatalogue,
  options: MapperOptions
): Manifestation {
  const mapper = new ManifestationMapper(options);
  return mapper.map({ entry, catalogue });
}

/**
 * Map all manifestations in a catalogue
 */
export function mapAllManifestations(
  entries: BSSelectionEntry[],
  catalogue: BSCatalogue,
  options: MapperOptions
): Manifestation[] {
  const mapper = new ManifestationMapper(options);
  return entries.map((entry) => mapper.map({ entry, catalogue }));
}
