import {
  buildProductionCanaryProofMatrix,
  writeProductionCanaryFeedbackAudit,
  writeProductionCanaryJson,
  writeProductionCanaryPolicyArtifacts,
  writeProductionCanaryReplayArtifacts,
  writeProductionCanaryRollbackAudit,
  writeProductionCanaryText,
  writeProductionCanaryWebArtifacts,
} from "./aiEstimateProductionCanaryCore";
import { runAndroidApi34AiEstimateProductionCanarySmoke } from "./runAndroidApi34AiEstimateProductionCanarySmoke";

export function runAiEstimateProductionCanaryProof() {
  const policyArtifacts = writeProductionCanaryPolicyArtifacts();
  const rollback = writeProductionCanaryRollbackAudit();
  const feedback = writeProductionCanaryFeedbackAudit();
  const replay = writeProductionCanaryReplayArtifacts();
  const web = writeProductionCanaryWebArtifacts();
  const android = runAndroidApi34AiEstimateProductionCanarySmoke().matrix;
  const proof = buildProductionCanaryProofMatrix({
    replay,
    policyArtifacts,
    rollback,
    feedback,
    android,
    web,
  });

  writeProductionCanaryJson("failures.json", proof.failures);
  writeProductionCanaryJson("matrix.json", proof.matrix);
  writeProductionCanaryText(
    "proof.md",
    [
      "# AI Estimate Production Canary Control Plane",
      "",
      `Status: ${proof.matrix.final_status}`,
      `Decision: ${proof.matrix.decision}`,
      `Prerequisites green: ${String(proof.matrix.prerequisites_green)}`,
      `Production rollout enabled: ${String(proof.matrix.production_rollout_enabled)}`,
      `Public canary enabled: ${String(proof.matrix.public_canary_enabled)}`,
      `Internal canary enabled by default: ${String(proof.matrix.internal_canary_enabled)}`,
      `Replay: ${proof.matrix.real_usage_replay_passed}/${proof.matrix.real_usage_replay_total}`,
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
  runAiEstimateProductionCanaryProof();
}
