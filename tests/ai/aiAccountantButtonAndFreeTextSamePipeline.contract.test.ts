import { ACCOUNTANT_ACTION_QUESTION_MAP, answerAccountantAction, answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant buttons and free text use the same pipeline", () => {
  it("keeps action and free-text provider traces on accountantFinancePipeline", () => {
    const context = buildAccountantRealFinanceFixture({ screenId: "accountant.invoice.detail" });
    const action = ACCOUNTANT_ACTION_QUESTION_MAP.find((item) => item.actionId === "prepare_payment_rationale");
    expect(action).toBeTruthy();

    const buttonAnswer = answerAccountantAction({ context, actionId: "prepare_payment_rationale" });
    const freeTextAnswer = answerAccountantFinanceQuestion({ context, questionRu: action?.concreteQuestionRu ?? "" });

    expect(buttonAnswer.providerTrace[0]).toBe("accountantFinancePipeline");
    expect(freeTextAnswer.providerTrace[0]).toBe("accountantFinancePipeline");
    expect(buttonAnswer.directPaymentPathUsed).toBe(false);
    expect(freeTextAnswer.directPaymentPathUsed).toBe(false);
  });
});
