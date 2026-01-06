import { z } from "zod";
import { weaponSchema } from "./weapon.schema.js";
import { abilitySchema } from "./ability.schema.js";
import {
  idSchema,
  grandAllianceSchema,
  roleSchema,
  moveSchema,
  saveSchema,
  metaSchema,
  publicationSchema,
  ruleSchema,
  costsSchema,
  constraintModifierSchema,
} from "../base.js";

// Unit stats
const unitStatsSchema = z
  .object({
    move: moveSchema,
    health: z.number().int().min(1),
    save: saveSchema,
    control: z.number().int().min(0),
    banishment: z.number().int().min(1).optional(),
  })
  .strict();

export const unitSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    faction: idSchema,
    grandAlliance: grandAllianceSchema.optional(),
    points: z.number().int().min(0),
    stats: unitStatsSchema,
    role: roleSchema,
    keywords: z.array(z.string()),
    regimentKeywords: z.array(z.string()).optional(),
    baseSize: z.number().int().min(1),
    maxSize: z.number().int().min(1).optional(),
    canReinforce: z.boolean().optional(),
    reinforcementCost: z.number().int().optional(),
    constraintModifiers: z.array(constraintModifierSchema).optional(),
    isCollective: z.boolean().optional(),
    costs: costsSchema.optional(),
    rules: z.array(ruleSchema).optional(),
    publication: publicationSchema.optional(),
    weapons: z.array(weaponSchema),
    abilities: z.array(abilitySchema).optional(),
    notes: z.string().optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Unit = z.infer<typeof unitSchema>;
