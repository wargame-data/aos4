import { z } from "zod";
import { weaponSchema } from "./weapon.schema.js";
import { abilitySchema } from "./ability.schema.js";
import {
  idSchema,
  grandAllianceSchema,
  moveSchema,
  metaSchema,
  publicationSchema,
  costsSchema,
} from "../base.js";

// Manifestation stats - note: save can be '-' for manifestations
const manifestationStatsSchema = z
  .object({
    move: moveSchema,
    health: z.number().int().min(1),
    save: z.string(), // Can be "6+" or "-"
    banishment: z.number().int().min(1),
  })
  .strict();

export const manifestationSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    faction: idSchema,
    grandAlliance: grandAllianceSchema.optional(),
    points: z.number().int().min(0),
    stats: manifestationStatsSchema,
    keywords: z.array(z.string()),
    baseSize: z.string().optional(), // String for manifestations (e.g., "90mm x 52mm")
    costs: costsSchema.optional(),
    publication: publicationSchema.optional(),
    weapons: z.array(weaponSchema).optional(),
    abilities: z.array(abilitySchema).optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Manifestation = z.infer<typeof manifestationSchema>;
