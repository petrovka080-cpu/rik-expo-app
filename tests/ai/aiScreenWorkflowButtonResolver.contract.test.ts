import { getAiScreenWorkflowPack } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { resolveAiScreenWorkflowButton } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowButtonResolver";

describe("AI screen workflow button resolver", () => {
  it("resolves safe, draft, approval and forbidden buttons without direct execution", () => {
    const pack = getAiScreenWorkflowPack({ role: "buyer", context: "buyer", screenId: "buyer.main" });
    const statuses = pack.actions.map((action) => resolveAiScreenWorkflowButton(action).status);

    expect(statuses).toEqual(expect.arrayContaining([
      "clickable_safe_read",
      "clickable_draft_only",
      "routes_to_approval_ledger",
      "forbidden_with_reason",
    ]));
    expect(pack.actions.every((action) => action.canExecuteDirectly === false)).toBe(true);
  });
});
