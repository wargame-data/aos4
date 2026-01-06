/**
 * Patch Generator
 *
 * Generates unified diff patch files.
 */

import { createTwoFilesPatch } from "diff";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import type { DiffResult } from "./comparator.js";

/**
 * Options for patch generation
 */
export interface PatchOptions {
  outputDir: string;
  format?: "unified" | "json";
  context?: number; // Lines of context in unified diff
}

/**
 * Result of patch generation for a single file
 */
export interface PatchResult {
  filePath: string;
  patchPath: string;
  hasChanges: boolean;
  added: boolean;
  removed: boolean;
}

/**
 * Generate a unified diff patch between two JSON objects
 */
export function generatePatch(
  existingPath: string,
  existing: unknown | null,
  parsed: unknown,
  options: PatchOptions
): string {
  const existingJson = existing
    ? JSON.stringify(existing, null, 2)
    : "";
  const parsedJson = JSON.stringify(parsed, null, 2);

  const patch = createTwoFilesPatch(
    existingPath,
    existingPath,
    existingJson,
    parsedJson,
    "existing",
    "parsed",
    { context: options.context || 3 }
  );

  return patch;
}

/**
 * Write a patch file to disk
 */
export function writePatchFile(
  patchContent: string,
  patchPath: string
): void {
  const dir = dirname(patchPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(patchPath, patchContent);
}

/**
 * Generate patch for a file and write it
 */
export function generateAndWritePatch(
  existingPath: string,
  existing: unknown | null,
  parsed: unknown,
  options: PatchOptions
): PatchResult {
  const relativePath = existingPath.replace(process.cwd() + "/", "");
  const patchFileName = relativePath.replace(/\//g, "_") + ".patch";
  const patchPath = join(options.outputDir, patchFileName);

  // Check if there are actual changes
  const existingJson = existing ? JSON.stringify(existing, null, 2) : "";
  const parsedJson = JSON.stringify(parsed, null, 2);

  if (existingJson === parsedJson) {
    return {
      filePath: existingPath,
      patchPath: "",
      hasChanges: false,
      added: false,
      removed: false,
    };
  }

  const patch = generatePatch(existingPath, existing, parsed, options);
  writePatchFile(patch, patchPath);

  return {
    filePath: existingPath,
    patchPath,
    hasChanges: true,
    added: existing === null,
    removed: false,
  };
}

/**
 * Batch patch generation result
 */
export interface BatchPatchResult {
  timestamp: string;
  outputDir: string;
  patches: PatchResult[];
  summary: {
    total: number;
    added: number;
    modified: number;
    unchanged: number;
  };
}

/**
 * Generate patches for multiple files
 */
export function generateBatchPatches(
  files: Array<{
    path: string;
    existing: unknown | null;
    parsed: unknown;
  }>,
  options: PatchOptions
): BatchPatchResult {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const timestampedDir = join(options.outputDir, timestamp);

  // Ensure output directory exists
  if (!existsSync(timestampedDir)) {
    mkdirSync(timestampedDir, { recursive: true });
  }

  const results: PatchResult[] = [];
  let added = 0;
  let modified = 0;
  let unchanged = 0;

  for (const file of files) {
    const result = generateAndWritePatch(
      file.path,
      file.existing,
      file.parsed,
      { ...options, outputDir: timestampedDir }
    );

    results.push(result);

    if (!result.hasChanges) {
      unchanged++;
    } else if (result.added) {
      added++;
    } else {
      modified++;
    }
  }

  // Write summary JSON
  const summaryPath = join(timestampedDir, "summary.json");
  const summary = {
    timestamp,
    total: files.length,
    added,
    modified,
    unchanged,
    patches: results
      .filter((r) => r.hasChanges)
      .map((r) => ({
        file: r.filePath,
        patch: r.patchPath,
        type: r.added ? "added" : "modified",
      })),
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  return {
    timestamp,
    outputDir: timestampedDir,
    patches: results,
    summary: {
      total: files.length,
      added,
      modified,
      unchanged,
    },
  };
}

/**
 * Read existing JSON file or return null if it doesn't exist
 */
export function readExistingJson(filePath: string): unknown | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Format patch result for display
 */
export function formatPatchSummary(result: BatchPatchResult): string {
  let output = `\nPatch Generation Summary\n`;
  output += `${"=".repeat(40)}\n`;
  output += `Timestamp: ${result.timestamp}\n`;
  output += `Output: ${result.outputDir}\n\n`;
  output += `Files processed: ${result.summary.total}\n`;
  output += `  Added: ${result.summary.added}\n`;
  output += `  Modified: ${result.summary.modified}\n`;
  output += `  Unchanged: ${result.summary.unchanged}\n`;

  if (result.patches.filter((p) => p.hasChanges).length > 0) {
    output += `\nGenerated patches:\n`;
    for (const patch of result.patches) {
      if (patch.hasChanges) {
        const type = patch.added ? "[NEW]" : "[MOD]";
        output += `  ${type} ${patch.patchPath}\n`;
      }
    }
  }

  return output;
}
