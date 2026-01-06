/**
 * Comparator
 *
 * Deep comparison of parsed data vs existing JSON files.
 */

/**
 * Represents a single difference between two values
 */
export interface DiffResult {
  path: string;
  type: "added" | "removed" | "changed";
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Deep compare two objects and return list of differences
 */
export function compareObjects(
  existing: Record<string, unknown>,
  parsed: Record<string, unknown>,
  basePath: string = ""
): DiffResult[] {
  const results: DiffResult[] = [];

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(existing),
    ...Object.keys(parsed),
  ]);

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const existingVal = existing[key];
    const parsedVal = parsed[key];

    // Skip _meta comparison (timestamps will always differ)
    if (key === "_meta") {
      continue;
    }

    // Skip $schema (always same)
    if (key === "$schema") {
      continue;
    }

    // Key only in existing (removed in parsed)
    if (!(key in parsed)) {
      results.push({
        path,
        type: "removed",
        oldValue: existingVal,
      });
      continue;
    }

    // Key only in parsed (added)
    if (!(key in existing)) {
      results.push({
        path,
        type: "added",
        newValue: parsedVal,
      });
      continue;
    }

    // Both have the key - compare values
    const diffs = compareValues(existingVal, parsedVal, path);
    results.push(...diffs);
  }

  return results;
}

/**
 * Compare two values (handles arrays, objects, primitives)
 */
function compareValues(
  existing: unknown,
  parsed: unknown,
  path: string
): DiffResult[] {
  // Both null/undefined
  if (existing == null && parsed == null) {
    return [];
  }

  // One is null/undefined
  if (existing == null) {
    return [{ path, type: "added", newValue: parsed }];
  }
  if (parsed == null) {
    return [{ path, type: "removed", oldValue: existing }];
  }

  // Different types
  if (typeof existing !== typeof parsed) {
    return [
      {
        path,
        type: "changed",
        oldValue: existing,
        newValue: parsed,
      },
    ];
  }

  // Arrays
  if (Array.isArray(existing) && Array.isArray(parsed)) {
    return compareArrays(existing, parsed, path);
  }

  // Objects
  if (typeof existing === "object" && typeof parsed === "object") {
    return compareObjects(
      existing as Record<string, unknown>,
      parsed as Record<string, unknown>,
      path
    );
  }

  // Primitives
  if (existing !== parsed) {
    return [
      {
        path,
        type: "changed",
        oldValue: existing,
        newValue: parsed,
      },
    ];
  }

  return [];
}

/**
 * Compare two arrays
 */
function compareArrays(
  existing: unknown[],
  parsed: unknown[],
  path: string
): DiffResult[] {
  const results: DiffResult[] = [];

  // For arrays of objects with 'name' or 'id', compare by that key
  if (existing.length > 0 && parsed.length > 0) {
    const existingFirst = existing[0];
    const parsedFirst = parsed[0];

    if (
      typeof existingFirst === "object" &&
      existingFirst !== null &&
      typeof parsedFirst === "object" &&
      parsedFirst !== null
    ) {
      // Check for name or id key
      const keyField =
        "name" in existingFirst
          ? "name"
          : "id" in existingFirst
            ? "id"
            : null;

      if (keyField) {
        return compareArraysByKey(existing, parsed, path, keyField);
      }
    }
  }

  // Simple index-based comparison for arrays without identifiable keys
  const maxLen = Math.max(existing.length, parsed.length);

  for (let i = 0; i < maxLen; i++) {
    const itemPath = `${path}[${i}]`;

    if (i >= existing.length) {
      results.push({
        path: itemPath,
        type: "added",
        newValue: parsed[i],
      });
    } else if (i >= parsed.length) {
      results.push({
        path: itemPath,
        type: "removed",
        oldValue: existing[i],
      });
    } else {
      results.push(...compareValues(existing[i], parsed[i], itemPath));
    }
  }

  return results;
}

/**
 * Compare arrays by a specific key field (e.g., 'name' or 'id')
 */
function compareArraysByKey(
  existing: unknown[],
  parsed: unknown[],
  path: string,
  keyField: string
): DiffResult[] {
  const results: DiffResult[] = [];

  const existingMap = new Map<string, unknown>();
  const parsedMap = new Map<string, unknown>();

  for (const item of existing) {
    if (typeof item === "object" && item !== null) {
      const key = (item as Record<string, unknown>)[keyField] as string;
      if (key) existingMap.set(key, item);
    }
  }

  for (const item of parsed) {
    if (typeof item === "object" && item !== null) {
      const key = (item as Record<string, unknown>)[keyField] as string;
      if (key) parsedMap.set(key, item);
    }
  }

  // Check for removed items
  for (const [key, existingItem] of existingMap) {
    if (!parsedMap.has(key)) {
      results.push({
        path: `${path}[${keyField}=${key}]`,
        type: "removed",
        oldValue: existingItem,
      });
    }
  }

  // Check for added and changed items
  for (const [key, parsedItem] of parsedMap) {
    const existingItem = existingMap.get(key);
    const itemPath = `${path}[${keyField}=${key}]`;

    if (!existingItem) {
      results.push({
        path: itemPath,
        type: "added",
        newValue: parsedItem,
      });
    } else {
      // Compare the items
      results.push(
        ...compareValues(existingItem, parsedItem, itemPath)
      );
    }
  }

  return results;
}

/**
 * Summarize differences
 */
export interface DiffSummary {
  totalChanges: number;
  added: number;
  removed: number;
  changed: number;
  paths: string[];
}

export function summarizeDiffs(diffs: DiffResult[]): DiffSummary {
  return {
    totalChanges: diffs.length,
    added: diffs.filter((d) => d.type === "added").length,
    removed: diffs.filter((d) => d.type === "removed").length,
    changed: diffs.filter((d) => d.type === "changed").length,
    paths: diffs.map((d) => d.path),
  };
}

/**
 * Check if two objects are deeply equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  const diffs = compareValues(a, b, "");
  return diffs.length === 0;
}
