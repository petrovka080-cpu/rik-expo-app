import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("Warehouse workflow buttons", () => {
  it("keeps receive, issue and stock changes out of direct AI execution", () => {
    for (const screenId of ["warehouse.main", "warehouse.incoming", "warehouse.issue"]) {
      const pack = getAiScreenWorkflowPack({ role: "warehouse", context: "warehouse", screenId });
      expect(pack.actions.every((action) => action.canExecuteDirectly === false)).toBe(true);
      expect(pack.actions.some((action) => action.actionKind === "forbidden")).toBe(true);
    }
  });
});
