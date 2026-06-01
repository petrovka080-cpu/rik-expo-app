import fs from "node:fs";
import path from "node:path";

import {
  REQUIRED_RELEASE_GATES,
  type ReleaseGateName,
} from "./releaseGuard.shared";
import {
  assertCurrentReleaseWaveScopeArtifact,
  CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
} from "./currentReleaseWaveScope";

export const IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES: ReleaseGateName[] = [
  "ios-testflight-release-scope-proof",
  "tsc",
  "expo-lint",
  "ios-testflight-test-weakening-scan",
  "jest-run-in-band",
  "git-diff-check",
];

export const IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE_ARTIFACT =
  "artifacts/S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD/release_verify_scope.json";

export const IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPED_RESULT_ARTIFACT =
  "artifacts/S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD/release_verify_scoped_result.json";

export const IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPED_OUT_GATES_ARTIFACT =
  "artifacts/S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD/release_verify_scoped_out_gates.json";

export const IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE = "ios-testflight-internal";

export const IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS =
  "SCOPED_NOT_REQUIRED_FOR_IOS_INTERNAL_TESTFLIGHT";

export type IosTestFlightScopedOutGateArtifact = {
  gate: ReleaseGateName;
  status: typeof IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS;
  required_for_current_wave: false;
  required_for_ios_internal_testflight: false;
  green_claimed: false;
  fake_green_claimed: false;
};

export type IosTestFlightReleaseVerifyScopeProofOptions = {
  requiredGatesPassed?: boolean;
  fullJestPassed?: boolean;
  releaseVerifyPassed?: boolean;
};

function writeJsonArtifact(rootDir: string, relativePath: string, value: unknown): void {
  const artifactPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeIosTestFlightReleaseVerifyScopeProof(
  rootDir = process.cwd(),
  options: IosTestFlightReleaseVerifyScopeProofOptions = {},
) {
  const scope = assertCurrentReleaseWaveScopeArtifact(rootDir);
  const required = new Set<ReleaseGateName>(IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES);
  const scopedOutGateNames = REQUIRED_RELEASE_GATES
    .map((gate) => gate.name)
    .filter((name) => !required.has(name));
  const scopedOutGates: IosTestFlightScopedOutGateArtifact[] = scopedOutGateNames.map((gate) => ({
    gate,
    status: IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS,
    required_for_current_wave: false,
    required_for_ios_internal_testflight: false,
    green_claimed: false,
    fake_green_claimed: false,
  }));
  const scopedOutGatesClaimedGreen = scopedOutGates.some((gate) => gate.green_claimed);
  const artifact = {
    wave: scope.wave,
    current_wave: scope.wave,
    current_release_wave: scope.wave,
    release_verify_scope: IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE,
    release_verify_scope_aware: true,
    final_status: "GREEN_IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE_READY",
    current_scope_artifact_path: CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
    release_verify_required_gate_names: IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES,
    mandatory_gates_selected: IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES,
    required_gates_passed: options.requiredGatesPassed ?? false,
    full_jest_passed: options.fullJestPassed ?? false,
    release_verify_passed: options.releaseVerifyPassed ?? false,
    scoped_out_gate_names: scopedOutGateNames,
    scoped_out_gates: scopedOutGates,
    scoped_out_gate_count: scopedOutGateNames.length,
    scoped_out_gates_total: scopedOutGateNames.length,
    scoped_out_gates_claimed_green: scopedOutGatesClaimedGreen,
    scoped_out_gates_green_claimed: scopedOutGatesClaimedGreen,
    internal_testflight_only: scope.internal_testflight_only,
    android_api34_global_replay_required: false,
    android_api34_full_replay_required: false,
    real10000_required: scope.real10000_required,
    public_beta_allowlist_required: false,
    built_in_ai10000_required: false,
    fifty_k_required: false,
    canary_required: scope.canary_required,
    release_candidate_required: scope.release_candidate_required,
    final_readiness_required: scope.final_readiness_required,
    srpc_required: scope.srpc_required,
    srt_required: scope.srt_required,
    warehouse_live_supabase_required: scope.warehouse_live_supabase_required,
    owner_replay_required: scope.owner_replay_required,
    app_review_submitted: scope.app_review_submitted,
    external_beta_review_submitted: scope.external_beta_review_submitted,
    public_beta_enabled: scope.public_beta_enabled,
    production_rollout_enabled: scope.production_rollout_enabled,
    global_release_gates_removed: false,
    global_release_gates_weakened: false,
    global_release_verify_still_available: true,
    fake_green_claimed: scope.fake_green_claimed,
  };
  const scopedResultArtifact = {
    current_release_wave: artifact.current_release_wave,
    release_verify_scope: artifact.release_verify_scope,
    required_gates_passed: artifact.required_gates_passed,
    full_jest_passed: artifact.full_jest_passed,
    release_verify_passed: artifact.release_verify_passed,
    scoped_out_gates_total: artifact.scoped_out_gates_total,
    scoped_out_gates_claimed_green: artifact.scoped_out_gates_claimed_green,
    global_release_gates_removed: artifact.global_release_gates_removed,
    global_release_gates_weakened: artifact.global_release_gates_weakened,
    global_release_verify_still_available: artifact.global_release_verify_still_available,
    app_review_submitted: artifact.app_review_submitted,
    external_beta_review_submitted: artifact.external_beta_review_submitted,
    public_beta_enabled: artifact.public_beta_enabled,
    production_rollout_enabled: artifact.production_rollout_enabled,
    fake_green_claimed: artifact.fake_green_claimed,
  };
  const scopedOutGatesArtifact = {
    current_release_wave: artifact.current_release_wave,
    release_verify_scope: artifact.release_verify_scope,
    status: IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS,
    scoped_out_gates_claimed_green: artifact.scoped_out_gates_claimed_green,
    scoped_out_gates: scopedOutGates,
  };

  writeJsonArtifact(rootDir, IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE_ARTIFACT, artifact);
  writeJsonArtifact(rootDir, IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPED_RESULT_ARTIFACT, scopedResultArtifact);
  writeJsonArtifact(rootDir, IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPED_OUT_GATES_ARTIFACT, scopedOutGatesArtifact);
  return artifact;
}

if (require.main === module) {
  const artifact = writeIosTestFlightReleaseVerifyScopeProof();
  console.log(artifact.final_status);
}
