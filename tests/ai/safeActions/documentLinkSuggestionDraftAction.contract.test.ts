import { createDocumentLinkSuggestionDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("document link suggestion draft action", () => {
  it("prepares PDF invoice link suggestion without final document link", () => {
    const draft = createDocumentLinkSuggestionDraftAction();
    expect(draft.draftPayload).toMatchObject({
      amountKgs: 125000,
      suggestedPayment: "№77",
      suggestedRequest: "№124",
      finalLinkCreated: false,
    });
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("документ не связан финально");
    expectDraftIsSafe(draft);
  });
});
