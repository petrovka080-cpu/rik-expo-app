import fs from "node:fs";
import path from "node:path";

test("limited public beta release guard requires kill switch rollback and telemetry proof", () => {
  const guard = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8");
  const proof = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiEstimateLimitedPublicBetaExecutionProof.ts"), "utf8");
  const core = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/aiEstimateLimitedPublicBetaExecutionCore.ts"), "utf8");
  expect(guard).toContain("ai-estimate-limited-public-beta-execution-proof");
  expect(proof).toContain("writeLimitedPublicBetaReplayArtifacts");
  expect(core).toContain("telemetry_audit.json");
  expect(core).toContain("kill_switch_drill.json");
  expect(core).toContain("rollback_drill.json");
});
