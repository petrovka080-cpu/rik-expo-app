import fs from "node:fs";
import path from "node:path";

test("canary evaluation proof requires manual estimator review", () => {
  const proof = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiEstimateCanaryEvaluationProof.ts"),
    "utf8",
  );
  const core = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "aiEstimateCanaryEvaluationCore.ts"),
    "utf8",
  );
  expect(proof).toContain("writeCanaryEvaluationManualEstimatorReviewSample");
  expect(core).toContain("manual_estimator_review.json");
});
