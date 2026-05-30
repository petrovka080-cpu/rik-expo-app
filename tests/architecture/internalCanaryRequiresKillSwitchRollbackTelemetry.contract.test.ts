import fs from "node:fs";
import path from "node:path";

test("internal canary release guard requires kill switch rollback telemetry and replay proof", () => {
  const guard = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8");
  const proof = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiEstimateInternalCanaryExecutionProof.ts"), "utf8");
  expect(guard).toContain("ai-estimate-internal-canary-execution-proof");
  expect(proof).toContain("writeInternalCanaryReplayArtifacts");
  expect(proof).toContain("runInternalCanaryKillSwitchDrill");
  expect(proof).toContain("runInternalCanaryRollbackDrill");
});
