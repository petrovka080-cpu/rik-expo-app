import fs from "node:fs";
import path from "node:path";

test("canary evaluation proof artifacts are present without rerunning prerequisite-sensitive proof", () => {
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

  const matrix = JSON.parse(fs.readFileSync(path.join(dir, "matrix.json"), "utf8")) as {
    final_status?: unknown;
    fake_green_claimed?: unknown;
  };
  expect(matrix.final_status).toBe("NO_GO_PREREQUISITE_NOT_GREEN");
  expect(matrix.fake_green_claimed).toBe(false);
});
