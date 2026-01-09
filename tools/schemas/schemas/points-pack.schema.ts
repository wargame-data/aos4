import { z } from "zod";
import { pointsPackIdSchema, metaSchema } from "../base.js";

// Points pack schema - maps catalog item IDs to points costs
export const pointsPackSchema = z
  .object({
    $schema: z.string().optional(),
    id: pointsPackIdSchema, // e.g., "points.aos2025"
    name: z.string(),
    effectiveFrom: z.string(), // ISO date, e.g., "2025-07-01"
    costs: z.record(z.string(), z.number().int().min(0)), // { "warscroll.stormcast.liberators": 110 }
    _meta: metaSchema.optional(),
  })
  .strict();

export type PointsPack = z.infer<typeof pointsPackSchema>;
