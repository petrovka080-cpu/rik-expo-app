import {
  buildCanaryEvaluationProofMatrix,
  writeCanaryEvaluationDecisionPolicyArtifacts,
  writeCanaryEvaluationEvidenceArtifacts,
  writeCanaryEvaluationJson,
  writeCanaryEvaluationPrerequisiteLedger,
  writeCanaryEvaluationText,
  writeCanaryEvaluationWebArtifacts,
} from "./aiEstimateCanaryEvaluationCore";
import { runAndroidApi34AiEstimateCanaryEvaluationSmoke } from "./runAndroidApi34AiEstimateCanaryEvaluationSmoke";

export function runAiEstimateCanaryEvaluationProof() {
  const prerequisiteLedger = writeCanaryEvaluationPrerequisiteLedger();
  const policy = writeCanaryEvaluationDecisionPolicyArtifacts();
  const evaluation = writeCanaryEvaluationEvidenceArtifacts();
  const web = writeCanaryEvaluationWebArtifacts();
  const android = runAndroidApi34AiEstimateCanaryEvaluationSmoke().matrix;
  const proof = buildCanaryEvaluationProofMatrix({
    prerequisiteLedger,
    policy,
    evaluation,
    web,
    android,
  });

  writeCanaryEvaluationJson("failures.json", proof.failures);
  writeCanaryEvaluationJson("matrix.json", proof.matrix);
  writeCanaryEvaluationText(
    "proof.md",
    [
      "# AI Estimate Canary Evaluation And Rollout Decision",
      "",
      `Status: ${proof.matrix.final_status}`,
      `Decision: ${proof.matrix.decision}`,
      `Internal canary green: ${String(proof.matrix.internal_canary_green)}`,
      `Production rollout enabled: ${String(proof.matrix.production_rollout_enabled)}`,
      `Public canary enabled: ${String(proof.matrix.public_canary_enabled)}`,
      `Public rollout authorized: ${String(proof.matrix.public_rollout_authorized)}`,
      `Replay: ${proof.matrix.replay_sessions_passed}/${proof.matrix.replay_sessions_total}`,
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
  runAiEstimateCanaryEvaluationProof();
}
