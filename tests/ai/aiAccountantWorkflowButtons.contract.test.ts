import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("Accountant workflow buttons", () => {
  it("keeps accountant workflows safe, draft-only, approval-routed or forbidden", () => {
    for (const screenId of ["accountant.main", "accountant.payment", "accountant.history"]) {
      const kinds = getAiScreenWorkflowPack({ role: "accountant", context: "accountant", screenId }).actions.map((action) => action.actionKind);
      expect(kinds).toEqual(expect.arrayContaining(["safe_read", "draft_only", "approval_required", "forbidden"]));
    }
  });
});
