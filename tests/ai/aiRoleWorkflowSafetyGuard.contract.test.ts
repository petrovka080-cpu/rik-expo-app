import {
  answerAiRoleBusinessWorkflow,
  guardAiRoleWorkflowAnswer,
} from "../../src/lib/ai/roleBusinessCopilots";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: safety guard", () => {
  it("passes safe workflow answers and rejects final submit drafts", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "buyer_approved_request_to_purchase_draft",
      role: "buyer",
      screenId: "buyer",
      questionRu: "что купить по заявке №124",
    });
    expect(guardAiRoleWorkflowAnswer(answer)).toMatchObject({ passed: true });

    const broken = {
      ...answer,
      draft: answer.draft ? { ...answer.draft, finalSubmitAllowed: true as false } : answer.draft,
    };
    expect(guardAiRoleWorkflowAnswer(broken)).toMatchObject({
      passed: false,
      failureReason: "final_submit_without_human",
    });
  });
});
