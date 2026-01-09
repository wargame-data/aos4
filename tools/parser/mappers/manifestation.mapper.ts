/**
 * Manifestation Mapper
 *
 * Maps BSData manifestation entries to the catalog manifestation format.
 * Manifestations are found in Library files with the MANIFESTATION category or profile.
 */

import type {
  BSCatalogue,
  BSSelectionEntry,
  BSProfile,
} from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { SCHEMA_URLS } from "../config.js";
import { findCharacteristicById } from "../xml/reader.js";
import {
  PROFILE_TYPES,
  MANIFESTATION_CHARACTERISTICS,
  FACTION_CATEGORY_TO_FACTION_ID,
  detectFactionFromCategoryIds,
} from "../xml/gst-ids.js";
import {
  getAllProfiles,
  getCategoryLinks,
  findManifestationsById,
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
import type { Manifestation, ManifestationStats } from "../../schemas/schemas/manifestation.schema.js";

/**
 * Input for manifestation mapping
 */
export interface ManifestationMapperInput {
  entry: BSSelectionEntry;
  catalogue: BSCatalogue;
}

/**
 * Maps BSData manifestation entries to catalog manifestation format
 */
export class ManifestationMapper extends BaseMapper<ManifestationMapperInput, Manifestation> {
  private abilityMapper: AbilityMapper;

  constructor(options: MapperOptions) {
    super(options);
    this.abilityMapper = new AbilityMapper(options);
  }

  map(input: ManifestationMapperInput): Manifestation {
    const { entry, catalogue } = input;
    const categoryLinks = getCategoryLinks(entry);
    const keywords = extractKeywords(categoryLinks);

    // Detect faction from category link targetIds (ID-based, more reliable than name matching)
    const targetIds = categoryLinks.map((link) => link.$.targetId);
    const detectedFaction = detectFactionFromCategoryIds(targetIds, this.options.factionId);

    // Get manifestation profile for stats
    const manifestationProfile = this.findManifestationProfile(entry, catalogue);
    const stats = this.extractStats(manifestationProfile, entry);

    // Get abilities
    const abilityProfiles = this.findAbilityProfiles(entry, catalogue);
    const abilities = abilityProfiles.map((p) => this.abilityMapper.map(p));

    // Transform keywords to lowercase format with faction tag
    const transformedKeywords = this.transformKeywords(keywords, detectedFaction, targetIds);

    // Build manifestation
    const manifestation: Manifestation = {
      $schema: SCHEMA_URLS.manifestation,
      id: toQualifiedId("manifestation", detectedFaction, entry.$.name),
      bsdataId: entry.$.id,
      type: "manifestation",
      name: entry.$.name,
      faction: toUnderscoreId(detectedFaction),
      keywords: transformedKeywords,
      stats,
      abilities,
      _meta: this.generateMeta(),
    };

    // Add grand alliance if available
    const grandAlliance = extractGrandAlliance(keywords) || this.options.grandAlliance;
    if (grandAlliance) {
      manifestation.grandAlliance = grandAlliance as "order" | "chaos" | "death" | "destruction";
    }

    return manifestation;
  }

  /**
   * Transform keywords to lowercase format with faction tag.
   * Uses category link targetIds to filter out faction keywords by ID.
   */
  private transformKeywords(
    originalKeywords: string[],
    factionId: string,
    targetIds: string[]
  ): string[] {
    const keywords: string[] = [];

    // Build set of faction keyword names from targetIds that match faction categories
    const factionKeywordNames = new Set<string>();
    for (const targetId of targetIds) {
      if (FACTION_CATEGORY_TO_FACTION_ID[targetId]) {
        // Find the keyword name for this targetId by looking at the original keywords
        // The keyword name is already in originalKeywords if it's a faction
        const factionIdFromTarget = FACTION_CATEGORY_TO_FACTION_ID[targetId];
        // Add variations that might appear in keywords
        factionKeywordNames.add(factionIdFromTarget.replace(/_/g, " ").toUpperCase());
      }
    }

    // Add lowercase versions of keywords, skipping faction keywords
    for (const kw of originalKeywords) {
      const lower = kw.toLowerCase();
      const upper = kw.toUpperCase();
      // Skip if this keyword matches a faction (by checking targetId-based faction names)
      // or by checking if it's in FACTION_CATEGORY_TO_FACTION_ID values
      const isFaction = Object.values(FACTION_CATEGORY_TO_FACTION_ID).some(
        (fid) => fid === lower.replace(/[- ]/g, "_")
      );
      if (!isFaction) {
        keywords.push(lower);
      }
    }

    // Add standardized faction tag
    keywords.push(`faction:${toUnderscoreId(factionId)}`);

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Find the Manifestation profile for stats
   */
  private findManifestationProfile(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue
  ): BSProfile | null {
    const allProfiles = getAllProfiles(catalogue, entry);

    // Check for Manifestation profile by typeId (primary detection)
    const manifestationProfile = allProfiles.find(
      (p) => p.$.typeId === PROFILE_TYPES.MANIFESTATION
    );
    if (manifestationProfile) return manifestationProfile;

    // Fallback: check by typeName
    const manifestationProfileByName = allProfiles.find(
      (p) => p.$.typeName?.toLowerCase() === "manifestation"
    );
    if (manifestationProfileByName) return manifestationProfileByName;

    return null;
  }

  /**
   * Extract stats from the Manifestation profile
   */
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

      // Return defaults for manifestation
      return {
        move: "-",
        health: 1,
        save: "-",
        banishment: "7+",
      };
    }

    // Use ID-based extraction
    const move = findCharacteristicById(profile, MANIFESTATION_CHARACTERISTICS.MOVE) || "-";
    const healthStr = findCharacteristicById(profile, MANIFESTATION_CHARACTERISTICS.HEALTH) || "1";
    const save = findCharacteristicById(profile, MANIFESTATION_CHARACTERISTICS.SAVE) || "-";
    const banishment = findCharacteristicById(profile, MANIFESTATION_CHARACTERISTICS.BANISHMENT) || "7+";

    // Parse health as number
    const health = parseInt(healthStr, 10) || 1;

    return {
      move,
      health,
      save,
      banishment,
    };
  }

  /**
   * Find all ability profiles for the manifestation
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
 * Map all manifestations from a catalogue
 */
export function mapManifestations(
  catalogue: BSCatalogue,
  options: MapperOptions
): Manifestation[] {
  const entries = findManifestationsById(catalogue);
  const mapper = new ManifestationMapper(options);
  const manifestations: Manifestation[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    // Skip hidden entries
    if (entry.$.hidden === "true") {
      continue;
    }

    try {
      const manifestation = mapper.map({ entry, catalogue });

      // Avoid duplicates (same BSData ID)
      if (!seenIds.has(manifestation.bsdataId)) {
        seenIds.add(manifestation.bsdataId);
        manifestations.push(manifestation);
      }
    } catch (error) {
      // Log error but continue processing
      console.error(`Error mapping manifestation ${entry.$.name}:`, error);
    }
  }

  return manifestations;
}
