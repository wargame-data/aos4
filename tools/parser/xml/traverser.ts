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
  BSModifier,
  BSRepeat,
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

// Profile type IDs for spells and prayers
const SPELL_PROFILE_TYPE_ID = "7312-8367-c171-f2ef";
const PRAYER_PROFILE_TYPE_ID = "5946-234-d7b4-6195";

/**
 * Check if a selection entry group contains spell or prayer profiles.
 * This is used to identify lore groups by their content rather than by name.
 */
function hasSpellOrPrayerProfiles(group: BSSelectionEntryGroup): boolean {
  if (group.selectionEntries) {
    for (const entry of group.selectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (
            profile.$.typeId === SPELL_PROFILE_TYPE_ID ||
            profile.$.typeId === PRAYER_PROFILE_TYPE_ID ||
            profile.$.typeName?.toLowerCase().includes("spell") ||
            profile.$.typeName?.toLowerCase().includes("prayer")
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Check if a selection entry group is a lore (spell, prayer, or manifestation).
 * Uses structural detection (checking for spell/prayer profiles) as the primary method,
 * with name-based detection as a fallback for manifestations.
 */
export function isLoreGroup(group: BSSelectionEntryGroup): boolean {
  // Primary: Check if the group contains spell or prayer profiles
  if (hasSpellOrPrayerProfiles(group)) {
    return true;
  }

  // Fallback: Check by name for manifestations (which may not have spell/prayer profiles)
  const name = group.$.name.toLowerCase();
  return name.includes("manifestation");
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
 * Recursively collect all selection entry groups, including nested ones.
 */
function collectNestedGroups(groups: BSSelectionEntryGroup[]): BSSelectionEntryGroup[] {
  const result: BSSelectionEntryGroup[] = [];
  for (const group of groups) {
    result.push(group);
    if (group.selectionEntryGroups) {
      result.push(...collectNestedGroups(group.selectionEntryGroups));
    }
  }
  return result;
}

/**
 * Find selection entry groups by name pattern.
 * Searches in both shared and direct selection entry groups, including nested groups.
 */
export function findSelectionEntryGroups(
  catalogue: BSCatalogue,
  namePattern: string | RegExp
): BSSelectionEntryGroup[] {
  const groups: BSSelectionEntryGroup[] = [];
  const pattern = typeof namePattern === "string" ? new RegExp(namePattern, "i") : namePattern;

  // Collect all groups recursively (including nested ones)
  const allSharedGroups = collectNestedGroups(catalogue.sharedSelectionEntryGroups ?? []);
  const allDirectGroups = collectNestedGroups(catalogue.selectionEntryGroups ?? []);

  for (const group of [...allSharedGroups, ...allDirectGroups]) {
    if (group.$ && group.$.name && pattern.test(group.$.name)) {
      groups.push(group);
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
 * Find manifestation lore groups in a faction catalogue.
 * These contain the faction-specific manifestation lores.
 */
export function findManifestationLoreGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  return findSelectionEntryGroups(catalogue, /^Manifestation Lores$/i);
}

/**
 * Check if a lore group is a manifestation lore
 */
export function isManifestationLore(group: BSSelectionEntryGroup): boolean {
  const name = group.$.name.toLowerCase();
  return name.includes("manifestation");
}

/**
 * Extract the names of manifestation lores that a faction can use.
 * This looks at the "Manifestation Lores" selection entry groups and extracts
 * the names of the selection entries within them.
 *
 * For example, Stormcast Eternals has:
 * <selectionEntryGroup name="Manifestation Lores">
 *   <selectionEntry name="Manifestations of the Storm">
 *   ...
 *
 * Returns: ["Manifestations of the Storm"]
 */
export function extractManifestationLoreNames(catalogue: BSCatalogue): string[] {
  const loreNames: string[] = [];

  // Find all "Manifestation Lores" groups
  const manifestationGroups = findManifestationLoreGroups(catalogue);

  for (const group of manifestationGroups) {
    // Get selection entries within this group
    if (group.selectionEntries) {
      for (const entry of group.selectionEntries) {
        const name = entry.$.name;
        // Skip entries that are just "Manifestation Lore" or "Manifestation Lores" (containers)
        if (name && !name.toLowerCase().match(/^manifestation\s+lores?$/)) {
          loreNames.push(name);
        }
      }
    }
  }

  return loreNames;
}

/**
 * Find spell lore groups in a faction catalogue.
 * These contain the faction-specific spell lores.
 */
export function findSpellLoreGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  return findSelectionEntryGroups(catalogue, /^Spell Lores$/i);
}

/**
 * Find prayer lore groups in a faction catalogue.
 * These contain the faction-specific prayer lores.
 */
export function findPrayerLoreGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  return findSelectionEntryGroups(catalogue, /^Prayer Lores$/i);
}

/**
 * Extract the names of spell lores that a faction can use.
 * This looks at the "Spell Lores" selection entry groups and extracts
 * the names of the selection entries within them.
 *
 * For example, a faction might have:
 * <selectionEntryGroup name="Spell Lores">
 *   <selectionEntry name="Lore of the Storm">
 *   ...
 *
 * Returns: ["Lore of the Storm"]
 */
export function extractSpellLoreNames(catalogue: BSCatalogue): string[] {
  const loreNames: string[] = [];

  const spellGroups = findSpellLoreGroups(catalogue);

  for (const group of spellGroups) {
    if (group.selectionEntries) {
      for (const entry of group.selectionEntries) {
        const name = entry.$.name;
        // Skip entries that are just "Spell Lore" or "Spell Lores" (containers)
        if (name && !name.toLowerCase().match(/^spell\s+lores?$/)) {
          loreNames.push(name);
        }
      }
    }
  }

  return loreNames;
}

/**
 * Extract the names of prayer lores that a faction can use.
 * This looks at the "Prayer Lores" selection entry groups and extracts
 * the names of the selection entries within them.
 *
 * For example, a faction might have:
 * <selectionEntryGroup name="Prayer Lores">
 *   <selectionEntry name="Prayers of the Stormhosts">
 *   ...
 *
 * Returns: ["Prayers of the Stormhosts"]
 */
export function extractPrayerLoreNames(catalogue: BSCatalogue): string[] {
  const loreNames: string[] = [];

  const prayerGroups = findPrayerLoreGroups(catalogue);

  for (const group of prayerGroups) {
    if (group.selectionEntries) {
      for (const entry of group.selectionEntries) {
        const name = entry.$.name;
        // Skip entries that are just "Prayer Lore" or "Prayer Lores" (containers)
        if (name && !name.toLowerCase().match(/^prayer\s+lores?$/)) {
          loreNames.push(name);
        }
      }
    }
  }

  return loreNames;
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

/**
 * Extracted repeat information for constraint modifiers
 */
export interface ExtractedRepeat {
  value: string;
  repeats: string;
  field: string;
  scope: string;
  childId?: string;
  shared?: boolean;
  roundUp?: boolean;
  includeChildSelections?: boolean;
  includeChildForces?: boolean;
  percentValue?: boolean;
}

/**
 * Extracted constraint modifier with repeat rules
 */
export interface ExtractedConstraintModifier {
  constraintId: string;
  type: "set" | "increment" | "decrement";
  value: string;
  repeats?: ExtractedRepeat[];
}

/**
 * Extract constraint modifiers with repeat rules from a selection entry.
 * These are modifiers that target constraint IDs with repeat logic for dynamic scaling.
 */
export function extractConstraintModifiers(entry: BSSelectionEntry): ExtractedConstraintModifier[] {
  const modifiers: ExtractedConstraintModifier[] = [];

  if (!entry.modifiers || !entry.constraints) {
    return modifiers;
  }

  // Build a set of constraint IDs for this entry
  const constraintIds = new Set<string>();
  for (const constraint of entry.constraints) {
    if (constraint.$ && constraint.$.id) {
      constraintIds.add(constraint.$.id);
    }
  }

  // Find modifiers that target constraint fields with repeat rules
  for (const mod of entry.modifiers) {
    if (!mod.$ || !mod.$.field) continue;

    // Check if this modifier targets a constraint ID
    if (!constraintIds.has(mod.$.field)) continue;

    // Only handle set/increment/decrement types
    const modType = mod.$.type;
    if (modType !== "set" && modType !== "increment" && modType !== "decrement") continue;

    const constraintMod: ExtractedConstraintModifier = {
      constraintId: mod.$.field,
      type: modType,
      value: mod.$.value,
    };

    // Extract repeats if present
    if (mod.repeats && mod.repeats.length > 0) {
      constraintMod.repeats = mod.repeats.map((r) => {
        const repeat: ExtractedRepeat = {
          value: r.$.value,
          repeats: r.$.repeats,
          field: r.$.field,
          scope: r.$.scope,
        };
        if (r.$.childId) repeat.childId = r.$.childId;
        if (r.$.shared === "true") repeat.shared = true;
        if (r.$.roundUp === "true") repeat.roundUp = true;
        if (r.$.includeChildSelections === "true") repeat.includeChildSelections = true;
        if (r.$.includeChildForces === "true") repeat.includeChildForces = true;
        if (r.$.percentValue === "true") repeat.percentValue = true;
        return repeat;
      });
    }

    modifiers.push(constraintMod);
  }

  return modifiers;
}

/**
 * Find Blood Tithe ability profiles in a catalogue.
 * These are profiles with typeName "Ability (Blood Tithe)" found in Blades of Khorne.
 */
export function findBloodTitheAbilities(catalogue: BSCatalogue): BSProfile[] {
  const profiles: BSProfile[] = [];

  // Check Battle Traits selection entries
  const battleTraitsGroups = findSelectionEntryGroups(catalogue, /^Battle Traits:/i);

  for (const group of battleTraitsGroups) {
    const entries = getEntriesFromGroup(group);
    for (const entry of entries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (profile.$ && profile.$.typeName === "Ability (Blood Tithe)") {
            profiles.push(profile);
          }
        }
      }
    }
  }

  // Also check direct selection entries (some catalogues structure differently)
  if (catalogue.selectionEntries) {
    for (const entry of catalogue.selectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (profile.$ && profile.$.typeName === "Ability (Blood Tithe)") {
            profiles.push(profile);
          }
        }
      }
    }
  }

  // Check shared selection entries (where Battle Traits are located)
  if (catalogue.sharedSelectionEntries) {
    for (const entry of catalogue.sharedSelectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (profile.$ && profile.$.typeName === "Ability (Blood Tithe)") {
            profiles.push(profile);
          }
        }
      }
    }
  }

  // Check shared profiles
  if (catalogue.sharedProfiles) {
    for (const profile of catalogue.sharedProfiles) {
      if (profile.$ && profile.$.typeName === "Ability (Blood Tithe)") {
        profiles.push(profile);
      }
    }
  }

  return profiles;
}

/**
 * Find Battle Tactic Card profiles in a game system.
 * These are profiles with typeName "Battle Tactic Card" from the core game system.
 */
export function findBattleTacticCards(gameSystem: BSGameSystem): BSProfile[] {
  const profiles: BSProfile[] = [];

  // Check shared profiles
  if (gameSystem.sharedProfiles) {
    for (const profile of gameSystem.sharedProfiles) {
      if (profile.$ && profile.$.typeName === "Battle Tactic Card") {
        profiles.push(profile);
      }
    }
  }

  // Check selection entries
  if (gameSystem.selectionEntries) {
    for (const entry of gameSystem.selectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (profile.$ && profile.$.typeName === "Battle Tactic Card") {
            profiles.push(profile);
          }
        }
      }
      // Check nested selection entry groups
      if (entry.selectionEntryGroups) {
        for (const group of entry.selectionEntryGroups) {
          const nestedEntries = getEntriesFromGroup(group);
          for (const nestedEntry of nestedEntries) {
            if (nestedEntry.profiles) {
              for (const profile of nestedEntry.profiles) {
                if (profile.$ && profile.$.typeName === "Battle Tactic Card") {
                  profiles.push(profile);
                }
              }
            }
          }
        }
      }
    }
  }

  // Check shared selection entries
  if (gameSystem.sharedSelectionEntries) {
    for (const entry of gameSystem.sharedSelectionEntries) {
      if (entry.profiles) {
        for (const profile of entry.profiles) {
          if (profile.$ && profile.$.typeName === "Battle Tactic Card") {
            profiles.push(profile);
          }
        }
      }
    }
  }

  return profiles;
}

/**
 * Find faction terrain entries in a catalogue.
 * These are selection entries with the FACTION TERRAIN category.
 */
export function findFactionTerrain(catalogue: BSCatalogue): BSSelectionEntry[] {
  const allEntries = findSelectionEntries(catalogue);
  return allEntries.filter((e) => {
    if (!e || !e.$ || isHidden(e)) {
      return false;
    }
    return hasCategory(e, "FACTION TERRAIN");
  });
}

/**
 * Whitelist of known enhancement category names.
 * These are selection entry groups that contain enhancement options for armies.
 * Base names only - faction-specific variants like "Heroic Traits: Stormcast" are matched by prefix.
 */
export const ENHANCEMENT_CATEGORIES = [
  // Universal (all/many factions)
  "Heroic Traits",
  "Artefacts of Power",
  "Monstrous Traits",

  // Faction-Specific Enhancement Types
  "Accursed Devices",           // Helsmiths of Hashut
  "Aetherwrought Machineries",  // Cities of Sigmar
  "Alphabeast Instincts",       // Bonesplitterz
  "Anarchic Relics",            // Beasts of Chaos
  "Aqshian Artefacts",          // Fyreslayers
  "Artefacts of the Tempest",   // Stormcast Eternals
  "Aspects of Azyr",            // Stormcast Eternals
  "Aspects of Enlightenment",   // Lumineth Realm-lords
  "Aspects of Renewal",         // Sylvaneth
  "Avatars of Corruption",      // Maggotkin of Nurgle
  "Benedictions of Sickness",   // Maggotkin of Nurgle
  "Big Names",                  // Ogor Mawtribes
  "Blessings of the Bad Moon",  // Gloomspite Gitz
  "Blood Blessings of Khorne",  // Blades of Khorne
  "Bloodshadow Rites",          // Daughters of Khaine
  "Bond-beast Traits",          // Idoneth Deepkin
  "Boons of Nurgle",            // Maggotkin of Nurgle
  "Boss Bones and Other Gubbinz", // Kruleboyz
  "Brutal Warlords",            // Ironjawz
  "Celestial Disciplines",      // Seraphon
  "Commanders of the Blood Legions", // Blades of Khorne
  "Coveted Treasures",          // Gloomspite Gitz
  "Da Beast Wivin",             // Bonesplitterz
  "Da Boss's Hoard",            // Ironjawz
  "Dark Gifts of Hashut",       // Helsmiths of Hashut
  "Deathly Heirlooms",          // Nighthaunt
  "Devious Machinators",        // Skaven
  "Emberstone Weapon",          // Fyreslayers
  "Endrinwork Upgrades",        // Kharadron Overlords
  "Ensorcelled Banners",        // Slaves to Darkness
  "Esoteric Treasures",         // Ossiarch Bonereapers
  "Everwinter Prayers",         // Ogor Mawtribes
  "Fated Artefacts",            // Disciples of Tzeentch
  "Fell Artefacts",             // Soulblight Gravelords
  "Figureheads of the Dark Prince", // Hedonites of Slaanesh
  "First Circle Titles",        // Slaves to Darkness
  "Gifts of Morathi",           // Daughters of Khaine
  "Gifts of the Blood God",     // Blades of Khorne
  "Grandfather's Gifts",        // Maggotkin of Nurgle
  "Great Endrinworks",          // Kharadron Overlords
  "Hallmarks of Hel's Claw",    // Helsmiths of Hashut
  "Hedonistic Obsessions",      // Hedonites of Slaanesh
  "Heirlooms of Hysh",          // Lumineth Realm-lords
  "Heirlooms of the Lodge",     // Fyreslayers
  "Horrors of the Necropolis",  // Ossiarch Bonereapers
  "Infernal Sorceries",         // Helsmiths of Hashut
  "Infernal Treasures",         // Helsmiths of Hashut
  "Ingenious Innovations",      // Skaven
  "Inheritance of Grimnir",     // Fyreslayers
  "Inventions of the Sky-ports", // Kharadron Overlords
  "Judgements of Khorne",       // Blades of Khorne
  "Krule Artefacts",            // Kruleboyz
  "Kunnin' Warlords",           // Kruleboyz
  "Leaders of the Raid",        // Idoneth Deepkin
  "Lords of Brilliance",        // Disciples of Tzeentch
  "Lords of the Sky-fleets",    // Kharadron Overlords
  "Marks of Vulkatrix",         // Fyreslayers
  "Murderous Artefacts",        // Daughters of Khaine
  "Noxious Prayers",            // Skaven
  "Paragons of Murder",         // Hedonites of Slaanesh
  "Plunder of the Mawtribes",   // Ogor Mawtribes
  "Relics of Dolorum",          // Nighthaunt
  "Relics of Nature",           // Sylvaneth
  "Relics of Ruin",             // Skaven
  "Relics of Sigmaron",         // Stormcast Eternals
  "Relics of the Abyss",        // Idoneth Deepkin
  "Relics of the Empire",       // Cities of Sigmar
  "Relics of the Underworlds",  // Flesh-eater Courts
  "Rites of Delusion",          // Flesh-eater Courts
  "Royal Traits",               // Flesh-eater Courts
  "Royal Treasury",             // Flesh-eater Courts
  "Ruinous Overlords",          // Slaves to Darkness
  "Ruinous Realm-Gnawers",      // Skaven
  "Sentinels of Order",         // Cities of Sigmar
  "Servants of the Cosmic Order", // Seraphon
  "Shades of Death",            // Nighthaunt
  "Stormforged Qualities",      // Stormcast Eternals
  "Teachings of the Tithe-reapers", // Ossiarch Bonereapers
  "The Cursed Bloodlines",      // Soulblight Gravelords
  "The Pride of Thyria",        // Sons of Behemat
  "Thyrian Wonders",            // Sons of Behemat
  "Titanic Trophies",           // Sons of Behemat
  "Traits of Endless Hunger",   // Flesh-eater Courts
  "Treasures of the Cities",    // Cities of Sigmar
  "Treasures of the Old Ones",  // Seraphon
  "Treasures of the Warglade",  // Sylvaneth
  "Troglodytic Treasures",      // Gloomspite Gitz
  "Twilit Sorceries",           // Sylvaneth
  "Tyrants and Overseers",      // Ogor Mawtribes
  "Undying Tyrants",            // Ossiarch Bonereapers
  "Vulkyn Gifts",               // Fyreslayers
  "Warbeats",                   // Ironjawz
  "Zharrgrim Blessings",        // Fyreslayers
] as const;

/**
 * Find all enhancement groups in a catalogue.
 * Searches for selection entry groups that match known enhancement category names.
 * Returns groups matching both base names (e.g., "Heroic Traits") and
 * faction-specific variants (e.g., "Heroic Traits: Stormcast Eternals").
 */
export function findEnhancementGroups(catalogue: BSCatalogue): BSSelectionEntryGroup[] {
  const groups: BSSelectionEntryGroup[] = [];
  const seenIds = new Set<string>();

  for (const categoryName of ENHANCEMENT_CATEGORIES) {
    // Escape special regex characters in category name
    const escaped = categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match exact name or name with faction suffix (e.g., "Heroic Traits" or "Heroic Traits: Faction")
    const pattern = new RegExp(`^${escaped}(:|$)`, "i");
    const found = findSelectionEntryGroups(catalogue, pattern);

    for (const group of found) {
      // Avoid duplicates
      if (group.$ && group.$.id && !seenIds.has(group.$.id)) {
        seenIds.add(group.$.id);
        groups.push(group);
      }
    }
  }

  return groups;
}

/**
 * Result of finding a universal manifestation lore
 */
export interface UniversalManifestationLore {
  name: string;
  id: string;
  spellEntries: BSSelectionEntry[];
}

/**
 * Resolve a selection entry group by ID from shared or direct groups
 */
function resolveSelectionEntryGroupById(
  catalogue: BSCatalogue,
  targetId: string
): BSSelectionEntryGroup | null {
  // Check shared selection entry groups
  if (catalogue.sharedSelectionEntryGroups) {
    for (const group of catalogue.sharedSelectionEntryGroups) {
      if (group.$ && group.$.id === targetId) {
        return group;
      }
      // Check nested groups
      if (group.selectionEntryGroups) {
        for (const nested of group.selectionEntryGroups) {
          if (nested.$ && nested.$.id === targetId) {
            return nested;
          }
        }
      }
    }
  }

  // Check direct selection entry groups
  if (catalogue.selectionEntryGroups) {
    for (const group of catalogue.selectionEntryGroups) {
      if (group.$ && group.$.id === targetId) {
        return group;
      }
      // Check nested groups
      if (group.selectionEntryGroups) {
        for (const nested of group.selectionEntryGroups) {
          if (nested.$ && nested.$.id === targetId) {
            return nested;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Find universal manifestation lores in Lores.cat.
 * These are the endless spells and incarnates available to all factions.
 *
 * Structure in BSData:
 * <selectionEntryGroup name="Manifestation Lores">
 *   <selectionEntry name="Aetherwrought Machineries">
 *     <entryLink targetId="3418-..."/> <- points to group with spells
 *   </selectionEntry>
 *   ...
 * </selectionEntryGroup>
 *
 * The target group contains selectionEntries with spell profiles.
 */
export function findUniversalManifestationLores(
  catalogue: BSCatalogue
): UniversalManifestationLore[] {
  const result: UniversalManifestationLore[] = [];

  // Find the "Manifestation Lores" top-level group
  const manifestationLoresGroups = findSelectionEntryGroups(catalogue, /^Manifestation Lores$/i);

  for (const loresGroup of manifestationLoresGroups) {
    // Each selectionEntry in this group is a universal manifestation lore
    if (!loresGroup.selectionEntries) continue;

    for (const entry of loresGroup.selectionEntries) {
      if (!entry.$ || !entry.$.name) continue;

      const loreName = entry.$.name;
      const loreId = entry.$.id;

      // Find the entryLink that points to the actual spells group
      let spellEntries: BSSelectionEntry[] = [];

      if (entry.entryLinks) {
        for (const link of entry.entryLinks) {
          if (link.$ && link.$.targetId && link.$.type === "selectionEntryGroup") {
            // Resolve the target group
            const targetGroup = resolveSelectionEntryGroupById(catalogue, link.$.targetId);
            if (targetGroup && targetGroup.selectionEntries) {
              // These are the spell entries (e.g., "Summon Aethervoid Pendulum")
              spellEntries.push(...targetGroup.selectionEntries);
            }
          }
        }
      }

      // Only include if we found spell entries
      if (spellEntries.length > 0) {
        result.push({
          name: loreName,
          id: loreId,
          spellEntries,
        });
      }
    }
  }

  return result;
}

/**
 * Information about an enhancement group with context for mapping
 */
export interface EnhancementGroupInfo {
  /** Top-level parent group name (e.g., "Artefacts of Power", "Heroic Traits") */
  parentGroupName: string;
  /** Sub-group name containing the actual enhancements (e.g., "Artefacts of the Tempest") */
  subGroupName: string;
  /** Restrictions text from <rule name="Enhancement Restrictions"> */
  restrictions?: string;
  /** Individual enhancement entries */
  entries: BSSelectionEntry[];
}

/**
 * Extract restrictions text from a selection entry group's rules.
 * Looks for a rule named "Enhancement Restrictions" and returns its description.
 */
function extractEnhancementRestrictions(group: BSSelectionEntryGroup): string | undefined {
  if (!group.rules) return undefined;

  for (const rule of group.rules) {
    if (rule.$ && rule.$.name === "Enhancement Restrictions") {
      // Description is stored as an array in BSData XML
      // Each element can be a string or an object with _ property containing the text
      if (rule.description && Array.isArray(rule.description) && rule.description.length > 0) {
        const desc = rule.description[0];
        // Handle both plain strings and objects with _ property
        if (typeof desc === "string") {
          return desc;
        } else if (desc && typeof desc === "object" && "_" in desc) {
          return (desc as { _: string })._;
        }
      }
    }
  }

  return undefined;
}

/**
 * Find all enhancement groups with their hierarchical context.
 * Returns structured information including parent/sub-group names and restrictions.
 *
 * Enhancement groups in BSData are structured as:
 * - Parent group: "Artefacts of Power", "Heroic Traits", etc.
 *   - Sub-group: "Artefacts of the Tempest", "Aspects of Azyr", etc.
 *     - Selection entries: Individual enhancements
 *     - Rules: "Enhancement Restrictions" with targeting text
 */
export function findEnhancementGroupsWithInfo(catalogue: BSCatalogue): EnhancementGroupInfo[] {
  const result: EnhancementGroupInfo[] = [];
  const parentGroups = findEnhancementGroups(catalogue);

  for (const parentGroup of parentGroups) {
    const parentName = parentGroup.$.name;

    // Check if this group has sub-groups with entries
    if (parentGroup.selectionEntryGroups && parentGroup.selectionEntryGroups.length > 0) {
      // Process sub-groups
      for (const subGroup of parentGroup.selectionEntryGroups) {
        const subGroupName = subGroup.$.name;
        const restrictions = extractEnhancementRestrictions(subGroup);
        const entries = subGroup.selectionEntries || [];

        if (entries.length > 0) {
          result.push({
            parentGroupName: parentName,
            subGroupName,
            restrictions,
            entries,
          });
        }

        // Some groups have further nesting
        if (subGroup.selectionEntryGroups) {
          for (const nestedGroup of subGroup.selectionEntryGroups) {
            const nestedEntries = nestedGroup.selectionEntries || [];
            const nestedRestrictions = extractEnhancementRestrictions(nestedGroup) || restrictions;

            if (nestedEntries.length > 0) {
              result.push({
                parentGroupName: parentName,
                subGroupName: nestedGroup.$.name,
                restrictions: nestedRestrictions,
                entries: nestedEntries,
              });
            }
          }
        }
      }
    }

    // Also check for direct entries in the parent group (some factions structure differently)
    if (parentGroup.selectionEntries && parentGroup.selectionEntries.length > 0) {
      const restrictions = extractEnhancementRestrictions(parentGroup);
      result.push({
        parentGroupName: parentName,
        subGroupName: parentName, // Use parent name when there's no sub-group
        restrictions,
        entries: parentGroup.selectionEntries,
      });
    }
  }

  return result;
}
