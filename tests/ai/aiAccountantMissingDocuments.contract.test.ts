import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantMissingSourceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant missing documents", () => {
  it("surfaces missing primary documents without fabricating them", () => {
    const answer = answerAccountantAction({
      context: buildAccountantMissingSourceFixture(),
      actionId: "missing_documents_for_payment",
    });

    expect(answer.answerKind).toBe("document_gap_check");
    expect(answer.documentGaps.length).toBeGreaterThan(0);
    expect(answer.fakeDocumentCreated).toBe(false);
    expect(answer.fakeWaybillCreated).toBe(false);
  });
});
