import { makeAiSourceRefId } from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture, buildAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS permission-aware links", () => {
  it("disables links the role cannot open and enables links for allowed roles", () => {
    const foremanGraph = buildAiAppContextGraphFixture("foreman");
    const paymentRef = foremanGraph.sourceRefs.find((ref) => ref.id === makeAiSourceRefId("payment", "pay-77"));
    expect(paymentRef?.permission.canOpen).toBe(false);
    expect(paymentRef?.appLink).toBeUndefined();

    const accountantGraph = buildAiAppContextGraphFixture("accountant");
    const accountantPaymentRef = accountantGraph.sourceRefs.find((ref) => ref.id === makeAiSourceRefId("payment", "pay-77"));
    expect(accountantPaymentRef?.permission.canOpen).toBe(true);
    expect(accountantPaymentRef?.appLink?.route).toBe("/office/accountant");

    const foremanAnswer = answerAiAppContextGraphFixture("покажи заявки по первому этажу", "foreman");
    const disabledPaymentLink = foremanAnswer.answerRu.openLinks.find((link) => link.sourceRefId === makeAiSourceRefId("payment", "pay-77"));
    expect(disabledPaymentLink?.enabled).toBe(false);
  });
});
