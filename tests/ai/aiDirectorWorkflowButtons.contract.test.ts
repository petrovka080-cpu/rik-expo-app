import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("Director workflow buttons", () => {
  it("keeps director decisions approval-aware and non-automatic", () => {
    for (const screenId of ["director.dashboard", "director.finance", "director.reports", "ai.command_center", "approval.inbox"]) {
      const pack = getAiScreenWorkflowPack({ role: "director", context: "director", screenId });
      expect(pack.actions.some((action) => action.actionKind === "approval_required" && action.approvalRoute)).toBe(true);
      expect(JSON.stringify(pack)).not.toMatch(/auto-approve/i);
    }
  });
});
