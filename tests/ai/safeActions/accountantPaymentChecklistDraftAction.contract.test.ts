import { createAccountantPaymentChecklistDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("accountant payment checklist draft action", () => {
  it("prepares a checklist for 3 payments / 245000 KGS without payment post", () => {
    const draft = createAccountantPaymentChecklistDraftAction();
    expect(draft.draftPayload).toMatchObject({
      paymentsCount: 3,
      totalKgs: 245000,
      paymentPosted: false,
    });
    expect(draft.mode).toBe("draft_only");
    expectDraftIsSafe(draft);
  });
});
