import AjvDefault from "ajv";
import addFormatsDefault from "ajv-formats";
import { readFileSync, existsSync } from "fs";
import { glob } from "glob";
import { join, dirname, basename } from "path";

const Ajv = AjvDefault.default ?? AjvDefault;
const addFormats = addFormatsDefault.default ?? addFormatsDefault;
type AjvInstance = InstanceType<typeof Ajv>;

// Use process.cwd() as root since validator is run from project root
const ROOT_DIR = process.cwd();
const SCHEMA_DIR = join(ROOT_DIR, "schema");
const DATA_DIR = join(ROOT_DIR, "data");

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: string[];
}

function loadSchema(schemaPath: string): object {
  const content = readFileSync(schemaPath, "utf-8");
  return JSON.parse(content);
}

function createValidator(): AjvInstance {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
  });
  addFormats(ajv);

  // Load all schemas
  const schemaFiles = glob.sync(join(SCHEMA_DIR, "*.schema.json"));
  for (const schemaFile of schemaFiles) {
    const schema = loadSchema(schemaFile);
    ajv.addSchema(schema);
  }

  return ajv;
}

function determineSchemaForFile(filePath: string): string | null {
  const relativePath = filePath.replace(DATA_DIR, "");

  if (relativePath.includes("/heroes/")) {
    return "https://aos-data.org/schema/hero.schema.json";
  }
  if (relativePath.includes("/units/")) {
    return "https://aos-data.org/schema/unit.schema.json";
  }
  if (relativePath.includes("/battle-formations/")) {
    return "https://aos-data.org/schema/battle-formation.schema.json";
  }
  // Check /lores/ before /manifestations/ since lores can have /lores/manifestations/ subdir
  if (relativePath.includes("/lores/")) {
    return "https://aos-data.org/schema/lore.schema.json";
  }
  if (relativePath.includes("/manifestations/")) {
    return "https://aos-data.org/schema/manifestation.schema.json";
  }
  if (relativePath.includes("/enhancements/")) {
    return "https://aos-data.org/schema/enhancement.schema.json";
  }
  if (relativePath.includes("/regiments-of-renown/")) {
    return "https://aos-data.org/schema/regiment-of-renown.schema.json";
  }
  if (relativePath.includes("/battle-tactics/")) {
    return "https://aos-data.org/schema/battle-tactic-card.schema.json";
  }
  if (relativePath.includes("/blood-tithe/")) {
    return "https://aos-data.org/schema/blood-tithe-ability.schema.json";
  }
  if (relativePath.includes("/terrain/")) {
    return "https://aos-data.org/schema/terrain.schema.json";
  }
  if (basename(filePath) === "_index.json") {
    return "https://aos-data.org/schema/faction.schema.json";
  }

  return null;
}

function validateFile(ajv: AjvInstance, filePath: string): ValidationResult {
  const schemaId = determineSchemaForFile(filePath);

  if (!schemaId) {
    return {
      file: filePath,
      valid: true,
      errors: ["No schema mapping found, skipping validation"],
    };
  }

  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    return {
      file: filePath,
      valid: false,
      errors: [`Schema not found: ${schemaId}`],
    };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    const valid = validate(data);
    if (valid) {
      return { file: filePath, valid: true };
    }

    const errors = validate.errors?.map((err) => {
      return `${err.instancePath || "/"}: ${err.message}`;
    });

    return {
      file: filePath,
      valid: false,
      errors,
    };
  } catch (err) {
    return {
      file: filePath,
      valid: false,
      errors: [`Parse error: ${(err as Error).message}`],
    };
  }
}

async function main(): Promise<void> {
  console.log("aos-data Validator\n");
  console.log(`Schema directory: ${SCHEMA_DIR}`);
  console.log(`Data directory: ${DATA_DIR}\n`);

  if (!existsSync(DATA_DIR)) {
    console.log("No data directory found. Nothing to validate.");
    process.exit(0);
  }

  const ajv = createValidator();
  const dataFiles = await glob(join(DATA_DIR, "**/*.json"));

  if (dataFiles.length === 0) {
    console.log("No JSON files found in data directory.");
    process.exit(0);
  }

  console.log(`Found ${dataFiles.length} JSON file(s) to validate.\n`);

  let hasErrors = false;
  const results: ValidationResult[] = [];

  for (const file of dataFiles) {
    const result = validateFile(ajv, file);
    results.push(result);

    if (!result.valid) {
      hasErrors = true;
    }
  }

  // Print results
  for (const result of results) {
    const relativePath = result.file.replace(ROOT_DIR + "/", "");
    if (result.valid) {
      console.log(`✓ ${relativePath}`);
    } else {
      console.log(`✗ ${relativePath}`);
      for (const error of result.errors || []) {
        console.log(`  - ${error}`);
      }
    }
  }

  console.log("\n---");
  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;
  console.log(`Valid: ${validCount}, Invalid: ${invalidCount}`);

  if (hasErrors) {
    process.exit(1);
  }

  console.log("\nAll files validated successfully!");
}

main().catch((err) => {
  console.error("Validator error:", err);
  process.exit(1);
});
