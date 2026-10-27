import type { LocalRateSourcePolicy, PricedRowEvidenceInput } from "./localRateSourceTypes";

export function validateRateSourceEvidence(params: {
  policy: LocalRateSourcePolicy;
  pricedRows: readonly PricedRowEvidenceInput[];
}): { valid: boolean; failures: string[] } {
  const failures: string[] = [];
  if (params.policy.level !== "boq_only_manual_estimator_required" && !params.policy.sourceId) {
    failures.push("RATE_SOURCE_ID_REQUIRED");
  }
  for (const row of params.pricedRows) {
    if (row.unitPrice == null) continue;
    if (!row.sourceId || !row.sourceType || !row.sourceDate) {
      failures.push(`PRICED_ROW_SOURCE_REQUIRED:${row.rowId}`);
    }
  }
  return { valid: failures.length === 0, failures };
}
