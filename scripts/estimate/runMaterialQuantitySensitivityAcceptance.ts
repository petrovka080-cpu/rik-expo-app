import { mkdirSync } from "node:fs";
import path from "node:path";

import sensitivityFixture from "../../tests/fixtures/estimate/materialQuantitySensitivityCases.json";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { materialQuantityLinesFromRows } from "../../src/lib/estimate/professionalMaterialQuantityTrace";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import { REAL_NAMED_BOQ_CRITICAL_CASES } from "./realNamedBoqCriticalCases";

export const GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE =
  "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE" as const;
export const STOP_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE_FAILED =
  "STOP_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-material-quantity-accuracy", "sensitivity");

type SensitivityFixture = {
  schema: string;
  minimumExpandedCases: number;
  variantsPerSeed: number;
  seeds: {
    baseCaseId: string;
    numberIndex?: number;
    lowDelta: number;
    highDelta: number;
  }[];
};

export type MaterialQuantitySensitivityCase = {
  case_id: string;
  base_case_id: string;
  expected_family: string;
  prompt_low: string;
  prompt_high: string;
};

export type MaterialQuantitySensitivityResult = MaterialQuantitySensitivityCase & {
  low_family: string;
  high_family: string;
  low_total_procurement_quantity: number;
  high_total_procurement_quantity: number;
  low_lines_count: number;
  high_lines_count: number;
  passed: boolean;
  blockers: string[];
};

function numberMatches(prompt: string): RegExpMatchArray[] {
  return [...prompt.matchAll(/\d+(?:[.,]\d+)?/g)];
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function replaceNumberAtIndex(prompt: string, value: number, numberIndex: number): string {
  let current = 0;
  return prompt.replace(/\d+(?:[.,]\d+)?/g, (match) => {
    if (current === numberIndex) {
      current += 1;
      return formatNumber(value);
    }
    current += 1;
    return match;
  });
}

export function expandMaterialQuantitySensitivityCases(
  fixture: SensitivityFixture = sensitivityFixture as SensitivityFixture,
): MaterialQuantitySensitivityCase[] {
  const cases: MaterialQuantitySensitivityCase[] = [];
  for (const seed of fixture.seeds) {
    const base = REAL_NAMED_BOQ_CRITICAL_CASES.find((item) => item.case_id === seed.baseCaseId);
    if (!base) continue;
    const numberIndex = seed.numberIndex ?? 0;
    const firstNumber = Number(numberMatches(base.prompt)[numberIndex]?.[0]?.replace(",", ".") ?? "0");
    for (let index = 0; index < fixture.variantsPerSeed; index += 1) {
      const lowValue = firstNumber + seed.lowDelta + index;
      const highValue = firstNumber + seed.highDelta + index + 1;
      cases.push({
        case_id: `${seed.baseCaseId}-sensitivity-${String(index + 1).padStart(3, "0")}`,
        base_case_id: seed.baseCaseId,
        expected_family: base.expected_family,
        prompt_low: replaceNumberAtIndex(base.prompt, lowValue, numberIndex),
        prompt_high: replaceNumberAtIndex(base.prompt, highValue, numberIndex),
      });
    }
  }
  return cases;
}

function totalProcurementQuantity(prompt: string): {
  family: string;
  linesCount: number;
  total: number;
} {
  const revision = createEstimateDraftRevision({
    rawInput: prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-08T00:00:00.000Z",
  });
  const lines = materialQuantityLinesFromRows({
    rows: revision.boq.rows,
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
  });
  return {
    family: revision.matchedFamily,
    linesCount: lines.length,
    total: Number(lines.reduce((sum, line) => sum + line.procurementQuantity, 0).toFixed(4)),
  };
}

export function runMaterialQuantitySensitivityAcceptance(input: {
  writeSummary?: boolean;
} = {}) {
  const fixture = sensitivityFixture as SensitivityFixture;
  const cases = expandMaterialQuantitySensitivityCases(fixture);
  const results: MaterialQuantitySensitivityResult[] = cases.map((testCase) => {
    const low = totalProcurementQuantity(testCase.prompt_low);
    const high = totalProcurementQuantity(testCase.prompt_high);
    const blockers = [
      low.family === testCase.expected_family ? "" : `low_family_mismatch:${low.family}`,
      high.family === testCase.expected_family ? "" : `high_family_mismatch:${high.family}`,
      low.linesCount > 0 ? "" : "low_material_quantity_lines_missing",
      high.linesCount > 0 ? "" : "high_material_quantity_lines_missing",
      high.total > low.total ? "" : `procurement_quantity_not_sensitive:${low.total}->${high.total}`,
    ].filter(Boolean);
    return {
      ...testCase,
      low_family: low.family,
      high_family: high.family,
      low_total_procurement_quantity: low.total,
      high_total_procurement_quantity: high.total,
      low_lines_count: low.linesCount,
      high_lines_count: high.linesCount,
      passed: blockers.length === 0,
      blockers,
    };
  });
  const failed = results.filter((item) => !item.passed);
  const blockers = [
    cases.length >= fixture.minimumExpandedCases ? "" : `expanded_cases_below_minimum:${cases.length}/${fixture.minimumExpandedCases}`,
    failed.length === 0 ? "" : `sensitivity_failed_cases:${failed.length}`,
    ...failed.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)).slice(0, 200),
  ].filter(Boolean);
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE
      : STOP_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    fixture_schema: fixture.schema,
    expanded_cases_total: cases.length,
    minimum_expanded_cases: fixture.minimumExpandedCases,
    variants_per_seed: fixture.variantsPerSeed,
    cases_passed: results.filter((item) => item.passed).length,
    cases_failed: failed.length,
    procurement_quantity_sensitive_to_input_params: failed.length === 0,
    fake_green_claimed: false,
    blockers,
    case_results: results,
  };
  if (input.writeSummary !== false) {
    mkdirSync(outDir, { recursive: true });
    writeJson(artifactPath, summary);
  }
  return { artifactPath, summary, results };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/runMaterialQuantitySensitivityAcceptance.ts")) {
  const result = runMaterialQuantitySensitivityAcceptance({
    writeSummary: !process.argv.includes("--no-write-summary"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    expanded_cases_total: result.summary.expanded_cases_total,
    cases_passed: result.summary.cases_passed,
    cases_failed: result.summary.cases_failed,
    blockers: result.summary.blockers.slice(0, 20),
    artifact: result.artifactPath,
  }, null, 2));
  if (result.summary.final_status === STOP_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE_FAILED) {
    process.exitCode = 1;
  }
}
