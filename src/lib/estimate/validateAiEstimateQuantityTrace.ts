import {
  buildAiEstimateQuantityExplanationTrace,
  type AiEstimateQuantityExplanationTrace,
} from "./buildAiEstimateQuantityExplanationTrace";
import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";

export type AiEstimateQuantityTraceValidationResult = {
  ok: boolean;
  rowCount: number;
  visibleExplanationRows: number;
  rowsWithCurrentParameters: number;
  staleTraceAccepted: boolean;
  rawInternalIdsVisibleCount: number;
  blockingReasons: string[];
};

function hasRawInternalToken(value: string): boolean {
  return /\b[a-z][a-z0-9]+_[a-z0-9_]+\b|\b(?:PRICE_MISSING|sourceParameters|formula_id|template_id|row_id|round_to)\b/i.test(value);
}

function validateTraceObject(trace: AiEstimateQuantityExplanationTrace | null): AiEstimateQuantityTraceValidationResult {
  if (!trace) {
    return {
      ok: false,
      rowCount: 0,
      visibleExplanationRows: 0,
      rowsWithCurrentParameters: 0,
      staleTraceAccepted: true,
      rawInternalIdsVisibleCount: 0,
      blockingReasons: ["quantity_trace_missing"],
    };
  }
  const visibleExplanationRows = trace.rows.filter((row) => row.explanationRu.trim() && row.visibleFormulaRu.trim()).length;
  const rowsWithCurrentParameters = trace.rows.filter((row) => row.parameters.length > 0).length;
  const rawInternalIdsVisibleCount = trace.rows.filter((row) =>
    hasRawInternalToken(`${row.explanationRu} ${row.visibleFormulaRu}`),
  ).length;
  const blockingReasons = [
    trace.staleTraceAccepted === false ? "" : "stale_trace_accepted",
    visibleExplanationRows === trace.rows.length ? "" : `visible_explanation_rows:${visibleExplanationRows}/${trace.rows.length}`,
    rawInternalIdsVisibleCount === 0 ? "" : `raw_internal_ids_visible:${rawInternalIdsVisibleCount}`,
    trace.traceUsesCurrentParameterValues ? "" : "trace_not_marked_current",
    trace.rows.length > 0 ? "" : "quantity_trace_rows_empty",
  ].filter(Boolean);
  return {
    ok: blockingReasons.length === 0,
    rowCount: trace.rowCount,
    visibleExplanationRows,
    rowsWithCurrentParameters,
    staleTraceAccepted: trace.staleTraceAccepted,
    rawInternalIdsVisibleCount,
    blockingReasons,
  };
}

export function validateAiEstimateQuantityTrace(input: {
  revision: EstimateDraftRevision | null | undefined;
}): AiEstimateQuantityTraceValidationResult {
  return validateTraceObject(buildAiEstimateQuantityExplanationTrace({ revision: input.revision }));
}
