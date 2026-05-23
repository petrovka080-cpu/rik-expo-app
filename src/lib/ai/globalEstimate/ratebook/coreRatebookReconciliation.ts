import type { GlobalEstimateTemplate } from "../globalEstimateTypes";
import {
  GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS,
  GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES,
} from "../templates/coreTemplateReconciliation";

export type GlobalEstimateTemplateRatebookReconciliationCase = {
  workKey: string;
  expectedRowCodes: readonly string[];
};

export const GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_RECONCILIATION_CASES: readonly GlobalEstimateTemplateRatebookReconciliationCase[] =
  GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS.map((workKey) => ({
    workKey,
    expectedRowCodes: GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES[workKey],
  }));

export function collectGlobalEstimateTemplateRowCodes(template: GlobalEstimateTemplate): string[] {
  return template.sections.flatMap((section) => section.rows.map((row) => row.code));
}

export function collectGlobalEstimateTemplateRateKeys(template: GlobalEstimateTemplate): string[] {
  return template.sections.flatMap((section) => section.rows.map((row) => row.rateKey));
}
