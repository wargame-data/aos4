/**
 * ID Transformer
 *
 * Generates IDs from names in various formats.
 */

/**
 * Convert a name to kebab-case ID (legacy format)
 * "Knight-Incantor" -> "knight-incantor"
 * "Lord-Celestant on Stardrake" -> "lord-celestant-on-stardrake"
 * "Liberators" -> "liberators"
 */
export function toKebabCase(name: string): string {
  if (!name) return "";

  return name
    .toLowerCase()
    .trim()
    // Replace special characters with hyphens
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Convert a name to underscore_case ID (new format)
 * "Knight-Arcanum" -> "knight_arcanum"
 * "Lord-Celestant on Stardrake" -> "lord_celestant_on_stardrake"
 * "Liberators" -> "liberators"
 */
export function toUnderscoreId(name: string): string {
  if (!name) return "";

  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscores
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Generate a qualified ID in format: type.faction.name
 * e.g., "warscroll.stormcast.knight_arcanum"
 */
export function toQualifiedId(type: string, faction: string, name: string): string {
  const factionId = toUnderscoreId(faction);
  const nameId = toUnderscoreId(name);
  return `${type}.${factionId}.${nameId}`;
}

/**
 * Generate a unit ID from name and optional suffix
 * Useful for disambiguating units with similar names
 */
export function generateUnitId(name: string, suffix?: string): string {
  const base = toKebabCase(name);
  if (suffix) {
    return `${base}-${toKebabCase(suffix)}`;
  }
  return base;
}

/**
 * Generate a faction ID from catalogue name
 * "Stormcast Eternals" -> "stormcast-eternals"
 * "Blades of Khorne" -> "blades-of-khorne"
 */
export function toFactionId(name: string): string {
  return toKebabCase(name);
}

/**
 * Validate that an ID matches the schema pattern
 * Pattern: ^[a-z0-9-]+$
 */
export function isValidId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id);
}

/**
 * Sanitize an ID to ensure it matches the schema pattern
 */
export function sanitizeId(id: string): string {
  const sanitized = toKebabCase(id);
  if (!isValidId(sanitized)) {
    // Fallback: remove any remaining invalid characters
    return sanitized.replace(/[^a-z0-9-]/g, "");
  }
  return sanitized;
}

/**
 * Generate a unique ID by appending a number if needed
 */
export function generateUniqueId(
  baseId: string,
  existingIds: Set<string>
): string {
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let counter = 2;
  while (existingIds.has(`${baseId}-${counter}`)) {
    counter++;
  }

  return `${baseId}-${counter}`;
}

/**
 * Extract a clean name from BSData entry name
 * Removes common suffixes/prefixes that BSData adds
 */
export function cleanEntryName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/g, "") // Remove trailing parenthetical
    .replace(/\s*\[[^\]]*\]\s*$/g, "") // Remove trailing brackets
    .trim();
}
