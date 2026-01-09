import { zodToJsonSchema } from "zod-to-json-schema";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { ZodTypeAny } from "zod";

// Import all schemas
import { weaponSchema } from "./schemas/weapon.schema.js";
import { abilitySchema } from "./schemas/ability.schema.js";
import { warscrollSchema } from "./schemas/warscroll.schema.js";
import { spellSchema, prayerSchema } from "./schemas/spell.schema.js";
import { pointsPackSchema } from "./schemas/points-pack.schema.js";

const SCHEMA_DIR = join(process.cwd(), "schema");
const BASE_URL = "https://wargamedata.com/aos4/schema";

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
    schema: warscrollSchema,
    filename: "warscroll.schema.json",
    title: "Warscroll",
    description: "A unified warscroll for units and heroes in the catalog",
  },
  {
    schema: spellSchema,
    filename: "spell.schema.json",
    title: "Spell",
    description: "An individual spell in the catalog",
  },
  {
    schema: prayerSchema,
    filename: "prayer.schema.json",
    title: "Prayer",
    description: "An individual prayer in the catalog",
  },
  {
    schema: pointsPackSchema,
    filename: "points-pack.schema.json",
    title: "Points Pack",
    description: "A points pack mapping catalog items to points costs",
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
