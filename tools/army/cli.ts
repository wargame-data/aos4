/**
 * Army Validator CLI
 *
 * Command-line interface for validating army lists.
 */

import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { loadArmyData, loadFactionArmyData } from "./loader.js";
import { validateArmy } from "../schemas/army-validator.js";
import { armySchema } from "../schemas/schemas/army.schema.js";
import type { Army } from "../schemas/schemas/army.schema.js";

/**
 * CLI options interface
 */
interface CLIOptions {
  file?: string;
  faction?: string;
  verbose?: boolean;
  quiet?: boolean;
}

/**
 * Logger interface
 */
interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  verbose: (msg: string) => void;
}

/**
 * Create logger based on options
 */
function createLogger(options: CLIOptions): Logger {
  return {
    info: (msg: string) => {
      if (!options.quiet) console.log(msg);
    },
    warn: (msg: string) => {
      if (!options.quiet) console.warn(msg);
    },
    error: (msg: string) => {
      console.error(msg);
    },
    verbose: (msg: string) => {
      if (options.verbose && !options.quiet) console.log(msg);
    },
  };
}

/**
 * Load and parse an army file
 */
function loadArmyFile(filePath: string): Army {
  if (!existsSync(filePath)) {
    throw new Error(`Army file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  // Validate against schema
  const result = armySchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid army format: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Validate command implementation
 */
async function validateCommand(options: CLIOptions): Promise<void> {
  const log = createLogger(options);

  if (!options.file) {
    log.error("Error: --file is required");
    process.exit(1);
  }

  log.info("aos-data Army Validator\n");

  // Load the army file
  log.verbose(`Loading army file: ${options.file}`);
  let army: Army;
  try {
    army = loadArmyFile(options.file);
    log.info(`Army: ${army.name || "(unnamed)"}`);
    log.info(`Faction: ${army.faction}`);
    log.info(`Game Format: ${army.gameFormat || "unspecified"}`);
    log.info(`Regiments: ${army.regiments.length}\n`);
  } catch (error) {
    log.error(`Failed to load army: ${error}`);
    process.exit(1);
  }

  // Load data
  log.verbose("Loading game data...");
  const armyData = options.faction
    ? loadFactionArmyData(options.faction)
    : loadArmyData();

  log.verbose(
    `Loaded: ${armyData.factions.size} factions, ${armyData.heroes.size} heroes, ${armyData.units.size} units, ${armyData.regimentsOfRenown.size} regiments of renown\n`
  );

  // Validate
  log.info("Validating army...\n");
  const result = validateArmy(army, armyData);

  // Print results
  log.info(`Total Points: ${result.totalPoints}`);
  if (army.gameFormat) {
    const limit =
      army.gameFormat === "path-to-glory"
        ? "unlimited"
        : `${army.gameFormat} pts`;
    log.info(`Points Limit: ${limit}`);
  }

  log.info("");

  if (result.errors.length > 0) {
    log.error("ERRORS:");
    for (const error of result.errors) {
      log.error(`  [${error.code}] ${error.path}: ${error.message}`);
    }
    log.info("");
  }

  if (result.warnings.length > 0) {
    log.warn("WARNINGS:");
    for (const warning of result.warnings) {
      log.warn(`  [${warning.code}] ${warning.path}: ${warning.message}`);
    }
    log.info("");
  }

  if (result.valid) {
    log.info("Result: VALID");
    process.exit(0);
  } else {
    log.error("Result: INVALID");
    process.exit(1);
  }
}

/**
 * Create the CLI program
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("aos-army")
    .description("Validate Age of Sigmar army lists")
    .version("0.1.0");

  program
    .command("validate")
    .description("Validate an army list file")
    .requiredOption("-f, --file <path>", "Path to army JSON file")
    .option("--faction <id>", "Load data for specific faction only")
    .option("-v, --verbose", "Show detailed output", false)
    .option("-q, --quiet", "Minimal output", false)
    .action(validateCommand);

  return program;
}
