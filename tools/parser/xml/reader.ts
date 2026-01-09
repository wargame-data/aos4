/**
 * BSData XML Reader
 *
 * Parses BattleScribe .cat and .gst files into typed TypeScript objects.
 */

import { readFile } from "fs/promises";
import { parseStringPromise } from "xml2js";
import { glob } from "glob";
import { join } from "path";
import type {
  BSGameSystem,
  BSCatalogue,
  ParsedGameSystem,
  ParsedCatalogue,
} from "./types.js";

// xml2js parser options
const XML_PARSER_OPTIONS = {
  explicitArray: true, // Always use arrays for elements
  mergeAttrs: false, // Keep $ for attributes
  explicitCharkey: true, // Use _ for text content
  trim: true, // Trim whitespace
  normalize: true, // Normalize whitespace
  normalizeTags: false, // Don't lowercase tags
  attrNameProcessors: undefined,
  attrValueProcessors: undefined,
  tagNameProcessors: undefined,
  valueProcessors: undefined,
};

/**
 * Parse a .gst (game system) file
 */
export async function parseGst(filePath: string): Promise<BSGameSystem> {
  const content = await readFile(filePath, "utf-8");
  const result = (await parseStringPromise(
    content,
    XML_PARSER_OPTIONS
  )) as ParsedGameSystem;

  if (!result.gameSystem) {
    throw new Error(`Invalid game system file: ${filePath} - missing gameSystem root element`);
  }

  return unwrapArrays(result.gameSystem) as BSGameSystem;
}

/**
 * Parse a .cat (catalogue) file
 */
export async function parseCat(filePath: string): Promise<BSCatalogue> {
  const content = await readFile(filePath, "utf-8");
  const result = (await parseStringPromise(
    content,
    XML_PARSER_OPTIONS
  )) as ParsedCatalogue;

  if (!result.catalogue) {
    throw new Error(`Invalid catalogue file: ${filePath} - missing catalogue root element`);
  }

  return unwrapArrays(result.catalogue) as BSCatalogue;
}

/**
 * Auto-detect file type and parse accordingly
 */
export async function parseFile(
  filePath: string
): Promise<BSGameSystem | BSCatalogue> {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".gst")) {
    return parseGst(filePath);
  } else if (lowerPath.endsWith(".cat")) {
    return parseCat(filePath);
  } else {
    throw new Error(
      `Unknown file type: ${filePath} - expected .gst or .cat extension`
    );
  }
}

/**
 * Check if parsed result is a game system
 */
export function isGameSystem(
  parsed: BSGameSystem | BSCatalogue
): parsed is BSGameSystem {
  return "gameSystemId" in (parsed.$ || {});
}

/**
 * Check if parsed result is a catalogue
 */
export function isCatalogue(
  parsed: BSGameSystem | BSCatalogue
): parsed is BSCatalogue {
  return "library" in (parsed.$ || {}) || !isGameSystem(parsed);
}

/**
 * Mapping from BSData container element names to their child element names.
 * xml2js creates: container: [{ child: [...] }]
 * We need: container: [...]
 */
const CONTAINER_CHILD_MAP: Record<string, string> = {
  sharedSelectionEntries: "selectionEntry",
  sharedSelectionEntryGroups: "selectionEntryGroup",
  sharedProfiles: "profile",
  sharedRules: "rule",
  selectionEntries: "selectionEntry",
  selectionEntryGroups: "selectionEntryGroup",
  profiles: "profile",
  rules: "rule",
  constraints: "constraint",
  costs: "cost",
  categoryLinks: "categoryLink",
  entryLinks: "entryLink",
  infoLinks: "infoLink",
  modifiers: "modifier",
  modifierGroups: "modifierGroup",
  conditions: "condition",
  conditionGroups: "conditionGroup",
  repeats: "repeat",
  characteristics: "characteristic",
  characteristicTypes: "characteristicType",
  costTypes: "costType",
  profileTypes: "profileType",
  categoryEntries: "categoryEntry",
  forceEntries: "forceEntry",
  catalogueLinks: "catalogueLink",
  publications: "publication",
  attributes: "attribute",
};

/**
 * Recursively unwrap single-element arrays from xml2js output.
 * This makes the data easier to work with while preserving arrays
 * where they're actually needed (multiple elements).
 *
 * Also handles BSData container elements by extracting the child array.
 */
function unwrapArrays(obj: unknown, parentKey?: string): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Check if this is a container element that needs unwrapping
    if (parentKey && CONTAINER_CHILD_MAP[parentKey]) {
      const childKey = CONTAINER_CHILD_MAP[parentKey];
      // xml2js creates: [{ childKey: [...] }]
      // We need to extract the child array
      if (obj.length === 1 && typeof obj[0] === "object" && obj[0] !== null) {
        const wrapper = obj[0] as Record<string, unknown>;
        if (childKey in wrapper && Array.isArray(wrapper[childKey])) {
          // Extract and process the child array
          return (wrapper[childKey] as unknown[]).map(item => unwrapArrays(item));
        }
      }
    }
    // Keep arrays, but process their elements
    return obj.map(item => unwrapArrays(item));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Don't unwrap the $ (attributes) object
      if (key === "$") {
        result[key] = value;
        continue;
      }

      // Don't unwrap the _ (text content) value
      if (key === "_") {
        result[key] = value;
        continue;
      }

      // Process the value recursively, passing the key for container detection
      result[key] = unwrapArrays(value, key);
    }

    return result;
  }

  return obj;
}

/**
 * Extract text content from a characteristic element
 */
export function getCharacteristicValue(
  characteristic: { $: { name: string }; _?: string } | undefined
): string {
  if (!characteristic) return "";
  return characteristic._ || "";
}

/**
 * Find characteristics by name in a profile
 */
export function findCharacteristic(
  profile: { characteristics?: Array<{ $: { name: string }; _?: string }> },
  name: string
): string {
  const char = profile.characteristics?.find((c) => c.$.name === name);
  return getCharacteristicValue(char);
}

/**
 * Find characteristics by typeId in a profile.
 * This is the preferred method as it uses IDs from the GST file
 * rather than relying on name strings.
 */
export function findCharacteristicById(
  profile: { characteristics?: Array<{ $: { name: string; typeId: string }; _?: string }> },
  typeId: string
): string {
  const char = profile.characteristics?.find((c) => c.$.typeId === typeId);
  return getCharacteristicValue(char);
}

/**
 * Find attribute by name in a profile
 */
export function findAttribute(
  profile: { attributes?: Array<{ $: { name: string }; _?: string }> },
  name: string
): string | undefined {
  const attr = profile.attributes?.find((a) => a.$.name === name);
  return attr?._;
}

/**
 * Build a map of catalogue ID to faction name.
 * Scans all .cat files to extract their IDs and names.
 * Includes both main faction catalogues and subfaction catalogues (mapped to parent faction).
 */
export async function buildCatalogueIdMap(bsdataDir: string): Promise<Map<string, string>> {
  const catalogueMap = new Map<string, string>();
  const catFiles = await glob(join(bsdataDir, "*.cat"));

  for (const catFile of catFiles) {
    const catalogue = await parseCat(catFile);

    // Skip library catalogues
    const isLibrary = catalogue.$.library === "true";
    if (isLibrary) {
      continue;
    }

    let factionName = catalogue.$.name;

    // For subfaction catalogues like "Ironjawz - Ironsunz [LEGENDS]",
    // extract the parent faction name ("Ironjawz")
    if (factionName.includes(" - ")) {
      factionName = factionName.split(" - ")[0].trim();
    }

    // Remove [LEGENDS] suffix if present
    factionName = factionName.replace(/\s*\[LEGENDS\]\s*/gi, "").trim();

    // Skip non-faction catalogues (special characters prefix)
    if (factionName.startsWith("þ") || factionName.startsWith("✦") || factionName.startsWith("❖") || factionName.startsWith("۞")) {
      continue;
    }

    catalogueMap.set(catalogue.$.id, factionName);
  }

  return catalogueMap;
}

/**
 * Information about a catalogue including subfaction details
 */
export interface CatalogueInfo {
  /** Parent faction name (e.g., "Ironjawz") */
  factionName: string;
  /** Subfaction name if this is a subfaction catalogue (e.g., "Ironsunz") */
  subfactionName?: string;
  /** Whether this is a subfaction catalogue */
  isSubfaction: boolean;
}

/**
 * Build a map of catalogue ID to detailed catalogue info.
 * Preserves subfaction identity for proper output organization.
 *
 * Examples:
 * - "Ironjawz" → { factionName: "Ironjawz", isSubfaction: false }
 * - "Ironjawz - Ironsunz [LEGENDS]" → { factionName: "Ironjawz", subfactionName: "Ironsunz", isSubfaction: true }
 */
export async function buildCatalogueInfoMap(bsdataDir: string): Promise<Map<string, CatalogueInfo>> {
  const catalogueMap = new Map<string, CatalogueInfo>();
  const catFiles = await glob(join(bsdataDir, "*.cat"));

  for (const catFile of catFiles) {
    const catalogue = await parseCat(catFile);

    // Skip library catalogues
    const isLibrary = catalogue.$.library === "true";
    if (isLibrary) {
      continue;
    }

    const rawName = catalogue.$.name;

    // Skip non-faction catalogues (special characters prefix)
    if (rawName.startsWith("þ") || rawName.startsWith("✦") || rawName.startsWith("❖") || rawName.startsWith("۞")) {
      continue;
    }

    // Check if this is a subfaction catalogue (contains " - ")
    if (rawName.includes(" - ")) {
      const parts = rawName.split(" - ");
      const factionName = parts[0].trim();
      let subfactionName = parts.slice(1).join(" - ").trim();

      // Remove [LEGENDS] suffix from subfaction name
      subfactionName = subfactionName.replace(/\s*\[LEGENDS\]\s*/gi, "").trim();

      catalogueMap.set(catalogue.$.id, {
        factionName,
        subfactionName,
        isSubfaction: true,
      });
    } else {
      // Main faction catalogue
      let factionName = rawName;
      // Remove [LEGENDS] suffix if present
      factionName = factionName.replace(/\s*\[LEGENDS\]\s*/gi, "").trim();

      catalogueMap.set(catalogue.$.id, {
        factionName,
        isSubfaction: false,
      });
    }
  }

  return catalogueMap;
}
