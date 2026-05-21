import {
  runAiRoleBusinessWorkflowSuite,
  buildAiRoleBusinessCopilotsProofMatrix,
  AI_ROLE_WORKFLOW_MANIFESTS,
} from "../../src/lib/ai/roleBusinessCopilots";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: core", () => {
  it("returns real workflow answers for all role copilots", () => {
    const traces = runAiRoleBusinessWorkflowSuite();
    const matrix = buildAiRoleBusinessCopilotsProofMatrix({
      answers: traces.map((trace) => trace.answer),
      safetyResults: traces.map((trace) => trace.safety),
      manifestCount: AI_ROLE_WORKFLOW_MANIFESTS.length,
    });

    expect(traces).toHaveLength(10);
    expect(traces.every((trace) => trace.safety.passed)).toBe(true);
    expect(matrix.final_status).toBe("GREEN_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS_READY");
    expect(matrix.workflow_answers_have_real_numeric_facts).toBe(true);
    expect(matrix.workflow_answers_have_source_refs).toBe(true);
    expect(matrix.workflow_answers_have_open_links).toBe(true);
  });
});
