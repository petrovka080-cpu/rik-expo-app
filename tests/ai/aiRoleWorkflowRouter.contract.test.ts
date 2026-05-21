import {
  AI_ROLE_WORKFLOW_MANIFESTS,
  AI_ROLE_WORKFLOW_ROUTER,
  answerAiRoleBusinessWorkflow,
} from "../../src/lib/ai/roleBusinessCopilots";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: workflow router", () => {
  it("routes every manifest through the approved workflow router", () => {
    for (const manifest of AI_ROLE_WORKFLOW_MANIFESTS) {
      expect(AI_ROLE_WORKFLOW_ROUTER[manifest.workflowId]).toBeDefined();
      const answer = answerAiRoleBusinessWorkflow({
        workflowId: manifest.workflowId,
        role: manifest.role,
        screenId: manifest.role,
        questionRu: manifest.triggerQuestionsRu[0],
      });
      expect(answer.workflowId).toBe(manifest.workflowId);
      expect(answer.openLinks.length).toBeGreaterThan(0);
      expect(answer.safetyStatus.changedData).toBe(false);
    }
  });
});
