/**
 * Cache Management
 *
 * Manages local cache for cloned BSData repositories.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

// Default cache directory relative to project root
const DEFAULT_CACHE_DIR = ".cache/bsdata";

/**
 * Cache metadata stored in a JSON file
 */
interface CacheMetadata {
  lastFetched: string; // ISO timestamp
  repoUrl: string;
  commit?: string;
}

/**
 * Get the cache directory path
 */
export function getCacheDir(rootDir: string = process.cwd()): string {
  return join(rootDir, DEFAULT_CACHE_DIR);
}

/**
 * Get the path to a specific repository in the cache
 */
export function getRepoCachePath(
  repoName: string,
  rootDir: string = process.cwd()
): string {
  return join(getCacheDir(rootDir), repoName);
}

/**
 * Get the metadata file path for a cached repository
 */
function getMetadataPath(cachePath: string): string {
  return join(cachePath, ".cache-meta.json");
}

/**
 * Check if cache exists for a repository
 */
export function cacheExists(
  repoName: string,
  rootDir: string = process.cwd()
): boolean {
  const cachePath = getRepoCachePath(repoName, rootDir);
  return existsSync(cachePath) && existsSync(getMetadataPath(cachePath));
}

/**
 * Check if cache is valid (not expired)
 */
export function isCacheValid(
  repoName: string,
  maxAgeHours: number = 24,
  rootDir: string = process.cwd()
): boolean {
  if (!cacheExists(repoName, rootDir)) {
    return false;
  }

  const cachePath = getRepoCachePath(repoName, rootDir);
  const metadata = readCacheMetadata(cachePath);

  if (!metadata) {
    return false;
  }

  const lastFetched = new Date(metadata.lastFetched);
  const now = new Date();
  const ageHours = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);

  return ageHours < maxAgeHours;
}

/**
 * Read cache metadata
 */
export function readCacheMetadata(cachePath: string): CacheMetadata | null {
  const metadataPath = getMetadataPath(cachePath);

  if (!existsSync(metadataPath)) {
    return null;
  }

  try {
    const content = readFileSync(metadataPath, "utf-8");
    return JSON.parse(content) as CacheMetadata;
  } catch {
    return null;
  }
}

/**
 * Write cache metadata
 */
export function writeCacheMetadata(
  cachePath: string,
  metadata: CacheMetadata
): void {
  const metadataPath = getMetadataPath(cachePath);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Ensure cache directory exists
 */
export function ensureCacheDir(rootDir: string = process.cwd()): void {
  const cacheDir = getCacheDir(rootDir);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Clear cache for a specific repository
 */
export function clearCache(
  repoName: string,
  rootDir: string = process.cwd()
): void {
  const cachePath = getRepoCachePath(repoName, rootDir);
  if (existsSync(cachePath)) {
    rmSync(cachePath, { recursive: true, force: true });
  }
}

/**
 * Clear all cached repositories
 */
export function clearAllCaches(rootDir: string = process.cwd()): void {
  const cacheDir = getCacheDir(rootDir);
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

/**
 * Get cache age in hours
 */
export function getCacheAge(
  repoName: string,
  rootDir: string = process.cwd()
): number | null {
  if (!cacheExists(repoName, rootDir)) {
    return null;
  }

  const cachePath = getRepoCachePath(repoName, rootDir);
  const metadata = readCacheMetadata(cachePath);

  if (!metadata) {
    return null;
  }

  const lastFetched = new Date(metadata.lastFetched);
  const now = new Date();
  return (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);
}
