# Contributing to aos-data

Thank you for your interest in contributing to aos-data! This document provides guidelines for contributing to the project.

## Ways to Contribute

1. **Fix data errors** - Points costs, stat lines, ability text
2. **Add missing units** - Heroes, units, battle formations
3. **Add new factions** - Following the established schema
4. **Improve tooling** - Validation, parsing, documentation

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aos-data.git
cd aos-data

# Install dependencies
npm install

# Build and validate
npm test
```

## Making Changes

### Data Files

All game data lives in the `data/` directory:

```
data/
├── factions/
│   └── faction-name/
│       ├── _index.json          # Faction metadata
│       ├── heroes/              # Hero warscrolls
│       │   └── hero-name.json
│       ├── units/               # Unit warscrolls
│       │   └── unit-name.json
│       ├── battle-formations/   # Battle formations
│       └── lores/               # Spell/prayer lores
└── shared/                      # Cross-faction data
```

### File Naming

- Use **kebab-case** for all file and folder names
- Example: `lord-celestant.json`, `stormcast-eternals/`
- Match the `id` field in the JSON to the filename (without `.json`)

### JSON Format

All JSON files must:

1. Pass JSON Schema validation
2. Include the `$schema` reference
3. Use consistent formatting (2-space indentation)

### Example Unit File

```json
{
  "$schema": "https://aos-data.org/schema/unit.schema.json",
  "id": "liberators",
  "name": "Liberators",
  "faction": "stormcast-eternals",
  "grandAlliance": "order",
  "points": 140,
  "stats": {
    "move": "5\"",
    "health": 2,
    "save": "3+",
    "control": 1
  },
  "role": "battleline",
  "keywords": ["ORDER", "STORMCAST ETERNALS", "WARRIOR CHAMBER", "REDEEMER", "INFANTRY"],
  "regimentKeywords": ["WARRIOR CHAMBER", "REDEEMER"],
  "baseSize": 5,
  "maxSize": 10,
  "canReinforce": true,
  "weapons": [
    {
      "name": "Heavens-wrought Weapon",
      "type": "melee",
      "attacks": 2,
      "hit": "3+",
      "wound": "4+",
      "rend": 0,
      "damage": 1,
      "abilities": []
    }
  ],
  "abilities": [
    {
      "name": "Lay Low the Tyrants",
      "type": "passive",
      "effect": "Add 1 to the Rend characteristic..."
    }
  ],
  "_meta": {
    "lastUpdated": "2025-01-06",
    "source": "Stormcast Eternals Faction Pack"
  }
}
```

## Validation

Before submitting a PR, always run validation:

```bash
npm run build
npm run validate
```

The CI will also validate your changes automatically.

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** for your changes: `git checkout -b fix/liberators-points`
3. **Make your changes** and validate them
4. **Commit** with a clear message: `fix(stormcast): update Liberators points to 140`
5. **Push** to your fork
6. **Open a Pull Request** against `main`

### Commit Message Format

```
type(scope): description

- type: fix, feat, docs, chore
- scope: faction name or area (optional)
- description: brief summary
```

Examples:
- `fix(stormcast): correct Knight-Incantor points cost`
- `feat(nighthaunt): add Spirit Hosts unit`
- `docs: update contribution guidelines`

## Schema Reference

### Stats Object

| Field | Type | Description |
|-------|------|-------------|
| move | string | Movement in inches (e.g., `"5\""`) |
| health | integer | Wounds/health value |
| save | string | Save roll (e.g., `"3+"`) |
| control | integer | Control value |

### Weapon Object

| Field | Type | Description |
|-------|------|-------------|
| name | string | Weapon name |
| type | string | `"melee"` or `"ranged"` |
| range | string | Range for ranged weapons (e.g., `"12\""`) |
| attacks | int/string | Number or dice (e.g., `2` or `"D6"`) |
| hit | string | Hit roll (e.g., `"3+"`) |
| wound | string | Wound roll (e.g., `"4+"`) |
| rend | integer | Rend value (0-4) |
| damage | int/string | Damage or dice |
| abilities | array | Weapon abilities |

### Ability Object

| Field | Type | Description |
|-------|------|-------------|
| name | string | Ability name |
| type | string | `passive`, `reaction`, `once-per-turn`, etc. |
| phase | string | When it can be used (optional) |
| effect | string | What the ability does |

## Questions?

- Open an [issue](https://github.com/aos-data/aos-data/issues) for questions
- Check existing issues before creating new ones

## Code of Conduct

Be respectful and constructive. We're all here to help the hobby community.
