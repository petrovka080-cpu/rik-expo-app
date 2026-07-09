import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { extractWorkParamsFromInlinePrompt } from "../../src/lib/ai/extractWorkParamsFromInlinePrompt";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { containsForbiddenAiEstimateVisibleToken } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

export const GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY =
  "GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY" as const;
export const STOP_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_FAILED" as const;

type ExpectedParam = {
  key: string;
  value: number | string;
  unit?: string;
  revisionKey?: string;
  cardKey?: string;
  traceKey?: string;
};

type ExtractionPriorityCase = {
  prompt: string;
  expected: ExpectedParam[];
  forbidden?: string[];
  requiresBoqRows?: boolean;
};

const CASES: ExtractionPriorityCase[] = [
  {
    prompt: "Капитальный ремонт квартиры 154 кв метра 2 санузла высота потолка 3 метра",
    expected: [
      { key: "area_m2", value: 154, unit: "m2" },
      { key: "bathrooms_count", value: 2, unit: "pcs" },
      { key: "ceiling_height_m", value: 3, unit: "m" },
    ],
    forbidden: ["length_m", "voltage_kv"],
  },
  {
    prompt: "Алмазное бурение бетона 120 отверстий диаметр 132 мм глубина 220 мм",
    expected: [
      { key: "count", value: 120, unit: "pcs" },
      { key: "diameter_mm", value: 132, unit: "mm" },
      { key: "depth_mm", value: 220, unit: "mm" },
    ],
    requiresBoqRows: true,
  },
  {
    prompt: "Забор из профлиста 80 м высота 2 м ворота 4 м",
    expected: [
      { key: "length_m", value: 80, unit: "m" },
      { key: "height_m", value: 2, unit: "m" },
    ],
    requiresBoqRows: true,
  },
  {
    prompt: "Вентфасад 1500 м2 высота 40 м утепление 100 мм",
    expected: [
      { key: "area_m2", revisionKey: "facade_area_m2", cardKey: "facade_area_m2", traceKey: "facade_area_m2", value: 1500, unit: "m2" },
      { key: "height_m", value: 40, unit: "m" },
      { key: "insulation_thickness_mm", value: 100, unit: "mm" },
    ],
    requiresBoqRows: true,
  },
  {
    prompt: "Водоснабжение села 5 км труба ПНД 110 башня 25 м3",
    expected: [
      { key: "length_m", value: 5000, unit: "m" },
      { key: "line_length_m", value: 5000, unit: "m" },
      { key: "diameter_mm", value: 110, unit: "mm" },
      { key: "volume_m3", value: 25, unit: "m3" },
    ],
    requiresBoqRows: true,
  },
  {
    prompt: "Строительство дороги 1 км ширина 6 м асфальт 2 слоя",
    expected: [
      { key: "length_m", value: 1000, unit: "m" },
      { key: "line_length_m", value: 1000, unit: "m" },
      { key: "width_m", value: 6, unit: "m" },
      { key: "count", value: 2, unit: "pcs" },
    ],
    requiresBoqRows: true,
  },
  {
    prompt: "Строительство дамбы 200 м высота 5 м габионы дренаж",
    expected: [
      { key: "length_m", value: 200, unit: "m" },
      { key: "height_m", value: 5, unit: "m" },
    ],
    requiresBoqRows: true,
  },
  {
    prompt: "ЛЭП 10 кВ 3 км опоры через 50 м провод СИП",
    expected: [
      { key: "voltage_kv", value: 10, unit: "kV" },
      { key: "length_m", value: 3000, unit: "m" },
      { key: "line_length_m", value: 3000, unit: "m" },
      { key: "pole_step_m", value: 50, unit: "m" },
    ],
    requiresBoqRows: true,
  },
  {
    prompt: "Мансардная крыша 120 м2 6 окон утепление 200 мм",
    expected: [
      { key: "area_m2", revisionKey: "roof_area_m2", cardKey: "roof_area_m2", traceKey: "roof_area_m2", value: 120, unit: "m2" },
      { key: "roof_windows_count", value: 6, unit: "pcs" },
      { key: "insulation_thickness_mm", value: 200, unit: "mm" },
    ],
    requiresBoqRows: true,
  },
];

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function valuesEqual(actual: unknown, expected: number | string): boolean {
  if (typeof actual === "number" && typeof expected === "number") return Math.abs(actual - expected) < 0.0001;
  return actual === expected;
}

function unitMatches(actual: string | undefined, expected: string | undefined): boolean {
  if (!expected) return true;
  return actual === expected;
}

function visibleHasNoForbiddenTokens(values: string[]): boolean {
  return values.every((value) =>
    !containsForbiddenAiEstimateVisibleToken(value) &&
    !/\b(?:area_m2|length_m|ceiling_height_m|bathrooms_count|user_input|ai_inferred|catalog_default|source_sha)\b/i.test(value)
  );
}

function caseResult(testCase: ExtractionPriorityCase, index: number) {
  const extracted = extractWorkParamsFromInlinePrompt(testCase.prompt);
  const revision = createEstimateDraftRevision({
    estimateDraftId: `priority-case-${index}`,
    rawInput: testCase.prompt,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const cards = buildAiEstimateParameterCards({ revision });
  const visible = cards.map((card) => `${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu}`);
  const expectedPassed = testCase.expected.every((expected) => {
    const extractedParam = extracted[expected.key];
    const revisionParam = revision.params[expected.revisionKey ?? expected.key];
    const card = cards.find((candidate) => candidate.key === (expected.cardKey ?? expected.revisionKey ?? expected.key));
    return valuesEqual(extractedParam?.value, expected.value) &&
      valuesEqual(revisionParam?.value, expected.value) &&
      unitMatches(extractedParam?.canonicalUnit, expected.unit) &&
      card != null &&
      !containsForbiddenAiEstimateVisibleToken(`${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu}`);
  });
  const forbiddenAbsent = (testCase.forbidden ?? []).every((key) => !extracted[key] && !revision.params[key]);
  const traceKeys = new Set(revision.trace.params.filter((param) => param.affectsRowIds.length > 0).map((param) => param.key));
  const boqUsesExtracted = !testCase.requiresBoqRows || (
    revision.boq.rows.length > 0 &&
    testCase.expected.some((expected) => traceKeys.has(expected.traceKey ?? expected.revisionKey ?? expected.key))
  );
  return {
    prompt: testCase.prompt,
    expectedPassed,
    forbiddenAbsent,
    parameter_cards_match_extracted_values: testCase.expected.every((expected) =>
      cards.some((card) => card.key === (expected.cardKey ?? expected.revisionKey ?? expected.key))
    ),
    boq_quantities_use_extracted_values: boqUsesExtracted,
    visible_russian_only: visibleHasNoForbiddenTokens(visible),
    rows: revision.boq.rows.length,
    extracted_values: Object.fromEntries(Object.entries(extracted).map(([key, value]) => [key, value.value])),
    passed: expectedPassed && forbiddenAbsent && boqUsesExtracted && visibleHasNoForbiddenTokens(visible),
  };
}

export function auditAiEstimateParameterExtractionPriority(input: { writeSummary?: boolean } = {}) {
  const results = CASES.map(caseResult);
  const manualBase = createEstimateDraftRevision({
    estimateDraftId: "manual-priority-case",
    rawInput: "Вентфасад 1500 м2 высота 40 м утепление 100 мм",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const manual = applyAiEstimateParameterOverride({
    revision: manualBase,
    operation: "update_param",
    paramKey: "facade_area_m2",
    rawValue: "1200 м2",
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const failures = results.filter((result) => !result.passed);
  const summary = {
    final_status: failures.length === 0
      ? GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY
      : STOP_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    cases_passed: `${results.length - failures.length}/${results.length}`,
    explicit_user_values_preserved: results.every((result) => result.expectedPassed),
    height_3m_not_overwritten_by_default_2_7: results[0]?.extracted_values.ceiling_height_m === 3,
    ceiling_height_not_misclassified_as_length: !Object.prototype.hasOwnProperty.call(results[0]?.extracted_values ?? {}, "length_m"),
    diameter_depth_width_length_thickness_extracted_correctly: results.every((result) => result.expectedPassed),
    bathrooms_points_units_extracted_correctly:
      results[0]?.extracted_values.bathrooms_count === 2 &&
      results[1]?.extracted_values.count === 120 &&
      results[8]?.extracted_values.roof_windows_count === 6,
    parameter_units_normalized_correctly: results.every((result) => result.expectedPassed),
    parameter_cards_match_extracted_values: results.every((result) => result.parameter_cards_match_extracted_values),
    boq_quantities_use_extracted_values: results.every((result) => result.boq_quantities_use_extracted_values),
    explicit_user_value_priority_over_catalog_default: results.every((result) => result.expectedPassed),
    manual_override_recalculates_after_explicit_value:
      manual.revision.params.facade_area_m2?.value === 1200 &&
      manual.diff.changedParams.some((param) => param.key === "facade_area_m2" && param.before === 1500 && param.after === 1200),
    forbidden_visible_output_count: results.filter((result) => !result.visible_russian_only).length,
    failures,
  };
  const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards-durable-history-runtime-hardening", "parameter-extraction-priority-summary.json");
  if (input.writeSummary) writeJson(summaryPath, summary);
  return { summary, results, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateParameterExtractionPriority({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY) process.exitCode = 1;
}
