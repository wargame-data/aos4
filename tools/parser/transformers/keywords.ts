/**
 * Keywords Transformer
 *
 * Extracts and transforms keywords from BSData category links.
 */

import type { BSCategoryLink, BSSelectionEntry } from "../xml/types.js";

/**
 * Grand Alliance mappings
 */
export const GRAND_ALLIANCE_KEYWORDS = new Set([
  "ORDER",
  "CHAOS",
  "DEATH",
  "DESTRUCTION",
]);

export type GrandAlliance = "order" | "chaos" | "death" | "destruction";

/**
 * Role keywords that determine battlefield role
 */
export const ROLE_KEYWORDS: Record<string, string> = {
  BATTLELINE: "battleline",
  "BATTLE LINE": "battleline",
  BEHEMOTH: "behemoth",
  ARTILLERY: "artillery",
};

/**
 * Unit type keywords
 */
export const UNIT_TYPE_KEYWORDS = new Set([
  "INFANTRY",
  "CAVALRY",
  "MONSTER",
  "WAR MACHINE",
  "WARMACHINE",
  "HERO",
  "WIZARD",
  "PRIEST",
  "UNIQUE",
  "TOTEM",
  "WARMASTER",
]);

/**
 * Categories to exclude from keywords (internal BSData categories)
 */
export const EXCLUDED_CATEGORIES = new Set([
  "CONFIGURATION",
  "CONFIG",
  "UPGRADE",
  "CORE",
  "ALLEGIANCE",
  "ALLIED",
  "GENERAL",
  "REINFORCED",
  "REINFORCEMENT",
  "ENHANCED",
  "BONUS",
  "FREE",
  "POINTS",
  "PTS",
]);

/**
 * Extract keywords from category links
 */
export function extractKeywords(categoryLinks: BSCategoryLink[]): string[] {
  const keywords = new Set<string>();

  for (const link of categoryLinks) {
    const name = link.$.name.toUpperCase().trim();

    // Skip excluded categories
    if (EXCLUDED_CATEGORIES.has(name)) {
      continue;
    }

    // Skip hidden categories
    if (link.$.hidden === "true") {
      continue;
    }

    keywords.add(name);
  }

  return Array.from(keywords).sort();
}

/**
 * Determine grand alliance from keywords
 */
export function extractGrandAlliance(keywords: string[]): GrandAlliance | null {
  for (const keyword of keywords) {
    const upper = keyword.toUpperCase();
    if (GRAND_ALLIANCE_KEYWORDS.has(upper)) {
      return upper.toLowerCase() as GrandAlliance;
    }
  }
  return null;
}

/**
 * Determine battlefield role from keywords/categories
 */
export function extractRole(
  keywords: string[]
): "battleline" | "other" | "artillery" | "behemoth" {
  for (const keyword of keywords) {
    const upper = keyword.toUpperCase();
    if (upper in ROLE_KEYWORDS) {
      return ROLE_KEYWORDS[upper] as "battleline" | "artillery" | "behemoth";
    }
  }
  return "other";
}

/**
 * Check if keywords indicate a hero
 */
export function isHero(keywords: string[]): boolean {
  return keywords.some((k) => k.toUpperCase() === "HERO");
}

/**
 * Check if keywords indicate a unique character
 */
export function isUnique(keywords: string[]): boolean {
  return keywords.some((k) => k.toUpperCase() === "UNIQUE");
}

/**
 * Check if keywords indicate a wizard
 */
export function isWizard(keywords: string[]): boolean {
  return keywords.some((k) => k.toUpperCase() === "WIZARD");
}

/**
 * Check if keywords indicate a priest
 */
export function isPriest(keywords: string[]): boolean {
  return keywords.some((k) => k.toUpperCase() === "PRIEST");
}

/**
 * Extract regiment keywords (used for army building restrictions)
 * These are typically faction-specific chamber/clan/bloodline keywords
 */
export function extractRegimentKeywords(keywords: string[]): string[] {
  // Filter out generic keywords that aren't used for regiment building
  const genericKeywords = new Set([
    ...GRAND_ALLIANCE_KEYWORDS,
    ...UNIT_TYPE_KEYWORDS,
    ...Object.keys(ROLE_KEYWORDS),
    "HERO",
    "WIZARD",
    "PRIEST",
    "UNIQUE",
    "TOTEM",
    "WARMASTER",
  ]);

  return keywords.filter((k) => !genericKeywords.has(k.toUpperCase()));
}

/**
 * Normalize a keyword to consistent format
 */
export function normalizeKeyword(keyword: string): string {
  return keyword.toUpperCase().trim();
}

/**
 * Extract faction keyword from keywords list
 * Usually the most specific non-generic keyword
 */
export function extractFactionKeyword(keywords: string[]): string | null {
  // Filter out generic keywords
  const candidates = keywords.filter((k) => {
    const upper = k.toUpperCase();
    return (
      !GRAND_ALLIANCE_KEYWORDS.has(upper) &&
      !UNIT_TYPE_KEYWORDS.has(upper) &&
      !(upper in ROLE_KEYWORDS)
    );
  });

  // Return first non-generic keyword as faction keyword
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Extract all keywords from a selection entry
 */
export function extractKeywordsFromEntry(entry: BSSelectionEntry): string[] {
  return extractKeywords(entry.categoryLinks || []);
}

/**
 * Parse wizard level from entry name or characteristics
 * "Wizard (1)" -> 1
 * "Wizard (2)" -> 2
 */
export function parseWizardLevel(value: string): number | null {
  if (!value) return null;

  const match = value.match(/wizard\s*\(?(\d+)\)?/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Check for plain "Wizard" (implies level 1)
  if (/wizard/i.test(value)) {
    return 1;
  }

  return null;
}

/**
 * Parse priest level from entry name or characteristics
 * "Priest (1)" -> 1
 * "Priest (2)" -> 2
 */
export function parsePriestLevel(value: string): number | null {
  if (!value) return null;

  const match = value.match(/priest\s*\(?(\d+)\)?/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Check for plain "Priest" (implies level 1)
  if (/priest/i.test(value)) {
    return 1;
  }

  return null;
}
