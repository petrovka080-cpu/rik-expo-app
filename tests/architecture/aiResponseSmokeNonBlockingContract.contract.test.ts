import { evaluateAiResponseSmokeNonBlockingContractGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI response smoke non-blocking architecture contract", () => {
  it("passes only when prompt pipeline proof is separate and response is canary-only", () => {
    const result = evaluateAiResponseSmokeNonBlockingContractGuardrail({
      projectRoot: process.cwd(),
    });

    expect(result.check).toEqual({
      name: "ai_response_smoke_non_blocking_contract",
      status: "pass",
      errors: [],
    });
    expect(result.summary.loadingTestIdPresent).toBe(true);
    expect(result.summary.releaseFlowsDelegatePromptProof).toBe(true);
    expect(result.summary.releaseFlowsDoNotRequireResponse).toBe(true);
    expect(result.summary.runnerObservesLoadingOrResponse).toBe(true);
    expect(result.summary.responseTimeoutCanaryNonBlocking).toBe(true);
  });
});
