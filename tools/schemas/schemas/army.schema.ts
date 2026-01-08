import { z } from "zod";
import { idSchema, grandAllianceSchema } from "../base.js";
import { regimentSchema } from "./regiment.schema.js";
import { unitSelectionSchema } from "./unit-selection.schema.js";

/**
 * Schema for enhancement assignments (heroic traits and artefacts).
 */
const enhancementAssignmentSchema = z
  .object({
    /** The hero receiving the enhancement */
    heroId: idSchema,
    /** The enhancement being assigned */
    enhancementId: idSchema,
  })
  .strict();

/**
 * Schema for all enhancement selections in an army.
 */
const enhancementsSchema = z
  .object({
    /** Heroic traits assigned to heroes */
    heroicTraits: z.array(enhancementAssignmentSchema).optional(),
    /** Artefacts of power assigned to heroes */
    artefacts: z.array(enhancementAssignmentSchema).optional(),
  })
  .strict();

/**
 * Game format enum for points limits.
 */
export const gameFormatSchema = z.enum([
  "1000",      // 1000 points (Spearhead-ish or small games)
  "2000",      // 2000 points (Standard matched play)
  "2500",      // 2500 points (Large games)
  "path-to-glory", // Path to Glory campaign format
]);

/**
 * Schema for a complete army list.
 * An army consists of 0-5 regiments, optional auxiliary units, and enhancements.
 */
export const armySchema = z
  .object({
    /** JSON Schema reference */
    $schema: z.string().optional(),
    /** Optional name for the army list */
    name: z.string().optional(),
    /** The faction this army belongs to */
    faction: idSchema,
    /** The grand alliance of the faction */
    grandAlliance: grandAllianceSchema,
    /** Optional battle formation (subfaction) selection */
    battleFormation: idSchema.optional(),
    /** The hero designated as the army general (optional - defaults to first regiment leader) */
    generalHeroId: idSchema.optional(),
    /** 0-5 regiments in the army */
    regiments: z.array(regimentSchema).max(5),
    /** Auxiliary units (outside of regiments) */
    auxiliary: z.array(unitSelectionSchema).optional(),
    /** Enhancement selections */
    enhancements: enhancementsSchema.optional(),
    /** Optional faction terrain */
    factionTerrain: idSchema.optional(),
    /** Selected manifestation lore ID (optional, faction must have access) */
    manifestationLore: idSchema.optional(),
    /** Selected spell lore ID (army-wide, optional) */
    spellLore: idSchema.optional(),
    /** Selected prayer lore ID (army-wide, optional) */
    prayerLore: idSchema.optional(),
    /** Game format determining points limit */
    gameFormat: gameFormatSchema.optional(),
    /** Selected battle tactic card IDs (typically 2 cards) */
    battleTactics: z.array(idSchema).max(2).optional(),
    /** Whether to allow LEGENDS units in the army (default: false) */
    allowLegends: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // At most 1 Regiment of Renown in the entire army
      const rorCount = data.regiments.filter((r) => r.regimentOfRenownId).length;
      return rorCount <= 1;
    },
    {
      message: "Army can have at most 1 Regiment of Renown",
      path: ["regiments"],
    }
  );

export type EnhancementAssignment = z.infer<typeof enhancementAssignmentSchema>;
export type Enhancements = z.infer<typeof enhancementsSchema>;
export type GameFormat = z.infer<typeof gameFormatSchema>;
export type Army = z.infer<typeof armySchema>;
