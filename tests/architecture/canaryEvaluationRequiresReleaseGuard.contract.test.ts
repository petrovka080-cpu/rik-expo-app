import fs from "node:fs";
import path from "node:path";

test("canary evaluation release guard is wired", () => {
  const guard = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8");
  const proof = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiEstimateCanaryEvaluationProof.ts"), "utf8");
  expect(guard).toContain("ai-estimate-canary-evaluation-public-rollout-decision-proof");
  expect(proof).toContain("writeCanaryEvaluationEvidenceArtifacts");
  expect(proof).toContain("runAndroidApi34AiEstimateCanaryEvaluationSmoke");
});
