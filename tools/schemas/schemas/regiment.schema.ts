import { z } from "zod";
import { idSchema } from "../base.js";
import { unitSelectionSchema } from "./unit-selection.schema.js";

/**
 * Schema for a regiment in an army list.
 * A regiment consists of exactly 1 regimental leader and up to 4 unit selections.
 * Alternatively, a Regiment of Renown can be used which has a fixed composition.
 */
export const regimentSchema = z
  .object({
    /** The regimental leader (must be a hero) */
    leader: unitSelectionSchema,
    /** Up to 4 unit selections in this regiment */
    units: z.array(unitSelectionSchema).max(4).optional(),
    /** If using a Regiment of Renown, specify its ID (replaces normal unit selections) */
    regimentOfRenownId: idSchema.optional(),
  })
  .strict()
  .refine(
    (data) => !data.regimentOfRenownId || !data.units?.length,
    {
      message: "Regiment of Renown replaces normal units - cannot have both",
      path: ["units"],
    }
  );

export type Regiment = z.infer<typeof regimentSchema>;
