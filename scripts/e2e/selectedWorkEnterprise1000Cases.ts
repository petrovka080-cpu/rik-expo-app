import {
  GLOBAL_WORK_TYPE_DEFINITIONS,
  visibleGlobalWorkCategoryTitleRu,
  visibleGlobalWorkTitleRu,
  type GlobalUnitInput,
  type GlobalWorkCategory,
} from "../../src/lib/ai/globalEstimate";

export const SELECTED_WORK_ENTERPRISE_1000_WAVE =
  "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE_CLOSEOUT_POINT_OF_NO_RETURN";

export const SELECTED_WORK_ENTERPRISE_1000_GREEN_STATUS =
  "GREEN_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE_READY";

export type SelectedWorkEnterprise1000Scenario =
  | "typo_noisy"
  | "broad_suggestion"
  | "quantity_edge"
  | "pdf_focused"
  | "catalog_label"
  | "control_row_policy"
  | "no_english_fallback"
  | "standard_estimate";

export type SelectedWorkEnterprise1000Case = {
  id: string;
  kind: "estimate";
  scenario: SelectedWorkEnterprise1000Scenario;
  domainKey: string;
  domainTitleRu: string;
  selectedWorkKey: string;
  selectedTitleRu: string;
  categoryKey: GlobalWorkCategory;
  categoryTitleRu: string;
  smartSearchInput: string;
  rawEstimateInput: string;
  volume: number;
  unit: GlobalUnitInput["normalizedUnit"];
  unitLabelRu: string;
  expected: {
    suggestionsVisible: true;
    selectedWorkWins: true;
    exactMaterialsRequired: true;
    visibleUiRequired: true;
    pdfReadyRequired: true;
    catalogVisibleRuLabelsRequired: true;
    requestHistoryForemanParityRequired: true;
  };
};

const PRODUCT_SEARCH_WORK_PATTERN = /\b(?:product|supplier|search|procurement|quote|rental)\b/i;
const CALCULATOR_ALIAS_REDIRECT_WORK_KEYS = new Set([
  "paving_slabs",
  "canopy_installation",
  "linoleum_removal",
  "green_roof_waterproofing",
  "steel_canopy",
]);

const ESTIMATE_ONLY_WORK_DEFINITIONS = GLOBAL_WORK_TYPE_DEFINITIONS.filter((definition) => {
  const searchableText = [
    definition.workKey,
    definition.names.en,
    definition.names.ru,
    visibleGlobalWorkTitleRu(definition),
  ].join(" ");
  return !PRODUCT_SEARCH_WORK_PATTERN.test(searchableText) && !CALCULATOR_ALIAS_REDIRECT_WORK_KEYS.has(definition.workKey);
}).filter((definition, index, definitions) =>
  definitions.findIndex((candidate) => candidate.workKey === definition.workKey) === index
);

function padId(index: number): string {
  return String(index + 1).padStart(4, "0");
}

function scenarioFor(index: number): SelectedWorkEnterprise1000Scenario {
  if (index < 100) return "typo_noisy";
  if (index < 200) return "broad_suggestion";
  if (index < 300) return "quantity_edge";
  if (index < 400) return "pdf_focused";
  if (index < 500) return "catalog_label";
  if (index < 550) return "control_row_policy";
  if (index < 600) return "no_english_fallback";
  return "standard_estimate";
}

function unitLabelRu(unit: GlobalUnitInput["normalizedUnit"]): string {
  if (unit === "sq_m") return "м2";
  if (unit === "sq_ft") return "кв. фут";
  if (unit === "linear_m") return "пог. м";
  if (unit === "linear_ft") return "пог. фут";
  if (unit === "pcs") return "шт";
  if (unit === "kg") return "кг";
  if (unit === "lbs") return "фунт";
  if (unit === "m3") return "м3";
  if (unit === "cu_ft") return "куб. фут";
  if (unit === "ton") return "т";
  return "компл";
}

function volumeFor(index: number, unit: GlobalUnitInput["normalizedUnit"], scenario: SelectedWorkEnterprise1000Scenario): number {
  if (scenario === "quantity_edge") {
    const edgeValues = [0.5, 1, 1.25, 2.75, 7.5, 18, 99.9, 250, 999, 10000];
    return edgeValues[index % edgeValues.length];
  }
  if (unit === "pcs") return 3 + (index % 47);
  if (unit === "kg") return 50 + index * 3;
  if (unit === "lbs") return 100 + index * 5;
  if (unit === "ton") return 1 + (index % 12);
  if (unit === "set") return 1 + (index % 4);
  if (unit === "m3" || unit === "cu_ft") return 2 + (index % 35);
  return 12 + (index % 180);
}

function firstMeaningfulWords(value: string, limit: number): string {
  const words = value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
  return words.slice(0, limit).join(" ") || value;
}

function smartSearchInputFor(input: {
  scenario: SelectedWorkEnterprise1000Scenario;
  title: string;
  categoryTitle: string;
  volume: number;
  unitLabel: string;
}): string {
  const { scenario, title, categoryTitle, volume, unitLabel } = input;
  if (scenario === "typo_noisy") return `${title}   ${volume} ${unitLabel} !!! срочна`;
  if (scenario === "broad_suggestion") return `${categoryTitle}: ${firstMeaningfulWords(title, 2)}`;
  if (scenario === "quantity_edge") return `${title} ${volume} ${unitLabel}`;
  if (scenario === "pdf_focused") return `${title} ${volume} ${unitLabel}, нужна смета и PDF`;
  if (scenario === "catalog_label") return `${title} ${volume} ${unitLabel}, подобрать материалы в каталоге`;
  if (scenario === "control_row_policy") return `${title} ${volume} ${unitLabel}, без контрольных строк в работах`;
  if (scenario === "no_english_fallback") return `${title} ${volume} ${unitLabel}, только русские видимые названия`;
  return `${title} ${volume} ${unitLabel}`;
}

function rawEstimateInputFor(input: {
  scenario: SelectedWorkEnterprise1000Scenario;
  title: string;
  categoryTitle: string;
  volume: number;
  unitLabel: string;
}): string {
  const { scenario, title, categoryTitle, volume, unitLabel } = input;
  if (scenario === "pdf_focused") return `Смета на ${title} ${volume} ${unitLabel}; подготовить PDF после расчета`;
  if (scenario === "catalog_label") return `Смета на ${title} ${volume} ${unitLabel}; материалы должны быть видны русскими названиями`;
  if (scenario === "control_row_policy") return `Смета на ${title} ${volume} ${unitLabel}; контроль качества не оплачиваемой строкой`;
  if (scenario === "no_english_fallback") return `Смета на ${title} ${volume} ${unitLabel}; без английских запасных названий`;
  if (scenario === "broad_suggestion") return `${categoryTitle}: выбран вид работ ${title}, объем ${volume} ${unitLabel}`;
  return `Смета на ${title} ${volume} ${unitLabel}`;
}

export const SELECTED_WORK_ENTERPRISE_1000_CASES: readonly SelectedWorkEnterprise1000Case[] = Object.freeze(
  Array.from({ length: 1000 }, (_, index): SelectedWorkEnterprise1000Case => {
    const definition = ESTIMATE_ONLY_WORK_DEFINITIONS[index % ESTIMATE_ONLY_WORK_DEFINITIONS.length];
    const scenario = scenarioFor(index);
    const title = visibleGlobalWorkTitleRu(definition);
    const categoryTitle = visibleGlobalWorkCategoryTitleRu(definition.category);
    const unit = definition.defaultMeasureUnit;
    const label = unitLabelRu(unit);
    const volume = volumeFor(index, unit, scenario);
    return {
      id: `swe1000_${padId(index)}`,
      kind: "estimate",
      scenario,
      domainKey: definition.workKey,
      domainTitleRu: title,
      selectedWorkKey: definition.workKey,
      selectedTitleRu: title,
      categoryKey: definition.category,
      categoryTitleRu: categoryTitle,
      smartSearchInput: smartSearchInputFor({ scenario, title, categoryTitle, volume, unitLabel: label }),
      rawEstimateInput: rawEstimateInputFor({ scenario, title, categoryTitle, volume, unitLabel: label }),
      volume,
      unit,
      unitLabelRu: label,
      expected: {
        suggestionsVisible: true,
        selectedWorkWins: true,
        exactMaterialsRequired: true,
        visibleUiRequired: true,
        pdfReadyRequired: true,
        catalogVisibleRuLabelsRequired: true,
        requestHistoryForemanParityRequired: true,
      },
    };
  }),
);

export const SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_PRODUCT_SEARCH_WORK_KEYS = Object.freeze(
  GLOBAL_WORK_TYPE_DEFINITIONS
    .filter((definition) => PRODUCT_SEARCH_WORK_PATTERN.test([
      definition.workKey,
      definition.names.en,
      definition.names.ru,
      visibleGlobalWorkTitleRu(definition),
    ].join(" ")))
    .map((definition) => definition.workKey),
);

export const SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_ALIAS_REDIRECT_WORK_KEYS = Object.freeze(
  [...CALCULATOR_ALIAS_REDIRECT_WORK_KEYS],
);

export const SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS = Object.freeze(
  SELECTED_WORK_ENTERPRISE_1000_CASES.reduce<Record<SelectedWorkEnterprise1000Scenario, number>>((summary, testCase) => {
    summary[testCase.scenario] = (summary[testCase.scenario] ?? 0) + 1;
    return summary;
  }, {
    typo_noisy: 0,
    broad_suggestion: 0,
    quantity_edge: 0,
    pdf_focused: 0,
    catalog_label: 0,
    control_row_policy: 0,
    no_english_fallback: 0,
    standard_estimate: 0,
  }),
);

if (SELECTED_WORK_ENTERPRISE_1000_CASES.length !== 1000) {
  throw new Error(`SELECTED_WORK_ENTERPRISE_1000_CASE_COUNT_INVALID:${SELECTED_WORK_ENTERPRISE_1000_CASES.length}`);
}

if (SELECTED_WORK_ENTERPRISE_1000_EXCLUDED_PRODUCT_SEARCH_WORK_KEYS.length === 0) {
  throw new Error("SELECTED_WORK_ENTERPRISE_1000_PRODUCT_SEARCH_EXCLUSION_NOT_PROVEN");
}

if (new Set(SELECTED_WORK_ENTERPRISE_1000_CASES.map((testCase) => testCase.domainKey)).size < 50) {
  throw new Error("SELECTED_WORK_ENTERPRISE_1000_DOMAIN_COVERAGE_BELOW_50");
}

if (
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS.typo_noisy < 100 ||
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS.broad_suggestion < 100 ||
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS.quantity_edge < 100 ||
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS.pdf_focused < 100 ||
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS.catalog_label < 100 ||
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS.control_row_policy < 50 ||
  SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS.no_english_fallback < 50
) {
  throw new Error(`SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS_INVALID:${JSON.stringify(SELECTED_WORK_ENTERPRISE_1000_SCENARIO_COUNTS)}`);
}
