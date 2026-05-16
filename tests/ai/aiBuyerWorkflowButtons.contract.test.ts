import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("Buyer workflow buttons", () => {
  it("routes buyer procurement workflow actions without direct orders or supplier confirmation", () => {
    for (const screenId of ["buyer.main", "buyer.requests", "buyer.request.detail", "procurement.copilot", "market.home", "supplier.showcase"]) {
      const pack = getAiScreenWorkflowPack({ role: "buyer", context: "buyer", screenId });
      expect(pack.actions.some((action) => action.actionKind === "forbidden" && action.forbiddenReason)).toBe(true);
      expect(pack.actions.some((action) => action.actionKind === "approval_required" && action.approvalRoute)).toBe(true);
    }
  });
});
