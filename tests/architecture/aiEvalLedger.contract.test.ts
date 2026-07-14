import fs from "node:fs";
import path from "node:path";

import type { AiEvalCase } from "../../src/lib/aiPlatform/eval/AiEvalContract";
import { createInMemoryAiEvalLedgerStore } from "../../src/lib/aiPlatform/eval/AiEvalLedger";
import { aiEvalLedgerStoresRawPromptUnredacted } from "../../src/lib/aiPlatform/eval/redactAiEvalLedger";
import { runAiEvalCase, AI_EVAL_PROMPT_VERSION } from "../../src/lib/aiPlatform/eval/AiEvalRunner";
import { writeAiEvalLedger } from "../../src/lib/aiPlatform/eval/writeAiEvalLedger";
import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";

function loadGoldenCase(index: number): AiEvalCase {
  const fixture = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "../fixtures/aiPlatform/eval/aiEstimateGoldenEvalCases.json"),
    "utf8",
  ));
  return fixture.cases[index] as AiEvalCase;
}

describe("AI EvalOps ledger", () => {
  it("stores source-bound score records without raw prompt or token leakage", async () => {
    const store = createInMemoryAiEvalLedgerStore();
    const result = await runAiEvalCase(loadGoldenCase(15), {
      evalRunId: "ledger-eval-run",
      sourceSha: "ledger-source-sha",
      runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
      promptVersion: AI_EVAL_PROMPT_VERSION,
      providerKey: "sk-test-secret-token-12345678",
      modelKey: "eval-model",
    });
    const record = writeAiEvalLedger(store, result);

    expect(store.list()).toHaveLength(1);
    expect(record.sourceSha).toBe("ledger-source-sha");
    expect(record.promptVersion).toBe(AI_EVAL_PROMPT_VERSION);
    expect(record.providerKey).toBe("[redacted_token]");
    expect(record.scoreBreakdown.work_classification_score).toBe(1);
    expect(aiEvalLedgerStoresRawPromptUnredacted(record)).toBe(false);
  });
});
