/**
 * Schema Validator
 *
 * JSON Schema validation for parsed output.
 */

import AjvDefault from "ajv";
import addFormatsDefault from "ajv-formats";

const Ajv = AjvDefault.default ?? AjvDefault;
const addFormats = addFormatsDefault.default ?? addFormatsDefault;
type AjvInstance = InstanceType<typeof Ajv>;
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { glob } from "glob";
import { SCHEMA_DIR } from "../config.js";

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Create AJV validator with all schemas loaded
 */
export function createValidator(): AjvInstance {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
  });
  addFormats(ajv);

  // Load all schemas
  const schemaFiles = glob.sync(join(SCHEMA_DIR, "*.schema.json"));
  for (const schemaFile of schemaFiles) {
    if (existsSync(schemaFile)) {
      const content = readFileSync(schemaFile, "utf-8");
      const schema = JSON.parse(content);
      ajv.addSchema(schema);
    }
  }

  return ajv;
}

/**
 * Validate data against a schema
 */
export function validateAgainstSchema(
  ajv: AjvInstance,
  schemaId: string,
  data: unknown
): ValidationResult {
  const validate = ajv.getSchema(schemaId);

  if (!validate) {
    return {
      valid: false,
      errors: [`Schema not found: ${schemaId}`],
    };
  }

  const valid = validate(data);

  if (valid) {
    return { valid: true };
  }

  const errors = validate.errors?.map((err) => {
    return `${err.instancePath || "/"}: ${err.message}`;
  });

  return {
    valid: false,
    errors,
  };
}

/**
 * Validate a unit
 */
export function validateUnit(
  ajv: AjvInstance,
  unit: unknown,
  isHero: boolean
): ValidationResult {
  const schemaId = isHero
    ? "https://aos-data.org/schema/hero.schema.json"
    : "https://aos-data.org/schema/unit.schema.json";

  return validateAgainstSchema(ajv, schemaId, unit);
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  valid: boolean;
  totalItems: number;
  validItems: number;
  invalidItems: number;
  errors: Array<{
    item: string;
    errors: string[];
  }>;
}

/**
 * Validate multiple items
 */
export function validateBatch(
  ajv: AjvInstance,
  items: Array<{ id: string; data: unknown; schemaId: string }>
): BatchValidationResult {
  const result: BatchValidationResult = {
    valid: true,
    totalItems: items.length,
    validItems: 0,
    invalidItems: 0,
    errors: [],
  };

  for (const item of items) {
    const validation = validateAgainstSchema(ajv, item.schemaId, item.data);

    if (validation.valid) {
      result.validItems++;
    } else {
      result.valid = false;
      result.invalidItems++;
      result.errors.push({
        item: item.id,
        errors: validation.errors || [],
      });
    }
  }

  return result;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  result: BatchValidationResult
): string {
  if (result.valid) {
    return `All ${result.totalItems} items validated successfully.`;
  }

  let output = `Validation failed: ${result.invalidItems}/${result.totalItems} items invalid\n\n`;

  for (const error of result.errors) {
    output += `${error.item}:\n`;
    for (const msg of error.errors) {
      output += `  - ${msg}\n`;
    }
    output += "\n";
  }

  return output;
}
