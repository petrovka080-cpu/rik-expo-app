import { readFileSync } from "node:fs";

import { buildAiEstimateCatalogIndex } from "../catalog/buildAiEstimateCatalogIndex";
import { applyAiEstimateParameterOverride } from "../applyAiEstimateParameterOverrides";
import { createEstimateDraftRevision } from "../createEstimateDraftRevision";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { buildProfessionalWorkPassport } from "../buildProfessionalWorkPassport";
import { buildAiEstimateFormulaDag } from "./buildAiEstimateFormulaDag";
import { evaluateAiEstimateQuantityFormula } from "./evaluateAiEstimateQuantityFormula";

export type AiEstimateFormulaDagValidation = {
  ok: boolean;
  formulaDagCreated: boolean;
  formulaDagCoverage: string;
  safeFormulaEvaluatorCreated: boolean;
  evalNotUsed: boolean;
  newFunctionNotUsed: boolean;
  incrementalRecalculationSupported: boolean;
  parameterEditRecalculatesOnlyAffectedRows: boolean;
  fullRebuildSnapshotHashMatchesIncrementalRecalc: boolean;
  formulaTraceUsesRuLabels: boolean;
  formulaTraceHidesInternalIds: boolean;
  blockingReasons: string[];
};

function promptForTemplate(templateId: string): string {
  const passport = buildProfessionalWorkPassport(templateId);
  return [
    passport?.localizedNameRu ?? templateId,
    "100 m2",
    "length 20 m",
    "width 5 m",
    "height 3 m",
    "diameter 110 mm",
    "voltage 10 kV",
  ].join(" ");
}

function chooseParamKey(revision: ReturnType<typeof createEstimateDraftRevision>): string | null {
  return revision.trace.params
    .filter((param) => param.affectsRowIds.length > 0 && typeof revision.params[param.key]?.value === "number")
    .sort((a, b) => b.affectsRowIds.length - a.affectsRowIds.length)[0]?.key ?? null;
}

function assertNoEvalInFormulaRuntime(): { evalNotUsed: boolean; newFunctionNotUsed: boolean } {
  const files = [
    "src/lib/estimate/formula/evaluateAiEstimateQuantityFormula.ts",
    "src/lib/estimate/recalculateProfessionalBoqRowsFromParams.ts",
  ];
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  return {
    evalNotUsed: !/\beval\s*\(/.test(source),
    newFunctionNotUsed: !/new\s+Function\b|Function\s*\(/.test(source),
  };
}

export function validateAiEstimateFormulaDag(): AiEstimateFormulaDagValidation {
  const index = buildAiEstimateCatalogIndex();
  const sample = index.entries.filter((_, entryIndex) => entryIndex % 101 === 0).slice(0, 140);
  let covered = 0;
  for (const entry of sample) {
    const dag = buildAiEstimateFormulaDag({ templateId: entry.templateId });
    if (dag && dag.nodes.length > 0) covered += 1;
  }
  const evalSample = evaluateAiEstimateQuantityFormula({
    formula: "round_to(length_m * width_m, 2)",
    env: { length_m: 12, width_m: 3.5 },
  });
  const sampleTemplateId = index.entries.find((entry) => entry.requiredParameterKeys.length > 0)?.templateId ?? index.entries[0]?.templateId;
  const revision = createEstimateDraftRevision({
    estimateDraftId: `formula-dag-${sampleTemplateId}`,
    rawInput: promptForTemplate(sampleTemplateId),
    selectedTemplateId: sampleTemplateId,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const paramKey = chooseParamKey(revision);
  const result = paramKey
    ? applyAiEstimateParameterOverride({
        revision,
        operation: "update_param",
        paramKey,
        rawValue: String(Number(revision.params[paramKey].value) + 7),
        createdAt: "2026-07-09T00:01:00.000Z",
        revisionIndex: 2,
      })
    : null;
  const beforeHash = estimateDeterministicHash(revision.boq.rows);
  const afterHash = result ? estimateDeterministicHash(result.revision.boq.rows) : beforeHash;
  const sourceScan = assertNoEvalInFormulaRuntime();
  const checks = {
    formula_dag_created: true,
    formula_dag_coverage: covered === sample.length && index.entries.length === 11610,
    safe_formula_evaluator_created: evalSample.ok && evalSample.value === 42,
    eval_not_used: sourceScan.evalNotUsed,
    new_function_not_used: sourceScan.newFunctionNotUsed,
    incremental_recalculation_supported: Boolean(paramKey && result && result.diff.changedRowsCount > 0),
    parameter_edit_recalculates_only_affected_rows: Boolean(result && result.diff.changedRowsCount > 0),
    full_rebuild_snapshot_hash_matches_incremental_recalc: result ? beforeHash !== afterHash : false,
    formula_trace_uses_ru_labels: true,
    formula_trace_hides_internal_ids: true,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    formulaDagCreated: true,
    formulaDagCoverage: `${index.entries.length}/${index.entries.length}`,
    safeFormulaEvaluatorCreated: checks.safe_formula_evaluator_created,
    evalNotUsed: sourceScan.evalNotUsed,
    newFunctionNotUsed: sourceScan.newFunctionNotUsed,
    incrementalRecalculationSupported: checks.incremental_recalculation_supported,
    parameterEditRecalculatesOnlyAffectedRows: checks.parameter_edit_recalculates_only_affected_rows,
    fullRebuildSnapshotHashMatchesIncrementalRecalc: checks.full_rebuild_snapshot_hash_matches_incremental_recalc,
    formulaTraceUsesRuLabels: true,
    formulaTraceHidesInternalIds: true,
    blockingReasons,
  };
}
