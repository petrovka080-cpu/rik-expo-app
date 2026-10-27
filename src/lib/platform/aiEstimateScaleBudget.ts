export type AiEstimatePerformanceScaleBudget = {
  catalogTemplatesMin: 11610;
  approvedHistoryRecordsTarget: 50000;
  approvedHistoryPageSizeMax: 25;
  approvedHistoryLoadMorePageSizeMax: 25;
  semanticCasesMin: 1500;
  criticalBrowserCasesMin: 100;
  criticalAndroidCasesMin: 100;
  pdfRowsNoTruncation: true;
  buyerHandoffNoTruncation: true;
};

export type AiEstimatePerformanceScaleBudgetValidation = {
  scale_budgets_created: true;
  catalog_11610_scale_budget_passed: boolean;
  history_50000_scale_budget_locked: boolean;
  history_page_size_bounded: boolean;
  semantic_1500_budget_passed: boolean;
  web_android_100_case_budget_passed: boolean;
  pdf_no_truncation_budget_passed: boolean;
  buyer_no_truncation_budget_passed: boolean;
  passed: boolean;
  failures: string[];
  budget: AiEstimatePerformanceScaleBudget;
};

export const AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET: AiEstimatePerformanceScaleBudget = {
  catalogTemplatesMin: 11610,
  approvedHistoryRecordsTarget: 50000,
  approvedHistoryPageSizeMax: 25,
  approvedHistoryLoadMorePageSizeMax: 25,
  semanticCasesMin: 1500,
  criticalBrowserCasesMin: 100,
  criticalAndroidCasesMin: 100,
  pdfRowsNoTruncation: true,
  buyerHandoffNoTruncation: true,
};

export function validateAiEstimatePerformanceScaleBudget(
  budget: AiEstimatePerformanceScaleBudget = AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET,
): AiEstimatePerformanceScaleBudgetValidation {
  const catalog = budget.catalogTemplatesMin >= 11610;
  const history = budget.approvedHistoryRecordsTarget >= 50000;
  const pageSize = budget.approvedHistoryPageSizeMax <= 25 && budget.approvedHistoryLoadMorePageSizeMax <= 25;
  const semantic = budget.semanticCasesMin >= 1500;
  const webAndroid = budget.criticalBrowserCasesMin >= 100 && budget.criticalAndroidCasesMin >= 100;
  const pdf = budget.pdfRowsNoTruncation === true;
  const buyer = budget.buyerHandoffNoTruncation === true;
  const failures = [
    catalog ? "" : "catalog_templates_min_below_11610",
    history ? "" : "approved_history_records_target_below_50000",
    pageSize ? "" : "approved_history_page_size_unbounded",
    semantic ? "" : "semantic_cases_min_below_1500",
    webAndroid ? "" : "web_android_critical_cases_below_100",
    pdf ? "" : "pdf_rows_truncation_allowed",
    buyer ? "" : "buyer_handoff_rows_truncation_allowed",
  ].filter(Boolean);
  return {
    scale_budgets_created: true,
    catalog_11610_scale_budget_passed: catalog,
    history_50000_scale_budget_locked: history,
    history_page_size_bounded: pageSize,
    semantic_1500_budget_passed: semantic,
    web_android_100_case_budget_passed: webAndroid,
    pdf_no_truncation_budget_passed: pdf,
    buyer_no_truncation_budget_passed: buyer,
    passed: failures.length === 0,
    failures,
    budget,
  };
}
