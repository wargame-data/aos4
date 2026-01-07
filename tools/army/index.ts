#!/usr/bin/env node
/**
 * aos-army CLI Entry Point
 *
 * Validate Age of Sigmar army lists.
 *
 * Usage:
 *   npx aos-army validate --file army.json
 *   npx aos-army validate --file army.json --verbose
 */

import { createProgram } from "./cli.js";

const program = createProgram();

program.parse(process.argv);
