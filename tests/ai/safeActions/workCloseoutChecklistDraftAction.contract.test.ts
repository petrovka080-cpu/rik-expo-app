import { createWorkCloseoutChecklistDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("work closeout checklist draft action", () => {
  it("prepares a closeout checklist without closing work", () => {
    const draft = createWorkCloseoutChecklistDraftAction();
    expect(draft.mode).toBe("draft_only");
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("работа не закрыта");
    expectDraftIsSafe(draft);
  });
});
