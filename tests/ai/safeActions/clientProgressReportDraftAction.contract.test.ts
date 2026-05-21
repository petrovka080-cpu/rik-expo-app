import { createClientProgressReportDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("client progress report draft action", () => {
  it("prepares a client-visible report draft without exposing internal finance", () => {
    const draft = createClientProgressReportDraftAction();
    expect(draft.draftPayload).toMatchObject({
      completedTasks: 5,
      clientVisibleOnly: true,
      finalReportSent: false,
    });
    expect(draft.approvalRoute?.approvalType).toBe("client_report_review");
    expectDraftIsSafe(draft);
  });
});
