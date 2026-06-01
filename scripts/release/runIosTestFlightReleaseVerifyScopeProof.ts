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

export function writeIosTestFlightReleaseVerifyScopeProof(rootDir = process.cwd()) {
  const scope = assertCurrentReleaseWaveScopeArtifact(rootDir);
  const required = new Set<ReleaseGateName>(IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES);
  const scopedOutGateNames = REQUIRED_RELEASE_GATES
    .map((gate) => gate.name)
    .filter((name) => !required.has(name));
  const artifact = {
    wave: scope.wave,
    final_status: "GREEN_IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE_READY",
    current_scope_artifact_path: CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
    release_verify_required_gate_names: IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES,
    scoped_out_gate_names: scopedOutGateNames,
    scoped_out_gate_count: scopedOutGateNames.length,
    internal_testflight_only: scope.internal_testflight_only,
    real10000_required: scope.real10000_required,
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
    fake_green_claimed: scope.fake_green_claimed,
  };

  const artifactPath = path.join(rootDir, IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE_ARTIFACT);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return artifact;
}

if (require.main === module) {
  const artifact = writeIosTestFlightReleaseVerifyScopeProof();
  console.log(artifact.final_status);
}
