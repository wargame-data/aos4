import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
import {
  idSchema,
  grandAllianceSchema,
  moveSchema,
  metaSchema,
  publicationSchema,
  costsSchema,
} from "../base.js";

// Terrain stats - from Unit profile, but terrain is usually immobile
const terrainStatsSchema = z
  .object({
    move: moveSchema, // Usually "-" for immobile terrain
    health: z.string(), // String to handle varying formats
    save: z.string(), // Can be "4+" or "-"
    control: z.string(), // Usually "-" for terrain
  })
  .strict();

export const terrainSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    faction: idSchema,
    grandAlliance: grandAllianceSchema.optional(),
    points: z.number().int().min(0).optional(), // Terrain is usually free
    stats: terrainStatsSchema,
    keywords: z.array(z.string()),
    baseSize: z.string().optional(),
    costs: costsSchema.optional(),
    publication: publicationSchema.optional(),
    abilities: z.array(abilitySchema).optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type FactionTerrain = z.infer<typeof terrainSchema>;
