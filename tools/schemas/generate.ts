import { zodToJsonSchema } from "zod-to-json-schema";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { ZodTypeAny } from "zod";

// Import all schemas
import { weaponSchema } from "./schemas/weapon.schema.js";
import { abilitySchema } from "./schemas/ability.schema.js";
import { unitSchema } from "./schemas/unit.schema.js";
import { heroSchema } from "./schemas/hero.schema.js";
import { manifestationSchema } from "./schemas/manifestation.schema.js";
import { loreSchema } from "./schemas/lore.schema.js";
import { battleFormationSchema } from "./schemas/battle-formation.schema.js";
import { enhancementCollectionSchema } from "./schemas/enhancement.schema.js";
import { regimentOfRenownSchema } from "./schemas/regiment-of-renown.schema.js";
import { factionSchema } from "./schemas/faction.schema.js";
// Army composition schemas
import { unitSelectionSchema } from "./schemas/unit-selection.schema.js";
import { regimentSchema } from "./schemas/regiment.schema.js";
import { armySchema } from "./schemas/army.schema.js";

const SCHEMA_DIR = join(process.cwd(), "schema");
const BASE_URL = "https://aos-data.org/schema";

interface SchemaConfig {
  schema: ZodTypeAny;
  filename: string;
  title: string;
  description: string;
}

const schemas: SchemaConfig[] = [
  {
    schema: weaponSchema,
    filename: "weapon.schema.json",
    title: "Weapon",
    description: "A weapon profile for an Age of Sigmar unit",
  },
  {
    schema: abilitySchema,
    filename: "ability.schema.json",
    title: "Ability",
    description: "An ability for an Age of Sigmar unit or hero",
  },
  {
    schema: unitSchema,
    filename: "unit.schema.json",
    title: "Unit",
    description: "A unit warscroll for Age of Sigmar 4th Edition",
  },
  {
    schema: heroSchema,
    filename: "hero.schema.json",
    title: "Hero",
    description: "A hero warscroll for Age of Sigmar 4th Edition",
  },
  {
    schema: manifestationSchema,
    filename: "manifestation.schema.json",
    title: "Manifestation",
    description:
      "A manifestation (endless spell) warscroll for Age of Sigmar 4th Edition",
  },
  {
    schema: loreSchema,
    filename: "lore.schema.json",
    title: "Lore",
    description: "A spell lore, prayer lore, or manifestation lore for Age of Sigmar",
  },
  {
    schema: battleFormationSchema,
    filename: "battle-formation.schema.json",
    title: "Battle Formation",
    description: "A battle formation (subfaction) for Age of Sigmar 4th Edition",
  },
  {
    schema: enhancementCollectionSchema,
    filename: "enhancement.schema.json",
    title: "Enhancement Collection",
    description: "A collection of enhancements (heroic traits or artefacts) for Age of Sigmar",
  },
  {
    schema: regimentOfRenownSchema,
    filename: "regiment-of-renown.schema.json",
    title: "Regiment of Renown",
    description: "A Regiment of Renown for Age of Sigmar 4th Edition",
  },
  {
    schema: factionSchema,
    filename: "faction.schema.json",
    title: "Faction",
    description: "Faction metadata for Age of Sigmar 4th Edition",
  },
  // Army composition schemas
  {
    schema: unitSelectionSchema,
    filename: "unit-selection.schema.json",
    title: "Unit Selection",
    description: "A unit or hero selection in an army list with count information",
  },
  {
    schema: regimentSchema,
    filename: "regiment.schema.json",
    title: "Regiment",
    description: "A regiment in an army list with leader and unit selections",
  },
  {
    schema: armySchema,
    filename: "army.schema.json",
    title: "Army",
    description: "A complete army list for Age of Sigmar 4th Edition",
  },
];

function generateSchemas(): void {
  if (!existsSync(SCHEMA_DIR)) {
    mkdirSync(SCHEMA_DIR, { recursive: true });
  }

  console.log("Generating JSON Schema files from Zod schemas...\n");

  for (const config of schemas) {
    const jsonSchema = zodToJsonSchema(config.schema, {
      $refStrategy: "none", // Inline all definitions
      target: "jsonSchema7",
    });

    // Remove the $schema added by zod-to-json-schema and add our own metadata
    const { $schema: _, ...schemaWithoutMeta } = jsonSchema as Record<string, unknown>;

    const output = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: `${BASE_URL}/${config.filename}`,
      title: config.title,
      description: config.description,
      ...schemaWithoutMeta,
    };

    const path = join(SCHEMA_DIR, config.filename);
    writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
    console.log(`  ✓ ${config.filename}`);
  }

  console.log(`\nGenerated ${schemas.length} JSON Schema files to ${SCHEMA_DIR}`);
}

generateSchemas();
