import { createOfficeReminderDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("office reminder draft action", () => {
  it("prepares a reminder draft without final send or task mutation", () => {
    const draft = createOfficeReminderDraftAction();
    expect(draft.draftPayload).toMatchObject({ finalSent: false });
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("напоминание не отправлено");
    expectDraftIsSafe(draft);
  });
});
