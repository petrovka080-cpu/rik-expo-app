import { validateUniversalRoleQaAnswer } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: no topic mismatch", () => {
  it("does not return drywall/payment answer for asphalt estimate", () => {
    const answer = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director", { web: true });
    const guard = validateUniversalRoleQaAnswer(answer, {
      intent: "construction_estimate",
      entity: "construction_work_type",
      requiredTermsRu: ["асфальт"],
      forbiddenTermsRu: ["платеж готов", "ГКЛ перегородки"],
    });
    expect(guard.passed).toBe(true);
  });
});
