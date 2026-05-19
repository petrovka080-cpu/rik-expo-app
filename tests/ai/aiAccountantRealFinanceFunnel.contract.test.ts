import {
  ACCOUNTANT_REAL_FINANCE_WAVE,
  answerAccountantFinanceQuestion,
  buildAccountantAiBlockViewModel,
  buildAccountantRealFinanceMatrix,
  listAccountantDataProviders,
} from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant real finance funnel", () => {
  it("builds a source-backed finance funnel without mutations", () => {
    const context = buildAccountantRealFinanceFixture();
    const answer = answerAccountantFinanceQuestion({
      context,
      questionRu: "почему этот счет можно или нельзя оплачивать",
    });

    expect(answer.answerRu).toContain("Счет");
    expect(answer.answerRu).toContain("Цепочка основания");
    expect(answer.answerRu).toContain("Источники");
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:invoice:INV-204", "src:act:ACT-701"]));
    expect(answer.changedData).toBe(false);
    expect(answer.paymentCreated).toBe(false);
    expect(answer.postingCreated).toBe(false);
    expect(answer.invoiceMutated).toBe(false);
    expect(answer.autoApproval).toBe(false);
    expect(answer.fakeInvoiceCreated).toBe(false);
    expect(answer.fakeActCreated).toBe(false);
    expect(answer.genericAnswerUsed).toBe(false);
  });

  it("exposes a focused accountant AI block model", () => {
    const model = buildAccountantAiBlockViewModel(buildAccountantRealFinanceFixture());

    expect(model.titleRu).toBe("Готово от AI");
    expect(model.invoicesCount).toBe(1);
    expect(model.paymentsCount).toBe(1);
    expect(model.visibleActionLabelsRu.length).toBe(5);
    expect(model.inputPlaceholderRu).toContain("Спросить");
  });

  it("has required pure providers and a green matrix when proofs pass", () => {
    expect(listAccountantDataProviders().every((provider) => provider.pure && !provider.usesHooks && !provider.dbWrites)).toBe(true);

    const matrix = buildAccountantRealFinanceMatrix({
      webFreeTextQuestionsPassed: true,
      webAllVisibleButtonsClicked: true,
      androidAccountantQuestionPassed: true,
      androidButtonsTargetable: true,
      releaseVerifyPassed: true,
    });

    expect(matrix.wave).toBe(ACCOUNTANT_REAL_FINANCE_WAVE);
    expect(matrix.final_status).toBe("GREEN_AI_ACCOUNTANT_REAL_FINANCE_FUNNEL_READY");
    expect(matrix.direct_payment_paths_found).toBe(0);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
