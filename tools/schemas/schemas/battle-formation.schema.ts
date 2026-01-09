/**
 * Battle Formation Schema
 *
 * Defines the structure for battle formations which provide army-wide abilities.
 * Battle formations are found in [Faction].cat files under "Battle Formations: [Faction]".
 */

import { z } from "zod";
import {
  qualifiedIdSchema,
  colorSchema,
  abilityCategorySchema,
  metaSchema,
  abilityTypeSchema,
  phaseSchema,
} from "../base.js";

/**
 * Embedded ability for battle formation
 */
const battleFormationAbilitySchema = z
  .object({
    /** Ability name */
    name: z.string(),
    /** Ability type */
    type: abilityTypeSchema,
    /** Phase when the ability can be used */
    phase: phaseSchema.optional(),
    /** Declaration instructions */
    declare: z.string().optional(),
    /** Effect description */
    effect: z.string(),
    /** Keywords for the ability */
    keywords: z.array(z.string()).optional(),
    /** GW color category for UI */
    color: colorSchema.optional(),
    /** GW ability category */
    abilityCategory: abilityCategorySchema.optional(),
  })
  .strict();

/**
 * Battle formation entity schema
 */
export const battleFormationSchema = z
  .object({
    $schema: z.string().optional(),
    /** Qualified ID: formation.{faction}.{name} */
    id: qualifiedIdSchema,
    /** Original BSData ID for cross-referencing */
    bsdataId: z.string(),
    /** Entity type discriminator */
    type: z.literal("battle-formation"),
    /** Display name */
    name: z.string(),
    /** Faction ID (underscore format) */
    faction: z.string(),
    /** The formation's ability */
    ability: battleFormationAbilitySchema,
    /** Parser metadata */
    _meta: metaSchema.optional(),
  })
  .strict();

export type BattleFormation = z.infer<typeof battleFormationSchema>;
export type BattleFormationAbility = z.infer<typeof battleFormationAbilitySchema>;
