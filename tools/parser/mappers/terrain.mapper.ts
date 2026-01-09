/**
 * Terrain Mapper
 *
 * Maps BSData faction terrain entries to the catalog terrain format.
 * Faction terrain is found in Library files with the FACTION TERRAIN category.
 */

import type {
  BSCatalogue,
  BSSelectionEntry,
  BSProfile,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { SCHEMA_URLS } from "../config.js";
import { findCharacteristic, findCharacteristicById } from "../xml/reader.js";
import { PROFILE_TYPES, UNIT_CHARACTERISTICS } from "../xml/gst-ids.js";
import {
  getAllProfiles,
  getCategoryLinks,
  findFactionTerrain,
} from "../xml/traverser.js";
import { toUnderscoreId, toQualifiedId } from "../transformers/id.js";
import {
  extractKeywords,
  extractGrandAlliance,
} from "../transformers/keywords.js";
import {
  AbilityMapper,
  type Ability,
  isAbilityProfile,
} from "./ability.mapper.js";
import type { Terrain, TerrainStats } from "../../schemas/schemas/terrain.schema.js";

/**
 * Input for terrain mapping
 */
export interface TerrainMapperInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData faction terrain entries to catalog terrain format
 */
export class TerrainMapper extends BaseMapper<TerrainMapperInput, Terrain> {
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: TerrainMapperInput): Terrain {
    const { entry, catalogue } = input;
    const keywords = extractKeywords(getCategoryLinks(entry));

    // Get unit profile for stats
    const unitProfile = this.findUnitProfile(entry, catalogue);
    const stats = this.extractStats(unitProfile, entry);

    // Get abilities
    const abilityProfiles = this.findAbilityProfiles(entry, catalogue);
    const abilities = abilityProfiles.map((p) => this.abilityMapper.map(p));

    // Transform keywords to lowercase format with faction tag
    const transformedKeywords = this.transformKeywords(keywords);

    // Build terrain
    const terrain: Terrain = {
      $schema: SCHEMA_URLS.terrain,
      id: toQualifiedId("terrain", this.options.factionId, entry.$.name),
      bsdataId: entry.$.id,
      type: "terrain",
      name: entry.$.name,
      faction: toUnderscoreId(this.options.factionId),
      keywords: transformedKeywords,
      stats,
      abilities,
      _meta: this.generateMeta(),
    };

    // Add grand alliance if available
    const grandAlliance = extractGrandAlliance(keywords) || this.options.grandAlliance;
    if (grandAlliance) {
      terrain.grandAlliance = grandAlliance as "order" | "chaos" | "death" | "destruction";
    }

    return terrain;
  }

  /**
   * Transform keywords to lowercase format with faction tag
   */
  private transformKeywords(originalKeywords: string[]): string[] {
    const keywords: string[] = [];

    // Add lowercase versions of keywords
    for (const kw of originalKeywords) {
      const lower = kw.toLowerCase();
      // Skip faction keywords - we'll add a standardized one
      if (!this.isFactionKeyword(kw)) {
        keywords.push(lower);
      }
    }

    // Add standardized faction tag
    keywords.push(`faction:${toUnderscoreId(this.options.factionId)}`);

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
   * Find the Unit profile for terrain stats
   */
  private findUnitProfile(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile | null {
    const allProfiles = getAllProfiles(catalogue, entry);

    // Check for Unit profile by typeId (primary detection)
    const unitProfile = allProfiles.find(
      (p) => p.$.typeId === PROFILE_TYPES.UNIT
    );
    if (unitProfile) return unitProfile;

    // Fallback: check by typeName
    const unitProfileByName = allProfiles.find(
      (p) => p.$.typeName?.toLowerCase() === "unit"
    );
    if (unitProfileByName) return unitProfileByName;

    return null;
  }

  /**
   * Extract stats from the Unit profile
   */
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

      // Return defaults for terrain (immobile)
      return {
        move: "-",
        health: 1,
        save: "4+",
        control: "-",
      };
    }

    // Use ID-based extraction with name-based fallback
    const move = findCharacteristicById(profile, UNIT_CHARACTERISTICS.MOVE) ||
      findCharacteristic(profile, "Move") || "-";
    const healthStr = findCharacteristicById(profile, UNIT_CHARACTERISTICS.HEALTH) ||
      findCharacteristic(profile, "Health") || "1";
    const save = findCharacteristicById(profile, UNIT_CHARACTERISTICS.SAVE) ||
      findCharacteristic(profile, "Save") || "4+";
    const controlStr = findCharacteristicById(profile, UNIT_CHARACTERISTICS.CONTROL) ||
      findCharacteristic(profile, "Control") || "-";

    // Parse health as number
    const health = parseInt(healthStr, 10) || 1;

    // Control can be "-" or a number
    const control = controlStr === "-" ? "-" : parseInt(controlStr, 10) || 0;

    return {
      move,
      health,
      save,
      control,
    };
  }

  /**
   * Find all ability profiles for the terrain
   */
  private findAbilityProfiles(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile[] {
    const allProfiles = getAllProfiles(catalogue, entry);
    const abilities = allProfiles.filter(isAbilityProfile);

    // Deduplicate by name
    const seen = new Set<string>();
    const uniqueAbilities: BSProfile[] = [];

    for (const ability of abilities) {
      if (!seen.has(ability.$.name)) {
        seen.add(ability.$.name);
        uniqueAbilities.push(ability);
      }
    }

    return uniqueAbilities;
  }
}

/**
 * Map all faction terrain from a catalogue
 */
export function mapTerrains(
  catalogue: BSCatalogue,
  options: MapperOptions
): Terrain[] {
  const entries = findFactionTerrain(catalogue);
  const mapper = new TerrainMapper(options);
  const terrains: Terrain[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    // Skip hidden entries
    if (entry.$.hidden === "true") {
      continue;
    }

    try {
      const terrain = mapper.map({ entry, catalogue });

      // Avoid duplicates (same BSData ID)
      if (!seenIds.has(terrain.bsdataId)) {
        seenIds.add(terrain.bsdataId);
        terrains.push(terrain);
      }
    } catch (error) {
      // Log error but continue processing
      console.error(`Error mapping terrain ${entry.$.name}:`, error);
    }
  }

  return terrains;
}
