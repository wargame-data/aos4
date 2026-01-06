import { z } from "zod";

// ID pattern: kebab-case
export const idSchema = z.string().regex(/^[a-z0-9-]+$/);

// Grand alliance enum
export const grandAllianceSchema = z.enum([
  "order",
  "chaos",
  "death",
  "destruction",
]);

// Phase enum
export const phaseSchema = z.enum([
  "any",
  "hero",
  "movement",
  "shooting",
  "charge",
  "combat",
  "end",
]);

// Ability type enum
export const abilityTypeSchema = z.enum([
  "passive",
  "reaction",
  "once-per-turn",
  "once-per-battle",
  "spell",
  "prayer",
  "command",
]);

// Role enum
export const roleSchema = z.enum([
  "battleline",
  "other",
  "artillery",
  "behemoth",
]);

// Color enum (for BSData visual categorization)
export const colorSchema = z.enum([
  "Black",
  "Blue",
  "Gray",
  "Green",
  "Orange",
  "Purple",
  "Red",
  "Yellow",
]);

// Ability category enum
export const abilityCategorySchema = z.enum([
  "Offensive",
  "Defensive",
  "Movement",
  "Control",
  "Special",
  "Rallying",
  "Shooting",
]);

// Lore type enum
export const loreTypeSchema = z.enum(["spell", "prayer", "manifestation"]);

// Dice expression pattern (e.g., "D6", "2D6+1")
export const diceExpressionSchema = z.string().regex(/^\d?[dD]\d+.*$/);

// Movement pattern (e.g., '5"', 'D6+8"', '3D6"', '-' for immobile)
export const moveSchema = z.string().regex(/^(-|(\d*D6(\+\d+)?|\d+)")$/);

// Save pattern (e.g., "4+")
export const saveSchema = z.string().regex(/^\d\+$/);

// Range pattern (e.g., '12"')
export const rangeSchema = z.string().regex(/^\d+"$/);

// Roll pattern (e.g., "3+", "4+")
export const rollSchema = z.string().regex(/^\d\+$/);

// Meta information
export const metaSchema = z
  .object({
    lastUpdated: z.string().optional(),
    source: z.string().optional(),
  })
  .strict();

// Publication reference
export const publicationSchema = z
  .object({
    name: z.string(),
    shortName: z.string().optional(),
    page: z.string().optional(),
  })
  .strict();

// Rule (non-ability rules)
export const ruleSchema = z
  .object({
    name: z.string(),
    description: z.string(),
  })
  .strict();

// Alternative costs
export const costsSchema = z
  .object({
    destinyPoints: z.number().int().min(0).optional(),
    ptgCategory: z.number().int().min(0).optional(),
    ghbCategory: z.number().int().min(0).optional(),
  })
  .strict();

// Condition type enum
export const conditionTypeSchema = z.enum([
  "equalTo",
  "notEqualTo",
  "lessThan",
  "greaterThan",
  "atLeast",
  "atMost",
  "instanceOf",
]);

// Single condition
export const conditionSchema = z
  .object({
    type: conditionTypeSchema,
    value: z.string(),
    field: z.string(),
    scope: z.string().optional(),
    childId: z.string().optional(),
  })
  .strict();

// Condition group (recursive)
export type ConditionGroup = {
  logic: "and" | "or";
  conditions?: z.infer<typeof conditionSchema>[];
  groups?: ConditionGroup[];
};

export const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z
    .object({
      logic: z.enum(["and", "or"]),
      conditions: z.array(conditionSchema).optional(),
      groups: z.array(conditionGroupSchema).optional(),
    })
    .strict()
);

// Modifier type enum
export const modifierTypeSchema = z.enum([
  "set",
  "increment",
  "decrement",
  "append",
  "add",
  "remove",
]);

// Modifier
export const modifierSchema = z
  .object({
    type: modifierTypeSchema,
    field: z.string(),
    value: z.string(),
    conditions: conditionGroupSchema.optional(),
  })
  .strict();

// Repeat (for constraint modifiers with scaling)
export const repeatSchema = z
  .object({
    value: z.string(),
    repeats: z.string(),
    field: z.string(),
    scope: z.string(),
    childId: z.string().optional(),
    shared: z.boolean().optional(),
    roundUp: z.boolean().optional(),
    includeChildSelections: z.boolean().optional(),
    includeChildForces: z.boolean().optional(),
    percentValue: z.boolean().optional(),
  })
  .strict();

// Constraint modifier (for dynamic min/max scaling)
export const constraintModifierSchema = z
  .object({
    constraintId: z.string(),
    type: z.enum(["set", "increment", "decrement"]),
    value: z.string(),
    repeats: z.array(repeatSchema).optional(),
  })
  .strict();

// Export types derived from schemas
export type GrandAlliance = z.infer<typeof grandAllianceSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type AbilityType = z.infer<typeof abilityTypeSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Color = z.infer<typeof colorSchema>;
export type AbilityCategory = z.infer<typeof abilityCategorySchema>;
export type LoreType = z.infer<typeof loreTypeSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type Costs = z.infer<typeof costsSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Modifier = z.infer<typeof modifierSchema>;
export type Repeat = z.infer<typeof repeatSchema>;
export type ConstraintModifier = z.infer<typeof constraintModifierSchema>;
