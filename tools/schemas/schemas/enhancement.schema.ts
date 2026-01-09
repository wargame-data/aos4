/**
 * Enhancement Schema
 *
 * Defines the structure for enhancements (artefacts, command traits, mount traits)
 * that can be attached to units.
 */

import { z } from "zod";
import {
  qualifiedIdSchema,
  colorSchema,
  abilityCategorySchema,
  metaSchema,
} from "../base.js";

/**
 * Requirements for which units can receive this enhancement
 */
const enhancementRequirementsSchema = z
  .object({
    /** Keywords the target unit must have (e.g., ["hero"]) */
    targetRequiresKeywords: z.array(z.string()).optional(),
    /** Keywords the target unit must NOT have (e.g., ["unique"]) */
    targetForbidsKeywords: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Intrinsic limits on enhancement usage
 * Note: Most caps (like "1 artefact per army") belong in rulesets, not here
 */
const enhancementLimitsSchema = z
  .object({
    /** Maximum instances allowed per army */
    perArmy: z.number().int().min(1).optional(),
    /** Maximum instances allowed per target unit */
    perTarget: z.number().int().min(1).optional(),
  })
  .strict();

/**
 * Enhancement entity schema
 */
export const enhancementSchema = z
  .object({
    $schema: z.string().optional(),
    /** Qualified ID: enhancement.{faction}.{name} */
    id: qualifiedIdSchema,
    /** Original BSData ID for cross-referencing */
    bsdataId: z.string(),
    /** Entity type discriminator */
    type: z.literal("enhancement"),
    /** Display name */
    name: z.string(),
    /** Enhancement type + faction keywords (e.g., ["artefact", "faction:stormcast"]) */
    keywords: z.array(z.string()),
    /** Requirements for which units can receive this enhancement */
    requirements: enhancementRequirementsSchema.optional(),
    /** Intrinsic usage limits */
    limits: enhancementLimitsSchema.optional(),
    /** When the ability can be used (for activated abilities) */
    timing: z.string().optional(),
    /** Declaration instructions (for activated abilities) */
    declare: z.string().optional(),
    /** Effect description */
    effect: z.string(),
    /** GW color category for UI */
    color: colorSchema.optional(),
    /** GW ability category */
    abilityCategory: abilityCategorySchema.optional(),
    /** Parser metadata */
    _meta: metaSchema.optional(),
  })
  .strict();

export type Enhancement = z.infer<typeof enhancementSchema>;
export type EnhancementRequirements = z.infer<typeof enhancementRequirementsSchema>;
export type EnhancementLimits = z.infer<typeof enhancementLimitsSchema>;
