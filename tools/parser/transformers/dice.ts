/**
 * Dice Transformer
 *
 * Handles dice notation parsing and transformation.
 * Supports formats like: "1", "D6", "2D6", "D3+1", "2D6+3", etc.
 */

/**
 * Check if a value is a dice expression
 */
export function isDiceExpression(value: string): boolean {
  if (!value) return false;
  const normalized = value.toUpperCase().trim();
  return /\d*D\d+/i.test(normalized);
}

/**
 * Transform a value that could be either a number or dice expression
 * Returns number for plain integers, string for dice expressions
 *
 * "2" -> 2
 * "D6" -> "D6"
 * "2D6" -> "2D6"
 * "D3+1" -> "D3+1"
 */
export function transformDiceValue(value: string): number | string {
  if (!value || value === "-" || value === "–" || value.trim() === "") {
    return 1; // Default minimum
  }

  const trimmed = value.trim();

  // Check if it's a dice expression
  if (isDiceExpression(trimmed)) {
    return normalizeDiceExpression(trimmed);
  }

  // Try to parse as integer
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && trimmed === String(num)) {
    return num;
  }

  // If it looks like it might have extra characters but is still a number
  const cleaned = trimmed.replace(/[^\d]/g, "");
  const cleanedNum = parseInt(cleaned, 10);
  if (!isNaN(cleanedNum)) {
    return cleanedNum;
  }

  // Return as string if we can't parse it
  return trimmed;
}

/**
 * Normalize dice expression to consistent format
 * "d6" -> "D6"
 * "d6+1" -> "D6+1"
 * "2d6" -> "2D6"
 */
export function normalizeDiceExpression(value: string): string {
  if (!value) return value;

  return value
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "") // Remove spaces
    .replace(/D(\d+)/g, "D$1"); // Ensure uppercase D
}

/**
 * Parse dice expression into components
 * "2D6+3" -> { count: 2, sides: 6, modifier: 3 }
 * "D3" -> { count: 1, sides: 3, modifier: 0 }
 */
export interface DiceComponents {
  count: number;
  sides: number;
  modifier: number;
}

export function parseDiceExpression(value: string): DiceComponents | null {
  if (!value || !isDiceExpression(value)) {
    return null;
  }

  const normalized = value.toUpperCase().trim();
  const match = normalized.match(/^(\d*)D(\d+)([+-]\d+)?$/i);

  if (!match) {
    return null;
  }

  return {
    count: match[1] ? parseInt(match[1], 10) : 1,
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

/**
 * Calculate minimum possible value from a dice expression
 */
export function getMinValue(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const components = parseDiceExpression(value);
  if (!components) {
    const num = parseInt(value, 10);
    return isNaN(num) ? 1 : num;
  }

  // Minimum roll is count * 1 + modifier
  return components.count + components.modifier;
}

/**
 * Calculate maximum possible value from a dice expression
 */
export function getMaxValue(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const components = parseDiceExpression(value);
  if (!components) {
    const num = parseInt(value, 10);
    return isNaN(num) ? 1 : num;
  }

  // Maximum roll is count * sides + modifier
  return components.count * components.sides + components.modifier;
}

/**
 * Calculate average value from a dice expression
 */
export function getAverageValue(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  const components = parseDiceExpression(value);
  if (!components) {
    const num = parseInt(value, 10);
    return isNaN(num) ? 1 : num;
  }

  // Average is count * (sides + 1) / 2 + modifier
  const avgPerDie = (components.sides + 1) / 2;
  return components.count * avgPerDie + components.modifier;
}

/**
 * Validate that a dice value matches the expected pattern
 * Used for schema validation
 */
export function isValidDiceValue(value: string | number): boolean {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1;
  }

  // Check against the schema pattern: ^\\d?[dD]\\d+.*$
  return /^\d?[dD]\d+.*$/.test(value);
}
