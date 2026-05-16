import { getAiRoleScreenAssistantPack } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantEngine";
import { answerAiRoleScreenQuestion } from "../../src/features/ai/realAssistants/aiRoleScreenQuestionAnswerEngine";

describe("AI role-screen question answer engine", () => {
  it("answers accountant questions from the hydrated payment pack", () => {
    const pack = getAiRoleScreenAssistantPack({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
      searchParams: {
        paymentSupplierName: "Evidence Supplier",
        paymentAmountLabel: "1 200 000 ₸",
        paymentTotalAmountLabel: "4 850 000 ₸",
        paymentRisk: "сумма выше обычной истории",
        paymentMissingDocument: "подтверждение доставки",
        paymentEvidence: "payment:1248",
      },
    });
    const answer = answerAiRoleScreenQuestion({
      pack,
      question: "Что сегодня критично по оплатам?",
    });

    expect(answer?.providerCallAllowed).toBe(false);
    expect(answer?.answer).toContain("Evidence Supplier");
    expect(answer?.answer).toContain("rationale");
    expect(answer?.answer).toContain("согласование");
  });
});
