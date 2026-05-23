import type { GlobalEstimateResult } from "./globalEstimateTypes";
import { validateGlobalEstimateResult } from "./validateGlobalEstimateResult";

export class UnsafeGlobalEstimateOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeGlobalEstimateOutputError";
  }
}

export function assertGlobalEstimateResultSafe(result: GlobalEstimateResult): asserts result is GlobalEstimateResult {
  if (result.outputContract.format !== "professional_boq") {
    throw new UnsafeGlobalEstimateOutputError("GLOBAL_ESTIMATE_REQUIRES_PROFESSIONAL_BOQ");
  }
  if (!result.locale.locale || !result.locale.currency) {
    throw new UnsafeGlobalEstimateOutputError("GLOBAL_ESTIMATE_REQUIRES_LOCALE_AND_CURRENCY");
  }
  if (!result.outputContract.hasMaterialsSection || !result.outputContract.hasLaborSection) {
    throw new UnsafeGlobalEstimateOutputError("GLOBAL_ESTIMATE_REQUIRES_MATERIALS_AND_LABOR");
  }
  if (!result.outputContract.hasGrandTotal || result.totals.grandTotal <= 0) {
    throw new UnsafeGlobalEstimateOutputError("GLOBAL_ESTIMATE_REQUIRES_GRAND_TOTAL");
  }

  for (const section of result.sections) {
    for (const row of section.rows) {
      if (!row.sourceId || row.unitPrice <= 0 || row.total < 0 || row.sourceEvidence.length === 0) {
        throw new UnsafeGlobalEstimateOutputError(`GLOBAL_ESTIMATE_ROW_REQUIRES_BACKEND_PRICE_SOURCE:${row.rowNumber}`);
      }
      if (row.sourceEvidence.some((evidence) => !evidence.sourceId || !evidence.label || !evidence.checkedAt)) {
        throw new UnsafeGlobalEstimateOutputError(`GLOBAL_ESTIMATE_ROW_REQUIRES_SOURCE_EVIDENCE:${row.rowNumber}`);
      }
      if (row.confidence === "high" && row.sourceEvidence.some((evidence) => evidence.freshness === "stale" || evidence.freshness === "expired" || evidence.freshness === "unknown")) {
        throw new UnsafeGlobalEstimateOutputError(`GLOBAL_ESTIMATE_ROW_STALE_SOURCE_CANNOT_BE_HIGH_CONFIDENCE:${row.rowNumber}`);
      }
    }
  }

  if (result.tax.taxType !== "unknown" && !result.sources.some((source) => /tax/i.test(source.id) || /tax|vat|gst|nds|НДС/i.test(source.label))) {
    throw new UnsafeGlobalEstimateOutputError("GLOBAL_ESTIMATE_TAX_REQUIRES_TAX_RULE_SOURCE");
  }

  if (result.tax.taxType === "unknown" && !result.tax.warning) {
    throw new UnsafeGlobalEstimateOutputError("GLOBAL_ESTIMATE_UNKNOWN_TAX_REQUIRES_WARNING");
  }

  const validation = validateGlobalEstimateResult(result);
  if (!validation.passed) {
    const firstIssue = validation.issues[0];
    throw new UnsafeGlobalEstimateOutputError(`${firstIssue.code}:${firstIssue.path}`);
  }
}

export function assertProfessionalBoqAnswer(answer: string): void {
  const checks: [boolean, string][] = [
    [answer.includes("|") && answer.includes("---"), "GLOBAL_ESTIMATE_ANSWER_REQUIRES_TABLE"],
    [/1\.1|1\.2|2\.1/.test(answer), "GLOBAL_ESTIMATE_ANSWER_REQUIRES_LINE_NUMBERS"],
    [/Материалы|Materials/i.test(answer), "GLOBAL_ESTIMATE_ANSWER_REQUIRES_MATERIALS_SECTION"],
    [/Работы|Labor/i.test(answer), "GLOBAL_ESTIMATE_ANSWER_REQUIRES_LABOR_SECTION"],
    [/ИТОГО|TOTAL|Grand total/i.test(answer), "GLOBAL_ESTIMATE_ANSWER_REQUIRES_TOTAL"],
    [/Налог|Tax|VAT|GST|sales tax/i.test(answer), "GLOBAL_ESTIMATE_ANSWER_REQUIRES_TAX_STATUS"],
    [/уточните|clarify/i.test(answer), "GLOBAL_ESTIMATE_ANSWER_REQUIRES_CLARIFYING_QUESTIONS"],
  ];
  const failed = checks.find(([passed]) => !passed);
  if (failed) throw new UnsafeGlobalEstimateOutputError(failed[1]);
}

export function assertNoLlmPriceOrTaxWithoutBackendResult(result: GlobalEstimateResult | null | undefined): asserts result is GlobalEstimateResult {
  if (!result) {
    throw new UnsafeGlobalEstimateOutputError("GLOBAL_ESTIMATE_BACKEND_RESULT_REQUIRED_BEFORE_PRICE_OR_TAX_OUTPUT");
  }
  assertGlobalEstimateResultSafe(result);
}
