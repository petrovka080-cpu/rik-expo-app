import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";
import { answerAiScreenNativeQuestion } from "../../src/features/ai/screenNative/aiScreenNativeQuestionAnswerEngine";

describe("AI screen-native question answer engine", () => {
  it("answers from the hydrated screen pack", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
      searchParams: {
        paymentSupplierName: "Evidence Supplier",
        paymentRisk: "amount above supplier history",
        paymentEvidence: "payment:1248",
      },
    });

    const answer = answerAiScreenNativeQuestion({
      pack,
      question: "Что сегодня критично по оплатам?",
    });

    expect(answer?.providerCallAllowed).toBe(false);
    expect(answer?.answer).toContain("Evidence Supplier");
    expect(answer?.answer).toContain("amount above supplier history");
    expect(answer?.answer).toContain("Опасные действия напрямую не выполняю");
  });
});
