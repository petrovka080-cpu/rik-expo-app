import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { buildAiEstimateMissingInputQuestions } from "../../src/lib/estimate/buildAiEstimateMissingInputQuestions";
import { buildNormativeParameterCompletenessModel } from "../../src/lib/estimate/buildNormativeParameterCompletenessModel";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { validateAiEstimateQuantityTrace } from "../../src/lib/estimate/validateAiEstimateQuantityTrace";
import { validateNormativeParameterCompleteness } from "../../src/lib/estimate/validateNormativeParameterCompleteness";
import { isAiEstimateTechnicalHiddenParam } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX =
  "GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX_FAILED" as const;

type MatrixBucket =
  | "catalog_11610"
  | "random_1000"
  | "infrastructure_200"
  | "repair_100"
  | "expanded_complex_100"
  | "critical_100"
  | "missing_input_50"
  | "quantity_trace_50";

type MatrixCaseResult = {
  bucket: MatrixBucket;
  template_id: string;
  passed: boolean;
  reason?: string;
};

export type AiEstimateNormativeCompletenessMatrixSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX
    | typeof STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  catalog_total_templates: number;
  normative_passport_coverage: string;
  requirements_connected_to_rows: string;
  matrix_1000_random_passed: string;
  matrix_200_infrastructure_passed: string;
  matrix_100_repair_passed: string;
  matrix_100_expanded_complex_passed: string;
  matrix_100_critical_passed: string;
  matrix_50_missing_input_passed: string;
  matrix_50_quantity_trace_passed: string;
  missing_questions_max_lte_5: boolean;
  parameter_cards_from_normative_passport: boolean;
  quantity_trace_uses_current_values: boolean;
  blocking_reasons: string[];
};

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness", "matrix");

function stableSample(ids: string[], count: number, salt: number): string[] {
  const selected: string[] = [];
  const used = new Set<string>();
  for (let index = 0; selected.length < count && index < ids.length * 4; index += 1) {
    const id = ids[(index * 41 + salt * 97) % ids.length];
    if (!id || used.has(id)) continue;
    used.add(id);
    selected.push(id);
  }
  return selected;
}

function matchingTemplates(pattern: RegExp, count: number, fallback: string[], salt: number): string[] {
  const matched = listProfessionalWorkPassportTemplateIds().filter((templateId, index) => {
    const passport = buildProfessionalWorkPassport(templateId);
    if (index > 0 && index % 250 === 0) clearProfessionalWorkPassportBuildCaches();
    return passport ? pattern.test(`${passport.templateId} ${passport.workKey} ${passport.familyId} ${passport.category} ${passport.localizedNameRu}`) : false;
  });
  clearProfessionalWorkPassportBuildCaches();
  return stableSample(matched.length >= count ? matched : fallback, count, salt);
}

function promptForTemplate(templateId: string): string {
  const passport = buildProfessionalWorkPassport(templateId);
  const title = passport?.localizedNameRu ?? templateId;
  return [
    title,
    "100 м2",
    "длина 20 м",
    "ширина 5 м",
    "высота 3 м",
    "глубина 1 м",
    "диаметр 110 мм",
    "толщина 0.12 м",
    "напряжение 10 кВ",
    "мощность 50 кВт",
  ].join(" ");
}

function createRevision(templateId: string, index: number): EstimateDraftRevision {
  const passport = buildProfessionalWorkPassport(templateId);
  return createEstimateDraftRevision({
    estimateDraftId: `norm-matrix-${index}-${templateId}`,
    rawInput: promptForTemplate(templateId),
    selectedTemplateId: templateId,
    selectedTemplateName: passport?.localizedNameRu ?? templateId,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
}

function chooseEditableParam(revision: EstimateDraftRevision): string | null {
  const traced = revision.trace.params
    .filter((param) =>
      !isAiEstimateTechnicalHiddenParam(param.key) &&
      param.affectsRowIds.length > 0 &&
      typeof revision.params[param.key]?.value === "number"
    )
    .sort((a, b) => b.affectsRowIds.length - a.affectsRowIds.length || a.key.localeCompare(b.key))[0];
  return traced?.key ?? null;
}

function nextValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "2";
  return String(Math.max(1, Math.round((value * 1.21 + 2) * 100) / 100));
}

function runPassportCase(bucket: MatrixBucket, templateId: string, index: number): MatrixCaseResult {
  try {
    const revision = createRevision(templateId, index);
    const model = buildNormativeParameterCompletenessModel(revision);
    const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
    const questions = buildAiEstimateMissingInputQuestions({ revision, model });
    const trace = validateAiEstimateQuantityTrace({ revision });
    const passed = Boolean(model) &&
      cards.length >= (model?.filledRequirements.length ?? 0) &&
      (questions?.questions.length ?? 0) <= 5 &&
      trace.ok;
    return {
      bucket,
      template_id: templateId,
      passed,
      reason: passed ? undefined : `model:${Boolean(model)} cards:${cards.length} questions:${questions?.questions.length ?? -1} trace:${trace.blockingReasons.join("|")}`,
    };
  } catch (error) {
    return {
      bucket,
      template_id: templateId,
      passed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function runEditTraceCase(bucket: MatrixBucket, templateId: string, index: number): MatrixCaseResult {
  try {
    const revision = createRevision(templateId, index);
    const paramKey = chooseEditableParam(revision);
    if (!paramKey) return { bucket, template_id: templateId, passed: false, reason: "editable_param_missing" };
    const beforeTrace = validateAiEstimateQuantityTrace({ revision });
    const result = applyAiEstimateParameterOverride({
      revision,
      operation: "update_param",
      paramKey,
      rawValue: nextValue(revision.params[paramKey]?.value),
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });
    const afterTrace = validateAiEstimateQuantityTrace({ revision: result.revision });
    const passed = beforeTrace.ok && afterTrace.ok && result.diff.changedRowsCount > 0;
    return {
      bucket,
      template_id: templateId,
      passed,
      reason: passed ? undefined : `before:${beforeTrace.blockingReasons.join("|")} after:${afterTrace.blockingReasons.join("|")} changed:${result.diff.changedRowsCount}`,
    };
  } catch (error) {
    return {
      bucket,
      template_id: templateId,
      passed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function countBucket(results: readonly MatrixCaseResult[], bucket: MatrixBucket): string {
  const items = results.filter((result) => result.bucket === bucket);
  return `${items.filter((result) => result.passed).length}/${items.length}`;
}

function writeText(filePath: string, value: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value, "utf8");
}

export function runAiEstimateNormativeCompletenessMatrix(input: { writeSummary?: boolean } = {}) {
  const ids = listProfessionalWorkPassportTemplateIds();
  const validation = validateNormativeParameterCompleteness();
  const random = stableSample(ids, 1000, 1);
  const infrastructure = matchingTemplates(/road|pipeline|water|sewer|line|dam|bridge|canal|network|utility|substation|power/i, 200, ids, 2);
  const repair = matchingTemplates(/repair|renovat|apartment|floor|wall|roof|paint|tile|facade|drywall|plaster|screed|bath/i, 100, ids, 3);
  const expanded = stableSample(ids.filter((id) => buildProfessionalWorkPassport(id)?.templateKind === "expanded_complex_1610"), 100, ids.length);
  const critical = matchingTemplates(/bridge|tunnel|dam|hydro|power|line|substation|industrial|pipeline|tank|high|facade|drilling|road|foundation/i, 100, ids, 4);
  const missingInput = stableSample(ids, 50, 5);
  const quantityTrace = stableSample(ids, 50, 6);

  const results: MatrixCaseResult[] = [];
  const caseGroups: { bucket: MatrixBucket; ids: string[]; edit?: boolean }[] = [
    { bucket: "random_1000", ids: random },
    { bucket: "infrastructure_200", ids: infrastructure },
    { bucket: "repair_100", ids: repair },
    { bucket: "expanded_complex_100", ids: expanded },
    { bucket: "critical_100", ids: critical },
    { bucket: "missing_input_50", ids: missingInput },
    { bucket: "quantity_trace_50", ids: quantityTrace, edit: true },
  ];
  for (const group of caseGroups) {
    group.ids.forEach((templateId, index) => {
      results.push(group.edit
        ? runEditTraceCase(group.bucket, templateId, index)
        : runPassportCase(group.bucket, templateId, index));
      if (results.length % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    });
  }
  clearProfessionalWorkPassportBuildCaches();

  const failures = results.filter((result) => !result.passed);
  const requirementsConnected = `${validation.requirementsConnectedToRows}/${validation.requirementsTotal}`;
  const blockers = [
    validation.ok ? "" : `normative_validation_failed:${validation.blockingReasons.slice(0, 20).join("|")}`,
    failures.length === 0 ? "" : `matrix_failures:${failures.length}`,
  ].filter(Boolean);
  const summary: AiEstimateNormativeCompletenessMatrixSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX
      : STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    catalog_total_templates: validation.catalogTotalTemplates,
    normative_passport_coverage: validation.normativePassportCoverage,
    requirements_connected_to_rows: requirementsConnected,
    matrix_1000_random_passed: countBucket(results, "random_1000"),
    matrix_200_infrastructure_passed: countBucket(results, "infrastructure_200"),
    matrix_100_repair_passed: countBucket(results, "repair_100"),
    matrix_100_expanded_complex_passed: countBucket(results, "expanded_complex_100"),
    matrix_100_critical_passed: countBucket(results, "critical_100"),
    matrix_50_missing_input_passed: countBucket(results, "missing_input_50"),
    matrix_50_quantity_trace_passed: countBucket(results, "quantity_trace_50"),
    missing_questions_max_lte_5: results.every((result) => result.bucket !== "missing_input_50" || result.passed),
    parameter_cards_from_normative_passport: results.every((result) => result.bucket !== "random_1000" || result.passed),
    quantity_trace_uses_current_values: results.every((result) => result.bucket !== "quantity_trace_50" || result.passed),
    blocking_reasons: blockers,
  };
  const outDir = path.join(ROOT, timestampForPath());
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) {
    writeJson(summaryPath, summary);
    writeText(path.join(outDir, "failures.json"), `${JSON.stringify(failures.slice(0, 100), null, 2)}\n`);
  }
  return { summary, results, validation, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateNormativeCompletenessMatrix({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX) process.exitCode = 1;
}
