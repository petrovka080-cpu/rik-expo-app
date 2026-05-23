import type { GlobalEstimateResult } from "../globalEstimateTypes";
import { scoreGlobalEstimateSourceEvidence } from "./globalExternalSourceQualityService";

export type SourceBackedEstimateGuardResult = {
  passed: boolean;
  blockers: string[];
};

export function assertSourceBackedGlobalEstimate(result: GlobalEstimateResult): SourceBackedEstimateGuardResult {
  const blockers: string[] = [];
  for (const section of result.sections) {
    for (const row of section.rows) {
      if (row.unitPrice > 0 && row.sourceEvidence.length === 0) {
        blockers.push(`GLOBAL_ESTIMATE_PRICED_ROW_WITHOUT_SOURCE_EVIDENCE:${row.rowNumber}`);
      }
      for (const evidence of row.sourceEvidence) {
        const quality = scoreGlobalEstimateSourceEvidence(evidence);
        if (quality.fakeLabel) blockers.push(`GLOBAL_ESTIMATE_FAKE_SOURCE_LABEL:${row.rowNumber}:${evidence.label}`);
        if ((evidence.freshness === "stale" || evidence.freshness === "expired" || evidence.freshness === "unknown") && row.confidence === "high") {
          blockers.push(`GLOBAL_ESTIMATE_STALE_SOURCE_HIGH_CONFIDENCE:${row.rowNumber}`);
        }
      }
      if (row.priceStatus === "manual_fallback" && row.sourceEvidence.every((evidence) => evidence.sourceType !== "manual_admin_rate")) {
        blockers.push(`GLOBAL_ESTIMATE_MANUAL_RATE_WITHOUT_SOURCE_NOTE:${row.rowNumber}`);
      }
    }
  }
  if (result.tax.taxAmount > 0 && !result.sources.some((source) => /tax|vat|gst|nds|sales/i.test(`${source.id} ${source.label}`))) {
    blockers.push("GLOBAL_ESTIMATE_TAX_AMOUNT_WITHOUT_TAX_SOURCE");
  }
  return {
    passed: blockers.length === 0,
    blockers,
  };
}
