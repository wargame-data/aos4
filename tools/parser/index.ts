#!/usr/bin/env node
/**
 * aos-parser CLI Entry Point
 *
 * Parse BSData XML files to aos-data JSON format.
 *
 * Usage:
 *   npx aos-parser sync --strict
 *   npx aos-parser parse --faction stormcast-eternals
 *   npx aos-parser diff --patch-dir ./patches
 */

import { createProgram } from "./cli.js";

const program = createProgram();

program.parse(process.argv);
