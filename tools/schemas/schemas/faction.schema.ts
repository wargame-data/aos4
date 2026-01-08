import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
import { idSchema, grandAllianceSchema, loreTypeSchema, metaSchema } from "../base.js";

// Lore reference - file path derived from: data/lores/{type}s/{id}.json
const loreReferenceSchema = z
  .object({
    id: idSchema,
    type: loreTypeSchema,
  })
  .strict();

// Battle formation reference
const battleFormationReferenceSchema = z
  .object({
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
    lores: z.array(loreReferenceSchema).optional(),
    battleFormations: z.array(battleFormationReferenceSchema).optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type LoreReference = z.infer<typeof loreReferenceSchema>;
export type BattleFormationReference = z.infer<typeof battleFormationReferenceSchema>;
export type Faction = z.infer<typeof factionSchema>;
