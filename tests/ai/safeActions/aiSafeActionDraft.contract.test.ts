import { buildAiSafeActionDraft, composeAiSafeActionResultText } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("AI safe action draft contract", () => {
  it("creates a draft with sourceRefs, openLinks, diff, confirmation and no mutation", () => {
    const draft = buildAiSafeActionDraft({ actionKind: "procurement_purchase_draft" });
    expect(draft.draftPayload).toMatchObject({
      quantity: 60,
      required: 80,
      issued: 20,
      remaining: 0,
      finalPurchaseCreated: false,
    });
    expect(draft.sourceRefIds.length).toBeGreaterThan(0);
    expect(draft.openLinks.length).toBeGreaterThan(0);
    expect(composeAiSafeActionResultText(draft)).toContain("60");
    expectDraftIsSafe(draft);
  });
});
