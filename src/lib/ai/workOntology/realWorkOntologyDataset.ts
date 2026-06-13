import {
  CONSTRUCTION_WORK_ONTOLOGY,
  getConstructionWorkOntologyEntry,
  pricebookScopeFor,
  relatedNegativeWorkKeys,
  WORK_ONTOLOGY_COUNTRY_REGIONS,
  WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS,
} from "./constructionWorkOntologyCatalog";
import type {
  ConstructionWorkOntologyEntry,
  RealWorkOntologyCase,
  WorkOntologyCategory,
  WorkOntologyConfusionPairCase,
  WorkOntologyRecipeBindingCase,
  WorkOntologyUnit,
} from "./constructionWorkOntologyTypes";

const TARGET_TOTAL = 10_000;
const RECIPE_BINDING_TOTAL = 1_000;
const CONFUSION_PAIR_TOTAL = 500;

const PROMPT_ACTIONS = [
  "нужно сделать",
  "смета на",
  "посчитать",
  "хочу заказать",
  "рассчитать",
  "надо выполнить",
  "бригада на",
  "стоимость работ",
  "заявка на",
  "подготовить расчет на",
] as const;

const PROMPT_CONTEXTS = [
  "в квартире",
  "в частном доме",
  "на коммерческом объекте",
  "для объекта",
  "на площадке",
  "после замера",
  "с материалами",
  "без закупочного списка",
  "для предварительной сметы",
  "под PDF смету",
] as const;

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function unitLabel(unit: WorkOntologyUnit): string {
  if (unit === "m2") return "м2";
  if (unit === "m3") return "м3";
  if (unit === "linear_m") return "пог. м";
  if (unit === "piece") return "шт";
  if (unit === "set") return "комплект";
  if (unit === "kg") return "кг";
  return "тонн";
}

function quantityFor(index: number, unit: WorkOntologyUnit): number {
  if (unit === "piece") return 1 + (index % 24);
  if (unit === "set") return 1 + (index % 4);
  if (unit === "kg") return 120 + (index % 90) * 10;
  if (unit === "ton") return 1 + (index % 18);
  if (unit === "m3") return 3 + (index % 85);
  if (unit === "linear_m") return 8 + (index % 160);
  return 12 + (index % 240);
}

function promptSafeSynonym(value: string): string {
  return value
    .replace(/\d+\s+\d+\s+\u043d\u0430\s+\d+\s+\d+\s*\u043c/giu, "")
    .replace(/(?:\u0432\u044b\u0441\u043e\u0442\u0430|\u0448\u0438\u0440\u0438\u043d\u0430|\u0434\u043b\u0438\u043d\u0430|\u043e\u0441\u043d\u043e\u0432\u0430)\s+\d+(?:[.,]\d+)?\s*(?:\u043c|\u043c2|\u043c\u00b2|\u043a\u0432\.?\s*\u043c|\u043a\u0432\s*\u043c\u0435\u0442\u0440\u043e\u0432?)/giu, "")
    .replace(/\d+(?:[.,]\d+)?\s*(?:\u043c2|\u043c\u00b2|\u043a\u0432\.?\s*\u043c|\u043a\u0432\s*\u043c\u0435\u0442\u0440\u043e\u0432?|\u043a\u0432\u0430\u0434\u0440\u0430\u0442\u043e\u0432|\u043c3|\u043c\u00b3|\u043a\u0443\u0431(?:\u043e\u0432|\.)?|\u043f\u043e\u0433\.?\s*\u043c|\u043f\.?\s*\u043c|\u043c|\u0448\u0442|\u043a\u043e\u043c\u043f\u043b\.?|\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442|\u043a\u0433|\u0442\u043e\u043d\u043d?)/giu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function synonymFor(entry: ConstructionWorkOntologyEntry, index: number): string {
  const synonym = promptSafeSynonym(entry.synonyms_ru[index % entry.synonyms_ru.length] ?? entry.visible_name_ru);
  return synonym && !/\d/.test(synonym) ? synonym : entry.visible_name_ru;
}

function keyDisambiguator(entry: ConstructionWorkOntologyEntry): string {
  return `тип ${entry.canonical_work_key.replace(/_/g, " ")}`;
}

function promptFor(input: {
  entry: ConstructionWorkOntologyEntry;
  index: number;
  quantity: number;
  unit: WorkOntologyUnit;
  region: string;
}): string {
  const action = PROMPT_ACTIONS[input.index % PROMPT_ACTIONS.length];
  const context = PROMPT_CONTEXTS[Math.floor(input.index / PROMPT_ACTIONS.length) % PROMPT_CONTEXTS.length];
  const synonym = synonymFor(input.entry, input.index);
  const qty = `${input.quantity} ${unitLabel(input.unit)}`;
  const keyHint = keyDisambiguator(input.entry);
  const variant = input.index % 10;
  if (variant === 0) return `${action} ${synonym} ${qty} в ${input.region}, ${keyHint}`;
  if (variant === 1) return `${synonym} ${qty}, ${context}, ${input.region}, ${keyHint}`;
  if (variant === 2) return `${action} ${input.entry.visible_name_ru} объем ${qty} ${context}, ${keyHint}`;
  if (variant === 3) return `${synonym}, ${context}, нужно ${qty}, ${keyHint}`;
  if (variant === 4) return `${input.entry.visible_name_ru} ${qty} ${context} в ${input.region}, ${keyHint}`;
  if (variant === 5) return `${action} ${synonym} ${context}, количество ${qty}, ${keyHint}`;
  if (variant === 6) return `${synonym} ${qty} ${input.region} срочно не надо угадывать, ${keyHint}`;
  if (variant === 7) return `${action} ${input.entry.visible_name_ru.toLocaleLowerCase("ru-RU")} ${qty}, ${keyHint}`;
  if (variant === 8) return `${context}: ${synonym}, ${qty}, город ${input.region}, ${keyHint}`;
  return `${synonym} - ${qty}; ${action} нормальную смету, ${keyHint}`;
}

function entriesByCategory(category: WorkOntologyCategory): ConstructionWorkOntologyEntry[] {
  const entries = CONSTRUCTION_WORK_ONTOLOGY
    .filter((entry) => entry.category === category)
    .sort((left, right) => left.canonical_work_key.localeCompare(right.canonical_work_key));
  if (entries.length === 0) throw new Error(`WORK_ONTOLOGY_CATEGORY_EMPTY:${category}`);
  return entries;
}

function buildCase(input: {
  sequence: number;
  category: WorkOntologyCategory;
  entry: ConstructionWorkOntologyEntry;
  categoryIndex: number;
}): RealWorkOntologyCase {
  const location = WORK_ONTOLOGY_COUNTRY_REGIONS[input.sequence % WORK_ONTOLOGY_COUNTRY_REGIONS.length];
  const unit = input.entry.default_unit;
  const quantity = quantityFor(input.sequence + input.categoryIndex, unit);
  return {
    id: `real_work_${pad(input.sequence + 1, 5)}`,
    user_input_ru: promptFor({
      entry: input.entry,
      index: input.sequence + input.categoryIndex,
      quantity,
      unit,
      region: location.region,
    }),
    expected_canonical_work_key: input.entry.canonical_work_key,
    expected_visible_work_name_ru: input.entry.visible_name_ru,
    category: input.category,
    quantity,
    unit,
    country: location.country,
    region: location.region,
    expected_currency: location.currency,
    ambiguity_group: input.entry.ambiguity_group ?? undefined,
    must_not_match: relatedNegativeWorkKeys(input.entry.canonical_work_key),
    expected_recipe_scope: input.entry.recipe_scope,
    expected_pricebook_scope: pricebookScopeFor({
      country: location.country,
      region: location.region,
      category: input.entry.category,
    }),
    must_have_recipe: true,
    must_have_material_recipe: true,
  };
}

export function buildRealWorkOntology10000Cases(): readonly RealWorkOntologyCase[] {
  let sequence = 0;
  const cases: RealWorkOntologyCase[] = [];
  for (const [category, count] of Object.entries(WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS) as [WorkOntologyCategory, number][]) {
    const entries = entriesByCategory(category);
    for (let categoryIndex = 0; categoryIndex < count; categoryIndex += 1) {
      const entry = entries[categoryIndex % entries.length];
      cases.push(buildCase({ sequence, category, entry, categoryIndex }));
      sequence += 1;
    }
  }
  if (cases.length !== TARGET_TOTAL) {
    throw new Error(`REAL_WORK_ONTOLOGY_10000_CASE_COUNT_INVALID:${cases.length}`);
  }
  return Object.freeze(cases);
}

const CONFUSION_PAIRS: readonly [string, string, WorkOntologyCategory][] = [
  ["roof_waterproofing", "metal_roofing", "waterproofing"],
  ["bathroom_waterproofing", "bathroom_tile_full", "waterproofing"],
  ["floor_screed", "concrete_slab", "concrete_foundation"],
  ["brick_masonry", "block_masonry", "masonry"],
  ["wall_plastering", "wall_putty", "plaster_paint"],
  ["wall_painting", "wallpaper_installation", "plaster_paint"],
  ["electrical_wiring", "low_voltage_network", "electrical"],
  ["water_pipe_installation", "sewer_pipe_installation", "plumbing"],
  ["heating_radiator_installation", "water_pipe_installation", "heating_hvac"],
  ["roof_insulation", "facade_insulation", "insulation"],
];

function confusionPrompt(entry: ConstructionWorkOntologyEntry, index: number, quantity: number, unit: WorkOntologyUnit): string {
  const synonym = synonymFor(entry, index);
  if (index % 4 === 0) return `не перепутать: ${synonym} ${quantity} ${unitLabel(unit)}`;
  if (index % 4 === 1) return `смета именно на ${entry.visible_name_ru} ${quantity} ${unitLabel(unit)}`;
  if (index % 4 === 2) return `${synonym} ${quantity} ${unitLabel(unit)}, похожую работу не выбирать`;
  return `пользователь просит ${entry.visible_name_ru.toLocaleLowerCase("ru-RU")} объем ${quantity} ${unitLabel(unit)}`;
}

export function buildWorkOntology500ConfusionPairs(): readonly WorkOntologyConfusionPairCase[] {
  const cases: WorkOntologyConfusionPairCase[] = [];
  for (const [pairIndex, pair] of CONFUSION_PAIRS.entries()) {
    const [leftKey, rightKey, category] = pair;
    const left = getConstructionWorkOntologyEntry(leftKey);
    const right = getConstructionWorkOntologyEntry(rightKey);
    if (!left || !right) throw new Error(`WORK_ONTOLOGY_CONFUSION_ENTRY_MISSING:${leftKey}:${rightKey}`);
    for (let index = 0; index < 50; index += 1) {
      const useLeft = index % 2 === 0;
      const expected = useLeft ? left : right;
      const control = useLeft ? right : left;
      const unit = expected.default_unit;
      const quantity = quantityFor(pairIndex * 50 + index, unit);
      cases.push({
        id: `confusion_${pad(pairIndex + 1, 2)}_${pad(index + 1, 3)}`,
        left_work_key: leftKey,
        right_work_key: rightKey,
        user_input_ru: confusionPrompt(expected, pairIndex * 50 + index, quantity, unit),
        expected_canonical_work_key: expected.canonical_work_key,
        must_not_match: control.canonical_work_key,
        category,
        quantity,
        unit,
      });
    }
  }
  if (cases.length !== CONFUSION_PAIR_TOTAL) {
    throw new Error(`WORK_ONTOLOGY_CONFUSION_PAIR_COUNT_INVALID:${cases.length}`);
  }
  return Object.freeze(cases);
}

export function buildWorkOntology1000RecipeBindingCases(): readonly WorkOntologyRecipeBindingCase[] {
  const cases = CONSTRUCTION_WORK_ONTOLOGY
    .filter((entry) => entry.support_status === "SUPPORTED" && entry.recipe_scope && entry.material_recipe_scope && entry.pricebook_scope)
    .slice(0, RECIPE_BINDING_TOTAL)
    .map((entry, index): WorkOntologyRecipeBindingCase => ({
      id: `recipe_binding_${pad(index + 1, 4)}`,
      canonical_work_key: entry.canonical_work_key,
      visible_work_name_ru: entry.visible_name_ru,
      category: entry.category,
      expected_unit: entry.default_unit,
      recipe_scope: entry.recipe_scope ?? "",
      material_recipe_scope: entry.material_recipe_scope ?? "",
      pricebook_scope: entry.pricebook_scope ?? "",
    }));
  if (cases.length !== RECIPE_BINDING_TOTAL) {
    throw new Error(`WORK_ONTOLOGY_RECIPE_BINDING_COUNT_INVALID:${cases.length}`);
  }
  return Object.freeze(cases);
}

export const REAL_WORK_ONTOLOGY_10000_CASES: readonly RealWorkOntologyCase[] =
  buildRealWorkOntology10000Cases();

export const WORK_ONTOLOGY_500_CONFUSION_PAIRS: readonly WorkOntologyConfusionPairCase[] =
  buildWorkOntology500ConfusionPairs();

export const WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES: readonly WorkOntologyRecipeBindingCase[] =
  buildWorkOntology1000RecipeBindingCases();
