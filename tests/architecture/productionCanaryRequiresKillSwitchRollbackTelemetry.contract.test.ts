import fs from "node:fs";
import path from "node:path";

test("production canary release guard requires kill switch rollback and telemetry proof", () => {
  const guard = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8");
  const proof = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiEstimateProductionCanaryProof.ts"), "utf8");
  expect(guard).toContain("ai-estimate-production-canary-control-plane-proof");
  expect(proof).toContain("writeProductionCanaryPolicyArtifacts");
  expect(proof).toContain("writeProductionCanaryRollbackAudit");
  expect(proof).toContain("writeProductionCanaryReplayArtifacts");
});
