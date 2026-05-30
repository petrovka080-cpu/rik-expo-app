import {
  buildInternalCanaryProofMatrix,
  runInternalCanaryKillSwitchDrill,
  runInternalCanaryRollbackDrill,
  writeInternalCanaryJson,
  writeInternalCanaryPolicyArtifacts,
  writeInternalCanaryPrerequisiteLedger,
  writeInternalCanaryReplayArtifacts,
  writeInternalCanaryText,
  writeInternalCanaryWebArtifacts,
} from "./aiEstimateInternalCanaryCore";
import { runAndroidApi34AiEstimateInternalCanarySmoke } from "./runAndroidApi34AiEstimateInternalCanarySmoke";

export function runAiEstimateInternalCanaryExecutionProof() {
  const prerequisiteLedger = writeInternalCanaryPrerequisiteLedger();
  const policy = writeInternalCanaryPolicyArtifacts();
  const replay = writeInternalCanaryReplayArtifacts();
  const killSwitchDrill = runInternalCanaryKillSwitchDrill();
  const rollbackDrill = runInternalCanaryRollbackDrill();
  const web = writeInternalCanaryWebArtifacts();
  const android = runAndroidApi34AiEstimateInternalCanarySmoke().matrix;
  const proof = buildInternalCanaryProofMatrix({
    prerequisiteLedger,
    policy,
    replay,
    killSwitchDrill,
    rollbackDrill,
    web,
    android,
  });

  writeInternalCanaryJson("failures.json", proof.failures);
  writeInternalCanaryJson("matrix.json", proof.matrix);
  writeInternalCanaryText(
    "proof.md",
    [
      "# AI Estimate Internal Canary Execution",
      "",
      `Status: ${proof.matrix.final_status}`,
      `Decision: ${proof.matrix.decision}`,
      `Prerequisites green: ${String(proof.matrix.all_prerequisites_green)}`,
      `Production rollout enabled: ${String(proof.matrix.production_rollout_enabled)}`,
      `Public canary enabled: ${String(proof.matrix.public_canary_enabled)}`,
      `Internal canary enabled by default: ${String(proof.matrix.internal_canary_enabled_by_default)}`,
      `Replay: ${proof.matrix.replay_sessions_passed}/${proof.matrix.replay_sessions_total}`,
      `Kill switch drill: ${String(proof.matrix.kill_switch_drill_passed)}`,
      `Rollback drill: ${String(proof.matrix.rollback_drill_passed)}`,
      `Android API34: ${String(proof.matrix.android_api34_tested)}`,
      `Fake green claimed: ${String(proof.matrix.fake_green_claimed)}`,
      "",
      "Failures:",
      ...(proof.failures.length > 0 ? proof.failures.map((failure) => `- ${failure.classification}: ${failure.reason}`) : ["- none"]),
      "",
    ].join("\n"),
  );

  if (proof.failures.length > 0) {
    throw new Error(`${proof.matrix.final_status}:${proof.failures.map((failure) => failure.classification).join(";")}`);
  }
  return proof;
}

if (require.main === module) {
  runAiEstimateInternalCanaryExecutionProof();
}
