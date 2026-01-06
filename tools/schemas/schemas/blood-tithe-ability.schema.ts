import { z } from "zod";
import { idSchema, metaSchema, colorSchema, abilityCategorySchema } from "../base.js";

/**
 * Blood Tithe Ability schema.
 * These are special abilities for Blades of Khorne that can be unlocked by spending
 * Blood Tithe points. They form a tree structure with prerequisites.
 */
export const bloodTitheAbilitySchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    faction: z.literal("blades-of-khorne"),
    bloodTithePoints: z.number().int().min(0).max(8), // Cost to unlock (0 = already unlocked)
    unlockCondition: z.string().optional(), // Prerequisites text
    parentAbilityId: idSchema.optional(), // For tree structure
    usedBy: z.string().optional(), // Which units can use this ability
    timing: z.string().optional(),
    declare: z.string().optional(),
    effect: z.string(),
    keywords: z.array(z.string()).optional(),
    color: colorSchema.optional(),
    abilityCategory: abilityCategorySchema.optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type BloodTitheAbility = z.infer<typeof bloodTitheAbilitySchema>;
