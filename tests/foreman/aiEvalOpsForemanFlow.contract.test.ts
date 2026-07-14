import fs from "node:fs";
import path from "node:path";

import type { AiEvalCase } from "../../src/lib/aiPlatform/eval/AiEvalContract";
import { runAiEvalCase, AI_EVAL_PROMPT_VERSION } from "../../src/lib/aiPlatform/eval/AiEvalRunner";
import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";

function loadGoldenCase(index: number): AiEvalCase {
  const fixture = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "../fixtures/aiPlatform/eval/aiEstimateGoldenEvalCases.json"),
    "utf8",
  ));
  return fixture.cases[index] as AiEvalCase;
}

describe("AI EvalOps foreman estimate flow", () => {
  it("keeps field construction parameters editable through the eval contract", async () => {
    const testCase = { ...loadGoldenCase(2), role: "foreman" as const };
    const result = await runAiEvalCase(testCase, {
      evalRunId: "foreman-flow-eval",
      sourceSha: "foreman-flow-source",
      runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
      promptVersion: AI_EVAL_PROMPT_VERSION,
    });

    expect(result.status).toBe("passed");
    expect(result.role).toBe("foreman");
    expect(result.actual.workFamily).toBe("road_construction");
    expect(result.actual.parameterKeys).toEqual(expect.arrayContaining(["length_m", "width_m", "layers_count"]));
  });
});
