import { createProcurementPurchaseDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("procurement purchase draft action", () => {
  it("prepares a 60 sheet GKL purchase draft without final purchase", () => {
    const draft = createProcurementPurchaseDraftAction();
    expect(draft.draftPayload).toMatchObject({
      quantity: 60,
      required: 80,
      issued: 20,
      remaining: 0,
      finalPurchaseCreated: false,
    });
    expect(draft.approvalRoute?.required).toBe(true);
    expectDraftIsSafe(draft);
  });
});
