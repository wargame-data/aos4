/**
 * GitHub Clone
 *
 * Clones and updates BSData repositories from GitHub.
 */

import { simpleGit, type SimpleGit } from "simple-git";
import { existsSync } from "fs";
import {
  getRepoCachePath,
  ensureCacheDir,
  writeCacheMetadata,
  readCacheMetadata,
  cacheExists,
  isCacheValid,
  clearCache,
} from "./cache.js";

// BSData AoS 4th repository
export const BSDATA_AOS_REPO = "https://github.com/BSData/age-of-sigmar-4th.git";
export const BSDATA_AOS_NAME = "age-of-sigmar-4th";

/**
 * Options for cloning/updating
 */
export interface CloneOptions {
  repoUrl?: string;
  repoName?: string;
  rootDir?: string;
  force?: boolean;
  maxCacheAgeHours?: number;
  shallow?: boolean;
}

/**
 * Result of clone/update operation
 */
export interface CloneResult {
  path: string;
  wasUpdated: boolean;
  commit?: string;
  fromCache: boolean;
}

/**
 * Clone or update BSData repository
 */
export async function cloneOrUpdate(
  options: CloneOptions = {}
): Promise<CloneResult> {
  const {
    repoUrl = BSDATA_AOS_REPO,
    repoName = BSDATA_AOS_NAME,
    rootDir = process.cwd(),
    force = false,
    maxCacheAgeHours = 24,
    shallow = true,
  } = options;

  ensureCacheDir(rootDir);

  const cachePath = getRepoCachePath(repoName, rootDir);
  const git: SimpleGit = simpleGit();

  // Force refresh - clear cache first
  if (force && cacheExists(repoName, rootDir)) {
    clearCache(repoName, rootDir);
  }

  // Check if cache is valid
  if (!force && isCacheValid(repoName, maxCacheAgeHours, rootDir)) {
    const metadata = readCacheMetadata(cachePath);
    return {
      path: cachePath,
      wasUpdated: false,
      commit: metadata?.commit,
      fromCache: true,
    };
  }

  // Clone or pull
  if (existsSync(cachePath) && existsSync(`${cachePath}/.git`)) {
    // Repository exists, pull updates
    const repoGit = simpleGit(cachePath);

    try {
      await repoGit.fetch();
      await repoGit.pull();

      const log = await repoGit.log({ maxCount: 1 });
      const commit = log.latest?.hash;

      writeCacheMetadata(cachePath, {
        lastFetched: new Date().toISOString(),
        repoUrl,
        commit,
      });

      return {
        path: cachePath,
        wasUpdated: true,
        commit,
        fromCache: false,
      };
    } catch (error) {
      // If pull fails, try to continue with existing cache
      console.warn(
        `Warning: Failed to update repository, using existing cache: ${error}`
      );
      const metadata = readCacheMetadata(cachePath);
      return {
        path: cachePath,
        wasUpdated: false,
        commit: metadata?.commit,
        fromCache: true,
      };
    }
  } else {
    // Fresh clone
    const cloneOptions = shallow ? ["--depth", "1"] : [];

    await git.clone(repoUrl, cachePath, cloneOptions);

    const repoGit = simpleGit(cachePath);
    const log = await repoGit.log({ maxCount: 1 });
    const commit = log.latest?.hash;

    writeCacheMetadata(cachePath, {
      lastFetched: new Date().toISOString(),
      repoUrl,
      commit,
    });

    return {
      path: cachePath,
      wasUpdated: true,
      commit,
      fromCache: false,
    };
  }
}

/**
 * Get the current commit hash of a cached repository
 */
export async function getCurrentCommit(
  repoName: string = BSDATA_AOS_NAME,
  rootDir: string = process.cwd()
): Promise<string | null> {
  const cachePath = getRepoCachePath(repoName, rootDir);

  if (!existsSync(`${cachePath}/.git`)) {
    return null;
  }

  try {
    const git = simpleGit(cachePath);
    const log = await git.log({ maxCount: 1 });
    return log.latest?.hash || null;
  } catch {
    return null;
  }
}

/**
 * Check if a repository is cloned
 */
export function isCloned(
  repoName: string = BSDATA_AOS_NAME,
  rootDir: string = process.cwd()
): boolean {
  const cachePath = getRepoCachePath(repoName, rootDir);
  return existsSync(`${cachePath}/.git`);
}
