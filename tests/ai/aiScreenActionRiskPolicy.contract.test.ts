import { AI_TOOL_NAMES } from "../../src/features/ai/tools/aiToolRegistry";
import { AI_SCREEN_ACTION_REGISTRY } from "../../src/features/ai/screenActions/aiScreenActionRegistry";
import { validateAiScreenActionRegistry } from "../../src/features/ai/screenActions/aiScreenActionResolver";

describe("AI screen action risk policy", () => {
  it("blocks unknown tool references and requires evidence for every action", () => {
    const validation = validateAiScreenActionRegistry();
    const toolNames = new Set(AI_TOOL_NAMES);

    expect(validation.ok).toBe(true);
    expect(validation.unknownToolReferences).toHaveLength(0);
    expect(
      AI_SCREEN_ACTION_REGISTRY.flatMap((entry) => entry.visibleActions)
        .filter((action) => action.aiTool)
        .every((action) => toolNames.has(action.aiTool ?? "get_action_status")),
    ).toBe(true);
    expect(
      AI_SCREEN_ACTION_REGISTRY.every(
        (entry) =>
          entry.evidenceSources.length > 0 &&
          entry.visibleActions.every(
            (action) => action.evidenceRequired === true && action.evidenceSources.length > 0,
          ),
      ),
    ).toBe(true);
  });

  it("keeps high-risk actions approval-required and forbidden actions non-executable", () => {
    const actions = AI_SCREEN_ACTION_REGISTRY.flatMap((entry) => entry.visibleActions);

    expect(
      actions
        .filter((action) => action.riskLevel === "high")
        .every((action) => action.mode === "approval_required" && action.requiresApproval === true),
    ).toBe(true);
    expect(
      actions
        .filter((action) => action.riskLevel === "forbidden")
        .every((action) => action.mode === "forbidden" && action.forbiddenReason),
    ).toBe(true);
  });
});
