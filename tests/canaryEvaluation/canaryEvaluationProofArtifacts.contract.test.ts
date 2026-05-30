import fs from "node:fs";
import path from "node:path";

import { runAiEstimateCanaryEvaluationProof } from "../../scripts/e2e/runAiEstimateCanaryEvaluationProof";

test("canary evaluation proof artifacts are present after runtime proof", () => {
  runAiEstimateCanaryEvaluationProof();
  const dir = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_CANARY_EVALUATION");
  const required = [
    "prerequisite_ledger.json",
    "decision_policy.json",
    "internal_canary_summary.json",
    "error_budget_evaluation.json",
    "telemetry_evaluation.json",
    "feedback_evaluation.json",
    "rollout_decision.json",
    "web_results.json",
    "android_api34_results.json",
    "pdf_text_extract.json",
    "matrix.json",
    "proof.md",
  ];
  for (const file of required) {
    expect(fs.existsSync(path.join(dir, file))).toBe(true);
  }
});
