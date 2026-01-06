# Product Requirements Document: aos-data

## Overview

**aos-data** is an open-source, community-maintained archive of Age of Sigmar 4th Edition game data in JSON format. It provides a clean, structured, and version-controlled alternative to existing data sources, enabling developers to build army list builders, stat trackers, and other hobby tools.

---

## Problem Statement

### Current State

The Warhammer Age of Sigmar community lacks a clean, developer-friendly data source for building hobby applications:

1. **BSData/BattleScribe XML** – The de facto standard, but:
   - Verbose XML with internal ID references
   - Designed for BattleScribe's UI, not general consumption
   - Monolithic files (one per faction, 5k-15k lines)
   - Complex constraint system for regiment rules
   - No structured changelog

2. **Official GW Sources** – PDFs and web pages:
   - No API or structured data
   - Terms of Service prohibit scraping
   - Updates scattered across multiple documents

3. **Wahapedia** – Comprehensive but:
   - HTML scraping required
   - No version history
   - Single point of failure

### Impact

- Developers reinvent data parsing for every project
- No historical record of points/rules changes
- Community knowledge is fragmented
- New players can't easily see what changed between updates

---

## Solution

A Git-based JSON archive with:

- **One file per unit** – Clean diffs, easy contributions
- **JSON Schema validation** – Consistent structure
- **Git history as changelog** – Every change tracked
- **Human-readable format** – No ID lookups required
- **Open source** – Community maintained, MIT licensed

---

## Goals

### Primary Goals

| Goal | Metric |
|------|--------|
| Complete AoS 4th Edition coverage | All factions, all units |
| Accurate data | <24hr sync with official GW updates |
| Developer adoption | 10+ projects using aos-data within 6 months |
| Community contributions | 20+ contributors within 1 year |

### Non-Goals

- Official GW endorsement (we operate in fan-content space)
- UI/application development (data only)
- Points recommendations or meta analysis
- Older edition support (4th Edition only)

---

## User Personas

### 1. App Developer (Primary)

**Profile:** Building an army list builder, painting tracker, or game assistant app.

**Needs:**
- Structured, typed data (JSON + TypeScript types)
- Reliable schema that won't break their app
- Easy integration (npm package or raw fetch)
- Changelog to update their app when data changes

**Example:** "I'm building a React Native army builder. I need to fetch all Stormcast units with points and keywords."

### 2. Community Contributor

**Profile:** Hobbyist who notices errors or wants to help maintain data.

**Needs:**
- Easy PR process (edit JSON, not XML)
- Clear contribution guidelines
- Validation feedback before merge

**Example:** "The Liberators points cost is wrong after the January FAQ. I want to fix it."

### 3. Data Consumer (Analyst)

**Profile:** Content creator or competitive player analyzing the game.

**Needs:**
- Historical data (how did points change over time?)
- Bulk export for spreadsheets
- Query capabilities

**Example:** "I want to chart average faction points costs over the last year."

---

## Data Schema

### Directory Structure

```
aos-data/
├── schema/
│   ├── faction.schema.json
│   ├── unit.schema.json
│   ├── hero.schema.json
│   ├── weapon.schema.json
│   ├── ability.schema.json
│   └── army-list.schema.json
│
├── data/
│   ├── factions/
│   │   ├── stormcast-eternals/
│   │   │   ├── _index.json           # Faction metadata
│   │   │   ├── heroes/
│   │   │   │   ├── knight-incantor.json
│   │   │   │   ├── lord-celestant.json
│   │   │   │   └── ...
│   │   │   ├── units/
│   │   │   │   ├── liberators.json
│   │   │   │   ├── retributors.json
│   │   │   │   └── ...
│   │   │   ├── battle-formations/
│   │   │   │   ├── scions-of-the-storm.json
│   │   │   │   └── ...
│   │   │   └── lores/
│   │   │       ├── spell-lore.json
│   │   │       └── prayer-lore.json
│   │   │
│   │   ├── nighthaunt/
│   │   ├── skaven/
│   │   └── ... (all factions)
│   │
│   └── shared/
│       ├── grand-alliances.json
│       ├── weapon-abilities.json     # Crit (Mortal), Anti-X, etc.
│       ├── core-abilities.json       # Rally, Retreat, etc.
│       └── battle-tactics.json
│
├── generated/
│   ├── all-factions.json             # Combined export
│   ├── typescript/
│   │   └── index.d.ts                # Generated types
│   └── changelog/
│       ├── 2025-01.md
│       └── ...
│
├── tools/
│   ├── parser/                       # BSData XML → JSON
│   ├── validator/                    # JSON Schema validation
│   ├── changelog-generator/          # Git diff → markdown
│   └── build/                        # Generate combined files
│
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE (MIT)
└── README.md
```

### Unit Schema (Simplified)

```json
{
  "$schema": "https://aos-data.org/schema/unit.schema.json",
  "id": "liberators",
  "name": "Liberators",
  "faction": "stormcast-eternals",
  "points": 140,
  
  "stats": {
    "move": "5\"",
    "health": 2,
    "save": "4+",
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
      "effect": "Add 1 to the Rend characteristic of this unit's melee weapons for attacks that target a unit with a Health characteristic of 3 or more."
    }
  ],
  
  "_meta": {
    "lastUpdated": "2025-01-06",
    "source": "General's Handbook 2025-26"
  }
}
```

### Hero Schema (extends Unit)

```json
{
  "$schema": "https://aos-data.org/schema/hero.schema.json",
  "id": "knight-incantor",
  "name": "Knight-Incantor",
  "faction": "stormcast-eternals",
  "points": 130,
  
  "...": "(...all unit fields...)",
  
  "isWizard": 1,
  "isPriest": null,
  "isUnique": false,
  
  "regimentAllows": [
    {
      "keywords": ["SACROSANCT CHAMBER"],
      "description": "Any SACROSANCT CHAMBER units"
    }
  ],
  
  "canJoinRegiment": null
}
```

---

## Features

### Phase 1: Foundation (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Core schema | JSON Schema for all entity types | P0 |
| Initial data | 5 factions fully populated | P0 |
| Validation CI | GitHub Actions to validate PRs | P0 |
| README + CONTRIBUTING | Documentation for contributors | P0 |
| npm package | `@aos-data/core` for easy consumption | P1 |

**Definition of Done:** A developer can `npm install @aos-data/core` and access typed Stormcast Eternals data.

### Phase 2: Complete Coverage

| Feature | Description | Priority |
|---------|-------------|----------|
| All factions | Complete AoS 4th Edition roster | P0 |
| Battle formations | All subfaction rules | P1 |
| Lores | Spell, prayer, manifestation lores | P1 |
| Regiments of Renown | Mercenary regiments | P2 |
| Legends | Legacy warscrolls | P2 |

**Definition of Done:** 100% parity with official GW faction packs.

### Phase 3: Tooling

| Feature | Description | Priority |
|---------|-------------|----------|
| BSData parser | Automated sync tool | P1 |
| Changelog generator | Git history → markdown | P1 |
| Web viewer | Browse data at aos-data.org | P2 |
| Diff tool | Compare two versions | P2 |
| API | REST/GraphQL for querying | P3 |

### Phase 4: Community

| Feature | Description | Priority |
|---------|-------------|----------|
| Discord integration | Webhook on updates | P2 |
| Update alerts | Subscribe to faction changes | P2 |
| Leaderboard | Top contributors | P3 |

---

## Technical Requirements

### Data Integrity

- **Schema validation:** All JSON must pass JSON Schema validation
- **Referential integrity:** IDs must be unique, references must resolve
- **Required fields:** No null/undefined where data should exist
- **Automated tests:** CI runs on every PR

### Versioning

- **Git tags:** Semantic versioning for releases (v1.0.0, v1.1.0, etc.)
- **Changelog:** Auto-generated from git history
- **Breaking changes:** Major version bump if schema changes

### Distribution

| Channel | Format |
|---------|--------|
| GitHub | Raw JSON files |
| npm | `@aos-data/core` package |
| CDN | jsDelivr/unpkg via npm |
| API (future) | REST endpoints |

### Update Process

```
GW releases FAQ/Points update
         ↓
BSData updates XML (community)
         ↓
aos-data parser runs (automated or manual)
         ↓
PR created with changes
         ↓
Review + validate
         ↓
Merge → npm publish → changelog generated
```

---

## Success Metrics

### Adoption

| Metric | Target (6 months) | Target (1 year) |
|--------|-------------------|-----------------|
| GitHub stars | 100 | 500 |
| npm weekly downloads | 500 | 2,000 |
| Projects using aos-data | 10 | 30 |
| Contributors | 10 | 25 |

### Quality

| Metric | Target |
|--------|--------|
| Data accuracy | 99%+ (validated against official sources) |
| Update latency | <48 hours from GW release |
| Schema coverage | 100% of official warscrolls |
| Test coverage | 100% of JSON files validated |

### Community

| Metric | Target |
|--------|--------|
| PR merge time | <48 hours for valid contributions |
| Issue response time | <24 hours |
| Documentation completeness | All schemas documented |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GW legal action | Low | High | MIT license, fan content disclaimer, no official imagery |
| BSData discontinues | Medium | Medium | Parser can adapt to other sources, manual entry fallback |
| Maintainer burnout | Medium | High | Multiple maintainers, clear contribution docs, automation |
| Schema breaking changes | Medium | Medium | Semantic versioning, deprecation warnings |
| Data staleness | Medium | Low | Automated sync, community PRs, update alerts |

---

## Legal Considerations

### Intellectual Property

- **No GW trademarks** in repo name or branding
- **No official artwork** or images
- **Rules text** is factual data (names, numbers, keywords)
- **Fan content policy** compliance

### Disclaimer (for README)

```
This project is not affiliated with, endorsed, or sponsored by Games Workshop. 
Age of Sigmar, Warhammer, and all associated marks are trademarks of Games Workshop Ltd.

This is a fan-made resource for the hobby community. All game data is derived from 
publicly available sources and is provided for personal, non-commercial use.
```

### License

- **Code:** MIT License
- **Data:** CC BY-NC-SA 4.0 (or similar)

---

## Timeline

### Month 1: Foundation
- [ ] Finalize JSON Schema
- [ ] Set up GitHub repo with CI
- [ ] Parse 3 factions (Stormcast, Skaven, Nighthaunt)
- [ ] Publish initial npm package

### Month 2: Expansion
- [ ] Complete all Order factions
- [ ] Complete all Chaos factions
- [ ] Add battle formations
- [ ] Launch basic documentation site

### Month 3: Polish
- [ ] Complete Death and Destruction
- [ ] Changelog generator
- [ ] Community outreach (Reddit, Discord)
- [ ] First external project integration

### Month 4+: Maintenance
- [ ] Ongoing updates with GW releases
- [ ] Community PRs and contributions
- [ ] Feature requests from adopters

---

## Open Questions

1. **Granularity:** One file per unit, or group small factions?
2. **Ability text:** Full text or summarized? (Copyright considerations)
3. **Points history:** Store historical points in file, or rely on git?
4. **Localization:** English only, or support translations?
5. **Spearhead:** Include Spearhead-specific data?

---

## Appendix

### Comparable Projects

| Project | Game | Approach |
|---------|------|----------|
| [mtgjson](https://mtgjson.com) | Magic: The Gathering | JSON archive, very successful |
| [scryfall](https://scryfall.com) | Magic: The Gathering | API + bulk data |
| [BSData](https://github.com/BSData) | Many wargames | XML, BattleScribe format |
| [Wahapedia](https://wahapedia.ru) | 40k, AoS | Web scraping, no API |

### References

- [AoS 4th Edition Core Rules](https://www.warhammer-community.com/en-gb/downloads/warhammer-age-of-sigmar/)
- [BSData AoS 4th Repo](https://github.com/BSData/age-of-sigmar-4th)
- [JSON Schema Spec](https://json-schema.org/)

---

*Document Version: 1.0*  
*Last Updated: 2025-01-06*  
*Author: aos-data community*