/**
 * Terrain Schema
 *
 * Defines the structure for faction terrain features.
 * Faction terrain is found in [Faction] - Library.cat files with the FACTION TERRAIN category.
 */

import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
import {
  qualifiedIdSchema,
  grandAllianceSchema,
  moveSchema,
  saveSchema,
  metaSchema,
} from "../base.js";

/**
 * Terrain stats schema (similar to unit stats)
 */
const terrainStatsSchema = z
  .object({
    move: moveSchema,
    health: z.number().int().min(1),
    save: saveSchema,
    control: z.union([z.number().int().min(0), z.literal("-")]),
  })
  .strict();

/**
 * Terrain entity schema
 */
export const terrainSchema = z
  .object({
    $schema: z.string().optional(),
    /** Qualified ID: terrain.{faction}.{name} */
    id: qualifiedIdSchema,
    /** Original BSData ID for cross-referencing */
    bsdataId: z.string(),
    /** Entity type discriminator */
    type: z.literal("terrain"),
    /** Display name */
    name: z.string(),
    /** Faction ID (underscore format) */
    faction: z.string(),
    /** Grand alliance */
    grandAlliance: grandAllianceSchema.optional(),
    /** Keywords (includes faction, grand alliance) */
    keywords: z.array(z.string()),
    /** Unit profile stats */
    stats: terrainStatsSchema,
    /** Terrain abilities */
    abilities: z.array(abilitySchema),
    /** Parser metadata */
    _meta: metaSchema.optional(),
  })
  .strict();

export type Terrain = z.infer<typeof terrainSchema>;
export type TerrainStats = z.infer<typeof terrainStatsSchema>;
