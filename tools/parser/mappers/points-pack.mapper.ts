/**
 * Points Pack Mapper
 *
 * Aggregates points costs from faction catalogues into a single points pack.
 */

import type { PointsPack } from "../../schemas/schemas/points-pack.schema.js";
import { NEW_SCHEMA_URLS } from "../config.js";

/**
 * Points pack builder for accumulating points from multiple sources
 */
export class PointsPackBuilder {
  private costs: Map<string, number> = new Map();
  private packId: string;
  private name: string;
  private effectiveFrom: string;

  constructor(packId: string, name: string, effectiveFrom?: string) {
    this.packId = packId;
    this.name = name;
    this.effectiveFrom = effectiveFrom || new Date().toISOString().split("T")[0];
  }

  /**
   * Add a single points cost entry
   */
  addCost(qualifiedId: string, points: number): void {
    // Use the higher value if duplicate (shouldn't happen, but be safe)
    const existing = this.costs.get(qualifiedId);
    if (existing === undefined || points > existing) {
      this.costs.set(qualifiedId, points);
    }
  }

  /**
   * Add multiple points cost entries
   */
  addCosts(entries: Map<string, number>): void {
    for (const [id, points] of entries) {
      this.addCost(id, points);
    }
  }

  /**
   * Check if an entry has points
   */
  hasPoints(qualifiedId: string): boolean {
    return this.costs.has(qualifiedId);
  }

  /**
   * Get points for an entry
   */
  getPoints(qualifiedId: string): number | undefined {
    return this.costs.get(qualifiedId);
  }

  /**
   * Get total number of entries
   */
  get size(): number {
    return this.costs.size;
  }

  /**
   * Build the final points pack
   */
  build(): PointsPack {
    // Sort costs alphabetically by key for consistent output
    const sortedCosts: Record<string, number> = {};
    const sortedKeys = [...this.costs.keys()].sort();
    for (const key of sortedKeys) {
      sortedCosts[key] = this.costs.get(key)!;
    }

    return {
      $schema: NEW_SCHEMA_URLS.pointsPack,
      id: this.packId,
      name: this.name,
      effectiveFrom: this.effectiveFrom,
      costs: sortedCosts,
      _meta: {
        lastUpdated: new Date().toISOString().split("T")[0],
        source: "BSData Age of Sigmar 4th Edition",
      },
    };
  }
}

/**
 * Create a standard points pack builder for AoS 2025
 */
export function createAos2025PointsPack(): PointsPackBuilder {
  return new PointsPackBuilder(
    "points.aos2025",
    "Age of Sigmar 2025 Points",
    "2025-01-01"
  );
}
