import {
  assertCurrentReleaseWaveScopeArtifact,
  CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH,
  currentReleaseWaveScopeArtifact,
  readCurrentReleaseWaveScopeArtifact,
  type CurrentReleaseWaveScopeArtifact,
} from "../../scripts/release/currentReleaseWaveScope";

export function hasCurrentIosTestFlightScopeArtifact(): boolean {
  return readCurrentReleaseWaveScopeArtifact() !== null;
}

export function expectCurrentIosTestFlightScopeArtifact(): CurrentReleaseWaveScopeArtifact {
  const artifact = assertCurrentReleaseWaveScopeArtifact();
  expect(artifact).toEqual(currentReleaseWaveScopeArtifact());
  expect(artifact.real10000_required).toBe(false);
  expect(artifact.canary_required).toBe(false);
  expect(artifact.release_candidate_required).toBe(false);
  expect(artifact.final_readiness_required).toBe(false);
  expect(artifact.srpc_required).toBe(false);
  expect(artifact.srt_required).toBe(false);
  expect(artifact.warehouse_live_supabase_required).toBe(false);
  expect(artifact.owner_replay_required).toBe(false);
  expect(artifact.app_review_submitted).toBe(false);
  expect(artifact.external_beta_review_submitted).toBe(false);
  expect(artifact.public_beta_enabled).toBe(false);
  expect(artifact.production_rollout_enabled).toBe(false);
  expect(artifact.fake_green_claimed).toBe(false);
  return artifact;
}

export function expectScopedOutForCurrentIosTestFlight(params: {
  wave: string;
  fakeGreenClaimed: boolean;
  productionRolloutEnabled?: boolean;
  publicBetaEnabled?: boolean;
  appReviewSubmitted?: boolean;
}): void {
  expectCurrentIosTestFlightScopeArtifact();
  expect(CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH).toContain("current_release_wave_scope.json");
  expect(params.wave.length).toBeGreaterThan(0);
  expect(params.fakeGreenClaimed).toBe(false);
  if (params.productionRolloutEnabled != null) {
    expect(params.productionRolloutEnabled).toBe(false);
  }
  if (params.publicBetaEnabled != null) {
    expect(params.publicBetaEnabled).toBe(false);
  }
  if (params.appReviewSubmitted != null) {
    expect(params.appReviewSubmitted).toBe(false);
  }
}
