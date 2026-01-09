# BSData XML Parsing Guide for Age of Sigmar 4th Edition

## Core Principle: ID-Based Type Detection

**NEVER guess entity types based on names.** All type information comes from IDs referencing the Game System file (`Age of Sigmar 4.0.gst`).

---

## 1. GST Reference IDs (The Source of Truth)

### Profile Type IDs
These IDs identify what kind of data a `<profile>` element contains:

```typescript
const PROFILE_TYPES = {
  // Combat profiles
  UNIT: 'ff03-376e-972f-8ab2',           // Move, Health, Save, Control
  MELEE_WEAPON: '9074-76b6-9e2f-81e3',   // Atk, Hit, Wnd, Rnd, Dmg, Ability
  RANGED_WEAPON: '1fd-a42f-41d3-fe05',   // Rng, Atk, Hit, Wnd, Rnd, Dmg, Ability
  MANIFESTATION: '1287-3a-9799-7e40',    // Move, Health, Save, Banishment

  // Ability profiles
  ABILITY_PASSIVE: '907f-a48-6a04-f788',     // Keywords, Effect (+ Color, Type attributes)
  ABILITY_ACTIVATED: '59b6-d47a-a68a-5dcc',  // Timing, Declare, Effect, Keywords, Used By
  ABILITY_SPELL: '7312-8367-c171-f2ef',      // Timing, Casting Value, Declare, Effect, Keywords
  ABILITY_PRAYER: '5946-234-d7b4-6195',      // Timing, Chanting Value, Declare, Effect, Keywords
  ABILITY_COMMAND: '55ac-f837-dded-5872',    // Timing, Cost, Declare, Effect, Keywords
  ABILITY_BLOOD_TITHE: '5453-37d7-6d37-db1b', // Khorne-specific ability type
  BATTLE_TACTIC_CARD: 'abf8-a239-9e66-54c1', // Battle Tactic objectives
} as const;
```

### Category IDs
These IDs identify unit types via `<categoryLink>` elements:

```typescript
const CATEGORIES = {
  // Primary unit types
  HERO: '6e72-1656-d554-528a',
  INFANTRY: '75d6-6995-dfcc-3898',
  CAVALRY: '926c-df8c-6841-d49e',
  MONSTER: '6d54-625c-d063-13e2',
  BEAST: 'b224-8c8e-ca93-9860',
  WAR_MACHINE: 'f7bc-b618-4b5d-2bae',
  MANIFESTATION: 'bff0-8be9-719f-4afc',

  // Special properties
  FLY: 'b979-4c3e-7d0e-6921',
  UNIQUE: '72ce-2188-70bf-2dbd',
  WARMASTER: 'c203-51a0-3d44-6b07',

  // Wizard levels (WIZARD 1-9)
  WIZARD_1: '6f28-c3f6-4b1b-8aff',
  WIZARD_2: 'e0c9-5c7a-e34f-2cb4',
  // ... etc

  // Priest levels (PRIEST 1-9)
  PRIEST_1: 'aef1-c72-9c0-6ad6',
  // ... etc

  // Ward values
  WARD_6: '6c6b-e787-f9b8-a510',
  WARD_5: '52cc-95fd-6cd3-8f72',
  WARD_4: 'd4dc-6a79-c920-309c',

  // Grand Alliances
  ORDER: 'ee22-3575-6590-25c',
  CHAOS: '1ea4-a0e7-fdeb-c71d',
  DEATH: '5ec7-5fab-e6ca-b37a',
  DESTRUCTION: '9e99-8d5b-591f-ad93',
} as const;
```

### Characteristic Type IDs
**IMPORTANT:** Characteristic IDs are DIFFERENT per profile type! The "Move" characteristic in a Unit profile has a different ID than in a Manifestation profile.

```typescript
// Unit Profile (ff03-376e-972f-8ab2) characteristics
const UNIT_CHARACTERISTICS = {
  MOVE: 'fed0-d1b3-1bb8-c501',
  HEALTH: '96be-54ae-ce7b-10b7',
  SAVE: '1981-ef09-96f6-7aa9',
  CONTROL: '6c6f-8510-9ce1-fc6e',
} as const;

// Melee Weapon (9074-76b6-9e2f-81e3) characteristics
const MELEE_WEAPON_CHARACTERISTICS = {
  ATK: '60e-35aa-31ed-e488',
  HIT: '26dc-168-b2fd-cb93',
  WND: '61c1-22cc-40af-2847',
  RND: 'eccc-10fa-6958-fb73',
  DMG: 'e948-9c71-12a6-6be4',
  ABILITY: 'eda3-7332-5db1-4159',
} as const;

// Ranged Weapon (1fd-a42f-41d3-fe05) characteristics
const RANGED_WEAPON_CHARACTERISTICS = {
  RNG: 'c6b5-908c-a604-1a98',
  ATK: 'aa17-4296-2887-e05d',
  HIT: '194d-aeb6-5ba7-83b4',
  WND: 'd3d5-9dc6-13de-8d1',
  RND: 'd03f-a9ae-3eec-755',
  DMG: '96c2-d0a5-ea1e-653b',
  ABILITY: 'd793-3dd7-9c13-741e',
} as const;

// Manifestation (1287-3a-9799-7e40) characteristics
const MANIFESTATION_CHARACTERISTICS = {
  MOVE: 'c28a-6000-2a0b-e7cf',
  HEALTH: 'd1b9-3068-515-131e',
  SAVE: '80c7-7691-b6ed-d6a6',
  BANISHMENT: '97a2-d412-9ac-6a37',
} as const;

// Ability (Passive) (907f-a48-6a04-f788) characteristics
const PASSIVE_ABILITY_CHARACTERISTICS = {
  KEYWORDS: 'b977-7c5e-33b2-428e',
  EFFECT: 'fd7f-888d-3257-a12b',
} as const;
// + Attributes: Color (50fe-4f29-6bc3-dcc6), Type (bf11-4e10-3ab1-06f4)

// Ability (Activated) (59b6-d47a-a68a-5dcc) characteristics
const ACTIVATED_ABILITY_CHARACTERISTICS = {
  TIMING: '652c-3d84-4e7-14f4',
  DECLARE: 'bad3-f9c5-ba46-18cb',
  EFFECT: 'b6f1-ba36-6cd-3b03',
  KEYWORDS: '12e8-3214-7d8f-1d0f',
  USED_BY: '1b32-c9d6-3106-166b',
} as const;
// + Attributes: Color (5a11-eab3-180c-ddf5), Type (6d16-c86b-2698-85a4)

// Ability (Spell) (7312-8367-c171-f2ef) characteristics
const SPELL_CHARACTERISTICS = {
  TIMING: 'de6f-d57b-248a-83be',
  CASTING_VALUE: '9fc7-b0f6-d018-a608',
  DECLARE: '24f8-3803-4ab1-3b6c',
  EFFECT: '1cb9-a-1345-907f',
  KEYWORDS: '353f-565e-c351-1cf2',
} as const;

// Ability (Prayer) (5946-234-d7b4-6195) characteristics
const PRAYER_CHARACTERISTICS = {
  TIMING: '76bf-8126-64d4-c709',
  CHANTING_VALUE: 'f192-6780-8138-9cef',
  DECLARE: '284c-90b2-245b-adf3',
  EFFECT: '6219-6fcc-5ae2-a6b7',
  KEYWORDS: 'e3d8-f58b-e4e0-8e9d',
} as const;

// Ability (Command) (55ac-f837-dded-5872) characteristics
const COMMAND_ABILITY_CHARACTERISTICS = {
  TIMING: '736-6e3a-d0b5-a1b0',
  COST: 'a49e-3082-e2a6-e802',
  DECLARE: 'b77f-7548-840e-c086',
  EFFECT: '2111-3ca8-61dd-a5f0',
  KEYWORDS: '445d-f443-5448-e7ce',
} as const;
```

---

## 2. Catalogue File Architecture

BSData uses MULTIPLE catalogue files that work together:

### File Types

| File Pattern | Purpose | Contains |
|--------------|---------|----------|
| `Age of Sigmar 4.0.gst` | Game System | All type definitions, categories, profile types |
| `[Faction] - Library.cat` | Unit Library | Unit profiles, hero definitions, manifestations |
| `[Faction].cat` | Faction Rules | Battle formations, artefacts, heroic traits, lore links |
| `Lores.cat` | Shared Lores | Spell lores, prayer lores, manifestation lores |

### Data Flow Between Files

```
GST (Type Definitions)
    ↓ typeId references
Library.cat (Unit Definitions)
    ↓ entryLinks
Faction.cat (Faction Rules)
    ↓ targetId references
Lores.cat (Spell/Prayer Lores)
```

### Catalogue Hierarchy
```
<catalogue>
  ├── <categoryEntries>       # Category definitions (usually empty in library, references GST)
  ├── <sharedSelectionEntries> # Shared entries like Champions, Musicians
  ├── <selectionEntries>      # Main unit/hero definitions
  │   └── <selectionEntry type="unit">
  │       ├── <profiles>      # Unit stats, abilities
  │       ├── <categoryLinks> # Type markers (HERO, INFANTRY, etc)
  │       ├── <selectionEntries>  # Nested models, weapons
  │       └── <selectionEntryGroups> # Weapon choices, upgrades
  └── <sharedProfiles>        # Shared ability definitions
```

### Selection Entry Types
```typescript
type SelectionEntryType = 'unit' | 'model' | 'upgrade';
```

- `type="unit"` - Top-level unit definitions (what we parse)
- `type="model"` - Individual model within a unit
- `type="upgrade"` - Weapon options, equipment, abilities

---

## 3. Parsing Algorithm

### Step 1: Load Both Files
```typescript
// 1. Parse GST first to build ID lookup tables
const gst = parseXML('Age of Sigmar 4.0.gst');

// 2. Parse library catalogue
const catalogue = parseXML('Stormcast Eternals - Library.cat');
```

### Step 2: Find All Top-Level Units
```typescript
function findUnits(catalogue: Catalogue): SelectionEntry[] {
  return catalogue.selectionEntries
    .filter(entry => entry.type === 'unit');
}
```

### Step 3: Classify Each Unit
```typescript
function classifyUnit(entry: SelectionEntry): 'hero' | 'unit' | 'manifestation' {
  const categoryIds = entry.categoryLinks.map(link => link.targetId);

  // Check by category ID, NOT by name
  if (categoryIds.includes(CATEGORIES.HERO)) {
    return 'hero';
  }
  if (categoryIds.includes(CATEGORIES.MANIFESTATION)) {
    return 'manifestation';
  }
  return 'unit';
}
```

### Step 4: Extract Unit Profile
```typescript
function extractUnitProfile(entry: SelectionEntry): UnitStats | null {
  // Find profile with Unit typeId
  const unitProfile = entry.profiles.find(
    p => p.typeId === PROFILE_TYPES.UNIT
  );

  if (!unitProfile) return null;

  // Extract characteristics by their typeId, NOT by name
  return {
    move: getCharacteristic(unitProfile, CHARACTERISTICS.MOVE),
    health: getCharacteristic(unitProfile, CHARACTERISTICS.HEALTH),
    save: getCharacteristic(unitProfile, CHARACTERISTICS.SAVE),
    control: getCharacteristic(unitProfile, CHARACTERISTICS.CONTROL),
  };
}

function getCharacteristic(profile: Profile, typeId: string): string {
  const char = profile.characteristics.find(c => c.typeId === typeId);
  return char?.value ?? '';
}
```

### Important: Where to Find What

| Entity Type | Source File | How to Identify |
|-------------|-------------|-----------------|
| Units | `[Faction] - Library.cat` | `selectionEntry type="unit"` WITHOUT HERO category |
| Heroes | `[Faction] - Library.cat` | `selectionEntry type="unit"` WITH categoryLink to HERO (`6e72-1656-d554-528a`) |
| Manifestations | `[Faction] - Library.cat` | Has categoryLink to MANIFESTATION (`bff0-8be9-719f-4afc`) |
| Artefacts | `[Faction].cat` | `selectionEntryGroup name="Artefacts of Power"` |
| Heroic Traits | `[Faction].cat` | `selectionEntryGroup name="Heroic Traits"` |
| Battle Formations | `[Faction].cat` | `selectionEntryGroup name="Battle Formations: [Faction]"` |
| Spell Lores | `Lores.cat` | `selectionEntryGroup` containing entries with spell profiles |
| Prayer Lores | `Lores.cat` | `selectionEntryGroup` containing entries with prayer profiles |
| Innate Spells | `[Faction] - Library.cat` | Spell profiles directly on hero entries |

### Step 5: Extract Weapons
```typescript
function extractWeapons(entry: SelectionEntry): Weapon[] {
  const weapons: Weapon[] = [];

  // Recursively search all nested selectionEntries
  function traverse(entries: SelectionEntry[]) {
    for (const e of entries) {
      // Check profiles for weapon types
      for (const profile of e.profiles) {
        if (profile.typeId === PROFILE_TYPES.MELEE_WEAPON) {
          weapons.push(parseWeapon(profile, 'melee'));
        }
        if (profile.typeId === PROFILE_TYPES.RANGED_WEAPON) {
          weapons.push(parseWeapon(profile, 'ranged'));
        }
      }

      // Recurse into nested entries
      if (e.selectionEntries) {
        traverse(e.selectionEntries);
      }
    }
  }

  traverse(entry.selectionEntries ?? []);
  return weapons;
}

function parseWeapon(profile: Profile, type: 'melee' | 'ranged'): Weapon {
  return {
    name: profile.name,
    type,
    range: type === 'ranged'
      ? getCharacteristic(profile, CHARACTERISTICS.RANGE)
      : undefined,
    attacks: getCharacteristic(profile, CHARACTERISTICS.ATTACKS),
    hit: getCharacteristic(profile, CHARACTERISTICS.HIT),
    wound: getCharacteristic(profile, CHARACTERISTICS.WOUND),
    rend: getCharacteristic(profile, CHARACTERISTICS.REND),
    damage: getCharacteristic(profile, CHARACTERISTICS.DAMAGE),
    ability: getCharacteristic(profile, CHARACTERISTICS.WEAPON_ABILITY) || undefined,
  };
}
```

### Step 6: Extract Abilities
```typescript
function extractAbilities(entry: SelectionEntry): Ability[] {
  const abilities: Ability[] = [];

  function traverse(profiles: Profile[]) {
    for (const profile of profiles) {
      const abilityType = getAbilityType(profile.typeId);
      if (abilityType) {
        abilities.push(parseAbility(profile, abilityType));
      }
    }
  }

  // Check direct profiles
  traverse(entry.profiles);

  // Check nested entries recursively
  traverseSelectionEntries(entry, e => traverse(e.profiles));

  return abilities;
}

function getAbilityType(typeId: string): AbilityType | null {
  switch (typeId) {
    case PROFILE_TYPES.ABILITY_PASSIVE: return 'passive';
    case PROFILE_TYPES.ABILITY_ACTIVATED: return 'activated';
    case PROFILE_TYPES.ABILITY_SPELL: return 'spell';
    case PROFILE_TYPES.ABILITY_PRAYER: return 'prayer';
    case PROFILE_TYPES.ABILITY_COMMAND: return 'command';
    default: return null;
  }
}

function parseAbility(profile: Profile, type: AbilityType): Ability {
  const base = {
    name: profile.name,
    type,
    effect: getCharacteristic(profile, CHARACTERISTICS.EFFECT),
    keywords: parseKeywords(getCharacteristic(profile, CHARACTERISTICS.KEYWORDS)),
  };

  // Add type-specific fields
  if (type === 'spell') {
    return { ...base, castingValue: getCharacteristic(profile, CHARACTERISTICS.CASTING_VALUE) };
  }
  if (type === 'prayer') {
    return { ...base, chantingValue: getCharacteristic(profile, CHARACTERISTICS.CHANTING_VALUE) };
  }
  if (type === 'activated' || type === 'command') {
    return {
      ...base,
      timing: getCharacteristic(profile, CHARACTERISTICS.TIMING),
      declare: getCharacteristic(profile, CHARACTERISTICS.DECLARE),
    };
  }

  // Passive abilities may have Color/Type attributes
  if (type === 'passive') {
    return {
      ...base,
      color: profile.attributes?.find(a => a.name === 'Color')?.value,
      abilityType: profile.attributes?.find(a => a.name === 'Type')?.value,
    };
  }

  return base;
}
```

### Step 7: Extract Keywords from CategoryLinks
```typescript
function extractKeywords(entry: SelectionEntry): string[] {
  return entry.categoryLinks
    .map(link => link.name)  // Name is safe here as it's display text
    .filter(name => !isPrimaryType(name)); // Exclude type markers
}

function isPrimaryType(keyword: string): boolean {
  const primaryTypes = ['HERO', 'INFANTRY', 'CAVALRY', 'MONSTER', 'BEAST', 'WAR MACHINE'];
  return primaryTypes.includes(keyword.toUpperCase());
}
```

---

## 4. Handling Special Cases

### Enhancements (Artefacts, Heroic Traits)

Enhancements are found in `[Faction].cat` under specific group names:

```typescript
// In [Faction].cat sharedSelectionEntryGroups:

// Artefacts structure:
// <selectionEntryGroup name="Artefacts of Power">
//   <selectionEntryGroups>
//     <selectionEntryGroup name="Artefacts of the Tempest"> // Sub-category
//       <selectionEntries>
//         <selectionEntry type="upgrade" name="Null Pendant">
//           <profiles>
//             <profile typeId="59b6-d47a-a68a-5dcc">  // Ability (Activated)

function findArtefacts(factionCatalogue: Catalogue): Artefact[] {
  const artefacts: Artefact[] = [];

  // Find the "Artefacts of Power" group
  const artefactsGroup = findGroupByName(factionCatalogue, 'Artefacts of Power');
  if (!artefactsGroup) return artefacts;

  // Iterate through sub-groups (e.g., "Artefacts of the Tempest")
  for (const subGroup of artefactsGroup.selectionEntryGroups ?? []) {
    for (const entry of subGroup.selectionEntries ?? []) {
      // Find the ability profile
      const abilityProfile = entry.profiles.find(p =>
        p.typeId === PROFILE_TYPES.ABILITY_PASSIVE ||
        p.typeId === PROFILE_TYPES.ABILITY_ACTIVATED
      );

      if (abilityProfile) {
        artefacts.push({
          id: toKebabCase(entry.name),
          name: entry.name,
          category: subGroup.name,  // e.g., "Artefacts of the Tempest"
          ability: parseAbility(abilityProfile, getAbilityType(abilityProfile.typeId)!),
        });
      }
    }
  }

  return artefacts;
}

function findHeroicTraits(factionCatalogue: Catalogue): HeroicTrait[] {
  const traits: HeroicTrait[] = [];

  const traitsGroup = findGroupByName(factionCatalogue, 'Heroic Traits');
  if (!traitsGroup) return traits;

  // Same pattern as artefacts - iterate sub-groups, find ability profiles
  for (const subGroup of traitsGroup.selectionEntryGroups ?? []) {
    for (const entry of subGroup.selectionEntries ?? []) {
      const abilityProfile = entry.profiles.find(p =>
        p.typeId === PROFILE_TYPES.ABILITY_PASSIVE ||
        p.typeId === PROFILE_TYPES.ABILITY_ACTIVATED
      );

      if (abilityProfile) {
        traits.push({
          id: toKebabCase(entry.name),
          name: entry.name,
          category: subGroup.name,
          ability: parseAbility(abilityProfile, getAbilityType(abilityProfile.typeId)!),
        });
      }
    }
  }

  return traits;
}
```

### Battle Formations

```typescript
// Battle formations are in [Faction].cat under "Battle Formations: [Faction]"
// <selectionEntryGroup name="Battle Formations: Stormcast Eternals">
//   <selectionEntries>
//     <selectionEntry type="upgrade" name="Vanguard Wing">
//       <profiles>
//         <profile typeId="907f-a48-6a04-f788">  // Ability (Passive) - the formation ability

function findBattleFormations(factionCatalogue: Catalogue, factionName: string): BattleFormation[] {
  const formations: BattleFormation[] = [];

  const groupName = `Battle Formations: ${factionName}`;
  const formationsGroup = findGroupByName(factionCatalogue, groupName);
  if (!formationsGroup) return formations;

  for (const entry of formationsGroup.selectionEntries ?? []) {
    const abilityProfile = entry.profiles.find(p =>
      p.typeId === PROFILE_TYPES.ABILITY_PASSIVE ||
      p.typeId === PROFILE_TYPES.ABILITY_ACTIVATED
    );

    if (abilityProfile) {
      formations.push({
        id: toKebabCase(entry.name),
        name: entry.name,
        ability: parseAbility(abilityProfile, getAbilityType(abilityProfile.typeId)!),
      });
    }
  }

  return formations;
}
```

### Spell Lores (from Lores.cat)

Spell lores are defined in the shared `Lores.cat` file, not in faction catalogues:

```typescript
// In Lores.cat:
// <selectionEntryGroup name="Lore of the Storm" id="b054-bd72-a5bf-1319">
//   <selectionEntries>
//     <selectionEntry type="upgrade" name="Lightning Blast">
//       <profiles>
//         <profile typeId="7312-8367-c171-f2ef" typeName="Ability (Spell)">
//           <characteristics>
//             <characteristic name="Casting Value">5</characteristic>
//             ...

function findSpellLores(loresCatalogue: Catalogue): Lore[] {
  const lores: Lore[] = [];

  // Find all selectionEntryGroups that contain spell profiles
  for (const group of loresCatalogue.sharedSelectionEntryGroups ?? []) {
    const spells = group.selectionEntries?.filter(entry =>
      entry.profiles.some(p => p.typeId === PROFILE_TYPES.ABILITY_SPELL)
    ) ?? [];

    if (spells.length > 0) {
      lores.push({
        id: toKebabCase(group.name),
        name: group.name,
        type: 'spell',
        spells: spells.map(entry => {
          const spellProfile = entry.profiles.find(p =>
            p.typeId === PROFILE_TYPES.ABILITY_SPELL
          )!;
          return parseSpellProfile(spellProfile);
        }),
      });
    }
  }

  return lores;
}

function parseSpellProfile(profile: Profile): Spell {
  return {
    name: profile.name,
    castingValue: parseInt(getCharacteristic(profile, SPELL_CHARACTERISTICS.CASTING_VALUE)),
    timing: getCharacteristic(profile, SPELL_CHARACTERISTICS.TIMING),
    declare: getCharacteristic(profile, SPELL_CHARACTERISTICS.DECLARE),
    effect: getCharacteristic(profile, SPELL_CHARACTERISTICS.EFFECT),
    keywords: parseKeywords(getCharacteristic(profile, SPELL_CHARACTERISTICS.KEYWORDS)),
  };
}
```

### Prayer Lores (from Lores.cat)

Same pattern as spell lores but using `PROFILE_TYPES.ABILITY_PRAYER`:

```typescript
function findPrayerLores(loresCatalogue: Catalogue): Lore[] {
  const lores: Lore[] = [];

  for (const group of loresCatalogue.sharedSelectionEntryGroups ?? []) {
    const prayers = group.selectionEntries?.filter(entry =>
      entry.profiles.some(p => p.typeId === PROFILE_TYPES.ABILITY_PRAYER)
    ) ?? [];

    if (prayers.length > 0) {
      lores.push({
        id: toKebabCase(group.name),
        name: group.name,
        type: 'prayer',
        prayers: prayers.map(entry => {
          const prayerProfile = entry.profiles.find(p =>
            p.typeId === PROFILE_TYPES.ABILITY_PRAYER
          )!;
          return parsePrayerProfile(prayerProfile);
        }),
      });
    }
  }

  return lores;
}

function parsePrayerProfile(profile: Profile): Prayer {
  return {
    name: profile.name,
    chantingValue: parseInt(getCharacteristic(profile, PRAYER_CHARACTERISTICS.CHANTING_VALUE)),
    timing: getCharacteristic(profile, PRAYER_CHARACTERISTICS.TIMING),
    declare: getCharacteristic(profile, PRAYER_CHARACTERISTICS.DECLARE),
    effect: getCharacteristic(profile, PRAYER_CHARACTERISTICS.EFFECT),
    keywords: parseKeywords(getCharacteristic(profile, PRAYER_CHARACTERISTICS.KEYWORDS)),
  };
}
```

### Linking Lores to Factions

Factions reference lores via `entryLink` elements in `[Faction].cat`:

```typescript
// In Stormcast Eternals.cat:
// <selectionEntry name="Lore of the Storm">
//   <entryLinks>
//     <entryLink targetId="b054-bd72-a5bf-1319" type="selectionEntryGroup"/>
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                References Lores.cat group ID

function getFactionLoreIds(factionCatalogue: Catalogue): { spellLoreIds: string[], prayerLoreIds: string[] } {
  const spellLoreIds: string[] = [];
  const prayerLoreIds: string[] = [];

  const spellLoresGroup = findGroupByName(factionCatalogue, 'Spell Lores');
  if (spellLoresGroup) {
    for (const entry of spellLoresGroup.selectionEntries ?? []) {
      for (const link of entry.entryLinks ?? []) {
        if (link.type === 'selectionEntryGroup') {
          spellLoreIds.push(link.targetId);
        }
      }
    }
  }

  // Same for prayer lores
  const prayerLoresGroup = findGroupByName(factionCatalogue, 'Prayer Lores');
  if (prayerLoresGroup) {
    for (const entry of prayerLoresGroup.selectionEntries ?? []) {
      for (const link of entry.entryLinks ?? []) {
        if (link.type === 'selectionEntryGroup') {
          prayerLoreIds.push(link.targetId);
        }
      }
    }
  }

  return { spellLoreIds, prayerLoreIds };
}
```

### Manifestations
Manifestations have the `MANIFESTATION` category and use the Manifestation profile type:

```typescript
function parseManifestationProfile(profile: Profile): ManifestationStats {
  if (profile.typeId !== PROFILE_TYPES.MANIFESTATION) {
    throw new Error('Not a manifestation profile');
  }

  return {
    move: getCharacteristic(profile, CHARACTERISTICS.MOVE),
    health: getCharacteristic(profile, CHARACTERISTICS.HEALTH),
    save: getCharacteristic(profile, CHARACTERISTICS.SAVE),
    banishment: getCharacteristic(profile, CHARACTERISTICS.BANISHMENT),
  };
}
```

---

## 5. Output JSON Structure

### Unit JSON
```json
{
  "$schema": "../../schema/unit.schema.json",
  "id": "liberators",
  "name": "Liberators",
  "faction": "stormcast-eternals",
  "type": "infantry",
  "stats": {
    "move": "5\"",
    "health": 2,
    "save": "3+",
    "control": 1
  },
  "keywords": ["ORDER", "STORMCAST ETERNALS", "WARRIOR CHAMBER"],
  "weapons": [
    {
      "name": "Heavens-wrought Weapon",
      "type": "melee",
      "attacks": "2",
      "hit": "3+",
      "wound": "4+",
      "rend": "-",
      "damage": "1"
    }
  ],
  "abilities": [
    {
      "name": "Stalwart Defenders",
      "type": "passive",
      "effect": "Add 3 to this unit's control score...",
      "color": "purple",
      "abilityType": "control"
    }
  ]
}
```

### Hero JSON
Same as Unit but with additional fields:
```json
{
  "heroicTrait": "...",
  "wizardLevel": 2,
  "priestLevel": null,
  "warmaster": false,
  "unique": true
}
```

### Manifestation JSON
```json
{
  "$schema": "../../schema/manifestation.schema.json",
  "id": "everblaze-comet",
  "name": "Everblaze Comet",
  "stats": {
    "move": "-",
    "health": 9,
    "save": "-",
    "banishment": "7+"
  },
  "abilities": [...]
}
```

---

## 6. File Organization

```
data/
├── factions/
│   └── stormcast-eternals/
│       ├── _index.json           # Faction metadata
│       ├── heroes/
│       │   ├── lord-celestant.json
│       │   └── knight-incantor.json
│       ├── units/
│       │   ├── liberators.json
│       │   └── sequitors.json
│       ├── manifestations/
│       │   └── everblaze-comet.json
│       └── enhancements/
│           ├── artefacts/
│           └── command-traits/
├── lores/
│   ├── lore-of-the-storm.json
│   └── lore-of-invigoration.json
└── battle-tactics/
```

---

## 7. Verification Steps

1. **Validate IDs exist**: Before parsing, verify all referenced IDs exist in GST
2. **Type checking**: Ensure every profile has a known typeId
3. **Schema validation**: Run JSON Schema validation on all output
4. **Completeness check**: Compare parsed unit count against XML unit count
5. **Round-trip test**: Parse -> Generate -> Compare with original data

```bash
# Full validation flow
npm run build
npm run parser:sync
npm run schema:build
npm run validate
```

---

## 8. Implementation Recommendations

### Option A: Single-Pass Parser
- Parse entire catalogue in one traversal
- Build in-memory representation
- Output all JSON at end
- **Pros**: Simple, fast
- **Cons**: High memory for large catalogues

### Option B: Streaming Parser
- Use SAX-style parsing
- Emit entities as discovered
- **Pros**: Low memory
- **Cons**: Complex state management

### Option C: Two-Pass Parser (Recommended)
1. **Pass 1**: Build index of all IDs and their locations
2. **Pass 2**: Parse entities, resolving references via index
- **Pros**: Clean resolution of cross-references, handles forward references
- **Cons**: Slightly slower

### Technology Choices
- **XML Parsing**: `fast-xml-parser` (fast, TypeScript-friendly)
- **Validation**: Zod schemas for runtime validation
- **Output**: JSON with `$schema` references
