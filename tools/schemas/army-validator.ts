import type { Unit } from "./schemas/unit.schema.js";
import type { Hero } from "./schemas/hero.schema.js";
import type { RegimentOfRenown } from "./schemas/regiment-of-renown.schema.js";
import type { Faction } from "./schemas/faction.schema.js";
import type { Lore } from "./schemas/lore.schema.js";
import type { Army, GameFormat } from "./schemas/army.schema.js";
import type { Regiment } from "./schemas/regiment.schema.js";
import type { UnitSelection } from "./schemas/unit-selection.schema.js";

/**
 * Data required for army validation.
 * Maps IDs to their full data objects.
 */
export interface ArmyData {
  units: Map<string, Unit>;
  heroes: Map<string, Hero>;
  regimentsOfRenown: Map<string, RegimentOfRenown>;
  factions: Map<string, Faction>;
  lores: Map<string, Lore>;
}

/**
 * Validation error with path and message.
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validation warning (non-fatal issues).
 */
export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

/**
 * Result of army validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  totalPoints: number;
}

/**
 * Points limits for each game format.
 */
const POINTS_LIMITS: Record<GameFormat, number> = {
  "1000": 1000,
  "2000": 2000,
  "2500": 2500,
  "path-to-glory": Infinity, // PTG doesn't have a fixed points limit
};

/**
 * Get a unit or hero by ID from the data.
 */
function getUnitOrHero(
  unitId: string,
  data: ArmyData
): Unit | Hero | undefined {
  return data.units.get(unitId) ?? data.heroes.get(unitId);
}

/**
 * Check if a unit ID exists in the data.
 */
export function validateUnitExists(unitId: string, data: ArmyData): boolean {
  return data.units.has(unitId) || data.heroes.has(unitId);
}

/**
 * Check if a Regiment of Renown ID exists in the data.
 */
export function validateRegimentOfRenownExists(
  rorId: string,
  data: ArmyData
): boolean {
  return data.regimentsOfRenown.has(rorId);
}

/**
 * Check if a Regiment of Renown is allowed for the given faction.
 */
export function validateRegimentOfRenownFaction(
  rorId: string,
  factionId: string,
  data: ArmyData
): boolean {
  const ror = data.regimentsOfRenown.get(rorId);
  if (!ror) return false;

  const faction = data.factions.get(factionId);
  if (!faction) return false;

  // Check if faction name is in allowedFactions
  return ror.allowedFactions.some(
    (allowed) =>
      allowed.toLowerCase() === faction.name.toLowerCase() ||
      allowed.toLowerCase() === factionId.toLowerCase()
  );
}

/**
 * Check if a unit can be led by a hero based on regiment keywords.
 * A hero can lead units whose regimentKeywords overlap with the hero's regimentAllows keywords.
 */
export function validateRegimentKeywords(
  leader: Hero,
  unit: Unit | Hero
): boolean {
  // If hero has no regimentAllows, they can only lead units of their faction
  if (!leader.regimentAllows || leader.regimentAllows.length === 0) {
    return unit.faction === leader.faction;
  }

  // Get all allowed keywords from the leader
  const allowedKeywords = new Set(
    leader.regimentAllows.flatMap((ra) =>
      ra.keywords.map((k) => k.toLowerCase())
    )
  );

  // Get the unit's regiment keywords
  const unitKeywords = new Set(
    (unit.regimentKeywords ?? []).map((k) => k.toLowerCase())
  );

  // Check if any allowed keyword matches unit keywords
  for (const allowed of allowedKeywords) {
    if (unitKeywords.has(allowed)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate points for a single unit selection.
 */
export function calculateSelectionPoints(
  selection: UnitSelection,
  data: ArmyData
): number {
  const unitOrHero = getUnitOrHero(selection.unitId, data);
  if (!unitOrHero) return 0;

  let points = unitOrHero.points;

  // Add reinforcement cost if reinforced
  if (selection.reinforced && "reinforcementCost" in unitOrHero) {
    points += (unitOrHero as Unit).reinforcementCost ?? 0;
  }

  return points;
}

/**
 * Calculate points for a regiment.
 */
export function calculateRegimentPoints(
  regiment: Regiment,
  data: ArmyData
): number {
  // If using Regiment of Renown, use its fixed points
  if (regiment.regimentOfRenownId) {
    const ror = data.regimentsOfRenown.get(regiment.regimentOfRenownId);
    return ror?.points ?? 0;
  }

  // Sum leader + units
  let points = calculateSelectionPoints(regiment.leader, data);
  for (const unit of regiment.units ?? []) {
    points += calculateSelectionPoints(unit, data);
  }
  return points;
}

/**
 * Calculate total points for an army.
 */
export function calculateArmyPoints(army: Army, data: ArmyData): number {
  let total = 0;

  // Sum regiment points
  for (const regiment of army.regiments) {
    total += calculateRegimentPoints(regiment, data);
  }

  // Sum auxiliary points
  for (const aux of army.auxiliary ?? []) {
    total += calculateSelectionPoints(aux, data);
  }

  return total;
}

/**
 * Check if army is within points limit for game format.
 */
export function validatePointsLimit(army: Army, data: ArmyData): boolean {
  if (!army.gameFormat) return true;

  const limit = POINTS_LIMITS[army.gameFormat];
  const total = calculateArmyPoints(army, data);
  return total <= limit;
}

/**
 * Validate a single unit selection.
 */
function validateSelection(
  selection: UnitSelection,
  path: string,
  data: ArmyData,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const unitOrHero = getUnitOrHero(selection.unitId, data);

  if (!unitOrHero) {
    errors.push({
      path,
      message: `Unit or hero '${selection.unitId}' not found`,
      code: "UNIT_NOT_FOUND",
    });
    return;
  }

  // Validate count against baseSize/maxSize
  const baseSize = unitOrHero.baseSize;
  const maxSize = unitOrHero.maxSize ?? baseSize;

  if (selection.count < baseSize) {
    errors.push({
      path: `${path}.count`,
      message: `Count ${selection.count} is below minimum base size ${baseSize}`,
      code: "COUNT_BELOW_BASE_SIZE",
    });
  }

  if (selection.count > maxSize) {
    errors.push({
      path: `${path}.count`,
      message: `Count ${selection.count} exceeds maximum size ${maxSize}`,
      code: "COUNT_EXCEEDS_MAX_SIZE",
    });
  }

  // Validate reinforced flag
  if (selection.reinforced) {
    if (!unitOrHero.canReinforce) {
      errors.push({
        path: `${path}.reinforced`,
        message: `Unit '${unitOrHero.name}' cannot be reinforced`,
        code: "CANNOT_REINFORCE",
      });
    } else if (selection.count !== maxSize) {
      warnings.push({
        path: `${path}.reinforced`,
        message: `Unit is marked as reinforced but count doesn't match maxSize`,
        code: "REINFORCED_COUNT_MISMATCH",
      });
    }
  }
}

/**
 * Validate a regiment.
 */
function validateRegiment(
  regiment: Regiment,
  index: number,
  army: Army,
  data: ArmyData,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const basePath = `regiments[${index}]`;

  // If using Regiment of Renown
  if (regiment.regimentOfRenownId) {
    if (!validateRegimentOfRenownExists(regiment.regimentOfRenownId, data)) {
      errors.push({
        path: `${basePath}.regimentOfRenownId`,
        message: `Regiment of Renown '${regiment.regimentOfRenownId}' not found`,
        code: "ROR_NOT_FOUND",
      });
    } else if (
      !validateRegimentOfRenownFaction(
        regiment.regimentOfRenownId,
        army.faction,
        data
      )
    ) {
      errors.push({
        path: `${basePath}.regimentOfRenownId`,
        message: `Regiment of Renown '${regiment.regimentOfRenownId}' is not allowed for faction '${army.faction}'`,
        code: "ROR_FACTION_MISMATCH",
      });
    }
    // Validate the leader even for RoR (it's the RoR's leader)
    validateSelection(
      regiment.leader,
      `${basePath}.leader`,
      data,
      errors,
      warnings
    );
    return;
  }

  // Validate leader
  validateSelection(
    regiment.leader,
    `${basePath}.leader`,
    data,
    errors,
    warnings
  );

  const leader = data.heroes.get(regiment.leader.unitId);
  if (!leader) {
    errors.push({
      path: `${basePath}.leader`,
      message: `Regimental leader '${regiment.leader.unitId}' must be a hero`,
      code: "LEADER_NOT_HERO",
    });
  }

  // Validate units
  if (regiment.units) {
    for (let i = 0; i < regiment.units.length; i++) {
      const unit = regiment.units[i];
      validateSelection(
        unit,
        `${basePath}.units[${i}]`,
        data,
        errors,
        warnings
      );

      // Validate regiment keywords if leader exists
      if (leader) {
        const unitData = getUnitOrHero(unit.unitId, data);
        if (unitData && !validateRegimentKeywords(leader, unitData)) {
          errors.push({
            path: `${basePath}.units[${i}]`,
            message: `Unit '${unitData.name}' cannot be in a regiment led by '${leader.name}' (keyword mismatch)`,
            code: "REGIMENT_KEYWORD_MISMATCH",
          });
        }
      }
    }
  }
}

/**
 * Validate an entire army list.
 */
export function validateArmy(army: Army, data: ArmyData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate faction exists
  if (!data.factions.has(army.faction)) {
    errors.push({
      path: "faction",
      message: `Faction '${army.faction}' not found`,
      code: "FACTION_NOT_FOUND",
    });
  }

  // Validate regiments
  for (let i = 0; i < army.regiments.length; i++) {
    validateRegiment(army.regiments[i], i, army, data, errors, warnings);
  }

  // Validate auxiliary units
  if (army.auxiliary) {
    for (let i = 0; i < army.auxiliary.length; i++) {
      validateSelection(
        army.auxiliary[i],
        `auxiliary[${i}]`,
        data,
        errors,
        warnings
      );
    }
  }

  // Validate unique heroes are not duplicated
  const heroUsageCount = new Map<string, number>();

  // Count heroes from regiment leaders
  for (const regiment of army.regiments) {
    if (regiment.leader?.unitId) {
      heroUsageCount.set(
        regiment.leader.unitId,
        (heroUsageCount.get(regiment.leader.unitId) ?? 0) + 1
      );
    }
  }

  // Count heroes from auxiliary (if any heroes are there)
  if (army.auxiliary) {
    for (const aux of army.auxiliary) {
      if (data.heroes.has(aux.unitId)) {
        heroUsageCount.set(
          aux.unitId,
          (heroUsageCount.get(aux.unitId) ?? 0) + 1
        );
      }
    }
  }

  // Check for duplicate unique heroes
  for (const [heroId, count] of heroUsageCount) {
    if (count > 1) {
      const hero = data.heroes.get(heroId);
      if (hero?.isUnique) {
        errors.push({
          path: "regiments",
          message: `Unique hero '${hero.name}' cannot be taken more than once (found ${count} times)`,
          code: "DUPLICATE_UNIQUE_HERO",
        });
      }
    }
  }

  // Calculate points
  const totalPoints = calculateArmyPoints(army, data);

  // Validate points limit
  if (army.gameFormat) {
    const limit = POINTS_LIMITS[army.gameFormat];
    if (totalPoints > limit) {
      errors.push({
        path: "totalPoints",
        message: `Army total ${totalPoints} exceeds ${army.gameFormat} point limit of ${limit}`,
        code: "POINTS_EXCEEDED",
      });
    }
  }

  // Validate enhancement assignments
  if (army.enhancements?.heroicTraits) {
    for (let i = 0; i < army.enhancements.heroicTraits.length; i++) {
      const trait = army.enhancements.heroicTraits[i];
      if (!data.heroes.has(trait.heroId)) {
        errors.push({
          path: `enhancements.heroicTraits[${i}].heroId`,
          message: `Hero '${trait.heroId}' not found for heroic trait assignment`,
          code: "ENHANCEMENT_HERO_NOT_FOUND",
        });
      }
    }
  }

  if (army.enhancements?.artefacts) {
    for (let i = 0; i < army.enhancements.artefacts.length; i++) {
      const artefact = army.enhancements.artefacts[i];
      if (!data.heroes.has(artefact.heroId)) {
        errors.push({
          path: `enhancements.artefacts[${i}].heroId`,
          message: `Hero '${artefact.heroId}' not found for artefact assignment`,
          code: "ENHANCEMENT_HERO_NOT_FOUND",
        });
      }
    }
  }

  // Validate manifestation lore selection
  if (army.manifestationLore) {
    if (!validateManifestationLoreExists(army.manifestationLore, data)) {
      errors.push({
        path: "manifestationLore",
        message: `Manifestation lore '${army.manifestationLore}' not found`,
        code: "MANIFESTATION_LORE_NOT_FOUND",
      });
    } else if (
      !validateManifestationLoreFaction(
        army.manifestationLore,
        army.faction,
        army.battleFormation,
        data
      )
    ) {
      errors.push({
        path: "manifestationLore",
        message: `Manifestation lore '${army.manifestationLore}' is not available for faction '${army.faction}'${army.battleFormation ? ` with battle formation '${army.battleFormation}'` : ""}`,
        code: "MANIFESTATION_LORE_FACTION_MISMATCH",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalPoints,
  };
}

/**
 * Check if a manifestation lore exists in the data.
 */
export function validateManifestationLoreExists(
  loreId: string,
  data: ArmyData
): boolean {
  const lore = data.lores.get(loreId);
  return lore !== undefined && lore.loreType === "manifestation";
}

/**
 * Check if a manifestation lore is valid for the given faction and battle formation.
 *
 * Manifestation lore validity rules:
 * 1. If the lore has a factionId, it must match either:
 *    - The army's faction ID
 *    - The army's battle formation ID (for formation-specific lores)
 * 2. If the lore has no factionId, it's a global lore available to all factions
 *    that can use manifestations (determined by grand alliance or faction abilities)
 */
export function validateManifestationLoreFaction(
  loreId: string,
  factionId: string,
  battleFormationId: string | undefined,
  data: ArmyData
): boolean {
  const lore = data.lores.get(loreId);
  if (!lore || lore.loreType !== "manifestation") return false;

  // If lore has no factionId, it's a global manifestation lore (available to all)
  if (!lore.factionId) {
    return true;
  }

  // Check if lore's factionId matches the army's faction
  if (lore.factionId === factionId) {
    return true;
  }

  // Check if lore's factionId matches the battle formation
  // (formation-specific manifestation lores like "manifestation-lore-astral-templars")
  if (battleFormationId && lore.factionId === battleFormationId) {
    return true;
  }

  return false;
}

/**
 * Create ArmyData from arrays of entities.
 * Convenience function to build the Map structures.
 */
export function createArmyData(options: {
  units?: Unit[];
  heroes?: Hero[];
  regimentsOfRenown?: RegimentOfRenown[];
  factions?: Faction[];
  lores?: Lore[];
}): ArmyData {
  return {
    units: new Map((options.units ?? []).map((u) => [u.id, u])),
    heroes: new Map((options.heroes ?? []).map((h) => [h.id, h])),
    regimentsOfRenown: new Map(
      (options.regimentsOfRenown ?? []).map((r) => [r.id, r])
    ),
    factions: new Map((options.factions ?? []).map((f) => [f.id, f])),
    lores: new Map((options.lores ?? []).map((l) => [l.id, l])),
  };
}
