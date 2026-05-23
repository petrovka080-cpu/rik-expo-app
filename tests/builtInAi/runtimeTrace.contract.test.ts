import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";
import { getLastBuiltInAiRuntimeTrace } from "../../src/lib/ai/builtInAi";

describe("built-in AI runtime trace", () => {
  it("records selected route, tool, backend call and output contract", () => {
    const answer = expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.asphalt10000, "asphalt_paving");
    expect(answer.runtimeTrace).toMatchObject({
      detectedIntent: "estimate",
      selectedTool: "calculate_global_estimate",
      backendCalled: true,
      workKey: "asphalt_paving",
    });
    expect(getLastBuiltInAiRuntimeTrace()?.traceId).toBe(answer.runtimeTrace.traceId);
  });
});
