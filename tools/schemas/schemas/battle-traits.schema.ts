import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
import { idSchema, metaSchema } from "../base.js";

export const battleTraitsSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    abilities: z.array(abilitySchema),
    _meta: metaSchema.optional(),
  })
  .strict();

export type BattleTraits = z.infer<typeof battleTraitsSchema>;
