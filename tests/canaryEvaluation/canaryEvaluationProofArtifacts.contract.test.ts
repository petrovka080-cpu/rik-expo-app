import fs from "node:fs";
import path from "node:path";

import { runAiEstimateCanaryEvaluationProof } from "../../scripts/e2e/runAiEstimateCanaryEvaluationProof";

test("canary evaluation proof artifacts are present after runtime proof", () => {
  runAiEstimateCanaryEvaluationProof();
  const dir = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_CANARY_EVALUATION");
  const required = [
    "prerequisite_ledger.json",
    "evidence_ledger.json",
    "real_usage_evaluation.json",
    "decision_policy.json",
    "internal_canary_summary.json",
    "error_budget.json",
    "feedback_evaluation.json",
    "manual_estimator_review.json",
    "rollout_decision.json",
    "limited_public_beta_plan.json",
    "rollback_redrill.json",
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
