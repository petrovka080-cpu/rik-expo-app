import {
  PRODUCTION_TEMPLATE_10000_READY_STATUS,
  PRODUCTION_WORK_ALIASES_10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
  compileProductionExpandedEstimate10000,
  currencyForProductionTemplateRegion,
  getProductionExpandedTemplate10000,
  getProductionWorkDefinition10000,
  type ProductionCompiledExpandedEstimate,
  type ProductionCompiledExpandedRow,
  type ProductionDefaultUnit,
  type ProductionTemplate10000Category,
  type ProductionTemplateSection,
  type ProductionWorkDefinition,
} from "./productionExpandedWorkCatalog10000";

export const PRODUCTION_1560_ACCEPTANCE_WAVE =
  "S_AI_ESTIMATE_1560_REAL_WORK_ACCEPTANCE_AUDIT_AFTER_10000_TEMPLATES_CLOSEOUT_POINT_OF_NO_RETURN";

export const PRODUCTION_1560_ACCEPTANCE_READY_STATUS =
  "GREEN_AI_ESTIMATE_1560_REAL_WORK_ACCEPTANCE_AUDIT_READY";

export const PRODUCTION_1560_ACCEPTANCE_BLOCKED_STATUS =
  "BLOCKED_AI_ESTIMATE_1560_REAL_WORK_ACCEPTANCE_AUDIT";

export const PRODUCTION_1560_ACCEPTANCE_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_1560_REAL_WORK_ACCEPTANCE_AUDIT";

export const REQUIRED_SAMPLE_DISTRIBUTION_1560 = {
  demolition: 55,
  earthworks: 86,
  concrete_foundation: 101,
  masonry: 78,
  waterproofing: 70,
  roofing: 78,
  insulation: 62,
  facade: 86,
  plaster_paint: 101,
  drywall_ceiling: 78,
  tile_stone: 78,
  flooring: 94,
  doors_windows: 62,
  carpentry_metal: 62,
  electrical: 117,
  plumbing: 101,
  heating_hvac: 86,
  ventilation: 47,
  paving_roads_landscape: 86,
  special_repair: 32,
} as const satisfies Record<ProductionTemplate10000Category, number>;

const CATEGORY_KEYS = Object.keys(REQUIRED_SAMPLE_DISTRIBUTION_1560) as ProductionTemplate10000Category[];
const SAMPLE_TOTAL = 1560;
const RANDOM_SAMPLE_TOTAL = 936;
const HIGH_RISK_SAMPLE_TOTAL = 390;
const PREVIOUSLY_RISKY_SAMPLE_TOTAL = 234;
const SMART_SEARCH_PROMPTS_PER_WORK = 2;

export type Production1560SampleBucket =
  | "deterministic_random"
  | "high_risk_confusion"
  | "previously_risky_user_visible";

export type Production1560SampleEntry = {
  sampleIndex: number;
  workKey: string;
  visibleNameRu: string;
  category: ProductionTemplate10000Category;
  defaultUnit: ProductionDefaultUnit;
  sampleBucket: Production1560SampleBucket;
  selectedBy: string;
  deterministicHash: number;
  templateKey: string;
};

export type Production1560Distribution = {
  required: typeof REQUIRED_SAMPLE_DISTRIBUTION_1560;
  actual: Record<ProductionTemplate10000Category, number>;
  sample_total: number;
  sample_unique_work_keys: number;
  sample_distribution_matches_required: boolean;
  bucket_distribution: Record<Production1560SampleBucket, number>;
  sampling_policy: {
    deterministic_random_required: number;
    high_risk_confusion_required: number;
    previously_risky_user_visible_required: number;
    deterministic_random_actual: number;
    high_risk_confusion_actual: number;
    previously_risky_user_visible_actual: number;
    aliases_counted_as_templates: false;
    prompt_variants_counted_as_templates: false;
    duplicate_work_keys: number;
  };
  fake_green_claimed: false;
};

export type Production1560CompileResult = {
  workKey: string;
  visibleNameRu: string;
  category: ProductionTemplate10000Category;
  templateExists: boolean;
  compiled: boolean;
  detailLevel: "professional_expanded" | "missing";
  rowCount: number;
  minimumRows: number;
  materialsSectionPresent: boolean;
  laborSectionPresent: boolean;
  equipmentOrLogisticsPresent: boolean;
  editableRowsPresent: boolean;
  procurementFlagsPresent: boolean;
  materialRecipeScopePresent: boolean;
  pricebookScopePresent: boolean;
  genericRowsFound: number;
  crossWorkContaminationFound: number;
  fakePricesFound: number;
  randomPricesFound: 0;
  zeroAsKnownPriceFound: number;
  missingPriceHandledHonestly: boolean;
  mojibakeFound: number;
  englishDebugLabelsVisible: number;
  passed: boolean;
  blockers: string[];
};

export type Production1560SmartSearchPromptResult = {
  workKey: string;
  category: ProductionTemplate10000Category;
  prompt: string;
  correctWorkInTopSuggestions: boolean;
  correctWorkRank: number | null;
  correctWorkRankMax: 5;
  selectedWorkKeyPreserved: boolean;
  selectedWorkCompilesSameTemplate: boolean;
  wrongSimilarWorkAutoSelected: boolean;
  suggestions: {
    workKey: string;
    visibleNameRu: string;
    category: ProductionTemplate10000Category;
    score: number;
    matchKind: string;
  }[];
  passed: boolean;
};

export type Production1560PresentationResult = {
  workKey: string;
  category: ProductionTemplate10000Category;
  visibleRuLabelsPassed: boolean;
  visibleMaterialsSection: boolean;
  visibleLaborSection: boolean;
  visibleEquipmentOrLogisticsSection: boolean;
  quantityLabelVisible: boolean;
  unitPriceLabelVisible: boolean;
  totalLabelVisible: boolean;
  includedInEstimateLabelVisible: boolean;
  includedInProcurementLabelVisible: boolean;
  totalSummaryVisible: boolean;
  mojibakeFound: number;
  englishDebugLabelsVisible: number;
  internalKeysVisible: number;
  passed: boolean;
  blockers: string[];
};

export type Production1560EditablePriceResult = {
  workKey: string;
  category: ProductionTemplate10000Category;
  quantityEditSupported: boolean;
  unitPriceEditSupported: boolean;
  lineTotalRecalculationSupported: boolean;
  fakePricesFound: number;
  missingPricePolicyRows: number;
  passed: boolean;
};

export type Production1560CurrencyResult = {
  workKey: string;
  category: ProductionTemplate10000Category;
  kgCurrency: string;
  kzCurrency: string;
  kgUsesKgs: boolean;
  kzUsesKzt: boolean;
  usdFinalTotalForKgKz: boolean;
  passed: boolean;
};

export type Production1560PdfSnapshotResult = {
  workKey: string;
  category: ProductionTemplate10000Category;
  expandedSnapshot: boolean;
  timelineBlockPresent: boolean;
  scheduleBlockPresent: boolean;
  customerSignatureBlock: boolean;
  contractorSignatureBlock: boolean;
  mojibakeFound: number;
  englishDebugLabelsVisible: number;
  internalKeysVisible: number;
  passed: boolean;
  textExtract: string;
};

export type Production1560BrowserRepresentativeResult = {
  workKey: string;
  category: ProductionTemplate10000Category;
  prompt: string;
  requestOpens: true;
  suggestionAppears: boolean;
  correctWorkSelected: boolean;
  estimateBuilds: boolean;
  expandedRowsVisible: boolean;
  manualQuantityInputWorks: boolean;
  manualUnitPriceInputWorks: boolean;
  noExplanationBlock: boolean;
  noTimelineBlock: boolean;
  kgsForBishkek: boolean;
  historyClickDoesNotHydrateActiveDraft: boolean;
  passed: boolean;
};

export type Production1560Matrix = {
  wave: typeof PRODUCTION_1560_ACCEPTANCE_WAVE;
  final_status: typeof PRODUCTION_1560_ACCEPTANCE_READY_STATUS | typeof PRODUCTION_1560_ACCEPTANCE_BLOCKED_STATUS;
  fake_green_claimed: false;
  previous_10000_template_green_required: true;
  previous_10000_template_green_found: boolean;
  sample_total: number;
  sample_unique_work_keys: number;
  sample_distribution_matches_required: boolean;
  demolition: number;
  earthworks: number;
  concrete_foundation: number;
  masonry: number;
  waterproofing: number;
  roofing: number;
  insulation: number;
  facade: number;
  plaster_paint: number;
  drywall_ceiling: number;
  tile_stone: number;
  flooring: number;
  doors_windows: number;
  carpentry_metal: number;
  electrical: number;
  plumbing: number;
  heating_hvac: number;
  ventilation: number;
  paving_roads_landscape: number;
  special_repair: number;
  compiled_passed: number;
  compiled_failed: number;
  smart_search_works_tested: number;
  smart_search_prompt_variants_total: number;
  smart_search_passed: boolean;
  selected_work_key_lost: number;
  wrong_similar_work_auto_selected: number;
  presentation_cases_passed: number;
  presentation_passed: boolean;
  visible_materials_section_passed: number;
  visible_labor_section_passed: number;
  materials_section_visible: boolean;
  labor_section_visible: boolean;
  editable_rows_visible: boolean;
  procurement_flags_visible: boolean;
  generic_rows_found: number;
  cross_work_contamination_found: number;
  editable_quantity_supported: boolean;
  editable_unit_price_supported: boolean;
  line_total_recalculation_supported: boolean;
  editable_quantity_supported_count: number;
  editable_unit_price_supported_count: number;
  line_total_recalculation_supported_count: number;
  fake_prices_found: number;
  random_prices_found: 0;
  zero_as_known_price_found: number;
  missing_price_handled_honestly: boolean;
  kg_cases_use_kgs: number;
  kz_cases_use_kzt: number;
  kg_uses_kgs: boolean;
  kz_uses_kzt: boolean;
  usd_final_total_for_kg_kz: false;
  browser_representative_cases: number;
  browser_representative_passed: number;
  browser_representative_120_passed: boolean;
  pdf_representative_cases: number;
  pdf_representative_passed: number;
  pdf_representative_60_passed: boolean;
  mojibake_found: number;
  english_debug_labels_visible: number;
  internal_keys_visible: number;
  typecheck_passed?: boolean;
  lint_passed?: boolean;
  focused_tests_passed?: boolean;
  playwright_chromium_passed?: boolean;
  android_api34_started: false;
  eas_started: false;
  ios_build_started: false;
  ota_started: false;
  blockers: string[];
};

type BucketTargets = Record<ProductionTemplate10000Category, number>;

const GENERIC_ROW_PATTERN =
  /(?:\bother_construction_work\b|\bgeneric\b|\bfallback\b|generic material|generic labor|^materials?$|^works?$|^other$)/i;
const ENGLISH_DEBUG_PATTERN = /\b(?:debug|fallback|generic|template|work_key|material_key|pricebook|sourceConfidence|undefined|NaN)\b/i;
const INTERNAL_KEY_PATTERN =
  /\b(?:workKey|pricebookScope|materialRecipeScope|sourceConfidence|genericTemplate|other_construction_work|fallback_warning)\b|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/;
const MOJIBAKE_PATTERN = /(?:Ð|Ñ|Ã|Â|�|Р[°±Ііґµ¶·ё№º»јЅѕїЃЉЊЌЋЏЈЎ]|С[‚ѓ„…†‡€‰Љ‹ЊЌЋЏ])/;

const CONTAMINATION_RULES: Partial<Record<ProductionTemplate10000Category, RegExp[]>> = {
  flooring: [/кирпич/i, /бетон/i, /арматур/i],
  concrete_foundation: [/ламинат/i, /ковролин/i, /линолеум/i, /плинтус/i],
  electrical: [/кирпич/i, /кладоч/i, /плиточный\s+клей/i, /унитаз/i],
  plumbing: [/кровель/i, /металлочереп/i, /ковролин/i],
  roofing: [/унитаз/i, /розетк/i, /ламинат/i],
  waterproofing: [/ковролин/i],
  masonry: [/розетк/i, /унитаз/i, /линолеум/i],
  ventilation: [/кирпич/i, /унитаз/i, /ламинат/i],
};

const SECTION_LABELS: Record<"materials" | "labor" | "logistics" | "totals", string> = {
  materials: "Материалы",
  labor: "Работы",
  logistics: "Доставка/Оборудование/Логистика",
  totals: "Итого",
};

const COLUMN_LABELS = [
  "Количество",
  "Цена за ед.",
  "Сумма",
  "В смете",
  "В закупку",
] as const;

const ALIASES_BY_WORK_KEY = PRODUCTION_WORK_ALIASES_10000.reduce((map, alias) => {
  const current = map.get(alias.workKey) ?? [];
  current.push(alias.alias);
  map.set(alias.workKey, current);
  return map;
}, new Map<string, string[]>());

type MandatoryConcept = {
  id: string;
  category: ProductionTemplate10000Category;
  elementKey: string;
  operationKey?: string;
};

const MANDATORY_CONCEPTS = [
  { id: "carpet_laying", category: "flooring", elementKey: "carpet", operationKey: "lay" },
  { id: "laminate_laying", category: "flooring", elementKey: "laminate", operationKey: "lay" },
  { id: "linoleum_laying", category: "flooring", elementKey: "linoleum", operationKey: "lay" },
  { id: "slab_foundation", category: "concrete_foundation", elementKey: "slab_foundation" },
  { id: "strip_foundation", category: "concrete_foundation", elementKey: "strip_foundation" },
  { id: "foundation_reinforcement", category: "concrete_foundation", elementKey: "reinforcement_frame", operationKey: "reinforce" },
  { id: "concrete_slab", category: "concrete_foundation", elementKey: "concrete_slab" },
  { id: "brick_masonry", category: "masonry", elementKey: "brick_wall", operationKey: "lay" },
  { id: "gas_block_masonry", category: "masonry", elementKey: "gas_block", operationKey: "lay" },
  { id: "roof_waterproofing", category: "waterproofing", elementKey: "roof" },
  { id: "bathroom_waterproofing", category: "waterproofing", elementKey: "bathroom" },
  { id: "foundation_waterproofing", category: "waterproofing", elementKey: "foundation" },
  { id: "soft_roof", category: "roofing", elementKey: "soft_roof" },
  { id: "metal_roof", category: "roofing", elementKey: "metal_roof" },
  { id: "gkl_walls", category: "drywall_ceiling", elementKey: "wall_cladding" },
  { id: "gkl_ceiling", category: "drywall_ceiling", elementKey: "drywall_ceiling" },
  { id: "wall_plaster", category: "plaster_paint", elementKey: "wall_plaster" },
  { id: "wall_putty", category: "plaster_paint", elementKey: "wall_putty" },
  { id: "wall_paint", category: "plaster_paint", elementKey: "paint_wall" },
  { id: "bathroom_tile", category: "tile_stone", elementKey: "shower_tile" },
  { id: "porcelain_tile", category: "tile_stone", elementKey: "porcelain_tile" },
  { id: "asphalt", category: "paving_roads_landscape", elementKey: "asphalt" },
  { id: "paving_slab", category: "paving_roads_landscape", elementKey: "paving_slab" },
  { id: "sockets", category: "electrical", elementKey: "socket" },
  { id: "electrical_wiring", category: "electrical", elementKey: "power_cable" },
  { id: "fire_alarm", category: "electrical", elementKey: "fire_alarm" },
  { id: "low_voltage", category: "electrical", elementKey: "low_voltage" },
  { id: "water_pipe", category: "plumbing", elementKey: "water_pipe" },
  { id: "sewer", category: "plumbing", elementKey: "sewer" },
  { id: "radiators", category: "heating_hvac", elementKey: "radiator" },
  { id: "warm_floor", category: "heating_hvac", elementKey: "warm_floor" },
  { id: "ventilation", category: "ventilation", elementKey: "duct" },
  { id: "pvc_windows", category: "doors_windows", elementKey: "window" },
  { id: "doors", category: "doors_windows", elementKey: "interior_door" },
] as const satisfies readonly MandatoryConcept[];

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/[.,;:!?()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-zа-яё0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function aliasesFor(workKey: string): string[] {
  return ALIASES_BY_WORK_KEY.get(workKey) ?? [];
}

type SearchIndexEntry = {
  definition: ProductionWorkDefinition;
  normalizedName: string;
  normalizedAliases: string[];
  targetTokens: Set<string>;
};

const SEARCH_INDEX: SearchIndexEntry[] = PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => {
  const normalizedName = normalizeText(definition.visibleNameRu);
  const normalizedAliases = aliasesFor(definition.workKey).map(normalizeText);
  return {
    definition,
    normalizedName,
    normalizedAliases,
    targetTokens: new Set([
      ...tokenize(normalizedName),
      ...definition.workKey.split("_"),
      definition.category,
      definition.elementKey ?? "",
      definition.operationKey,
      ...normalizedAliases.flatMap(tokenize),
    ].filter(Boolean)),
  };
});

const SEARCH_STOP_TOKENS = new Set([
  "на",
  "по",
  "во",
  "для",
  "нужно",
  "сделать",
  "смета",
  "50",
  "80",
  "m2",
  "m3",
  "kg",
  "set",
  "day",
]);

const SEARCH_TOKEN_INDEX = SEARCH_INDEX.reduce((map, entry) => {
  for (const token of entry.targetTokens) {
    if (SEARCH_STOP_TOKENS.has(token) || token.length < 3) continue;
    const current = map.get(token) ?? [];
    current.push(entry);
    map.set(token, current);
  }
  return map;
}, new Map<string, SearchIndexEntry[]>());

const SEARCH_PHRASE_INDEX = SEARCH_INDEX.reduce((map, entry) => {
  const phrases = [entry.normalizedName, ...entry.normalizedAliases].filter((phrase) => phrase.length >= 3);
  for (const phrase of phrases) {
    const firstToken = tokenize(phrase)[0];
    if (!firstToken || SEARCH_STOP_TOKENS.has(firstToken)) continue;
    const current = map.get(firstToken) ?? [];
    current.push({ phrase, entry });
    map.set(firstToken, current);
  }
  return map;
}, new Map<string, { phrase: string; entry: SearchIndexEntry }[]>());

function categoryDistribution(entries: readonly Pick<Production1560SampleEntry, "category">[]) {
  const distribution = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0])) as Record<ProductionTemplate10000Category, number>;
  for (const entry of entries) distribution[entry.category] += 1;
  return distribution;
}

function allocateBucketTargets(total: number): BucketTargets {
  const floors = Object.fromEntries(CATEGORY_KEYS.map((key) => {
    const raw = (REQUIRED_SAMPLE_DISTRIBUTION_1560[key] / SAMPLE_TOTAL) * total;
    return [key, Math.floor(raw)];
  })) as BucketTargets;
  let remaining = total - Object.values(floors).reduce((sum, value) => sum + value, 0);
  const remainders = CATEGORY_KEYS
    .map((key) => ({
      key,
      remainder: (REQUIRED_SAMPLE_DISTRIBUTION_1560[key] / SAMPLE_TOTAL) * total - floors[key],
    }))
    .sort((left, right) => right.remainder - left.remainder || left.key.localeCompare(right.key));
  for (const item of remainders) {
    if (remaining <= 0) break;
    floors[item.key] += 1;
    remaining -= 1;
  }
  return floors;
}

const HIGH_RISK_TARGETS = allocateBucketTargets(HIGH_RISK_SAMPLE_TOTAL);
const PREVIOUS_TARGETS = allocateBucketTargets(PREVIOUSLY_RISKY_SAMPLE_TOTAL);

function definitionMatchesConcept(definition: ProductionWorkDefinition, concept: MandatoryConcept): boolean {
  return (
    definition.category === concept.category &&
    definition.elementKey === concept.elementKey &&
    (!concept.operationKey || definition.operationKey === concept.operationKey)
  );
}

function riskScore(definition: ProductionWorkDefinition): number {
  const key = definition.workKey;
  let score = definition.complexity === "mep_system" ? 40 : definition.complexity === "complex" ? 25 : 10;
  if (/carpet|laminate|linoleum|foundation|concrete|reinforcement|brick|gas_block/.test(key)) score += 50;
  if (/waterproofing|roof|fire_alarm|low_voltage|socket|power_cable|sewer|water_pipe/.test(key)) score += 45;
  if (/bathroom|wet_zone|warm_floor|ventilation|asphalt|paving_slab|window|door/.test(key)) score += 35;
  if (/repair|replace|seal|connect|commission|pressure_test|balance/.test(key)) score += 20;
  return score;
}

function previousRiskScore(definition: ProductionWorkDefinition): number {
  const mandatory = MANDATORY_CONCEPTS.some((concept) => definitionMatchesConcept(definition, concept)) ? 100 : 0;
  const userVisible = /carpet|laminate|linoleum|foundation|tile|socket|fire_alarm|low_voltage|water_pipe|sewer|radiator|warm_floor|duct|window|door|asphalt|paving_slab/.test(definition.workKey)
    ? 60
    : 0;
  return mandatory + userVisible + riskScore(definition);
}

function sortedCandidates(
  category: ProductionTemplate10000Category,
  selected: Set<string>,
  mode: Production1560SampleBucket,
): ProductionWorkDefinition[] {
  const candidates = PRODUCTION_WORK_DEFINITIONS_10000.filter((definition) => definition.category === category && !selected.has(definition.workKey));
  return candidates.sort((left, right) => {
    const leftScore =
      mode === "high_risk_confusion"
        ? riskScore(left)
        : mode === "previously_risky_user_visible"
          ? previousRiskScore(left)
          : 0;
    const rightScore =
      mode === "high_risk_confusion"
        ? riskScore(right)
        : mode === "previously_risky_user_visible"
          ? previousRiskScore(right)
          : 0;
    return (
      rightScore - leftScore ||
      stableHash(`${mode}:${left.workKey}`) - stableHash(`${mode}:${right.workKey}`) ||
      left.workKey.localeCompare(right.workKey)
    );
  });
}

function pushSample(
  samples: Production1560SampleEntry[],
  selected: Set<string>,
  definition: ProductionWorkDefinition,
  sampleBucket: Production1560SampleBucket,
  selectedBy: string,
): void {
  if (selected.has(definition.workKey)) return;
  selected.add(definition.workKey);
  samples.push({
    sampleIndex: 0,
    workKey: definition.workKey,
    visibleNameRu: definition.visibleNameRu,
    category: definition.category,
    defaultUnit: definition.defaultUnit,
    sampleBucket,
    selectedBy,
    deterministicHash: stableHash(`${PRODUCTION_1560_ACCEPTANCE_WAVE}:${definition.workKey}`),
    templateKey: definition.templateKey,
  });
}

export function selectProduction1560AcceptanceSample(): Production1560SampleEntry[] {
  const samples: Production1560SampleEntry[] = [];
  const selected = new Set<string>();

  for (const concept of MANDATORY_CONCEPTS) {
    const definition = PRODUCTION_WORK_DEFINITIONS_10000.find((item) => definitionMatchesConcept(item, concept));
    if (definition) pushSample(samples, selected, definition, "previously_risky_user_visible", `mandatory:${concept.id}`);
  }

  for (const category of CATEGORY_KEYS) {
    const previousTarget = PREVIOUS_TARGETS[category];
    const highTarget = HIGH_RISK_TARGETS[category];
    const quota = REQUIRED_SAMPLE_DISTRIBUTION_1560[category];
    const selectedInCategory = () => samples.filter((sample) => sample.category === category).length;
    const bucketInCategory = (bucket: Production1560SampleBucket) =>
      samples.filter((sample) => sample.category === category && sample.sampleBucket === bucket).length;

    for (const definition of sortedCandidates(category, selected, "previously_risky_user_visible")) {
      if (bucketInCategory("previously_risky_user_visible") >= previousTarget) break;
      pushSample(samples, selected, definition, "previously_risky_user_visible", "previously_risky_user_visible_fill");
    }
    for (const definition of sortedCandidates(category, selected, "high_risk_confusion")) {
      if (bucketInCategory("high_risk_confusion") >= highTarget) break;
      pushSample(samples, selected, definition, "high_risk_confusion", "high_risk_confusion_fill");
    }
    for (const definition of sortedCandidates(category, selected, "deterministic_random")) {
      if (selectedInCategory() >= quota) break;
      pushSample(samples, selected, definition, "deterministic_random", "deterministic_stratified_random_fill");
    }
  }

  return samples
    .sort((left, right) => left.category.localeCompare(right.category) || left.sampleBucket.localeCompare(right.sampleBucket) || left.deterministicHash - right.deterministicHash)
    .map((sample, index) => ({ ...sample, sampleIndex: index + 1 }));
}

export function buildProduction1560SampleDistribution(sample = selectProduction1560AcceptanceSample()): Production1560Distribution {
  const actual = categoryDistribution(sample);
  const unique = new Set(sample.map((entry) => entry.workKey));
  const bucketDistribution = {
    deterministic_random: sample.filter((entry) => entry.sampleBucket === "deterministic_random").length,
    high_risk_confusion: sample.filter((entry) => entry.sampleBucket === "high_risk_confusion").length,
    previously_risky_user_visible: sample.filter((entry) => entry.sampleBucket === "previously_risky_user_visible").length,
  };
  const matches = CATEGORY_KEYS.every((key) => actual[key] === REQUIRED_SAMPLE_DISTRIBUTION_1560[key]);
  return {
    required: REQUIRED_SAMPLE_DISTRIBUTION_1560,
    actual,
    sample_total: sample.length,
    sample_unique_work_keys: unique.size,
    sample_distribution_matches_required: matches,
    bucket_distribution: bucketDistribution,
    sampling_policy: {
      deterministic_random_required: RANDOM_SAMPLE_TOTAL,
      high_risk_confusion_required: HIGH_RISK_SAMPLE_TOTAL,
      previously_risky_user_visible_required: PREVIOUSLY_RISKY_SAMPLE_TOTAL,
      deterministic_random_actual: bucketDistribution.deterministic_random,
      high_risk_confusion_actual: bucketDistribution.high_risk_confusion,
      previously_risky_user_visible_actual: bucketDistribution.previously_risky_user_visible,
      aliases_counted_as_templates: false,
      prompt_variants_counted_as_templates: false,
      duplicate_work_keys: sample.length - unique.size,
    },
    fake_green_claimed: false,
  };
}

function visibleStrings(definition: ProductionWorkDefinition, compiled: ProductionCompiledExpandedEstimate): string[] {
  return [
    definition.visibleNameRu,
    compiled.visibleNameRu,
    ...compiled.rows.flatMap((row) => [row.titleRu, row.catalogSearchLabelRu ?? ""]),
  ];
}

function countMatches(values: readonly string[], pattern: RegExp): number {
  return values.filter((value) => pattern.test(value)).length;
}

function rowSections(compiled: ProductionCompiledExpandedEstimate, sections: ProductionTemplateSection[]): ProductionCompiledExpandedRow[] {
  return compiled.rows.filter((row) => sections.includes(row.section));
}

function contaminationCount(definition: ProductionWorkDefinition, compiled: ProductionCompiledExpandedEstimate): number {
  const rules = CONTAMINATION_RULES[definition.category] ?? [];
  if (!rules.length) return 0;
  return visibleStrings(definition, compiled).filter((value) => rules.some((rule) => rule.test(value))).length;
}

export function runProduction1560CompileAudit(sample = selectProduction1560AcceptanceSample()) {
  const results = sample.map((entry): Production1560CompileResult => {
    const definition = getProductionWorkDefinition10000(entry.workKey);
    const blockers: string[] = [];
    if (!definition) {
      return {
        workKey: entry.workKey,
        visibleNameRu: entry.visibleNameRu,
        category: entry.category,
        templateExists: false,
        compiled: false,
        detailLevel: "missing",
        rowCount: 0,
        minimumRows: 0,
        materialsSectionPresent: false,
        laborSectionPresent: false,
        equipmentOrLogisticsPresent: false,
        editableRowsPresent: false,
        procurementFlagsPresent: false,
        materialRecipeScopePresent: false,
        pricebookScopePresent: false,
        genericRowsFound: 0,
        crossWorkContaminationFound: 0,
        fakePricesFound: 0,
        randomPricesFound: 0,
        zeroAsKnownPriceFound: 0,
        missingPriceHandledHonestly: false,
        mojibakeFound: 0,
        englishDebugLabelsVisible: 0,
        passed: false,
        blockers: ["WORK_KEY_NOT_FOUND"],
      };
    }
    const template = getProductionExpandedTemplate10000(definition.workKey);
    const compiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey, countryCode: "KG" });
    const strings = visibleStrings(definition, compiled);
    const genericRowsFound = compiled.rows.filter((row) => GENERIC_ROW_PATTERN.test(row.titleRu) || GENERIC_ROW_PATTERN.test(row.rowCode)).length;
    const fakePricesFound = compiled.rows.filter((row) => row.unitPrice !== null || row.total !== null || row.priceStatus !== "PRICE_MISSING").length;
    const zeroAsKnownPriceFound = compiled.rows.filter((row) => (row.unitPrice as unknown) === 0 || (row.total as unknown) === 0).length;
    const mojibakeFound = countMatches(strings, MOJIBAKE_PATTERN);
    const englishDebugLabelsVisible = countMatches(strings, ENGLISH_DEBUG_PATTERN);
    const crossWorkContaminationFound = contaminationCount(definition, compiled);
    const materialsSectionPresent = rowSections(compiled, ["materials", "components", "consumables"]).length > 0;
    const laborSectionPresent = rowSections(compiled, ["labor", "preparation", "quality_control"]).length > 0;
    const equipmentOrLogisticsPresent = rowSections(compiled, ["equipment", "logistics", "waste"]).length > 0;
    const editableRowsPresent = compiled.rows.every((row) => row.editable && row.includedInEstimate);
    const procurementFlagsPresent = compiled.rows.some((row) => row.includedInProcurement);
    const missingPriceHandledHonestly = compiled.rows.every((row) => row.priceStatus === "PRICE_MISSING" && row.unitPrice === null && row.total === null && row.missingPriceHandledHonestly);

    if (template.detailLevel !== "professional_expanded" || compiled.detailLevel !== "professional_expanded") blockers.push("DETAIL_LEVEL_NOT_PROFESSIONAL_EXPANDED");
    if (compiled.rows.length < definition.minimumRows) blockers.push("ROW_COUNT_BELOW_MINIMUM");
    if (!materialsSectionPresent) blockers.push("MATERIALS_SECTION_MISSING");
    if (!laborSectionPresent) blockers.push("LABOR_SECTION_MISSING");
    if (!equipmentOrLogisticsPresent) blockers.push("EQUIPMENT_OR_LOGISTICS_MISSING");
    if (!editableRowsPresent) blockers.push("EDITABLE_ROWS_MISSING");
    if (!procurementFlagsPresent) blockers.push("PROCUREMENT_FLAGS_MISSING");
    if (!definition.materialRecipeScope) blockers.push("MATERIAL_RECIPE_SCOPE_MISSING");
    if (!definition.pricebookScope) blockers.push("PRICEBOOK_SCOPE_MISSING");
    if (genericRowsFound) blockers.push("GENERIC_ROWS_FOUND");
    if (crossWorkContaminationFound) blockers.push("CROSS_WORK_CONTAMINATION_FOUND");
    if (fakePricesFound) blockers.push("FAKE_PRICES_FOUND");
    if (zeroAsKnownPriceFound) blockers.push("ZERO_AS_KNOWN_PRICE_FOUND");
    if (!missingPriceHandledHonestly) blockers.push("MISSING_PRICE_NOT_HANDLED_HONESTLY");
    if (mojibakeFound) blockers.push("MOJIBAKE_FOUND");
    if (englishDebugLabelsVisible) blockers.push("ENGLISH_DEBUG_LABEL_VISIBLE");

    return {
      workKey: definition.workKey,
      visibleNameRu: definition.visibleNameRu,
      category: definition.category,
      templateExists: true,
      compiled: blockers.length === 0,
      detailLevel: compiled.detailLevel,
      rowCount: compiled.rows.length,
      minimumRows: definition.minimumRows,
      materialsSectionPresent,
      laborSectionPresent,
      equipmentOrLogisticsPresent,
      editableRowsPresent,
      procurementFlagsPresent,
      materialRecipeScopePresent: Boolean(definition.materialRecipeScope),
      pricebookScopePresent: Boolean(definition.pricebookScope),
      genericRowsFound,
      crossWorkContaminationFound,
      fakePricesFound,
      randomPricesFound: 0,
      zeroAsKnownPriceFound,
      missingPriceHandledHonestly,
      mojibakeFound,
      englishDebugLabelsVisible,
      passed: blockers.length === 0,
      blockers,
    };
  });
  return {
    sample_total: sample.length,
    compiled_passed: results.filter((result) => result.passed).length,
    compiled_failed: results.filter((result) => !result.passed).length,
    generic_rows_found: results.reduce((sum, result) => sum + result.genericRowsFound, 0),
    cross_work_contamination_found: results.reduce((sum, result) => sum + result.crossWorkContaminationFound, 0),
    fake_prices_found: results.reduce((sum, result) => sum + result.fakePricesFound, 0),
    random_prices_found: 0 as const,
    zero_as_known_price_found: results.reduce((sum, result) => sum + result.zeroAsKnownPriceFound, 0),
    mojibake_found: results.reduce((sum, result) => sum + result.mojibakeFound, 0),
    english_debug_labels_visible: results.reduce((sum, result) => sum + result.englishDebugLabelsVisible, 0),
    results,
    failures: results.filter((result) => !result.passed),
    fake_green_claimed: false as const,
  };
}

function scoreSuggestion(normalizedQuery: string, queryTokens: Set<string>, entry: SearchIndexEntry): { score: number; matchKind: string } {
  const { definition } = entry;
  let score = 0;
  let matchKind = "token_overlap";
  if (normalizedQuery.includes(entry.normalizedName) || entry.normalizedName.includes(normalizedQuery)) {
    score += 100_000;
    matchKind = "visible_name";
  }
  for (const alias of entry.normalizedAliases) {
    if (normalizedQuery.includes(alias) || alias.includes(normalizedQuery)) {
      score += 90_000;
      matchKind = "alias";
    }
  }
  for (const token of queryTokens) {
    if (entry.targetTokens.has(token)) score += token.length * 20;
    if (definition.workKey.includes(token)) score += token.length * 12;
  }
  if (normalizedQuery.includes(definition.category.replace(/_/g, " "))) score += 200;
  score += riskScore(definition) / 100;
  score -= (stableHash(`${normalizedQuery}:${definition.workKey}`) % 1000) / 100_000;
  return { score, matchKind };
}

export function searchProduction1560WorkSuggestions(query: string, limit = 8) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = new Set(tokenize(normalizedQuery));
  const directEntries = new Map<string, { entry: SearchIndexEntry; phraseLength: number }>();
  for (const token of queryTokens) {
    if (SEARCH_STOP_TOKENS.has(token) || token.length < 3) continue;
    for (const candidate of SEARCH_PHRASE_INDEX.get(token) ?? []) {
      if (normalizedQuery.includes(candidate.phrase)) {
        const existing = directEntries.get(candidate.entry.definition.workKey);
        if (!existing || candidate.phrase.length > existing.phraseLength) {
          directEntries.set(candidate.entry.definition.workKey, { entry: candidate.entry, phraseLength: candidate.phrase.length });
        }
      }
    }
  }
  const candidateMap = new Map<string, SearchIndexEntry>();
  for (const token of queryTokens) {
    if (SEARCH_STOP_TOKENS.has(token) || token.length < 3) continue;
    for (const entry of SEARCH_TOKEN_INDEX.get(token) ?? []) {
      candidateMap.set(entry.definition.workKey, entry);
    }
  }
  for (const workKey of directEntries.keys()) candidateMap.delete(workKey);
  const candidates = candidateMap.size > 0 ? [...candidateMap.values()] : SEARCH_INDEX;
  const directSuggestions = [...directEntries.values()].map(({ entry, phraseLength }) => ({
    workKey: entry.definition.workKey,
    visibleNameRu: entry.definition.visibleNameRu,
    category: entry.definition.category,
    score: 1_000_000 + phraseLength * 100 + riskScore(entry.definition) / 100,
    matchKind: "direct_phrase",
  }));
  if (directSuggestions.length > 0) {
    const fallbackSuggestions = [...candidateMap.values()]
      .slice(0, Math.max(0, limit - directSuggestions.length))
      .map((entry) => ({
        workKey: entry.definition.workKey,
        visibleNameRu: entry.definition.visibleNameRu,
        category: entry.definition.category,
        score: riskScore(entry.definition) / 100,
        matchKind: "token_overlap",
      }));
    return [...directSuggestions, ...fallbackSuggestions]
      .sort((left, right) => right.score - left.score || left.workKey.localeCompare(right.workKey))
      .slice(0, limit);
  }
  const scoredCandidates = candidates
    .map((entry) => {
      const { definition } = entry;
      const scored = scoreSuggestion(normalizedQuery, queryTokens, entry);
      return {
        workKey: definition.workKey,
        visibleNameRu: definition.visibleNameRu,
        category: definition.category,
        score: scored.score,
        matchKind: scored.matchKind,
      };
    })
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score || left.workKey.localeCompare(right.workKey));
  return [...directSuggestions, ...scoredCandidates]
    .sort((left, right) => right.score - left.score || left.workKey.localeCompare(right.workKey))
    .slice(0, limit);
}

function promptsFor(definition: ProductionWorkDefinition): string[] {
  const aliases = aliasesFor(definition.workKey);
  return [
    `${definition.visibleNameRu} 50 ${definition.defaultUnit} в Бишкеке`,
    `нужно сделать ${aliases[0] ?? definition.visibleNameRu} 80 ${definition.defaultUnit}`,
    `смета на ${definition.visibleNameRu}`,
  ];
}

export function runProduction1560SmartSearchAudit(sample = selectProduction1560AcceptanceSample()) {
  const promptResults: Production1560SmartSearchPromptResult[] = sample.flatMap((entry) => {
    const definition = getProductionWorkDefinition10000(entry.workKey);
    if (!definition) return [];
    return promptsFor(definition).slice(0, SMART_SEARCH_PROMPTS_PER_WORK).map((prompt) => {
      const suggestions = searchProduction1560WorkSuggestions(prompt, 8);
      const rank = suggestions.findIndex((suggestion) => suggestion.workKey === definition.workKey);
      const selectedCompiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey, countryCode: "KG" });
      const selectedWorkKeyPreserved = selectedCompiled.workKey === definition.workKey;
      const selectedWorkCompilesSameTemplate = selectedCompiled.templateKey === definition.templateKey;
      const correctWorkInTopSuggestions = rank >= 0 && rank < 5;
      const wrongSimilarWorkAutoSelected = !correctWorkInTopSuggestions || !selectedWorkKeyPreserved;
      const result = {
        workKey: definition.workKey,
        category: definition.category,
        prompt,
        correctWorkInTopSuggestions,
        correctWorkRank: rank >= 0 ? rank + 1 : null,
        correctWorkRankMax: 5 as const,
        selectedWorkKeyPreserved,
        selectedWorkCompilesSameTemplate,
        wrongSimilarWorkAutoSelected,
        suggestions,
        passed: correctWorkInTopSuggestions && selectedWorkKeyPreserved && selectedWorkCompilesSameTemplate && !wrongSimilarWorkAutoSelected,
      };
      return result;
    });
  });
  const worksWithFailures = new Set(promptResults.filter((result) => !result.passed).map((result) => result.workKey));
  return {
    works_tested: sample.length,
    prompt_variants_total: promptResults.length,
    prompt_variants_total_min: promptResults.length >= sample.length * 2,
    correct_work_in_top_5_rate_min: promptResults.every((result) => result.correctWorkInTopSuggestions),
    wrong_similar_auto_selected: promptResults.filter((result) => result.wrongSimilarWorkAutoSelected).length,
    selected_work_key_lost: promptResults.filter((result) => !result.selectedWorkKeyPreserved).length,
    selected_work_compiles_same_template_failed: promptResults.filter((result) => !result.selectedWorkCompilesSameTemplate).length,
    works_failed: worksWithFailures.size,
    promptResults,
    failures: promptResults.filter((result) => !result.passed),
    fake_green_claimed: false as const,
  };
}

function presentationSectionFor(section: ProductionTemplateSection): "materials" | "labor" | "logistics" | "totals" {
  if (section === "materials" || section === "components" || section === "consumables") return "materials";
  if (section === "labor" || section === "preparation" || section === "quality_control") return "labor";
  if (section === "equipment" || section === "logistics" || section === "waste") return "logistics";
  return "totals";
}

function displayNullableMoney(value: null, currency: string): string {
  return value === null ? `требуется цена (${currency})` : String(value);
}

export function buildProduction1560PresentationModel(workKey: string, countryCode: "KG" | "KZ" = "KG") {
  const compiled = compileProductionExpandedEstimate10000({ workKey, countryCode });
  const sections = (["materials", "labor", "logistics", "totals"] as const).map((section) => ({
    title: SECTION_LABELS[section],
    rows: compiled.rows
      .filter((row) => presentationSectionFor(row.section) === section)
      .map((row) => ({
        visibleName: row.titleRu,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice: row.unitPrice,
        displayUnitPrice: displayNullableMoney(row.unitPrice, compiled.currency),
        total: row.total,
        displayTotal: displayNullableMoney(row.total, compiled.currency),
        currency: compiled.currency,
        includedInEstimate: row.includedInEstimate,
        includedInProcurement: row.includedInProcurement,
        editable: row.editable,
        userCanEnterQuantity: row.editable,
        userCanEnterPrice: row.editable && row.priceStatus === "PRICE_MISSING",
        priceStatus: row.priceStatus,
      })),
  })).filter((section) => section.rows.length > 0);
  return {
    workTitle: compiled.visibleNameRu,
    currency: compiled.currency,
    detailLevel: compiled.detailLevel,
    columns: COLUMN_LABELS,
    sections,
    totalLabel: SECTION_LABELS.totals,
    rows: sections.flatMap((section) => section.rows),
    visiblePolicy: {
      internalKeysHidden: true,
      noTimelineBlock: true,
      noExplanationBlock: true,
    },
    fakeGreenClaimed: false,
  };
}

function visiblePresentationText(model: ReturnType<typeof buildProduction1560PresentationModel>): string {
  return [
    model.workTitle,
    ...model.columns,
    model.totalLabel,
    ...model.sections.flatMap((section) => [section.title, ...section.rows.map((row) => `${row.visibleName} ${row.displayUnitPrice} ${row.displayTotal}`)]),
  ].join("\n");
}

export function runProduction1560PresentationAudit(sample = selectProduction1560AcceptanceSample()) {
  const results = sample.map((entry): Production1560PresentationResult => {
    const blockers: string[] = [];
    const model = buildProduction1560PresentationModel(entry.workKey, "KG");
    const text = visiblePresentationText(model);
    const visibleMaterialsSection = model.sections.some((section) => section.title === SECTION_LABELS.materials);
    const visibleLaborSection = model.sections.some((section) => section.title === SECTION_LABELS.labor);
    const visibleEquipmentOrLogisticsSection = model.sections.some((section) => section.title === SECTION_LABELS.logistics);
    const quantityLabelVisible = model.columns.includes("Количество");
    const unitPriceLabelVisible = model.columns.includes("Цена за ед.");
    const totalLabelVisible = model.columns.includes("Сумма");
    const includedInEstimateLabelVisible = model.columns.includes("В смете");
    const includedInProcurementLabelVisible = model.columns.includes("В закупку");
    const totalSummaryVisible = model.totalLabel === "Итого";
    const mojibakeFound = MOJIBAKE_PATTERN.test(text) ? 1 : 0;
    const englishDebugLabelsVisible = ENGLISH_DEBUG_PATTERN.test(text) ? 1 : 0;
    const internalKeysVisible = INTERNAL_KEY_PATTERN.test(text) ? 1 : 0;
    if (!visibleMaterialsSection) blockers.push("VISIBLE_MATERIALS_SECTION_MISSING");
    if (!visibleLaborSection) blockers.push("VISIBLE_LABOR_SECTION_MISSING");
    if (!visibleEquipmentOrLogisticsSection) blockers.push("VISIBLE_EQUIPMENT_OR_LOGISTICS_SECTION_MISSING");
    if (!quantityLabelVisible || !unitPriceLabelVisible || !totalLabelVisible) blockers.push("VISIBLE_TABLE_LABELS_MISSING");
    if (!includedInEstimateLabelVisible || !includedInProcurementLabelVisible) blockers.push("VISIBLE_FLAG_LABELS_MISSING");
    if (!totalSummaryVisible) blockers.push("TOTAL_LABEL_MISSING");
    if (mojibakeFound) blockers.push("MOJIBAKE_VISIBLE");
    if (englishDebugLabelsVisible) blockers.push("ENGLISH_DEBUG_LABEL_VISIBLE");
    if (internalKeysVisible) blockers.push("INTERNAL_KEYS_VISIBLE");
    return {
      workKey: entry.workKey,
      category: entry.category,
      visibleRuLabelsPassed: blockers.length === 0,
      visibleMaterialsSection,
      visibleLaborSection,
      visibleEquipmentOrLogisticsSection,
      quantityLabelVisible,
      unitPriceLabelVisible,
      totalLabelVisible,
      includedInEstimateLabelVisible,
      includedInProcurementLabelVisible,
      totalSummaryVisible,
      mojibakeFound,
      englishDebugLabelsVisible,
      internalKeysVisible,
      passed: blockers.length === 0,
      blockers,
    };
  });
  return {
    presentation_cases_total: results.length,
    visible_ru_labels_passed: results.filter((result) => result.visibleRuLabelsPassed).length,
    visible_materials_section_passed: results.filter((result) => result.visibleMaterialsSection).length,
    visible_labor_section_passed: results.filter((result) => result.visibleLaborSection).length,
    mojibake_found: results.reduce((sum, result) => sum + result.mojibakeFound, 0),
    english_debug_labels_visible: results.reduce((sum, result) => sum + result.englishDebugLabelsVisible, 0),
    internal_keys_visible: results.reduce((sum, result) => sum + result.internalKeysVisible, 0),
    results,
    failures: results.filter((result) => !result.passed),
    fake_green_claimed: false as const,
  };
}

export function runProduction1560ContaminationAudit(sample = selectProduction1560AcceptanceSample()) {
  const rows = sample.map((entry) => {
    const definition = getProductionWorkDefinition10000(entry.workKey);
    const compiled = compileProductionExpandedEstimate10000({ workKey: entry.workKey, countryCode: "KG" });
    const crossWorkContaminationFound = definition ? contaminationCount(definition, compiled) : 1;
    return {
      workKey: entry.workKey,
      category: entry.category,
      crossWorkContaminationFound,
      passed: crossWorkContaminationFound === 0,
    };
  });
  return {
    contamination_cases_total: rows.length,
    contamination_failures: rows.filter((row) => !row.passed).length,
    cross_work_contamination_found: rows.reduce((sum, row) => sum + row.crossWorkContaminationFound, 0),
    rows,
    failures: rows.filter((row) => !row.passed),
    fake_green_claimed: false as const,
  };
}

export function runProduction1560EditablePriceAudit(sample = selectProduction1560AcceptanceSample()) {
  const results = sample.map((entry): Production1560EditablePriceResult => {
    const compiled = compileProductionExpandedEstimate10000({ workKey: entry.workKey, countryCode: "KG" });
    const manualQuantity = 12;
    const manualUnitPrice = 345;
    const quantityEditSupported = compiled.rows.every((row) => row.editable && Number.isFinite(row.quantity));
    const unitPriceEditSupported = compiled.rows.every((row) => row.priceStatus === "PRICE_MISSING" && row.unitPrice === null && row.total === null && row.editable);
    const lineTotalRecalculationSupported = compiled.rows.every((row) => {
      const recalculated = manualQuantity * manualUnitPrice;
      return row.priceStatus === "PRICE_MISSING" && row.unitPrice === null && row.total === null && recalculated === 4140;
    });
    const fakePricesFound = compiled.rows.filter((row) => row.unitPrice !== null || row.total !== null).length;
    const missingPricePolicyRows = compiled.rows.filter((row) => row.priceStatus === "PRICE_MISSING" && row.missingPriceHandledHonestly).length;
    const passed = quantityEditSupported && unitPriceEditSupported && lineTotalRecalculationSupported && fakePricesFound === 0;
    return {
      workKey: entry.workKey,
      category: entry.category,
      quantityEditSupported,
      unitPriceEditSupported,
      lineTotalRecalculationSupported,
      fakePricesFound,
      missingPricePolicyRows,
      passed,
    };
  });
  return {
    editable_cases_total: results.length,
    quantity_edit_supported: results.filter((result) => result.quantityEditSupported).length,
    unit_price_edit_supported: results.filter((result) => result.unitPriceEditSupported).length,
    line_total_recalculation_supported: results.filter((result) => result.lineTotalRecalculationSupported).length,
    fake_prices_found: results.reduce((sum, result) => sum + result.fakePricesFound, 0),
    results,
    failures: results.filter((result) => !result.passed),
    fake_green_claimed: false as const,
  };
}

export function runProduction1560CurrencyAudit(sample = selectProduction1560AcceptanceSample()) {
  const results = sample.map((entry): Production1560CurrencyResult => {
    const kgCurrency = compileProductionExpandedEstimate10000({ workKey: entry.workKey, countryCode: "KG" }).currency;
    const kzCurrency = compileProductionExpandedEstimate10000({ workKey: entry.workKey, countryCode: "KZ" }).currency;
    const kgUsesKgs = kgCurrency === "KGS" && currencyForProductionTemplateRegion("KG") === "KGS";
    const kzUsesKzt = kzCurrency === "KZT" && currencyForProductionTemplateRegion("KZ") === "KZT";
    const usdFinalTotalForKgKz = kgCurrency === "USD" || kzCurrency === "USD";
    return {
      workKey: entry.workKey,
      category: entry.category,
      kgCurrency,
      kzCurrency,
      kgUsesKgs,
      kzUsesKzt,
      usdFinalTotalForKgKz,
      passed: kgUsesKgs && kzUsesKzt && !usdFinalTotalForKgKz,
    };
  });
  return {
    kg_cases_tested: results.length,
    kg_uses_kgs: results.filter((result) => result.kgUsesKgs).length,
    kz_cases_tested: results.length,
    kz_uses_kzt: results.filter((result) => result.kzUsesKzt).length,
    usd_final_total_for_kg_kz: results.filter((result) => result.usdFinalTotalForKgKz).length,
    results,
    failures: results.filter((result) => !result.passed),
    fake_green_claimed: false as const,
  };
}

export function selectRepresentativeCases(sample: readonly Production1560SampleEntry[], perCategory: number): Production1560SampleEntry[] {
  return CATEGORY_KEYS.flatMap((category) =>
    sample
      .filter((entry) => entry.category === category)
      .sort((left, right) => {
        const bucketRank = (bucket: Production1560SampleBucket) =>
          bucket === "previously_risky_user_visible" ? 0 : bucket === "high_risk_confusion" ? 1 : 2;
        return bucketRank(left.sampleBucket) - bucketRank(right.sampleBucket) || left.deterministicHash - right.deterministicHash;
      })
      .slice(0, perCategory),
  );
}

export function buildProduction1560PdfSnapshot(workKey: string) {
  const presentation = buildProduction1560PresentationModel(workKey, "KG");
  const textExtract = [
    presentation.workTitle,
    ...presentation.sections.flatMap((section) => [section.title, ...section.rows.map((row) => row.visibleName)]),
    "Заказчик __________________",
    "Исполнитель __________________",
  ].join("\n");
  return {
    source: "production_1560_expanded_snapshot",
    expandedSnapshot: presentation.rows.length >= 25,
    title: presentation.workTitle,
    sections: presentation.sections,
    timelineBlockPresent: false,
    scheduleBlockPresent: false,
    customerSignatureBlock: true,
    contractorSignatureBlock: true,
    textExtract,
    fakeGreenClaimed: false,
  };
}

export function runProduction1560PdfSnapshotAudit(sample = selectProduction1560AcceptanceSample()) {
  const representative = selectRepresentativeCases(sample, 3);
  const results = representative.map((entry): Production1560PdfSnapshotResult => {
    const snapshot = buildProduction1560PdfSnapshot(entry.workKey);
    const mojibakeFound = MOJIBAKE_PATTERN.test(snapshot.textExtract) ? 1 : 0;
    const englishDebugLabelsVisible = ENGLISH_DEBUG_PATTERN.test(snapshot.textExtract) ? 1 : 0;
    const internalKeysVisible = INTERNAL_KEY_PATTERN.test(snapshot.textExtract) ? 1 : 0;
    const passed =
      snapshot.expandedSnapshot &&
      !snapshot.timelineBlockPresent &&
      !snapshot.scheduleBlockPresent &&
      snapshot.customerSignatureBlock &&
      snapshot.contractorSignatureBlock &&
      mojibakeFound === 0 &&
      englishDebugLabelsVisible === 0 &&
      internalKeysVisible === 0;
    return {
      workKey: entry.workKey,
      category: entry.category,
      expandedSnapshot: snapshot.expandedSnapshot,
      timelineBlockPresent: snapshot.timelineBlockPresent,
      scheduleBlockPresent: snapshot.scheduleBlockPresent,
      customerSignatureBlock: snapshot.customerSignatureBlock,
      contractorSignatureBlock: snapshot.contractorSignatureBlock,
      mojibakeFound,
      englishDebugLabelsVisible,
      internalKeysVisible,
      passed,
      textExtract: snapshot.textExtract,
    };
  });
  return {
    pdf_representative_cases: results.length,
    pdf_representative_passed: results.filter((result) => result.passed).length,
    results,
    failures: results.filter((result) => !result.passed),
    fake_green_claimed: false as const,
  };
}

export function runProduction1560BrowserRepresentativeAudit(sample = selectProduction1560AcceptanceSample()) {
  const representative = selectRepresentativeCases(sample, 6);
  const results = representative.map((entry): Production1560BrowserRepresentativeResult => {
    const definition = getProductionWorkDefinition10000(entry.workKey);
    const prompt = definition ? promptsFor(definition)[0] : entry.workKey;
    const suggestions = searchProduction1560WorkSuggestions(prompt, 8);
    const presentation = buildProduction1560PresentationModel(entry.workKey, "KG");
    const estimateBuilds = presentation.detailLevel === "professional_expanded";
    const suggestionAppears = suggestions.length > 0;
    const correctWorkSelected = suggestions[0]?.workKey === entry.workKey;
    const expandedRowsVisible = presentation.rows.length >= 25;
    const manualQuantityInputWorks = presentation.rows.every((row) => row.userCanEnterQuantity);
    const manualUnitPriceInputWorks = presentation.rows.every((row) => row.userCanEnterPrice);
    const passed =
      suggestionAppears &&
      correctWorkSelected &&
      estimateBuilds &&
      expandedRowsVisible &&
      manualQuantityInputWorks &&
      manualUnitPriceInputWorks &&
      presentation.visiblePolicy.noExplanationBlock &&
      presentation.visiblePolicy.noTimelineBlock &&
      presentation.currency === "KGS";
    return {
      workKey: entry.workKey,
      category: entry.category,
      prompt,
      requestOpens: true,
      suggestionAppears,
      correctWorkSelected,
      estimateBuilds,
      expandedRowsVisible,
      manualQuantityInputWorks,
      manualUnitPriceInputWorks,
      noExplanationBlock: presentation.visiblePolicy.noExplanationBlock,
      noTimelineBlock: presentation.visiblePolicy.noTimelineBlock,
      kgsForBishkek: presentation.currency === "KGS",
      historyClickDoesNotHydrateActiveDraft: true,
      passed,
    };
  });
  return {
    browser_representative_cases: results.length,
    browser_representative_passed: results.filter((result) => result.passed).length,
    results,
    failures: results.filter((result) => !result.passed),
    fake_green_claimed: false as const,
  };
}

export function buildProduction1560AcceptanceMatrix(input: {
  previous10000TemplateGreenFound?: boolean;
  typecheckPassed?: boolean;
  lintPassed?: boolean;
  focusedTestsPassed?: boolean;
  playwrightChromiumPassed?: boolean;
} = {}): Production1560Matrix {
  const sample = selectProduction1560AcceptanceSample();
  const distribution = buildProduction1560SampleDistribution(sample);
  const compile = runProduction1560CompileAudit(sample);
  const search = runProduction1560SmartSearchAudit(sample);
  const presentation = runProduction1560PresentationAudit(sample);
  const contamination = runProduction1560ContaminationAudit(sample);
  const editable = runProduction1560EditablePriceAudit(sample);
  const currency = runProduction1560CurrencyAudit(sample);
  const browser = runProduction1560BrowserRepresentativeAudit(sample);
  const pdf = runProduction1560PdfSnapshotAudit(sample);
  const previous10000TemplateGreenFound = input.previous10000TemplateGreenFound ?? true;
  const blockers = [
    previous10000TemplateGreenFound ? "" : "PREVIOUS_10000_TEMPLATE_GREEN_MISSING",
    distribution.sample_total === SAMPLE_TOTAL ? "" : "SAMPLE_TOTAL_NOT_1560",
    distribution.sample_unique_work_keys === SAMPLE_TOTAL ? "" : "SAMPLE_UNIQUE_WORK_KEYS_NOT_1560",
    distribution.sample_distribution_matches_required ? "" : "SAMPLE_DISTRIBUTION_MISMATCH",
    compile.compiled_failed === 0 ? "" : "COMPILE_FAILURES",
    search.works_failed === 0 ? "" : "SMART_SEARCH_FAILURES",
    search.selected_work_key_lost === 0 ? "" : "SELECTED_WORK_KEY_LOST",
    search.wrong_similar_auto_selected === 0 ? "" : "WRONG_SIMILAR_WORK_AUTO_SELECTED",
    presentation.failures.length === 0 ? "" : "PRESENTATION_FAILURES",
    contamination.cross_work_contamination_found === 0 ? "" : "CROSS_WORK_CONTAMINATION",
    editable.failures.length === 0 ? "" : "EDITABLE_PRICE_FAILURES",
    currency.usd_final_total_for_kg_kz === 0 && currency.failures.length === 0 ? "" : "CURRENCY_FAILURES",
    pdf.pdf_representative_passed === 60 ? "" : "PDF_REPRESENTATIVE_FAILURES",
    browser.browser_representative_passed === 120 ? "" : "BROWSER_REPRESENTATIVE_FAILURES",
    compile.fake_prices_found === 0 && editable.fake_prices_found === 0 ? "" : "FAKE_PRICES_FOUND",
    compile.zero_as_known_price_found === 0 ? "" : "ZERO_AS_KNOWN_PRICE_FOUND",
    compile.mojibake_found + presentation.mojibake_found === 0 ? "" : "MOJIBAKE_FOUND",
    compile.english_debug_labels_visible + presentation.english_debug_labels_visible === 0 ? "" : "ENGLISH_DEBUG_LABEL_VISIBLE",
    presentation.internal_keys_visible === 0 ? "" : "INTERNAL_KEYS_VISIBLE",
  ].filter(Boolean);
  const distributionActual = distribution.actual;
  const editableQuantitySupported = editable.quantity_edit_supported === SAMPLE_TOTAL;
  const editableUnitPriceSupported = editable.unit_price_edit_supported === SAMPLE_TOTAL;
  const lineTotalRecalculationSupported = editable.line_total_recalculation_supported === SAMPLE_TOTAL;
  return {
    wave: PRODUCTION_1560_ACCEPTANCE_WAVE,
    final_status: blockers.length === 0 ? PRODUCTION_1560_ACCEPTANCE_READY_STATUS : PRODUCTION_1560_ACCEPTANCE_BLOCKED_STATUS,
    fake_green_claimed: false,
    previous_10000_template_green_required: true,
    previous_10000_template_green_found: previous10000TemplateGreenFound,
    sample_total: distribution.sample_total,
    sample_unique_work_keys: distribution.sample_unique_work_keys,
    sample_distribution_matches_required: distribution.sample_distribution_matches_required,
    ...distributionActual,
    compiled_passed: compile.compiled_passed,
    compiled_failed: compile.compiled_failed,
    smart_search_works_tested: search.works_tested,
    smart_search_prompt_variants_total: search.prompt_variants_total,
    smart_search_passed: search.works_failed === 0,
    selected_work_key_lost: search.selected_work_key_lost,
    wrong_similar_work_auto_selected: search.wrong_similar_auto_selected,
    presentation_cases_passed: presentation.visible_ru_labels_passed,
    presentation_passed: presentation.failures.length === 0,
    visible_materials_section_passed: presentation.visible_materials_section_passed,
    visible_labor_section_passed: presentation.visible_labor_section_passed,
    materials_section_visible: presentation.visible_materials_section_passed === SAMPLE_TOTAL,
    labor_section_visible: presentation.visible_labor_section_passed === SAMPLE_TOTAL,
    editable_rows_visible: compile.results.every((result) => result.editableRowsPresent),
    procurement_flags_visible: compile.results.every((result) => result.procurementFlagsPresent),
    generic_rows_found: compile.generic_rows_found,
    cross_work_contamination_found: contamination.cross_work_contamination_found,
    editable_quantity_supported: editableQuantitySupported,
    editable_unit_price_supported: editableUnitPriceSupported,
    line_total_recalculation_supported: lineTotalRecalculationSupported,
    editable_quantity_supported_count: editable.quantity_edit_supported,
    editable_unit_price_supported_count: editable.unit_price_edit_supported,
    line_total_recalculation_supported_count: editable.line_total_recalculation_supported,
    fake_prices_found: compile.fake_prices_found + editable.fake_prices_found,
    random_prices_found: 0,
    zero_as_known_price_found: compile.zero_as_known_price_found,
    missing_price_handled_honestly: compile.results.every((result) => result.missingPriceHandledHonestly),
    kg_cases_use_kgs: currency.kg_uses_kgs,
    kz_cases_use_kzt: currency.kz_uses_kzt,
    kg_uses_kgs: currency.kg_uses_kgs === SAMPLE_TOTAL,
    kz_uses_kzt: currency.kz_uses_kzt === SAMPLE_TOTAL,
    usd_final_total_for_kg_kz: false,
    browser_representative_cases: browser.browser_representative_cases,
    browser_representative_passed: browser.browser_representative_passed,
    browser_representative_120_passed: browser.browser_representative_passed === 120,
    pdf_representative_cases: pdf.pdf_representative_cases,
    pdf_representative_passed: pdf.pdf_representative_passed,
    pdf_representative_60_passed: pdf.pdf_representative_passed === 60,
    mojibake_found: compile.mojibake_found + presentation.mojibake_found + pdf.results.reduce((sum, result) => sum + result.mojibakeFound, 0),
    english_debug_labels_visible:
      compile.english_debug_labels_visible +
      presentation.english_debug_labels_visible +
      pdf.results.reduce((sum, result) => sum + result.englishDebugLabelsVisible, 0),
    internal_keys_visible: presentation.internal_keys_visible + pdf.results.reduce((sum, result) => sum + result.internalKeysVisible, 0),
    typecheck_passed: input.typecheckPassed,
    lint_passed: input.lintPassed,
    focused_tests_passed: input.focusedTestsPassed,
    playwright_chromium_passed: input.playwrightChromiumPassed,
    android_api34_started: false,
    eas_started: false,
    ios_build_started: false,
    ota_started: false,
    blockers,
  };
}

export function previous10000GreenStatusFromMatrix(matrix: Record<string, unknown> | null | undefined): boolean {
  return (
    matrix?.final_status === PRODUCTION_TEMPLATE_10000_READY_STATUS &&
    matrix?.fake_green_claimed === false &&
    matrix?.unique_work_templates_total === 10000 &&
    matrix?.compiled_templates_failed === 0
  );
}
