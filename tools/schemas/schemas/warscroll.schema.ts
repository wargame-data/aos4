import { z } from "zod";
import { weaponSchema } from "./weapon.schema.js";
import { abilitySchema } from "./ability.schema.js";
import {
  simpleIdSchema,
  qualifiedIdSchema,
  grandAllianceSchema,
  roleSchema,
  moveSchema,
  saveSchema,
  metaSchema,
  publicationSchema,
  ruleSchema,
  constraintModifierSchema,
} from "../base.js";

// Warscroll stats (unified hero/unit stats)
const warscrollStatsSchema = z
  .object({
    move: moveSchema,
    health: z.number().int().min(1),
    save: saveSchema,
    control: z.number().int().min(0),
    banishment: z.number().int().min(1).optional(), // For manifestations
  })
  .strict();

// Regiment allows schema (hero-specific)
const regimentAllowsSchema = z
  .object({
    keywords: z.array(z.string()),
    description: z.string(),
  })
  .strict();

// Can join regiment schema (hero-specific)
const canJoinRegimentSchema = z
  .object({
    keywords: z.array(z.string()),
    description: z.string().optional(),
  })
  .strict();

// Unit sizes schema
const sizesSchema = z
  .object({
    min: z.number().int().min(1),
    default: z.number().int().min(1),
    max: z.number().int().min(1).optional(),
  })
  .strict();

export const warscrollSchema = z
  .object({
    $schema: z.string().optional(),
    id: qualifiedIdSchema, // e.g., "warscroll.stormcast.knight_arcanum"
    bsdataId: z.string(), // Original BSData entry ID for cross-referencing
    type: z.literal("warscroll"),
    name: z.string(),
    faction: simpleIdSchema, // e.g., "stormcast"
    grandAlliance: grandAllianceSchema.optional(),
    keywords: z.array(z.string()), // Includes "hero", "wizard", etc.
    sizes: sizesSchema, // { min, default, max }
    costs: z.record(z.string(), z.number()).optional(), // { "points.aos2025": 135 }

    // Stats and combat
    stats: warscrollStatsSchema,
    role: roleSchema,
    weapons: z.array(weaponSchema),
    abilities: z.array(abilitySchema).optional(),

    // Regiment rules
    regimentKeywords: z.array(z.string()).optional(),
    canReinforce: z.boolean().optional(),
    constraintModifiers: z.array(constraintModifierSchema).optional(),
    isCollective: z.boolean().optional(),

    // Hero-specific fields (present when "hero" keyword)
    wizard: z.number().int().min(1).nullable().optional(),
    priest: z.number().int().min(1).nullable().optional(),
    unique: z.boolean().optional(),
    regimentAllows: z.array(regimentAllowsSchema).optional(),
    canJoinRegiment: canJoinRegimentSchema.nullable().optional(),

    // Metadata
    rules: z.array(ruleSchema).optional(),
    publication: publicationSchema.optional(),
    notes: z.string().optional(),
    _meta: metaSchema.optional(),
  })
  .strict();

export type Warscroll = z.infer<typeof warscrollSchema>;
export type WarscrollStats = z.infer<typeof warscrollStatsSchema>;
export type Sizes = z.infer<typeof sizesSchema>;
