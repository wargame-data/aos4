import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
import { idSchema, metaSchema } from "../base.js";

export const battleFormationSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    faction: idSchema,
    description: z.string().optional(),
    abilities: z.array(abilitySchema),
    restrictions: z.string().optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type BattleFormation = z.infer<typeof battleFormationSchema>;
