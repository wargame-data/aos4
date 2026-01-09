/**
 * Manifestation Schema
 *
 * Defines the structure for manifestations (endless spells).
 * Manifestations are found in [Faction] - Library.cat files with the MANIFESTATION category.
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
 * Banishment value schema (e.g., "7+", "8+")
 */
const banishmentSchema = z.string().regex(/^\d+\+$|^-$/, {
  message: "Banishment must be a dice roll (e.g., '7+') or '-'",
});

/**
 * Manifestation stats schema
 */
const manifestationStatsSchema = z
  .object({
    move: moveSchema,
    health: z.number().int().min(1),
    save: saveSchema,
    banishment: banishmentSchema,
  })
  .strict();

/**
 * Manifestation entity schema
 */
export const manifestationSchema = z
  .object({
    $schema: z.string().optional(),
    /** Qualified ID: manifestation.{faction}.{name} */
    id: qualifiedIdSchema,
    /** Original BSData ID for cross-referencing */
    bsdataId: z.string(),
    /** Entity type discriminator */
    type: z.literal("manifestation"),
    /** Display name */
    name: z.string(),
    /** Faction ID (underscore format) */
    faction: z.string(),
    /** Grand alliance */
    grandAlliance: grandAllianceSchema.optional(),
    /** Keywords (includes faction, grand alliance) */
    keywords: z.array(z.string()),
    /** Manifestation profile stats */
    stats: manifestationStatsSchema,
    /** Manifestation abilities */
    abilities: z.array(abilitySchema),
    /** Parser metadata */
    _meta: metaSchema.optional(),
  })
  .strict();

export type Manifestation = z.infer<typeof manifestationSchema>;
export type ManifestationStats = z.infer<typeof manifestationStatsSchema>;
