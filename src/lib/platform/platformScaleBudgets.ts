export type AiEstimatePlatformScaleBudgets = {
  catalogTemplatesMin: number;
  boqRowsAuditedMin: number;
  approvedHistoryScaleTarget: number;
  historyPageSizeMax: number;
  pdfRowsPerSnapshotMax: number;
  buyerHandoffRowsPerProcurementSubsetMax: number;
  webSmokeCorpusMin: number;
  androidSmokeCorpusMin: number;
  semanticAcceptanceCorpusMin: number;
};

export type AiEstimateScaleBudgetValidation = {
  scale_budgets_created: boolean;
  catalog_scale_budget_passed: boolean;
  boq_rows_audited_budget_passed: boolean;
  history_50000_scale_budget_locked: boolean;
  history_page_size_bounded: boolean;
  pdf_package_scale_budget_passed: boolean;
  buyer_handoff_scale_budget_passed: boolean;
  web_android_corpus_budget_passed: boolean;
  semantic_1500_budget_passed: boolean;
  passed: boolean;
  failures: string[];
  budgets: AiEstimatePlatformScaleBudgets;
};

export const AI_ESTIMATE_PLATFORM_SCALE_BUDGETS: AiEstimatePlatformScaleBudgets = {
  catalogTemplatesMin: 11610,
  boqRowsAuditedMin: 296345,
  approvedHistoryScaleTarget: 50000,
  historyPageSizeMax: 100,
  pdfRowsPerSnapshotMax: 2500,
  buyerHandoffRowsPerProcurementSubsetMax: 1500,
  webSmokeCorpusMin: 100,
  androidSmokeCorpusMin: 100,
  semanticAcceptanceCorpusMin: 1500,
};

export function validateAiEstimateScaleBudgets(
  budgets: AiEstimatePlatformScaleBudgets = AI_ESTIMATE_PLATFORM_SCALE_BUDGETS,
): AiEstimateScaleBudgetValidation {
  const catalog = budgets.catalogTemplatesMin >= 11610;
  const boqRows = budgets.boqRowsAuditedMin >= 296345;
  const history = budgets.approvedHistoryScaleTarget >= 50000;
  const historyPage = budgets.historyPageSizeMax > 0 && budgets.historyPageSizeMax <= 100;
  const pdf = budgets.pdfRowsPerSnapshotMax > 0 && budgets.pdfRowsPerSnapshotMax <= 2500;
  const buyer = budgets.buyerHandoffRowsPerProcurementSubsetMax > 0 && budgets.buyerHandoffRowsPerProcurementSubsetMax <= 1500;
  const webAndroid = budgets.webSmokeCorpusMin >= 100 && budgets.androidSmokeCorpusMin >= 100;
  const semantic = budgets.semanticAcceptanceCorpusMin >= 1500;
  const failures = [
    catalog ? "" : "catalog_scale_budget_below_11610",
    boqRows ? "" : "boq_rows_audited_budget_below_baseline",
    history ? "" : "history_50000_scale_budget_not_locked",
    historyPage ? "" : "history_page_size_unbounded",
    pdf ? "" : "pdf_package_scale_unbounded",
    buyer ? "" : "buyer_handoff_scale_unbounded",
    webAndroid ? "" : "web_android_corpus_budget_below_100",
    semantic ? "" : "semantic_acceptance_budget_below_1500",
  ].filter(Boolean);
  return {
    scale_budgets_created: true,
    catalog_scale_budget_passed: catalog,
    boq_rows_audited_budget_passed: boqRows,
    history_50000_scale_budget_locked: history,
    history_page_size_bounded: historyPage,
    pdf_package_scale_budget_passed: pdf,
    buyer_handoff_scale_budget_passed: buyer,
    web_android_corpus_budget_passed: webAndroid,
    semantic_1500_budget_passed: semantic,
    passed: failures.length === 0,
    failures,
    budgets,
  };
}
