import {
  AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET,
  validateAiEstimatePerformanceScaleBudget,
} from "../../src/lib/platform/aiEstimateScaleBudget";

describe("AI estimate performance scale budget", () => {
  it("locks 11610 catalog, 50k history, 100 web/android cases and no truncation budgets", () => {
    const validation = validateAiEstimatePerformanceScaleBudget();

    expect(validation.scale_budgets_created).toBe(true);
    expect(validation.catalog_11610_scale_budget_passed).toBe(true);
    expect(validation.history_50000_scale_budget_locked).toBe(true);
    expect(validation.history_page_size_bounded).toBe(true);
    expect(validation.semantic_1500_budget_passed).toBe(true);
    expect(validation.web_android_100_case_budget_passed).toBe(true);
    expect(validation.pdf_no_truncation_budget_passed).toBe(true);
    expect(validation.buyer_no_truncation_budget_passed).toBe(true);
    expect(AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET.approvedHistoryPageSizeMax).toBeLessThanOrEqual(25);
    expect(validation.passed).toBe(true);
  });
});
