import { z } from "zod";
import {
  phaseSchema,
  abilityTypeSchema,
  colorSchema,
  abilityCategorySchema,
  modifierSchema,
} from "../base.js";

export const abilitySchema = z
  .object({
    name: z.string(),
    type: abilityTypeSchema,
    phase: phaseSchema.optional(),
    castingValue: z.number().int().min(2).max(12).optional(),
    chantingValue: z.number().int().min(2).max(6).optional(),
    declare: z.string().optional(),
    effect: z.string(),
    keywords: z.array(z.string()).optional(),
    color: colorSchema.optional(),
    abilityCategory: abilityCategorySchema.optional(),
    modifiers: z.array(modifierSchema).optional(),
  })
  .strict();

export type Ability = z.infer<typeof abilitySchema>;
