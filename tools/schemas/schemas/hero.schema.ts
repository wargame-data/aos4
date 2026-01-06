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
} from "../base.js";

// Hero stats (same as unit)
const heroStatsSchema = z
  .object({
    move: moveSchema,
    health: z.number().int().min(1),
    save: saveSchema,
    control: z.number().int().min(0),
  })
  .strict();

// Regiment allows schema
const regimentAllowsSchema = z
  .object({
    keywords: z.array(z.string()),
    description: z.string(),
  })
  .strict();

// Can join regiment schema
const canJoinRegimentSchema = z
  .object({
    keywords: z.array(z.string()),
    description: z.string().optional(),
  })
  .strict();

export const heroSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    faction: idSchema,
    grandAlliance: grandAllianceSchema.optional(),
    points: z.number().int().min(0),
    stats: heroStatsSchema,
    role: roleSchema,
    keywords: z.array(z.string()),
    regimentKeywords: z.array(z.string()).optional(),
    baseSize: z.number().int().min(1),
    maxSize: z.number().int().min(1).optional(),
    canReinforce: z.boolean().optional(),
    isCollective: z.boolean().optional(),
    costs: costsSchema.optional(),
    rules: z.array(ruleSchema).optional(),
    publication: publicationSchema.optional(),
    weapons: z.array(weaponSchema),
    abilities: z.array(abilitySchema).optional(),
    notes: z.string().optional(),
    // Hero-specific fields
    isWizard: z.number().int().min(1).nullable(),
    isPriest: z.number().int().min(1).nullable(),
    isUnique: z.boolean(),
    regimentAllows: z.array(regimentAllowsSchema).optional(),
    canJoinRegiment: canJoinRegimentSchema.nullable(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Hero = z.infer<typeof heroSchema>;
