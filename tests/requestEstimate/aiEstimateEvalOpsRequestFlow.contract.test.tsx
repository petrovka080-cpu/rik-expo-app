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

describe("AI EvalOps request estimate flow", () => {
  it("runs a request estimate case through the platform eval contract", async () => {
    const result = await runAiEvalCase(loadGoldenCase(15), {
      evalRunId: "request-flow-eval",
      sourceSha: "request-flow-source",
      runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
      promptVersion: AI_EVAL_PROMPT_VERSION,
    });

    expect(result.status).toBe("passed");
    expect(result.surface).toBe("estimate");
    expect(result.actual.workFamily).toBe("electric");
    expect(result.actual.parameterKeys).toEqual(expect.arrayContaining(["area_m2", "voltage_kv"]));
    expect(result.rawInternalIdsVisible).toBe(false);
  });
});
