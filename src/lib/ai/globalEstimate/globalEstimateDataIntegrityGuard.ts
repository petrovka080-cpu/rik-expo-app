import { GLOBAL_RATE_MATERIALS, GLOBAL_RATE_WORKS, GLOBAL_TAX_RULES } from "./globalEstimateSeedData";
import { getGlobalEstimateTemplateRows, verifyGlobalEstimateTemplateCoverage } from "./globalEstimateTemplateService";
import type { GlobalEstimateResult } from "./globalEstimateTypes";
import { GLOBAL_WORK_TYPE_DEFINITIONS } from "./globalWorkTypeResolver";
import { resolveGlobalPriceSourceFreshness } from "./dataOps/globalPriceSourceFreshnessService";

export type GlobalEstimateDataIntegrityReport = {
  passed: boolean;
  blockers: string[];
  warnings: string[];
};

export function assertGlobalEstimateDataIntegrity(result: GlobalEstimateResult): GlobalEstimateDataIntegrityReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const sourceIds = new Set(result.sources.map((source) => source.id));

  for (const section of result.sections) {
    for (const row of section.rows) {
      if (row.unitPrice > 0 && !row.sourceId) blockers.push(`GLOBAL_ESTIMATE_PRICE_WITHOUT_SOURCE:${row.rowNumber}`);
      if (row.sourceId && !sourceIds.has(row.sourceId)) blockers.push(`GLOBAL_ESTIMATE_SOURCE_NOT_FOUND:${row.sourceId}`);
    }
  }
  if (result.tax.taxAmount > 0) {
    const taxSourcePresent = result.sources.some((source) => /tax|vat|gst|nds|sales/i.test(source.id + source.label));
    if (!taxSourcePresent) blockers.push("GLOBAL_ESTIMATE_TAX_WITHOUT_RULE_SOURCE");
  }
  if (result.confidence === "high") {
    for (const source of result.sources) {
      const freshness = resolveGlobalPriceSourceFreshness(source.checkedAt);
      if (freshness.confidence !== "high") blockers.push(`GLOBAL_ESTIMATE_HIGH_CONFIDENCE_WITH_STALE_SOURCE:${source.id}`);
    }
  }

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
  };
}

export function buildGlobalEstimateReferenceDataIntegrityReport(): GlobalEstimateDataIntegrityReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const templateCoverage = verifyGlobalEstimateTemplateCoverage();
  if (!templateCoverage.passed) {
    blockers.push(`GLOBAL_ESTIMATE_ACTIVE_WORK_TYPE_WITHOUT_TEMPLATE:${templateCoverage.missingWorkKeys.join(",")}`);
  }

  const rateKeys = new Set([...GLOBAL_RATE_MATERIALS, ...GLOBAL_RATE_WORKS].map((rate) => rate.rateKey));
  for (const workType of GLOBAL_WORK_TYPE_DEFINITIONS) {
    const rows = getGlobalEstimateTemplateRows(workType.workKey);
    if (rows.length === 0) blockers.push(`GLOBAL_ESTIMATE_WORK_TYPE_WITHOUT_TEMPLATE_ROWS:${workType.workKey}`);
    for (const row of rows) {
      if (!rateKeys.has(row.rateKey)) blockers.push(`GLOBAL_ESTIMATE_TEMPLATE_ROW_MISSING_RATE_KEY:${row.workKey}:${row.rateKey}`);
    }
  }
  for (const rate of [...GLOBAL_RATE_MATERIALS, ...GLOBAL_RATE_WORKS]) {
    if (!/^[A-Z]{3}$/.test(rate.currency)) blockers.push(`GLOBAL_ESTIMATE_INVALID_RATE_CURRENCY:${rate.id}`);
    if (!rate.unit) blockers.push(`GLOBAL_ESTIMATE_INVALID_RATE_UNIT:${rate.id}`);
    if (!rate.sourceLabel) blockers.push(`GLOBAL_ESTIMATE_RATE_SOURCE_MISSING:${rate.id}`);
    const freshness = resolveGlobalPriceSourceFreshness(rate.checkedAt);
    if (freshness.confidence !== "high") warnings.push(`GLOBAL_ESTIMATE_RATE_SOURCE_NOT_FRESH:${rate.id}`);
  }
  for (const rule of GLOBAL_TAX_RULES) {
    if (!rule.sourceLabel) blockers.push(`GLOBAL_ESTIMATE_TAX_RULE_SOURCE_MISSING:${rule.id}`);
  }
  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
  };
}
