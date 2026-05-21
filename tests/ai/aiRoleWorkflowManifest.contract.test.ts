import { AI_ROLE_WORKFLOW_MANIFESTS } from "../../src/lib/ai/roleBusinessCopilots";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: workflow manifest", () => {
  it("registers all role workflow manifests with safe action modes", () => {
    expect(AI_ROLE_WORKFLOW_MANIFESTS).toHaveLength(18);
    expect(new Set(AI_ROLE_WORKFLOW_MANIFESTS.map((item) => item.workflowId)).size).toBe(18);
    expect(AI_ROLE_WORKFLOW_MANIFESTS.every((item) => item.requiredAnswerSections.includes("next_step"))).toBe(true);
    expect(AI_ROLE_WORKFLOW_MANIFESTS.every((item) => item.forbiddenFinalActions.includes("final_submit"))).toBe(true);
    expect(AI_ROLE_WORKFLOW_MANIFESTS.every((item) => !item.allowedActionModes.includes("forbidden" as never))).toBe(true);
  });
});
