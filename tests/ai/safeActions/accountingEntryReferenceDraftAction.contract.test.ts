import { createAccountingEntryReferenceDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("accounting entry reference draft action", () => {
  it("keeps accounting entry as a reviewed reference, not a final posting", () => {
    const draft = createAccountingEntryReferenceDraftAction();
    expect(draft.preconditions.some((item) => item.status === "requires_review")).toBe(true);
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("проводка не утверждена");
    expectDraftIsSafe(draft);
  });
});
