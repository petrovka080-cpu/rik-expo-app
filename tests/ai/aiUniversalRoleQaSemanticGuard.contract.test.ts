import { validateUniversalRoleQaAnswer } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: semantic guard", () => {
  it("fails topic/entity mismatch and passes correct answer", () => {
    const answer = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director", { web: true });
    expect(validateUniversalRoleQaAnswer(answer, {
      intent: "construction_estimate",
      entity: "construction_work_type",
      requiredTermsRu: ["асфальт"],
      forbiddenTermsRu: ["платеж готов"],
    }).passed).toBe(true);
    expect(validateUniversalRoleQaAnswer(answer, { intent: "finance_payment_review" }).failureReason).toBe("intent_mismatch");
  });
});
