/**
 * Army Validator Unit Tests
 *
 * Tests for the army validation logic.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  validateArmy,
  validateUnitExists,
  validateRegimentKeywords,
  validateManifestationLoreExists,
  validateManifestationLoreFaction,
  calculateArmyPoints,
  createArmyData,
  type ArmyData,
} from "../schemas/army-validator.js";
import type { Army } from "../schemas/schemas/army.schema.js";
import type { Unit } from "../schemas/schemas/unit.schema.js";
import type { Hero } from "../schemas/schemas/hero.schema.js";
import type { Faction } from "../schemas/schemas/faction.schema.js";
import type { Lore } from "../schemas/schemas/lore.schema.js";

// Test data: simplified faction and units for testing
const testFaction: Faction = {
  id: "test-faction",
  name: "Test Faction",
  grandAlliance: "order",
};

const testLordCelestant: Hero = {
  id: "lord-celestant",
  name: "Lord-Celestant",
  faction: "test-faction",
  grandAlliance: "order",
  points: 100,
  stats: { move: '5"', health: 6, save: "3+", control: 2 },
  role: "other",
  keywords: ["HERO", "INFANTRY", "WARRIOR CHAMBER"],
  regimentKeywords: ["WARRIOR CHAMBER"],
  baseSize: 1,
  weapons: [{ name: "Weapons", type: "melee", attacks: 5, hit: "3+", wound: "3+", rend: 1, damage: 2 }],
  isWizard: null,
  isPriest: null,
  isUnique: false,
  canJoinRegiment: null,
  regimentAllows: [{ keywords: ["WARRIOR CHAMBER"], description: "WARRIOR CHAMBER units" }],
};

const testKnightIncantor: Hero = {
  id: "knight-incantor",
  name: "Knight-Incantor",
  faction: "test-faction",
  grandAlliance: "order",
  points: 140,
  stats: { move: '5"', health: 6, save: "3+", control: 2 },
  role: "other",
  keywords: ["HERO", "INFANTRY", "SACROSANCT CHAMBER", "WIZARD (1)"],
  regimentKeywords: ["SACROSANCT CHAMBER"],
  baseSize: 1,
  weapons: [{ name: "Staff", type: "melee", attacks: 3, hit: "3+", wound: "3+", rend: 1, damage: 2 }],
  isWizard: 1,
  isPriest: null,
  isUnique: false,
  canJoinRegiment: null,
  regimentAllows: [{ keywords: ["SACROSANCT CHAMBER"], description: "SACROSANCT CHAMBER units" }],
};

const testLiberators: Unit = {
  id: "liberators",
  name: "Liberators",
  faction: "test-faction",
  grandAlliance: "order",
  points: 90,
  stats: { move: '5"', health: 2, save: "3+", control: 1 },
  role: "other",
  keywords: ["INFANTRY", "WARRIOR CHAMBER"],
  regimentKeywords: ["WARRIOR CHAMBER"],
  baseSize: 5,
  maxSize: 10,
  canReinforce: true,
  reinforcementCost: 90,
  weapons: [{ name: "Warhammer", type: "melee", attacks: 2, hit: "3+", wound: "3+", rend: 1, damage: 1 }],
};

const testAnnihilators: Unit = {
  id: "annihilators",
  name: "Annihilators",
  faction: "test-faction",
  grandAlliance: "order",
  points: 130,
  stats: { move: '4"', health: 3, save: "2+", control: 1 },
  role: "other",
  keywords: ["INFANTRY", "WARRIOR CHAMBER"],
  regimentKeywords: ["WARRIOR CHAMBER"],
  baseSize: 3,
  maxSize: 6,
  canReinforce: true,
  reinforcementCost: 130,
  weapons: [{ name: "Meteoric Hammer", type: "melee", attacks: 3, hit: "3+", wound: "3+", rend: 1, damage: 2 }],
};

const testEvocators: Unit = {
  id: "evocators",
  name: "Evocators",
  faction: "test-faction",
  grandAlliance: "order",
  points: 100,
  stats: { move: '5"', health: 3, save: "4+", control: 1 },
  role: "other",
  keywords: ["INFANTRY", "SACROSANCT CHAMBER"],
  regimentKeywords: ["SACROSANCT CHAMBER"],
  baseSize: 5,
  weapons: [{ name: "Tempest Blade", type: "melee", attacks: 3, hit: "3+", wound: "3+", rend: 1, damage: 1 }],
};

// Test manifestation lores
const globalManifestationLore: Lore = {
  id: "manifestations-of-the-storm",
  name: "Manifestations of the Storm",
  loreType: "manifestation",
  spells: [
    {
      name: "Summon Celestian Vortex",
      castingValue: 6,
      effect: "Set up a Celestian Vortex wholly within 18\" of the caster.",
    },
  ],
};

const factionManifestationLore: Lore = {
  id: "manifestation-lore-test-faction",
  name: "Manifestation Lore: Test Faction",
  loreType: "manifestation",
  factionId: "test-faction",
  spells: [
    {
      name: "Summon Test Manifestation",
      castingValue: 7,
      effect: "Set up a Test Manifestation wholly within 12\" of the caster.",
    },
  ],
};

const formationManifestationLore: Lore = {
  id: "manifestation-lore-vanguard-wing",
  name: "Manifestation Lore: Vanguard Wing",
  loreType: "manifestation",
  factionId: "vanguard-wing",
  spells: [
    {
      name: "Summon Vanguard Manifestation",
      castingValue: 5,
      effect: "Set up a Vanguard Manifestation wholly within 18\" of the caster.",
    },
  ],
};

const otherFactionManifestationLore: Lore = {
  id: "manifestation-lore-other-faction",
  name: "Manifestation Lore: Other Faction",
  loreType: "manifestation",
  factionId: "other-faction",
  spells: [
    {
      name: "Summon Other Manifestation",
      castingValue: 6,
      effect: "Set up an Other Manifestation wholly within 18\" of the caster.",
    },
  ],
};

const spellLore: Lore = {
  id: "lore-of-storms",
  name: "Lore of Storms",
  loreType: "spell",
  spells: [
    {
      name: "Chain Lightning",
      castingValue: 7,
      effect: "Pick an enemy unit within 18\"...",
    },
  ],
};

// Create test ArmyData
let testData: ArmyData;

beforeAll(() => {
  testData = createArmyData({
    factions: [testFaction],
    heroes: [testLordCelestant, testKnightIncantor],
    units: [testLiberators, testAnnihilators, testEvocators],
    regimentsOfRenown: [],
    lores: [
      globalManifestationLore,
      factionManifestationLore,
      formationManifestationLore,
      otherFactionManifestationLore,
      spellLore,
    ],
  });
});

describe("validateUnitExists", () => {
  it("should return true for existing unit", () => {
    expect(validateUnitExists("liberators", testData)).toBe(true);
  });

  it("should return true for existing hero", () => {
    expect(validateUnitExists("lord-celestant", testData)).toBe(true);
  });

  it("should return false for non-existing unit", () => {
    expect(validateUnitExists("non-existent", testData)).toBe(false);
  });
});

describe("validateRegimentKeywords", () => {
  it("should allow hero to lead matching keyword units", () => {
    expect(validateRegimentKeywords(testLordCelestant, testLiberators)).toBe(true);
    expect(validateRegimentKeywords(testLordCelestant, testAnnihilators)).toBe(true);
  });

  it("should not allow hero to lead mismatched keyword units", () => {
    // Knight-Incantor (SACROSANCT CHAMBER) cannot lead WARRIOR CHAMBER units
    expect(validateRegimentKeywords(testKnightIncantor, testLiberators)).toBe(false);
  });

  it("should allow hero to lead matching chamber units", () => {
    // Knight-Incantor (SACROSANCT CHAMBER) can lead SACROSANCT CHAMBER units
    expect(validateRegimentKeywords(testKnightIncantor, testEvocators)).toBe(true);
  });
});

describe("calculateArmyPoints", () => {
  it("should calculate total points for a simple army", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
    };

    const points = calculateArmyPoints(army, testData);
    // Lord-Celestant (100) + Liberators (90) = 190
    expect(points).toBe(190);
  });

  it("should include reinforcement costs", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 10, reinforced: true }],
        },
      ],
    };

    const points = calculateArmyPoints(army, testData);
    // Lord-Celestant (100) + Liberators (90 + 90 reinforcement) = 280
    expect(points).toBe(280);
  });
});

describe("validateArmy", () => {
  it("should validate a valid army", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      gameFormat: "1000",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [
            { unitId: "liberators", count: 5 },
            { unitId: "annihilators", count: 3 },
          ],
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    // Lord-Celestant (100) + Liberators (90) + Annihilators (130) = 320
    expect(result.totalPoints).toBe(320);
  });

  it("should report error for non-existent unit", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "non-existent-unit", count: 5 }],
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "UNIT_NOT_FOUND")).toBe(true);
  });

  it("should report error for keyword mismatch", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "knight-incantor", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "REGIMENT_KEYWORD_MISMATCH")).toBe(true);
  });

  it("should report error when points exceed limit", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      gameFormat: "1000",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [
            { unitId: "liberators", count: 5 },
            { unitId: "annihilators", count: 3 },
            { unitId: "annihilators", count: 3 },
            { unitId: "annihilators", count: 3 },
          ],
        },
        {
          leader: { unitId: "knight-incantor", count: 1 },
          units: [
            { unitId: "evocators", count: 5 },
            { unitId: "evocators", count: 5 },
            { unitId: "evocators", count: 5 },
          ],
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "POINTS_EXCEEDED")).toBe(true);
    expect(result.totalPoints).toBeGreaterThan(1000);
  });

  it("should report error for count below base size", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 3 }], // baseSize is 5
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "COUNT_BELOW_BASE_SIZE")).toBe(true);
  });

  it("should report error for count exceeds max size", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 15 }], // maxSize is 10
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "COUNT_EXCEEDS_MAX_SIZE")).toBe(true);
  });

  it("should report error for non-hero as regiment leader", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "liberators", count: 5 }, // Not a hero
          units: [],
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "LEADER_NOT_HERO")).toBe(true);
  });

  it("should report error for non-existent faction", () => {
    const army: Army = {
      faction: "non-existent-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [],
        },
      ],
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "FACTION_NOT_FOUND")).toBe(true);
  });

  it("should report warning for reinforced flag mismatch", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5, reinforced: true }], // reinforced but count is base
        },
      ],
    };

    const result = validateArmy(army, testData);
    // This is a warning, not an error
    expect(result.warnings.some((w) => w.code === "REINFORCED_COUNT_MISMATCH")).toBe(true);
  });

  it("should validate army with valid global manifestation lore", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
      manifestationLore: "manifestations-of-the-storm",
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate army with valid faction-specific manifestation lore", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
      manifestationLore: "manifestation-lore-test-faction",
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate army with formation-specific manifestation lore", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      battleFormation: "vanguard-wing",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
      manifestationLore: "manifestation-lore-vanguard-wing",
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should report error for non-existent manifestation lore", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
      manifestationLore: "non-existent-lore",
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MANIFESTATION_LORE_NOT_FOUND")).toBe(true);
  });

  it("should report error for manifestation lore from other faction", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
      manifestationLore: "manifestation-lore-other-faction",
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MANIFESTATION_LORE_FACTION_MISMATCH")).toBe(true);
  });

  it("should report error when selecting spell lore as manifestation lore", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
      manifestationLore: "lore-of-storms", // This is a spell lore, not manifestation
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MANIFESTATION_LORE_NOT_FOUND")).toBe(true);
  });

  it("should report error for formation-specific lore without matching formation", () => {
    const army: Army = {
      faction: "test-faction",
      grandAlliance: "order",
      // No battleFormation, or different one
      regiments: [
        {
          leader: { unitId: "lord-celestant", count: 1 },
          units: [{ unitId: "liberators", count: 5 }],
        },
      ],
      manifestationLore: "manifestation-lore-vanguard-wing",
    };

    const result = validateArmy(army, testData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MANIFESTATION_LORE_FACTION_MISMATCH")).toBe(true);
  });
});

describe("validateManifestationLoreExists", () => {
  it("should return true for existing manifestation lore", () => {
    expect(validateManifestationLoreExists("manifestations-of-the-storm", testData)).toBe(true);
  });

  it("should return true for faction-specific manifestation lore", () => {
    expect(validateManifestationLoreExists("manifestation-lore-test-faction", testData)).toBe(true);
  });

  it("should return false for non-existent lore", () => {
    expect(validateManifestationLoreExists("non-existent", testData)).toBe(false);
  });

  it("should return false for spell lore (not manifestation type)", () => {
    expect(validateManifestationLoreExists("lore-of-storms", testData)).toBe(false);
  });
});

describe("validateManifestationLoreFaction", () => {
  it("should return true for global manifestation lore (no factionId)", () => {
    expect(
      validateManifestationLoreFaction("manifestations-of-the-storm", "test-faction", undefined, testData)
    ).toBe(true);
  });

  it("should return true when lore factionId matches army faction", () => {
    expect(
      validateManifestationLoreFaction("manifestation-lore-test-faction", "test-faction", undefined, testData)
    ).toBe(true);
  });

  it("should return true when lore factionId matches battle formation", () => {
    expect(
      validateManifestationLoreFaction("manifestation-lore-vanguard-wing", "test-faction", "vanguard-wing", testData)
    ).toBe(true);
  });

  it("should return false when lore factionId doesn't match faction or formation", () => {
    expect(
      validateManifestationLoreFaction("manifestation-lore-other-faction", "test-faction", undefined, testData)
    ).toBe(false);
  });

  it("should return false for non-existent lore", () => {
    expect(
      validateManifestationLoreFaction("non-existent", "test-faction", undefined, testData)
    ).toBe(false);
  });

  it("should return false for spell lore (not manifestation type)", () => {
    expect(
      validateManifestationLoreFaction("lore-of-storms", "test-faction", undefined, testData)
    ).toBe(false);
  });
});
