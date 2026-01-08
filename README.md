# aos4

## Overview

**aos4** provides clean, structured, and version-controlled game data for Age of Sigmar 4th Edition. It's designed to help developers build army list builders, stat trackers, and other hobby tools.

### Features

- **One file per unit** - Clean diffs, easy contributions
- **JSON Schema validation** - Consistent structure across all data
- **Git history as changelog** - Every change tracked
- **Human-readable format** - No ID lookups required
- **Open source** - MIT licensed

## Installation

```bash
npm install @wargame-data/aos4
```

Or use directly from GitHub:

```bash
npm install github:wargame-data/aos4
```

## Usage

```typescript
import factions from "@wargame-data/aos4/data/factions";

// Or import specific data
import liberators from "@wargame-data/aos4/data/factions/stormcast-eternals/units/liberators.json";
```

## Data Structure

```
aos4/
├── schema/                    # JSON Schema definitions
│   ├── faction.schema.json
│   ├── unit.schema.json
│   ├── hero.schema.json
│   └── ...
├── data/
│   ├── factions/
│   │   ├── stormcast-eternals/
│   │   │   ├── _index.json    # Faction metadata
│   │   │   ├── heroes/
│   │   │   ├── units/
│   │   │   ├── battle-formations/
│   │   │   └── lores/
│   │   └── ...
│   └── shared/                # Cross-faction data
└── tools/                     # Validation and build tools
```

## Example Unit Data

```json
{
  "id": "liberators",
  "name": "Liberators",
  "faction": "stormcast-eternals",
  "points": 140,
  "stats": {
    "move": "5\"",
    "health": 2,
    "save": "3+",
    "control": 1
  },
  "role": "battleline",
  "keywords": ["ORDER", "STORMCAST ETERNALS", "WARRIOR CHAMBER", "REDEEMER", "INFANTRY"],
  "weapons": [...],
  "abilities": [...]
}
```

### Quick Start for Contributors

1. Fork the repository
2. Make your changes to JSON files in `data/`
3. Run `npm test` to validate
4. Submit a pull request

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Validate all data files
npm run validate

# Run tests (build + validate)
npm test
```

## License

- **Code:** MIT License

## Disclaimer

This project is not affiliated with, endorsed, or sponsored by Games Workshop. Age of Sigmar, Warhammer, and all associated marks are trademarks of Games Workshop Ltd.

This is a fan-made resource for the hobby community. All game data is derived from publicly available sources and is provided for personal, non-commercial use.

## Links

- [GitHub Repository](https://github.com/wargame-data/aos4)
- [Issue Tracker](https://github.com/wargame-data/aos4/issues)
- [BSData AoS 4th](https://github.com/BSData/age-of-sigmar-4th) - Source reference
