import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("Foreman workflow buttons", () => {
  it("keeps acts, reports and subcontract work draft/read-only until human review", () => {
    for (const screenId of ["foreman.main", "foreman.ai.quick_modal", "foreman.subcontract", "contractor.main"]) {
      const pack = getAiScreenWorkflowPack({ role: "foreman", context: "foreman", screenId });
      expect(pack.readyBlocks.length).toBeGreaterThan(0);
      expect(pack.actions.every((action) => action.canExecuteDirectly === false)).toBe(true);
    }
  });
});
