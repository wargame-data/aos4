import { z } from "zod";
import { diceExpressionSchema, rangeSchema, rollSchema } from "../base.js";

// Weapon type
const weaponTypeSchema = z.enum(["melee", "ranged"]);

// Attacks can be a number or dice expression
const attacksSchema = z.union([
  z.number().int().min(1),
  diceExpressionSchema,
]);

// Damage can be a number or dice expression
const damageSchema = z.union([
  z.number().int().min(1),
  diceExpressionSchema,
]);

export const weaponSchema = z
  .object({
    name: z.string(),
    type: weaponTypeSchema,
    range: rangeSchema.optional(),
    attacks: attacksSchema,
    hit: rollSchema,
    wound: rollSchema,
    rend: z.number().int().min(0).max(4),
    damage: damageSchema,
    abilities: z.array(z.string()).optional(),
  })
  .strict()
  .refine((data) => data.type !== "ranged" || data.range !== undefined, {
    message: "Ranged weapons must have a range",
    path: ["range"],
  });

export type Weapon = z.infer<typeof weaponSchema>;
