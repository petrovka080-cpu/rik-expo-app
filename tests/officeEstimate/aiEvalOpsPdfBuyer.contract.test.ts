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

describe("AI EvalOps PDF buyer handoff flow", () => {
  it("keeps buyer-facing estimate eval output grounded and source-bound", async () => {
    const testCase = { ...loadGoldenCase(12), role: "buyer" as const };
    const result = await runAiEvalCase(testCase, {
      evalRunId: "pdf-buyer-flow-eval",
      sourceSha: "pdf-buyer-flow-source",
      runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
      promptVersion: AI_EVAL_PROMPT_VERSION,
    });

    expect(result.status).toBe("passed");
    expect(result.role).toBe("buyer");
    expect(result.sourceSha).toBe("pdf-buyer-flow-source");
    expect(result.actual.workFamily).toBe("bridge");
    expect(result.piiRedactionPassed).toBe(true);
    expect(result.rawInternalIdsVisible).toBe(false);
  });
});
