import { evaluateAiKnowledgePreviewE2eContractGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI knowledge preview e2e architecture contract", () => {
  it("passes only when deterministic preview IDs replace prompt-block assertions", () => {
    const result = evaluateAiKnowledgePreviewE2eContractGuardrail({
      projectRoot: process.cwd(),
    });

    expect(result.check).toEqual({
      name: "ai_knowledge_preview_e2e_contract",
      status: "pass",
      errors: [],
    });
    expect(result.summary.deterministicPreviewPresent).toBe(true);
    expect(result.summary.maestroFlowsDoNotAssertPromptBlock).toBe(true);
    expect(result.summary.llmSmokeResponseElementOnly).toBe(true);
  });
});
