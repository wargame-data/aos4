import { z } from "zod";
import {
  simpleIdSchema,
  qualifiedIdSchema,
  colorSchema,
  abilityCategorySchema,
  metaSchema,
} from "../base.js";

// Requirements for using a spell
const spellRequirementsSchema = z
  .object({
    armyRequiresKeywords: z.array(z.string()).optional(),
  })
  .strict();

// Individual spell entity (not nested in a lore)
export const spellSchema = z
  .object({
    $schema: z.string().optional(),
    id: qualifiedIdSchema, // e.g., "spell.stormcast.chain_lightning"
    type: z.literal("spell"),
    name: z.string(),
    faction: simpleIdSchema, // e.g., "stormcast" or "shared"
    keywords: z.array(z.string()), // e.g., ["spell", "faction:stormcast"]
    castingValue: z.number().int().min(2).max(12),
    timing: z.string().optional(),
    declare: z.string().optional(),
    effect: z.string(),
    requirements: spellRequirementsSchema.optional(),
    color: colorSchema.optional(),
    abilityCategory: abilityCategorySchema.optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

// Individual prayer entity
export const prayerSchema = z
  .object({
    $schema: z.string().optional(),
    id: qualifiedIdSchema, // e.g., "prayer.stormcast.bless_weapons"
    type: z.literal("prayer"),
    name: z.string(),
    faction: simpleIdSchema,
    keywords: z.array(z.string()), // e.g., ["prayer", "faction:stormcast"]
    chantingValue: z.number().int().min(2).max(12),
    timing: z.string().optional(),
    declare: z.string().optional(),
    effect: z.string(),
    requirements: spellRequirementsSchema.optional(),
    color: colorSchema.optional(),
    abilityCategory: abilityCategorySchema.optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Spell = z.infer<typeof spellSchema>;
export type Prayer = z.infer<typeof prayerSchema>;
export type SpellRequirements = z.infer<typeof spellRequirementsSchema>;
