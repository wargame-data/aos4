/**
 * Faction Terrain Mapper
 *
 * Maps BSData selection entries (faction terrain pieces) to aos-data terrain schema format.
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
} from "../xml/traverser.js";
import { toKebabCase } from "../transformers/id.js";
import { extractKeywords, extractGrandAlliance } from "../transformers/keywords.js";
import { AbilityMapper, type Ability, isAbilityProfile } from "./ability.mapper.js";

/**
 * Terrain stats (from Unit profile)
 */
export interface TerrainStats {
  move: string;
  health: string;
  save: string;
  control: string;
}

/**
 * aos-data FactionTerrain type
 */
export interface FactionTerrain {
  $schema?: string;
  id: string;
  name: string;
  faction: string;
  grandAlliance?: string;
  points?: number;
  stats: TerrainStats;
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
  abilities?: Ability[];
  _meta?: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Input for terrain mapping
 */
export interface TerrainMapperInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData selection entries to aos-data terrain format
 */
export class TerrainMapper extends BaseMapper<TerrainMapperInput, FactionTerrain> {
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: TerrainMapperInput): FactionTerrain {
    const { entry, catalogue } = input;
    const keywords = extractKeywords(getCategoryLinks(entry));

    // Get Unit profile for stats (terrain uses Unit profile type)
    const unitProfile = this.findUnitProfile(entry, catalogue);
    const stats = this.extractStats(unitProfile, entry);

    // Get abilities
    const abilityProfiles = this.findAbilityProfiles(entry, catalogue);
    const abilities = abilityProfiles.map((p) => this.abilityMapper.map(p));

    // Build terrain
    const terrain: FactionTerrain = {
      $schema: "https://aos-data.org/schema/terrain.schema.json",
      id: toKebabCase(entry.$.name),
      name: entry.$.name,
      faction: this.options.factionId,
      stats,
      keywords,
      _meta: this.generateMeta(),
    };

    // Add points if present (terrain is usually free)
    const points = getPointsCost(entry);
    if (points > 0) {
      terrain.points = points;
    }

    // Add optional fields
    const grandAlliance = extractGrandAlliance(keywords) || this.options.grandAlliance;
    if (grandAlliance) {
      terrain.grandAlliance = grandAlliance;
    }

    // Extract alternative costs
    const allCosts = getAllCosts(entry);
    if (allCosts.destinyPoints || allCosts.ptgCategory || allCosts.ghbCategory) {
      terrain.costs = {};
      if (allCosts.destinyPoints) terrain.costs.destinyPoints = allCosts.destinyPoints;
      if (allCosts.ptgCategory) terrain.costs.ptgCategory = allCosts.ptgCategory;
      if (allCosts.ghbCategory) terrain.costs.ghbCategory = allCosts.ghbCategory;
    }

    // Extract publication reference
    const publication = this.extractPublication(entry);
    if (publication) {
      terrain.publication = publication;
    }

    // Extract base size from rules
    const baseSize = this.extractBaseSize(entry);
    if (baseSize) {
      terrain.baseSize = baseSize;
    }

    if (abilities.length > 0) {
      terrain.abilities = abilities;
    }

    return terrain;
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
  ): TerrainStats {
    if (!profile) {
      this.recordUnmapped({
        type: "missing_profile",
        message: "No Unit profile found for terrain stats",
        location: {
          catalogue: this.options.catalogueName,
          entryId: entry.$.id,
          entryName: entry.$.name,
        },
        suggestion: "Check BSData entry for Unit profile type",
      });

      // Return defaults for immobile terrain
      return {
        move: "-",
        health: "10",
        save: "4+",
        control: "-",
      };
    }

    const rawMove = findCharacteristic(profile, "Move") || "-";
    const health = findCharacteristic(profile, "Health") || "10";
    const save = findCharacteristic(profile, "Save") || "-";
    const control = findCharacteristic(profile, "Control") || "-";

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
      health,
      save,
      control,
    };
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
 * Map a single terrain entry
 */
export function mapFactionTerrain(
  entry: BSSelectionEntry,
  catalogue: BSCatalogue,
  options: MapperOptions
): FactionTerrain {
  const mapper = new TerrainMapper(options);
  return mapper.map({ entry, catalogue });
}

/**
 * Map all terrain in a catalogue
 */
export function mapAllFactionTerrain(
  entries: BSSelectionEntry[],
  catalogue: BSCatalogue,
  options: MapperOptions
): FactionTerrain[] {
  const mapper = new TerrainMapper(options);
  return entries.map((entry) => mapper.map({ entry, catalogue }));
}
