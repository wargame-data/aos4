import { z } from "zod";
import { idSchema } from "../base.js";

/**
 * Schema for a unit selection in an army list.
 * References a unit or hero by ID with quantity information.
 */
export const unitSelectionSchema = z
  .object({
    /** Reference to the unit or hero ID */
    unitId: idSchema,
    /** Number of models in this selection (respects unit's baseSize/maxSize) */
    count: z.number().int().min(1),
    /** Whether this unit has been reinforced to maxSize */
    reinforced: z.boolean().optional(),
  })
  .strict();

export type UnitSelection = z.infer<typeof unitSelectionSchema>;
