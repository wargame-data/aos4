import { z } from "zod";
import { abilitySchema } from "./ability.schema.js";
import { idSchema, metaSchema } from "../base.js";

// Individual enhancement (trait or artefact)
const enhancementEntrySchema = z
  .object({
    name: z.string(),
    restrictions: z.string().optional(),
    ability: abilitySchema.optional(),
    points: z.number().int().min(0).optional(),
  })
  .strict();

// Enhancement collection (e.g., "Heroic Traits", "Artefacts of Power")
export const enhancementCollectionSchema = z
  .object({
    $schema: z.string().optional(),
    id: idSchema,
    name: z.string(),
    faction: idSchema,
    enhancementType: z.enum(["heroic-trait", "artefact"]),
    enhancements: z.array(enhancementEntrySchema),
    _meta: metaSchema.optional(),
  })
  .strict();

export type EnhancementEntry = z.infer<typeof enhancementEntrySchema>;
export type EnhancementCollection = z.infer<typeof enhancementCollectionSchema>;
