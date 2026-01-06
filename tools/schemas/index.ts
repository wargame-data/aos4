// Export all Zod schemas
export { weaponSchema, type Weapon } from "./schemas/weapon.schema.js";
export { abilitySchema, type Ability } from "./schemas/ability.schema.js";
export { unitSchema, type Unit } from "./schemas/unit.schema.js";
export { heroSchema, type Hero } from "./schemas/hero.schema.js";
export {
  manifestationSchema,
  type Manifestation,
} from "./schemas/manifestation.schema.js";
export {
  loreSchema,
  type Lore,
  type Spell,
  type Prayer,
} from "./schemas/lore.schema.js";
export {
  battleFormationSchema,
  type BattleFormation,
} from "./schemas/battle-formation.schema.js";
export {
  enhancementCollectionSchema,
  type EnhancementCollection,
  type EnhancementEntry,
} from "./schemas/enhancement.schema.js";
export {
  regimentOfRenownSchema,
  type RegimentOfRenown,
  type UnitComposition,
} from "./schemas/regiment-of-renown.schema.js";
export {
  factionSchema,
  type Faction,
  type LoreReference,
  type BattleFormationReference,
} from "./schemas/faction.schema.js";
export {
  battleTacticCardSchema,
  type BattleTacticCard,
  type Tactic,
} from "./schemas/battle-tactic-card.schema.js";
export {
  bloodTitheAbilitySchema,
  type BloodTitheAbility,
} from "./schemas/blood-tithe-ability.schema.js";
export {
  terrainSchema,
  type FactionTerrain,
} from "./schemas/terrain.schema.js";

// Army composition schemas
export {
  unitSelectionSchema,
  type UnitSelection,
} from "./schemas/unit-selection.schema.js";
export {
  regimentSchema,
  type Regiment,
} from "./schemas/regiment.schema.js";
export {
  armySchema,
  gameFormatSchema,
  type Army,
  type EnhancementAssignment,
  type Enhancements,
  type GameFormat,
} from "./schemas/army.schema.js";

// Army validation helpers
export {
  validateArmy,
  validateUnitExists,
  validateRegimentOfRenownExists,
  validateRegimentOfRenownFaction,
  validateRegimentKeywords,
  validatePointsLimit,
  calculateArmyPoints,
  calculateRegimentPoints,
  calculateSelectionPoints,
  createArmyData,
  type ArmyData,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from "./army-validator.js";

// Export base types and schemas
export {
  idSchema,
  grandAllianceSchema,
  phaseSchema,
  abilityTypeSchema,
  roleSchema,
  colorSchema,
  abilityCategorySchema,
  loreTypeSchema,
  moveSchema,
  saveSchema,
  rangeSchema,
  rollSchema,
  diceExpressionSchema,
  metaSchema,
  publicationSchema,
  ruleSchema,
  costsSchema,
  conditionSchema,
  conditionGroupSchema,
  modifierSchema,
  repeatSchema,
  constraintModifierSchema,
  type GrandAlliance,
  type Phase,
  type AbilityType,
  type Role,
  type Color,
  type AbilityCategory,
  type LoreType,
  type Meta,
  type Publication,
  type Rule,
  type Costs,
  type Condition,
  type ConditionGroup,
  type Modifier,
  type Repeat,
  type ConstraintModifier,
} from "./base.js";
