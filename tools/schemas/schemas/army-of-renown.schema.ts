import { z } from "zod";
import { idSchema, grandAllianceSchema, metaSchema } from "../base.js";

// Unified reference schema - all references use { id, name, file }
// File paths: relative for local files, /absolute for centralized data
const referenceSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    file: z.string(),
  })
  .strict();

export const armyOfRenownSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    parentFaction: idSchema,
    grandAlliance: grandAllianceSchema,
    armyKeywords: z.array(z.string()).optional(),
    units: z.array(idSchema).optional(),
    heroes: z.array(idSchema).optional(),
    terrain: z.array(idSchema).optional(),
    lores: z.array(referenceSchema).optional(),
    enhancements: z.array(referenceSchema).optional(),
    regimentsOfRenown: z.array(referenceSchema).optional(),
    battleTraits: referenceSchema.optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Reference = z.infer<typeof referenceSchema>;
export type ArmyOfRenown = z.infer<typeof armyOfRenownSchema>;
