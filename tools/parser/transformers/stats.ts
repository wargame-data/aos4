/**
 * Stats Transformer
 *
 * Transforms BSData stat values to aos-data schema format.
 */

/**
 * Transform move value to include inch suffix
 * "5" -> "5\""
 * "5\"" -> "5\""
 * "D6+8\"" -> "D6+8\""
 * "D6" -> "D6\""
 * "-" or "" -> "0\""
 */
export function transformMove(value: string): string {
  if (!value || value === "-" || value === "–" || value.trim() === "") {
    return '0"';
  }

  // Normalize inch suffix (remove any existing)
  let cleaned = value.replace(/[""]$/, "").trim();

  // Handle dice notation (D6, D6+8, etc.)
  const diceMatch = cleaned.match(/^(D6(?:\+\d+)?)$/i);
  if (diceMatch) {
    return `${diceMatch[1].toUpperCase()}"`;
  }

  // Handle simple numeric value
  const num = parseInt(cleaned, 10);
  if (!isNaN(num)) {
    return `${num}"`;
  }

  // Fallback - try to preserve the original if it looks reasonable
  if (/^[D\d+]+$/i.test(cleaned)) {
    return `${cleaned}"`;
  }

  return '0"';
}

/**
 * Transform save value to include + suffix
 * "3" -> "3+"
 * "3+" -> "3+" (already formatted)
 * "-" -> null (no save)
 */
export function transformSave(value: string): string | null {
  if (!value || value === "-" || value === "–" || value.trim() === "") {
    return null;
  }

  // If already has + suffix, return as-is
  if (value.endsWith("+")) {
    return value;
  }

  // Extract numeric value
  const num = parseInt(value.replace(/[^\d]/g, ""), 10);
  if (isNaN(num) || num < 1 || num > 7) {
    return null;
  }

  return `${num}+`;
}

/**
 * Transform health value to integer
 * "2" -> 2
 * "D6" -> parse as max value? or throw?
 */
export function transformHealth(value: string): number {
  if (!value || value === "-" || value.trim() === "") {
    return 1; // Default minimum
  }

  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    return 1;
  }

  return num;
}

/**
 * Transform control value to integer
 * "1" -> 1
 * "-" -> 0
 */
export function transformControl(value: string): number {
  if (!value || value === "-" || value === "–" || value.trim() === "") {
    return 0;
  }

  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return 0;
  }

  return num;
}

/**
 * Transform banishment value to integer (optional stat for manifestations)
 * "4" -> 4
 * "-" or "" -> undefined
 */
export function transformBanishment(value: string): number | undefined {
  if (!value || value === "-" || value === "–" || value.trim() === "") {
    return undefined;
  }

  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    return undefined;
  }

  return num;
}

/**
 * Transform range value to include inch suffix
 * "12" -> "12\""
 * "12\"" -> "12\""
 */
export function transformRange(value: string): string {
  if (!value || value === "-" || value === "–" || value.trim() === "") {
    return '0"';
  }

  // If already has inch suffix, normalize it
  if (value.endsWith('"') || value.endsWith("\"")) {
    const num = parseInt(value.replace(/[^\d]/g, ""), 10);
    return `${num}"`;
  }

  // Extract numeric value
  const num = parseInt(value.replace(/[^\d]/g, ""), 10);
  if (isNaN(num)) {
    return '0"';
  }

  return `${num}"`;
}

/**
 * Transform hit/wound value to include + suffix
 * "3" -> "3+"
 * "3+" -> "3+"
 */
export function transformRollValue(value: string): string {
  if (!value || value === "-" || value === "–") {
    return "6+"; // Default to worst case
  }

  // If already has + suffix, return as-is
  if (value.endsWith("+")) {
    return value;
  }

  // Extract numeric value
  const num = parseInt(value.replace(/[^\d]/g, ""), 10);
  if (isNaN(num) || num < 1 || num > 6) {
    return "6+";
  }

  return `${num}+`;
}

/**
 * Transform rend value to integer
 * "-" -> 0
 * "-1" -> 1
 * "1" -> 1
 * "2" -> 2
 */
export function transformRend(value: string): number {
  if (!value || value === "-" || value === "–" || value.trim() === "") {
    return 0;
  }

  // Remove minus sign and parse
  const cleaned = value.replace("-", "").trim();
  const num = parseInt(cleaned, 10);

  if (isNaN(num)) {
    return 0;
  }

  return Math.min(Math.max(num, 0), 4); // Clamp between 0-4
}

/**
 * Stats object structure matching aos-data schema
 */
export interface TransformedStats {
  move: string;
  health: number;
  save: string;
  control: number;
  banishment?: number;
}

/**
 * Transform all stats from BSData characteristics
 */
export function transformStats(characteristics: {
  Move?: string;
  Health?: string;
  Save?: string;
  Control?: string;
  Banishment?: string;
}): TransformedStats {
  const stats: TransformedStats = {
    move: transformMove(characteristics.Move || ""),
    health: transformHealth(characteristics.Health || ""),
    save: transformSave(characteristics.Save || "") || "6+",
    control: transformControl(characteristics.Control || ""),
  };

  const banishment = transformBanishment(characteristics.Banishment || "");
  if (banishment !== undefined) {
    stats.banishment = banishment;
  }

  return stats;
}
