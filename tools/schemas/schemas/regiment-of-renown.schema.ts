import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
import { idSchema, metaSchema } from "../base.js";

// Unit composition entry
const unitCompositionSchema = z
  .object({
    name: z.string(),
    count: z.number().int().min(1),
    required: z.boolean().optional(),
  })
  .strict();

export const regimentOfRenownSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    points: z.number().int().min(0),
    allowedFactions: z.array(z.string()),
    units: z.array(unitCompositionSchema),
    abilities: z.array(abilitySchema).optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type UnitComposition = z.infer<typeof unitCompositionSchema>;
export type RegimentOfRenown = z.infer<typeof regimentOfRenownSchema>;
