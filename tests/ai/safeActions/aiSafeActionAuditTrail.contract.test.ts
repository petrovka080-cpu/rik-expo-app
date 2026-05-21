import { createSafeActionDraftFixture } from "./safeActionsTestFixtures";

describe("AI safe action audit trail", () => {
  it("records draft proposal, preconditions and impact diff events without unsafe payloads", () => {
    const draft = createSafeActionDraftFixture("procurement_purchase_draft");
    expect(draft.auditTrail.map((event) => event.event)).toEqual([
      "draft_proposed_by_ai",
      "preconditions_checked",
      "impact_diff_shown",
    ]);
    expect(draft.auditTrail.every((event) => event.safeToShowToUser)).toBe(true);
  });
});
