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

describe("AI EvalOps consumer estimate flow", () => {
  it("shows missing construction parameters through the runtime answer", async () => {
    const result = await runAiEvalCase(loadGoldenCase(4), {
      evalRunId: "consumer-flow-eval",
      sourceSha: "consumer-flow-source",
      runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
      promptVersion: AI_EVAL_PROMPT_VERSION,
    });

    expect(result.status).toBe("passed");
    expect(result.actual.workFamily).toBe("sewerage");
    expect(result.actual.missingQuestionsRu).toContain("Нужно уточнить исходные данные для профессиональной сметы.");
    expect(result.groundingPassed).toBe(true);
  });
});
