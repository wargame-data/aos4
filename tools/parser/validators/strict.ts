/**
 * Strict Validator
 *
 * Validates completeness of BSData mapping in strict mode.
 */

import type { BSSelectionEntry, BSProfile, BSCatalogue } from "../xml/types.js";
import type { StrictModeError } from "../mappers/base.js";
import { getAllProfiles } from "../xml/traverser.js";

/**
 * Known profile types that we can map
 */
const KNOWN_PROFILE_TYPES = new Set([
  "unit",
  "melee weapon",
  "ranged weapon",
  "ability",
  "spell",
  "prayer",
  "command ability",
]);

/**
 * Known characteristic names
 */
const KNOWN_CHARACTERISTICS = new Set([
  // Unit
  "move",
  "health",
  "save",
  "control",
  "banishment",
  // Weapon
  "range",
  "attacks",
  "to hit",
  "hit",
  "to wound",
  "wound",
  "rend",
  "damage",
  "ability",
  "abilities",
  // Ability
  "type",
  "timing",
  "declare",
  "effect",
  "description",
  "text",
  "casting value",
  "chanting value",
  "keywords",
]);

/**
 * Strict validator for BSData completeness
 */
export class StrictValidator {
  private errors: StrictModeError[] = [];
  private catalogueName: string;

  constructor(catalogueName: string) {
    this.catalogueName = catalogueName;
  }

  /**
   * Validate a selection entry for unmapped data
   */
  validateEntry(
    entry: BSSelectionEntry,
    catalogue: BSCatalogue,
    mappedProfileIds: Set<string>
  ): void {
    const allProfiles = getAllProfiles(catalogue, entry);

    for (const profile of allProfiles) {
      // Check if profile was mapped
      if (!mappedProfileIds.has(profile.$.id)) {
        const typeName = profile.$.typeName.toLowerCase();

        // Check if it's a known type that should have been mapped
        if (KNOWN_PROFILE_TYPES.has(typeName)) {
          this.errors.push({
            type: "unmapped_profile",
            message: `Profile "${profile.$.name}" of type "${profile.$.typeName}" was not mapped`,
            location: {
              catalogue: this.catalogueName,
              entryId: entry.$.id,
              entryName: entry.$.name,
              path: `profiles[${profile.$.id}]`,
            },
            bsdataElement: profile,
            suggestion: `Check if this profile type is being processed`,
          });
        } else {
          // Unknown profile type
          this.errors.push({
            type: "unknown_profile_type",
            message: `Unknown profile type "${profile.$.typeName}" for profile "${profile.$.name}"`,
            location: {
              catalogue: this.catalogueName,
              entryId: entry.$.id,
              entryName: entry.$.name,
              path: `profiles[${profile.$.id}]`,
            },
            bsdataElement: profile,
            suggestion: `Add mapping for profile type "${profile.$.typeName}"`,
          });
        }
      }

      // Check characteristics
      this.validateCharacteristics(profile, entry);
    }
  }

  /**
   * Validate characteristics in a profile
   */
  private validateCharacteristics(
    profile: BSProfile,
    entry: BSSelectionEntry
  ): void {
    if (!profile.characteristics) return;

    for (const char of profile.characteristics) {
      const charName = char.$.name.toLowerCase();

      if (!KNOWN_CHARACTERISTICS.has(charName)) {
        this.errors.push({
          type: "unknown_characteristic",
          message: `Unknown characteristic "${char.$.name}" in profile "${profile.$.name}"`,
          location: {
            catalogue: this.catalogueName,
            entryId: entry.$.id,
            entryName: entry.$.name,
            path: `profiles[${profile.$.id}].characteristics[${char.$.name}]`,
          },
          bsdataElement: char,
          suggestion: `Add mapping for characteristic "${char.$.name}"`,
        });
      }
    }
  }

  /**
   * Check if validation has errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get all errors
   */
  getErrors(): StrictModeError[] {
    return [...this.errors];
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Format errors for display
   */
  formatErrors(): string {
    if (this.errors.length === 0) {
      return "No strict mode violations found.";
    }

    // Group by type
    const byType = new Map<string, StrictModeError[]>();
    for (const error of this.errors) {
      const existing = byType.get(error.type) || [];
      existing.push(error);
      byType.set(error.type, existing);
    }

    let output = `\n${"=".repeat(60)}\n`;
    output += `STRICT MODE: ${this.errors.length} issues found\n`;
    output += `Catalogue: ${this.catalogueName}\n`;
    output += `${"=".repeat(60)}\n\n`;

    for (const [type, errors] of byType) {
      output += `## ${type.replace(/_/g, " ").toUpperCase()} (${errors.length})\n\n`;

      const displayErrors = errors.slice(0, 5);
      for (const error of displayErrors) {
        output += `  - ${error.location.entryName || "Unknown"}\n`;
        output += `    ${error.message}\n`;
        if (error.suggestion) {
          output += `    Suggestion: ${error.suggestion}\n`;
        }
        output += "\n";
      }

      if (errors.length > 5) {
        output += `  ... and ${errors.length - 5} more\n\n`;
      }
    }

    return output;
  }

  /**
   * Clear errors
   */
  clear(): void {
    this.errors = [];
  }
}

/**
 * Create a strict validator
 */
export function createStrictValidator(catalogueName: string): StrictValidator {
  return new StrictValidator(catalogueName);
}
