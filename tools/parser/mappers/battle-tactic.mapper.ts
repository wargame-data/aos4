/**
 * Battle Tactic Card Mapper
 *
 * Maps BSData Battle Tactic Card profiles to aos-data format.
 */

import type { BSProfile } from "../xml/types.js";
import { BaseMapper, type MapperOptions } from "./base.js";
import { findCharacteristic } from "../xml/reader.js";
import { toKebabCase } from "../transformers/id.js";

/**
 * Individual tactic within a battle tactic card
 */
export interface Tactic {
  name: string;
  description: string;
}

/**
 * aos-data Battle Tactic Card type
 */
export interface BattleTacticCard {
  $schema?: string;
  id: string;
  name: string;
  cardRules?: string;
  affray: Tactic;
  strike: Tactic;
  domination: Tactic;
  _meta?: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Maps BSData Battle Tactic Card profiles to aos-data format
 */
export class BattleTacticMapper extends BaseMapper<BSProfile, BattleTacticCard> {
  constructor(options: MapperOptions) {
    super(options);
  }

  map(profile: BSProfile): BattleTacticCard {
    const card: BattleTacticCard = {
      $schema: "https://aos-data.org/schema/battle-tactic-card.schema.json",
      id: toKebabCase(profile.$.name),
      name: profile.$.name,
      affray: this.extractTactic(profile, "Affray"),
      strike: this.extractTactic(profile, "Strike"),
      domination: this.extractTactic(profile, "Domination"),
      _meta: this.generateMeta(),
    };

    // Extract card-level rules if present
    const cardRules = findCharacteristic(profile, "Card");
    if (cardRules && cardRules.trim() !== "" && cardRules !== "-") {
      card.cardRules = this.cleanText(cardRules);
    }

    return card;
  }

  /**
   * Extract a tactic from a characteristic.
   * Format is typically "Tactic Name: Description text..."
   */
  private extractTactic(profile: BSProfile, characteristicName: string): Tactic {
    const rawValue = findCharacteristic(profile, characteristicName) || "";

    // Try to parse "Name: Description" format
    const colonIndex = rawValue.indexOf(":");
    if (colonIndex > 0) {
      const name = rawValue.substring(0, colonIndex).trim();
      const description = rawValue.substring(colonIndex + 1).trim();
      return {
        name: this.cleanText(name),
        description: this.cleanText(description),
      };
    }

    // If no colon found, use the characteristic name as the tactic name
    // and the raw value as the description
    if (rawValue.trim()) {
      return {
        name: characteristicName,
        description: this.cleanText(rawValue),
      };
    }

    // Fallback for empty values
    this.recordUnmapped({
      type: "missing_tactic",
      message: `Missing or empty ${characteristicName} tactic`,
      location: {
        catalogue: this.options.catalogueName,
        entryName: profile.$.name,
        path: characteristicName,
      },
      suggestion: "Check BSData profile for tactic text",
    });

    return {
      name: characteristicName,
      description: "",
    };
  }

  /**
   * Clean up text by removing BSData formatting markers
   */
  private cleanText(text: string): string {
    return text
      .replace(/\*\*\^\^/g, "") // Remove BSData bold markers start
      .replace(/\^\^\*\*/g, "") // Remove BSData bold markers end
      .replace(/\^\^/g, "") // Remove any remaining markers
      .trim();
  }
}

/**
 * Map multiple battle tactic card profiles
 */
export function mapBattleTacticCards(
  profiles: BSProfile[],
  options: MapperOptions
): BattleTacticCard[] {
  const mapper = new BattleTacticMapper(options);
  return profiles.map((p) => mapper.map(p));
}
