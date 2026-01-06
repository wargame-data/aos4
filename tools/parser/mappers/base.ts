/**
 * Base Mapper
 *
 * Abstract base class for all mappers with strict mode support.
 */

export interface StrictModeError {
  type: string;
  message: string;
  location: {
    catalogue?: string;
    entryId?: string;
    entryName?: string;
    path?: string;
  };
  bsdataElement?: unknown;
  suggestion?: string;
}

export interface MapperOptions {
  strict: boolean;
  factionId: string;
  grandAlliance?: string;
  catalogueName?: string;
}

export abstract class BaseMapper<TInput, TOutput> {
  protected options: MapperOptions;
  protected unmappedData: StrictModeError[] = [];

  constructor(options: MapperOptions) {
    this.options = options;
  }

  /**
   * Main mapping method - implemented by subclasses
   */
  abstract map(input: TInput): TOutput;

  /**
   * Record unmapped data for reporting
   * In strict mode, throws immediately
   */
  protected recordUnmapped(error: StrictModeError): void {
    this.unmappedData.push(error);

    if (this.options.strict) {
      throw new StrictMapperError(error);
    }
  }

  /**
   * Get all recorded unmapped data
   */
  getUnmappedData(): StrictModeError[] {
    return [...this.unmappedData];
  }

  /**
   * Check if there are any unmapped data errors
   */
  hasUnmappedData(): boolean {
    return this.unmappedData.length > 0;
  }

  /**
   * Clear recorded unmapped data
   */
  clearUnmappedData(): void {
    this.unmappedData = [];
  }

  /**
   * Generate metadata for output
   */
  protected generateMeta(): { lastUpdated: string; source: string } {
    const today = new Date().toISOString().split("T")[0];
    return {
      lastUpdated: today,
      source: "BSData import",
    };
  }
}

/**
 * Error thrown in strict mode when unmappable data is encountered
 */
export class StrictMapperError extends Error {
  public readonly strictError: StrictModeError;

  constructor(error: StrictModeError) {
    const locationStr = [
      error.location.catalogue,
      error.location.entryName,
      error.location.path,
    ]
      .filter(Boolean)
      .join(" > ");

    super(`[STRICT] ${error.type}: ${error.message} at ${locationStr}`);
    this.name = "StrictMapperError";
    this.strictError = error;
  }
}

/**
 * Combine multiple mapper errors into a report
 */
export function formatStrictErrors(errors: StrictModeError[]): string {
  if (errors.length === 0) {
    return "No unmapped data found.";
  }

  const grouped = new Map<string, StrictModeError[]>();
  for (const error of errors) {
    const existing = grouped.get(error.type) || [];
    existing.push(error);
    grouped.set(error.type, existing);
  }

  let output = `\n${"=".repeat(60)}\n`;
  output += `STRICT MODE: ${errors.length} unmapped elements found\n`;
  output += `${"=".repeat(60)}\n\n`;

  for (const [type, typeErrors] of grouped) {
    output += `## ${type} (${typeErrors.length})\n\n`;

    for (const error of typeErrors.slice(0, 10)) {
      output += `  - ${error.location.entryName || "Unknown"}\n`;
      if (error.location.catalogue) {
        output += `    Catalogue: ${error.location.catalogue}\n`;
      }
      output += `    ${error.message}\n`;
      if (error.suggestion) {
        output += `    Suggestion: ${error.suggestion}\n`;
      }
      output += "\n";
    }

    if (typeErrors.length > 10) {
      output += `  ... and ${typeErrors.length - 10} more\n\n`;
    }
  }

  return output;
}
