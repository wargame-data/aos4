/**
 * BSData XML TypeScript Type Definitions
 *
 * These types represent the structure of BattleScribe .cat and .gst files
 * as parsed by xml2js. The $ property contains XML attributes, and child
 * elements are arrays (even for single elements due to xml2js defaults).
 */

// Base attributes common to most elements
export interface BSBaseAttributes {
  id: string;
  name: string;
}

// Game System (.gst) root element
export interface BSGameSystem {
  $: BSBaseAttributes & {
    gameSystemId: string;
    revision: string;
  };
  costTypes?: BSCostType[];
  profileTypes?: BSProfileType[];
  categoryEntries?: BSCategoryEntry[];
  forceEntries?: BSForceEntry[];
  sharedSelectionEntries?: BSSelectionEntry[];
  sharedProfiles?: BSProfile[];
  sharedRules?: BSRule[];
  selectionEntries?: BSSelectionEntry[];
  entryLinks?: BSEntryLink[];
  publications?: BSPublication[];
}

// Catalogue (.cat) root element
export interface BSCatalogue {
  $: BSBaseAttributes & {
    gameSystemId: string;
    revision: string;
    library?: string;
  };
  costTypes?: BSCostType[];
  profileTypes?: BSProfileType[];
  categoryEntries?: BSCategoryEntry[];
  forceEntries?: BSForceEntry[];
  sharedSelectionEntries?: BSSelectionEntry[];
  sharedSelectionEntryGroups?: BSSelectionEntryGroup[];
  sharedProfiles?: BSProfile[];
  sharedRules?: BSRule[];
  selectionEntries?: BSSelectionEntry[];
  selectionEntryGroups?: BSSelectionEntryGroup[];
  entryLinks?: BSEntryLink[];
  catalogueLinks?: BSCatalogueLink[];
  publications?: BSPublication[];
}

// Cost type definition (e.g., "pts" for points)
export interface BSCostType {
  $: BSBaseAttributes & {
    defaultCostLimit?: string;
  };
}

// Profile type definition (defines columns for a profile type)
export interface BSProfileType {
  $: BSBaseAttributes;
  characteristicTypes?: BSCharacteristicType[];
}

// Characteristic type (column definition within a profile type)
export interface BSCharacteristicType {
  $: BSBaseAttributes;
}

// Category entry (used for organizing units and applying keywords)
export interface BSCategoryEntry {
  $: BSBaseAttributes & {
    hidden?: string;
    publicationId?: string;
  };
}

// Force entry (defines army organization)
export interface BSForceEntry {
  $: BSBaseAttributes & {
    hidden?: string;
  };
  categoryLinks?: BSCategoryLink[];
  forceEntries?: BSForceEntry[];
  costs?: BSCost[];
  modifiers?: BSModifier[];
  constraints?: BSConstraint[];
}

// Selection Entry - The main building block (units, models, upgrades)
export interface BSSelectionEntry {
  $: BSBaseAttributes & {
    type: "unit" | "model" | "upgrade";
    hidden?: string;
    collective?: string;
    publicationId?: string;
    page?: string;
  };
  profiles?: BSProfile[];
  rules?: BSRule[];
  infoLinks?: BSInfoLink[];
  costs?: BSCost[];
  constraints?: BSConstraint[];
  modifiers?: BSModifier[];
  modifierGroups?: BSModifierGroup[];
  categoryLinks?: BSCategoryLink[];
  entryLinks?: BSEntryLink[];
  selectionEntries?: BSSelectionEntry[];
  selectionEntryGroups?: BSSelectionEntryGroup[];
}

// Selection Entry Group (groups of options like weapon choices)
export interface BSSelectionEntryGroup {
  $: BSBaseAttributes & {
    hidden?: string;
    collective?: string;
    defaultSelectionEntryId?: string;
    flatten?: string;
  };
  constraints?: BSConstraint[];
  modifiers?: BSModifier[];
  entryLinks?: BSEntryLink[];
  selectionEntries?: BSSelectionEntry[];
  selectionEntryGroups?: BSSelectionEntryGroup[];
  rules?: BSRule[];
}

// Attribute on a profile (Color, Type, etc.)
export interface BSAttribute {
  $: {
    name: string;
    typeId: string;
  };
  _?: string; // The attribute value
}

// Profile (stat line - can be Unit, Weapon, Ability, etc.)
export interface BSProfile {
  $: BSBaseAttributes & {
    typeId: string;
    typeName: string;
    hidden?: string;
    publicationId?: string;
    page?: string;
  };
  characteristics?: BSCharacteristic[];
  attributes?: BSAttribute[];
  modifiers?: BSModifier[];
}

// Characteristic (individual stat within a profile)
export interface BSCharacteristic {
  $: {
    name: string;
    typeId: string;
  };
  _?: string; // The value (can be in text content)
}

// Rule (ability or special rule text)
export interface BSRule {
  $: BSBaseAttributes & {
    hidden?: string;
    publicationId?: string;
    page?: string;
  };
  description?: string[];
  modifiers?: BSModifier[];
}

// Cost (points value)
export interface BSCost {
  $: {
    name: string;
    typeId: string;
    value: string;
  };
}

// Constraint (min/max limits)
export interface BSConstraint {
  $: {
    type: "min" | "max";
    value: string;
    field: string;
    scope: string;
    shared?: string;
    id?: string;
    includeChildSelections?: string;
    includeChildForces?: string;
  };
}

// Modifier (changes values based on conditions)
export interface BSModifier {
  $: {
    type: "set" | "increment" | "decrement" | "append" | "add" | "remove";
    value: string;
    field: string;
  };
  conditions?: BSCondition[];
  conditionGroups?: BSConditionGroup[];
  repeats?: BSRepeat[];
}

// Modifier Group (groups of modifiers)
export interface BSModifierGroup {
  $?: {
    type?: string;
  };
  modifiers?: BSModifier[];
  conditions?: BSCondition[];
  conditionGroups?: BSConditionGroup[];
}

// Condition (prerequisite for a modifier)
export interface BSCondition {
  $: {
    type:
      | "equalTo"
      | "notEqualTo"
      | "lessThan"
      | "greaterThan"
      | "atLeast"
      | "atMost"
      | "instanceOf";
    value: string;
    field: string;
    scope: string;
    childId?: string;
    shared?: string;
    includeChildSelections?: string;
    includeChildForces?: string;
    percentValue?: string;
  };
}

// Condition Group (logical grouping of conditions)
export interface BSConditionGroup {
  $: {
    type: "and" | "or";
  };
  conditions?: BSCondition[];
  conditionGroups?: BSConditionGroup[];
}

// Repeat (for modifiers that apply multiple times)
export interface BSRepeat {
  $: {
    value: string;
    repeats: string;
    field: string;
    scope: string;
    childId?: string;
    shared?: string;
    roundUp?: string;
    includeChildSelections?: string;
    includeChildForces?: string;
    percentValue?: string;
  };
}

// Category Link (assigns categories/keywords to entries)
export interface BSCategoryLink {
  $: {
    id: string;
    name: string;
    targetId: string;
    primary?: string;
    hidden?: string;
  };
}

// Entry Link (reference to another selection entry)
export interface BSEntryLink {
  $: BSBaseAttributes & {
    targetId: string;
    type: "selectionEntry" | "selectionEntryGroup";
    hidden?: string;
    collective?: string;
  };
  constraints?: BSConstraint[];
  modifiers?: BSModifier[];
  modifierGroups?: BSModifierGroup[];
  costs?: BSCost[];
  categoryLinks?: BSCategoryLink[];
  profiles?: BSProfile[];
  entryLinks?: BSEntryLink[];
}

// Info Link (reference to shared profiles/rules)
export interface BSInfoLink {
  $: BSBaseAttributes & {
    targetId: string;
    type: "profile" | "rule" | "infoGroup";
    hidden?: string;
  };
  modifiers?: BSModifier[];
}

// Catalogue Link (import another catalogue)
export interface BSCatalogueLink {
  $: {
    id: string;
    name: string;
    targetId: string;
    type: "catalogue";
    importRootEntries?: string;
  };
}

// Publication reference
export interface BSPublication {
  $: BSBaseAttributes & {
    shortName?: string;
    publisher?: string;
    publicationDate?: string;
  };
}

// Parsed file result types
export interface ParsedGameSystem {
  gameSystem: BSGameSystem;
}

export interface ParsedCatalogue {
  catalogue: BSCatalogue;
}

// Known profile type names in AoS
export type BSProfileTypeName =
  | "Unit"
  | "Melee Weapon"
  | "Ranged Weapon"
  | "Ability"
  | "Spell"
  | "Prayer"
  | "Manifestation Lore"
  | "Core Battalion";

// Characteristic names for Unit profile
export interface BSUnitCharacteristics {
  Move: string;
  Health: string;
  Save: string;
  Control: string;
  Banishment?: string;
}

// Characteristic names for Weapon profiles
export interface BSWeaponCharacteristics {
  Range?: string;
  Attacks: string;
  "To Hit": string;
  "To Wound": string;
  Rend: string;
  Damage: string;
  Ability?: string;
}

// Characteristic names for Ability profiles
export interface BSAbilityCharacteristics {
  Type?: string;
  Timing?: string;
  Declare?: string;
  Effect: string;
  "Casting Value"?: string;
  "Chanting Value"?: string;
  Keywords?: string;
}
