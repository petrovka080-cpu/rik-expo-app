import {
  auditAiEstimateUiHooksBusinessLogic,
  GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS,
} from "../../scripts/architecture/auditAiEstimateUiHooksBusinessLogic";

describe("AI estimate UI hooks boundary", () => {
  it("does not put BOQ, revision, ledger, PDF, or buyer package logic inside React hooks", () => {
    const result = auditAiEstimateUiHooksBusinessLogic();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_NO_BUSINESS_LOGIC_IN_UI_HOOKS);
    expect(result.ui_hook_business_logic_violations_count).toBe(0);
  });
});
