# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

aos4 is a community-maintained archive of Age of Sigmar 4th Edition game data in JSON format. It parses BSData XML files (from github.com/BSData/age-of-sigmar-4th) and converts them to clean, developer-friendly JSON.

## Commands

```bash
# Build TypeScript
npm run build

# Validate all JSON data files against schemas
npm run validate

# Build + generate schemas + validate (full test)
npm test

# Sync from BSData (clone/update + parse all factions)
npm run parser:sync

# Parse a single faction
npm run build && node dist/tools/parser/index.js parse --faction stormcast-eternals

# List available factions
npm run parser:list

# Show diff between parsed and existing data
npm run parser:diff

# Generate JSON Schema files from Zod schemas
npm run schema:build
```

## Architecture

### Data Flow
BSData XML (`*.cat`, `*.gst`) → Parser → JSON files in `data/` → Validated against JSON Schemas

### Directory Structure
- `tools/parser/` - BSData XML parser (CLI entry point: `index.ts`, logic: `cli.ts`)
- `tools/validator/` - JSON Schema validation for data files
- `tools/schemas/` - Zod schemas that generate JSON Schema files
- `schema/` - Generated JSON Schema files (do not edit directly)
- `data/factions/` - Output JSON files organized by faction
- `data/shared/` - Cross-faction data (lores, regiments of renown)
- `.cache/bsdata/` - Cached BSData repository clone

### Parser Components
- `xml/reader.ts` - Parse BSData `.cat` and `.gst` XML files
- `xml/traverser.ts` - Navigate BSData XML structure, find units/manifestations
- `mappers/*.mapper.ts` - Transform BSData entries to aos4 JSON format
- `output/writer.ts` - Write JSON files to disk with proper structure
- `github/clone.ts` - Clone/update BSData from GitHub

### Schema System
Schemas are defined in Zod (`tools/schemas/schemas/*.schema.ts`) and exported from `tools/schemas/index.ts`. Running `npm run schema:build` generates JSON Schema files in `schema/`.

Key entity types: Unit, Hero, Manifestation, BattleFormation, Enhancement, RegimentOfRenown, Lore, Faction

### Validation
The validator (`tools/validator/`) uses directory path to determine schema:
- `/heroes/` → hero.schema.json
- `/units/` → unit.schema.json
- `/battle-formations/` → battle-formation.schema.json
- `_index.json` → faction.schema.json

## Data Conventions

- File naming: kebab-case matching the `id` field (e.g., `lord-celestant.json`)
- All JSON files should have `$schema` reference
- Points costs come from non-library catalogues (e.g., `Stormcast Eternals.cat`)
- Unit definitions come from library catalogues (e.g., `Stormcast Eternals - Library.cat`)
