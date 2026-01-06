/**
 * BSData XML Tree Traverser
 *
 * Utilities for navigating and extracting data from parsed BSData XML structures.
 */

import type {
  BSCatalogue,
  BSGameSystem,
  BSSelectionEntry,
  BSSelectionEntryGroup,
  BSProfile,
  BSCategoryLink,
  BSEntryLink,
  BSCost,
  BSConstraint,
  BSInfoLink,
} from "./types.js";

/**
 * Find all top-level selection entries in a catalogue.
 * These represent the main units/models available for selection.
 * For library catalogues, looks at sharedSelectionEntries.
 */
export function findSelectionEntries(
  catalogue: BSCatalogue
): BSSelectionEntry[] {
  const entries: BSSelectionEntry[] = [];

  // Shared selection entries (library catalogues)
  if (catalogue.sharedSelectionEntries) {
    entries.push(...catalogue.sharedSelectionEntries);
  }

  // Direct selection entries
  if (catalogue.selectionEntries) {
    entries.push(...catalogue.selectionEntries);
  }

  // Entry links to shared entries
  if (catalogue.entryLinks) {
    for (const link of catalogue.entryLinks) {
      const resolved = resolveEntryLink(catalogue, link);
      if (resolved) {
        entries.push(resolved);
      }
    }
  }

  return entries;
}

/**
 * Find all shared selection entries (reusable across catalogues)
 */
export function findSharedSelectionEntries(
  catalogue: BSCatalogue
): BSSelectionEntry[] {
  return catalogue.sharedSelectionEntries || [];
}

/**
 * Find all shared profiles in a catalogue
 */
export function findSharedProfiles(catalogue: BSCatalogue): BSProfile[] {
  return catalogue.sharedProfiles || [];
}

/**
 * Resolve an entry link to its target selection entry
 */
export function resolveEntryLink(
  catalogue: BSCatalogue,
  link: BSEntryLink
): BSSelectionEntry | null {
  // Guard against malformed links
  if (!link || !link.$ || !link.$.targetId) {
    return null;
  }

  const targetId = link.$.targetId;

  // Search in shared selection entries
  const shared = catalogue.sharedSelectionEntries?.find(
    (e) => e.$.id === targetId
  );
  if (shared) {
    return mergeEntryLinkOverrides(shared, link);
  }

  // Search in direct selection entries
  const direct = catalogue.selectionEntries?.find((e) => e.$.id === targetId);
  if (direct) {
    return mergeEntryLinkOverrides(direct, link);
  }

  return null;
}

/**
 * Merge entry link overrides (costs, constraints, etc.) with the target entry
 */
function mergeEntryLinkOverrides(
  entry: BSSelectionEntry,
  link: BSEntryLink
): BSSelectionEntry {
  const merged = { ...entry };

  // Override costs if present in link
  if (link.costs && link.costs.length > 0) {
    merged.costs = link.costs;
  }

  // Add constraints from link
  if (link.constraints) {
    merged.constraints = [...(entry.constraints || []), ...link.constraints];
  }

  // Add category links from link
  if (link.categoryLinks) {
    merged.categoryLinks = [
      ...(entry.categoryLinks || []),
      ...link.categoryLinks,
    ];
  }

  return merged;
}

/**
 * Find profiles of a specific type within a selection entry
 */
export function findProfiles(
  entry: BSSelectionEntry,
  typeName: string
): BSProfile[] {
  const profiles: BSProfile[] = [];

  // Direct profiles
  if (entry.profiles) {
    profiles.push(
      ...entry.profiles.filter((p) => p.$.typeName === typeName)
    );
  }

  return profiles;
}

/**
 * Find all profiles within a selection entry (any type)
 */
export function findAllProfiles(entry: BSSelectionEntry): BSProfile[] {
  return entry.profiles || [];
}

/**
 * Recursively find all profiles in an entry and its children
 */
export function findProfilesRecursive(
  entry: BSSelectionEntry,
  typeName?: string
): BSProfile[] {
  const profiles: BSProfile[] = [];

  // Direct profiles
  if (entry.profiles) {
    const filtered = typeName
      ? entry.profiles.filter((p) => p.$.typeName === typeName)
      : entry.profiles;
    profiles.push(...filtered);
  }

  // Child selection entries
  if (entry.selectionEntries) {
    for (const child of entry.selectionEntries) {
      profiles.push(...findProfilesRecursive(child, typeName));
    }
  }

  // Selection entry groups
  if (entry.selectionEntryGroups) {
    for (const group of entry.selectionEntryGroups) {
      profiles.push(...findProfilesInGroup(group, typeName));
    }
  }

  return profiles;
}

/**
 * Find profiles within a selection entry group
 */
function findProfilesInGroup(
  group: BSSelectionEntryGroup,
  typeName?: string
): BSProfile[] {
  const profiles: BSProfile[] = [];

  if (group.selectionEntries) {
    for (const entry of group.selectionEntries) {
      profiles.push(...findProfilesRecursive(entry, typeName));
    }
  }

  if (group.selectionEntryGroups) {
    for (const subGroup of group.selectionEntryGroups) {
      profiles.push(...findProfilesInGroup(subGroup, typeName));
    }
  }

  return profiles;
}

/**
 * Get all category links for an entry (used for keywords)
 */
export function getCategoryLinks(entry: BSSelectionEntry): BSCategoryLink[] {
  return entry.categoryLinks || [];
}

/**
 * Check if an entry has a specific category
 */
export function hasCategory(
  entry: BSSelectionEntry,
  categoryName: string
): boolean {
  const normalizedName = categoryName.toLowerCase();
  return (
    entry.categoryLinks?.some(
      (link) => link && link.$ && link.$.name && link.$.name.toLowerCase() === normalizedName
    ) || false
  );
}

/**
 * Check if an entry has the primary category set
 */
export function getPrimaryCategory(
  entry: BSSelectionEntry
): BSCategoryLink | null {
  return entry.categoryLinks?.find((link) => link && link.$ && link.$.primary === "true") || null;
}

/**
 * Get the points cost for an entry
 */
export function getPointsCost(entry: BSSelectionEntry): number {
  const ptsCost = entry.costs?.find(
    (c) => c && c.$ && c.$.name && (c.$.name.toLowerCase() === "pts" || c.$.name.toLowerCase() === "points")
  );
  return ptsCost && ptsCost.$ && ptsCost.$.value ? parseInt(ptsCost.$.value, 10) : 0;
}

/**
 * All cost types available in BSData
 */
export interface AllCosts {
  pts: number;
  destinyPoints?: number;
  ptgCategory?: number;
  ghbCategory?: number;
}

/**
 * Get all cost types for an entry (points, destiny points, PTG/GHB categories)
 */
export function getAllCosts(entry: BSSelectionEntry): AllCosts {
  const costs: AllCosts = { pts: 0 };

  if (!entry.costs) {
    return costs;
  }

  for (const cost of entry.costs) {
    if (!cost || !cost.$) continue;

    const name = cost.$.name?.toLowerCase();
    const typeId = cost.$.typeId;
    const value = cost.$.value ? parseInt(cost.$.value, 10) : 0;

    if (isNaN(value)) continue;

    // Points cost
    if (name === "pts" || name === "points") {
      costs.pts = value;
    }
    // Destiny Points (typeId: bc33-05f5-8d3f-af43)
    else if (typeId === "bc33-05f5-8d3f-af43" || name === "destiny points") {
      costs.destinyPoints = value;
    }
    // PTG Category (typeId: e63c-79ff-93ba-c5eb)
    else if (typeId === "e63c-79ff-93ba-c5eb") {
      costs.ptgCategory = value;
    }
    // GHB Category (typeId: de92-2099-fbf7-a156)
    else if (typeId === "de92-2099-fbf7-a156") {
      costs.ghbCategory = value;
    }
  }

  return costs;
}

/**
 * Get a specific cost by name
 */
export function getCost(entry: BSSelectionEntry, costName: string): number {
  const cost = entry.costs?.find(
    (c) => c && c.$ && c.$.name && c.$.name.toLowerCase() === costName.toLowerCase()
  );
  return cost && cost.$ && cost.$.value ? parseInt(cost.$.value, 10) : 0;
}

/**
 * Get constraint value (min or max)
 */
export function getConstraint(
  entry: BSSelectionEntry,
  type: "min" | "max",
  field: string = "selections"
): number | null {
  const constraint = entry.constraints?.find(
    (c) => c && c.$ && c.$.type === type && c.$.field === field
  );
  return constraint && constraint.$ && constraint.$.value ? parseInt(constraint.$.value, 10) : null;
}

/**
 * Check if entry is hidden
 */
export function isHidden(entry: BSSelectionEntry): boolean {
  return entry && entry.$ && entry.$.hidden === "true";
}

/**
 * Get entry type (unit, model, upgrade)
 */
export function getEntryType(
  entry: BSSelectionEntry
): "unit" | "model" | "upgrade" {
  return entry && entry.$ && entry.$.type ? entry.$.type : "unit";
}

/**
 * Find child selection entries
 */
export function getChildEntries(entry: BSSelectionEntry): BSSelectionEntry[] {
  return entry.selectionEntries || [];
}

/**
 * Find selection entry groups (e.g., weapon options)
 */
export function getSelectionGroups(
  entry: BSSelectionEntry
): BSSelectionEntryGroup[] {
  return entry.selectionEntryGroups || [];
}

/**
 * Resolve info links to shared profiles
 */
export function resolveInfoLink(
  catalogue: BSCatalogue,
  link: BSInfoLink
): BSProfile | null {
  // Guard against malformed links
  if (!link || !link.$ || !link.$.targetId) {
    return null;
  }

  const targetId = link.$.targetId;
  return catalogue.sharedProfiles?.find((p) => p.$ && p.$.id === targetId) || null;
}

/**
 * Get all profiles including those from info links
 */
export function getAllProfiles(
  catalogue: BSCatalogue,
  entry: BSSelectionEntry
): BSProfile[] {
  const profiles: BSProfile[] = [...(entry.profiles || [])];

  // Resolve info links
  if (entry.infoLinks) {
    for (const link of entry.infoLinks) {
      if (link && link.$ && link.$.type === "profile") {
        const resolved = resolveInfoLink(catalogue, link);
        if (resolved) {
          profiles.push(resolved);
        }
      }
    }
  }

  return profiles;
}

/**
 * Find units (entries with type="unit" that have a Unit profile, not Manifestations)
 */
export function findUnits(catalogue: BSCatalogue): BSSelectionEntry[] {
  const allEntries = findSelectionEntries(catalogue);
  return allEntries.filter((e) => {
    if (!e || !e.$ || e.$.type !== "unit" || isHidden(e)) {
      return false;
    }
    // Must have a Unit profile (not just Manifestation)
    const hasUnitProfile = e.profiles?.some(p => p.$.typeName === "Unit");
    return hasUnitProfile;
  });
}

/**
 * Find manifestations (endless spells - entries with Manifestation profile)
 */
export function findManifestations(catalogue: BSCatalogue): BSSelectionEntry[] {
  const allEntries = findSelectionEntries(catalogue);
  return allEntries.filter((e) => {
    if (!e || !e.$ || isHidden(e)) {
      return false;
    }
    // Has a Manifestation profile
    const hasManifestation = e.profiles?.some(p => p.$.typeName === "Manifestation");
    return hasManifestation;
  });
}

/**
 * Find entries by category name
 */
export function findEntriesByCategory(
  catalogue: BSCatalogue,
  categoryName: string
): BSSelectionEntry[] {
  const allEntries = findSelectionEntries(catalogue);
  return allEntries.filter((e) => e && hasCategory(e, categoryName));
}

/**
 * Get faction name from catalogue
 */
export function getFactionName(catalogue: BSCatalogue): string {
  return catalogue && catalogue.$ && catalogue.$.name ? catalogue.$.name : "unknown";
}

/**
 * Get faction ID from catalogue (kebab-case version of name)
 * Strips " - Library" suffix from library catalogues
 */
export function getFactionId(catalogue: BSCatalogue): string {
  const name = getFactionName(catalogue);
  return name
    .toLowerCase()
    .replace(/\s*-\s*library$/i, "") // Remove " - Library" suffix
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Check if catalogue is a library (shared content only)
 */
export function isLibrary(catalogue: BSCatalogue): boolean {
  return catalogue && catalogue.$ && catalogue.$.library === "true";
}

/**
 * Extract points costs from entry links in a non-library catalogue.
 * Returns a map of targetId -> points cost.
 */
export function extractPointsFromEntryLinks(
  catalogue: BSCatalogue
): Map<string, number> {
  const pointsMap = new Map<string, number>();

  if (!catalogue.entryLinks) {
    return pointsMap;
  }

  for (const link of catalogue.entryLinks) {
    if (!link || !link.$ || !link.$.targetId) {
      continue;
    }

    const targetId = link.$.targetId;
    const costs = link.costs || [];
    const ptsCost = costs.find(
      (c) => c && c.$ && c.$.name && c.$.name.toLowerCase() === "pts"
    );

    if (ptsCost && ptsCost.$ && ptsCost.$.value) {
      const points = parseInt(ptsCost.$.value, 10);
      if (!isNaN(points)) {
        pointsMap.set(targetId, points);
      }
    }
  }

  return pointsMap;
}

/**
 * Check if a selection entry group is a lore (spell, prayer, or manifestation)
 */
export function isLoreGroup(group: BSSelectionEntryGroup): boolean {
  const name = group.$.name.toLowerCase();
  return (
    name.includes("lore") ||
    name.includes("manifestation") ||
    name.includes("prayer lore") ||
    name.includes("spell lore")
  );
}

/**
 * Find all lore groups in a catalogue
 */
export function findLoreGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  const lores: BSSelectionEntryGroup[] = [];

  // Check shared selection entry groups
  if (catalogue.sharedSelectionEntryGroups) {
    for (const group of catalogue.sharedSelectionEntryGroups) {
      if (isLoreGroup(group)) {
        lores.push(group);
      }
    }
  }

  // Check direct selection entry groups
  if (catalogue.selectionEntryGroups) {
    for (const group of catalogue.selectionEntryGroups) {
      if (isLoreGroup(group)) {
        lores.push(group);
      }
    }
  }

  return lores;
}

/**
 * Find selection entry groups by name pattern.
 * Searches in both shared and direct selection entry groups.
 */
export function findSelectionEntryGroups(
  catalogue: BSCatalogue,
  namePattern: string | RegExp
): BSSelectionEntryGroup[] {
  const groups: BSSelectionEntryGroup[] = [];
  const pattern = typeof namePattern === "string" ? new RegExp(namePattern, "i") : namePattern;

  // Check shared selection entry groups
  if (catalogue.sharedSelectionEntryGroups) {
    for (const group of catalogue.sharedSelectionEntryGroups) {
      if (group.$ && group.$.name && pattern.test(group.$.name)) {
        groups.push(group);
      }
    }
  }

  // Check direct selection entry groups
  if (catalogue.selectionEntryGroups) {
    for (const group of catalogue.selectionEntryGroups) {
      if (group.$ && group.$.name && pattern.test(group.$.name)) {
        groups.push(group);
      }
    }
  }

  return groups;
}

/**
 * Find battle formation groups in a catalogue.
 * Battle formations are selection entry groups with names like "Battle Formations: <Faction>"
 */
export function findBattleFormationGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  return findSelectionEntryGroups(catalogue, /^Battle Formations:/i);
}

/**
 * Find heroic trait groups in a catalogue.
 */
export function findHeroicTraitGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  return findSelectionEntryGroups(catalogue, /^Heroic Traits$/i);
}

/**
 * Find artefact of power groups in a catalogue.
 */
export function findArtefactGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  return findSelectionEntryGroups(catalogue, /^Artefacts of Power$/i);
}

/**
 * Get all selection entries from a selection entry group (including nested groups)
 */
export function getEntriesFromGroup(group: BSSelectionEntryGroup): BSSelectionEntry[] {
  const entries: BSSelectionEntry[] = [];

  // Direct selection entries
  if (group.selectionEntries) {
    entries.push(...group.selectionEntries);
  }

  // Nested selection entry groups
  if (group.selectionEntryGroups) {
    for (const nestedGroup of group.selectionEntryGroups) {
      entries.push(...getEntriesFromGroup(nestedGroup));
    }
  }

  return entries;
}
