import { z } from "zod";
import { idSchema, metaSchema } from "../base.js";

/**
 * Individual tactic within a battle tactic card.
 * Each card has three tiers: Affray (1pt), Strike (2pt), Domination (3pt).
 */
const tacticSchema = z
  .object({
    name: z.string(),
    description: z.string(),
  })
  .strict();

/**
 * Battle Tactic Card schema.
 * Players select 2 battle tactic cards per army from the available pool.
 */
export const battleTacticCardSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    cardRules: z.string().optional(), // Setup/selection rules specific to this card
    affray: tacticSchema, // 1 victory point tactic
    strike: tacticSchema, // 2 victory points tactic
    domination: tacticSchema, // 3 victory points tactic
    _meta: metaSchema.optional(),
  })
  .strict();

export type Tactic = z.infer<typeof tacticSchema>;
export type BattleTacticCard = z.infer<typeof battleTacticCardSchema>;
