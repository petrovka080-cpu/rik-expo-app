import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("Documents workflow buttons", () => {
  it("keeps document and report workflows draft/read-only without signing or deletion", () => {
    for (const screenId of ["documents.main", "reports.modal", "agent.documents.knowledge"]) {
      const pack = getAiScreenWorkflowPack({ role: "unknown", context: "reports", screenId });
      expect(pack.actions.some((action) => action.actionKind === "draft_only" || action.actionKind === "safe_read")).toBe(true);
      expect(pack.actions.every((action) => action.canExecuteDirectly === false)).toBe(true);
    }
  });
});
