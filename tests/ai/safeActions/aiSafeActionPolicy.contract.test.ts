import { AI_SAFE_ACTION_POLICY, isAiSafeActionFinalMutationBlocked } from "../../../src/lib/ai/safeActions";

describe("AI safe action policy", () => {
  it("keeps answer pipeline read-only and blocks final business mutations", () => {
    expect(AI_SAFE_ACTION_POLICY).toMatchObject({
      answerPipelineReadOnly: true,
      actionDraftRequiresHumanClick: true,
      finalExecutionRequiresApprovalPolicy: true,
      sourceRefsRequired: true,
      preconditionsRequired: true,
      impactDiffRequired: true,
      humanConfirmationRequired: true,
    });
    expect(AI_SAFE_ACTION_POLICY.forbiddenFinalActions).toEqual(
      expect.arrayContaining(["post_payment", "issue_stock", "close_work", "publish_marketplace_product"]),
    );
    expect(isAiSafeActionFinalMutationBlocked("procurement_purchase_draft")).toBe(true);
  });
});
