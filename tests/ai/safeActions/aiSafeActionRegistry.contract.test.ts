import { AI_SAFE_ACTION_KINDS, getAiSafeActionRegistryEntry, listAiSafeActionRegistryEntries } from "../../../src/lib/ai/safeActions";

describe("AI safe action registry", () => {
  it("registers all action families with source refs and existing ledger action types", () => {
    const entries = listAiSafeActionRegistryEntries();
    expect(entries.map((entry) => entry.actionKind)).toEqual([...AI_SAFE_ACTION_KINDS]);
    expect(getAiSafeActionRegistryEntry("procurement_purchase_draft")).toMatchObject({
      mode: "approval_required",
      draftType: "purchase_request",
      ledgerActionType: "draft_request",
    });
    expect(entries.every((entry) => entry.requiredSourceRefIds.length > 0)).toBe(true);
  });
});
