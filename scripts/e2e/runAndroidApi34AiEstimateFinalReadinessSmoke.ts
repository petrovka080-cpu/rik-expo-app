import { writeAiEstimateEnterpriseFinalReadinessArtifacts } from "../audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";
import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";

export function runAndroidApi34AiEstimateFinalReadinessSmoke() {
  const evidence = resolveCanonicalApi34Evidence({
    write: true,
    allowChangedFile: (file) =>
      file.startsWith("scripts/audit/") ||
      file.startsWith("scripts/e2e/") ||
      file.startsWith("scripts/release/") ||
      file.startsWith("tests/finalReadiness/") ||
      file.startsWith("tests/e2e/") ||
      file.startsWith("tests/architecture/finalReadiness") ||
      file === "tests/architecture/aiEstimateFinalReadinessNoProductionRollout.contract.test.ts" ||
      file === "tests/release/aiEstimateFinalReadinessReleaseGate.contract.test.ts" ||
      file.startsWith("artifacts/S_AI_ESTIMATE_FINAL_READINESS/") ||
      file === "src/lib/ai/observability/" ||
      file.startsWith("src/lib/ai/observability/") ||
      file === "src/lib/ai/killSwitch/" ||
      file.startsWith("src/lib/ai/killSwitch/") ||
      file === "src/lib/ai/rollback/" ||
      file.startsWith("src/lib/ai/rollback/"),
    allowedRuntimeReuseReason: "final readiness audit adds non-estimate observability, rollback, kill-switch proof only",
  });
  writeAiEstimateEnterpriseFinalReadinessArtifacts({
    verification: { androidApi34SmokePassed: evidence.ok },
    ignoreNonArtifactDirtyPaths: true,
  });
  if (!evidence.ok) throw new Error(`ANDROID_API34_PROOF_MISSING:${evidence.reason}`);
  return evidence;
}

if (require.main === module) {
  runAndroidApi34AiEstimateFinalReadinessSmoke();
}
