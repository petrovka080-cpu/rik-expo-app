import { createContractorRemarkResponseDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("contractor remark response draft action", () => {
  it("prepares a contractor response without closing remarks or promising payment", () => {
    const draft = createContractorRemarkResponseDraftAction();
    expect(draft.mode).toBe("draft_only");
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("замечание не закрыто");
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("оплата не обещана");
    expectDraftIsSafe(draft);
  });
});
