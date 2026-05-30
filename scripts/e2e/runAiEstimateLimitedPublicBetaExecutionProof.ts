import {
  buildLimitedPublicBetaExecutionMatrix,
  runAndroidApi34LimitedPublicBetaSmoke,
  runLimitedPublicBetaKillSwitchDrill,
  runLimitedPublicBetaRollbackDrill,
  writeLimitedPublicBetaDailyMonitorArtifacts,
  writeLimitedPublicBetaFeedbackAudit,
  writeLimitedPublicBetaJson,
  writeLimitedPublicBetaPdfProofArtifacts,
  writeLimitedPublicBetaPolicyArtifacts,
  writeLimitedPublicBetaPrerequisiteLedger,
  writeLimitedPublicBetaReleaseGuardEvidence,
  writeLimitedPublicBetaReplayArtifacts,
  writeLimitedPublicBetaText,
  writeLimitedPublicBetaWebArtifacts,
} from "./aiEstimateLimitedPublicBetaExecutionCore";

export function runAiEstimateLimitedPublicBetaExecutionProof() {
  const prerequisiteLedger = writeLimitedPublicBetaPrerequisiteLedger();
  const policyArtifacts = writeLimitedPublicBetaPolicyArtifacts();
  const replay = writeLimitedPublicBetaReplayArtifacts();
  const web = writeLimitedPublicBetaWebArtifacts();
  const android = runAndroidApi34LimitedPublicBetaSmoke({ throwOnFailure: false }).matrix;
  const pdf = writeLimitedPublicBetaPdfProofArtifacts();
  const feedback = writeLimitedPublicBetaFeedbackAudit();
  const dailyMonitor = writeLimitedPublicBetaDailyMonitorArtifacts(replay);
  const killSwitch = runLimitedPublicBetaKillSwitchDrill();
  const rollback = runLimitedPublicBetaRollbackDrill();
  const proof = buildLimitedPublicBetaExecutionMatrix({
    prerequisiteLedger,
    policyArtifacts,
    replay,
    web,
    android,
    pdf,
    feedback,
    dailyMonitor,
    killSwitch,
    rollback,
  });

  writeLimitedPublicBetaJson("failures.json", proof.failures);
  writeLimitedPublicBetaJson("matrix.json", proof.matrix);
  writeLimitedPublicBetaText(
    "proof.md",
    [
      "# AI Estimate Limited Public Beta Execution",
      "",
      `Status: ${proof.matrix.final_status}`,
      `Decision: ${proof.matrix.decision}`,
      `Prerequisites green: ${String(proof.matrix.all_prerequisites_green)}`,
      `Full public rollout enabled: ${String(proof.matrix.full_public_rollout_enabled)}`,
      `Public beta enabled by default: ${String(proof.matrix.limited_public_beta_enabled_by_default)}`,
      `Allowlist IDs present: ${String(proof.matrix.allowlist_ids_present)}`,
      `Replay: ${proof.matrix.beta_replay_sessions_passed}/${proof.matrix.beta_replay_sessions_total}`,
      `PDF extraction: ${proof.matrix.pdf_extraction_cases_passed}/${proof.matrix.pdf_extraction_cases_total}`,
      `Android API34: ${String(proof.matrix.android_api34_tested)}`,
      `Fake green claimed: ${String(proof.matrix.fake_green_claimed)}`,
      "",
      "Failures:",
      ...(proof.failures.length > 0
        ? proof.failures.map((failure) => `- ${failure.classification}: ${failure.reason}${failure.artifact ? ` (${failure.artifact})` : ""}`)
        : ["- none"]),
      "",
    ].join("\n"),
  );
  writeLimitedPublicBetaReleaseGuardEvidence();

  if (proof.failures.length > 0) {
    throw new Error(`${proof.matrix.final_status}:${proof.failures.map((failure) => failure.classification).join(";")}`);
  }
  return proof;
}

if (require.main === module) {
  runAiEstimateLimitedPublicBetaExecutionProof();
}
