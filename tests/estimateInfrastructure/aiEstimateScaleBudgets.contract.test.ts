import {
  AI_ESTIMATE_PLATFORM_SCALE_BUDGETS,
  validateAiEstimateScaleBudgets,
} from "../../src/lib/platform/platformScaleBudgets";

describe("AI estimate platform scale budgets", () => {
  it("locks the platform core scale floors and bounded page/package sizes", () => {
    const validation = validateAiEstimateScaleBudgets();

    expect(validation.scale_budgets_created).toBe(true);
    expect(validation.catalog_scale_budget_passed).toBe(true);
    expect(validation.history_50000_scale_budget_locked).toBe(true);
    expect(validation.pdf_package_scale_budget_passed).toBe(true);
    expect(validation.buyer_handoff_scale_budget_passed).toBe(true);
    expect(validation.web_android_corpus_budget_passed).toBe(true);
    expect(validation.semantic_1500_budget_passed).toBe(true);
    expect(validation.passed).toBe(true);
    expect(AI_ESTIMATE_PLATFORM_SCALE_BUDGETS.boqRowsAuditedMin).toBeGreaterThanOrEqual(296345);
  });
});
