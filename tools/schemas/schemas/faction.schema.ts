import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
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

export const factionSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    grandAlliance: grandAllianceSchema,
    armyKeywords: z.array(z.string()).optional(),
    armyAbilities: z.array(abilitySchema).optional(),
    units: z.array(idSchema).optional(),
    heroes: z.array(idSchema).optional(),
    terrain: z.array(idSchema).optional(),
    lores: z.array(referenceSchema).optional(),
    battleFormations: z.array(referenceSchema).optional(),
    enhancements: z.array(referenceSchema).optional(),
    regimentsOfRenown: z.array(referenceSchema).optional(),
    armiesOfRenown: z.array(referenceSchema).optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Reference = z.infer<typeof referenceSchema>;
export type Faction = z.infer<typeof factionSchema>;
