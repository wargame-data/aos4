import { z } from "zod";
import {
  idSchema,
  loreTypeSchema,
  colorSchema,
  abilityCategorySchema,
  metaSchema,
} from "../base.js";

// Spell in a lore
const spellSchema = z
  .object({
    name: z.string(),
    castingValue: z.number().int().min(2).max(12),
    timing: z.string().optional(),
    declare: z.string().optional(),
    effect: z.string(),
    keywords: z.array(z.string()).optional(),
    color: colorSchema.optional(),
    abilityCategory: abilityCategorySchema.optional(),
  })
  .strict();

// Prayer in a lore
const prayerSchema = z
  .object({
    name: z.string(),
    chantingValue: z.number().int().min(2).max(12),
    timing: z.string().optional(),
    declare: z.string().optional(),
    effect: z.string(),
    keywords: z.array(z.string()).optional(),
    color: colorSchema.optional(),
    abilityCategory: abilityCategorySchema.optional(),
  })
  .strict();

export const loreSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    loreType: loreTypeSchema,
    spells: z.array(spellSchema).optional(),
    prayers: z.array(prayerSchema).optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Lore = z.infer<typeof loreSchema>;
export type Spell = z.infer<typeof spellSchema>;
export type Prayer = z.infer<typeof prayerSchema>;
