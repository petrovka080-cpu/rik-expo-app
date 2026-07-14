import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { isAllowedIosInternalQaPath } from "./iosTestFlightInternalQaCore";

export type CurrentReleaseWaveScope = {
  wave: "IOS_TESTFLIGHT_INTERNAL_QA";
  internalTestFlightOnly: true;
  requiresReal10000: false;
  requiresCanary: false;
  requiresReleaseCandidate: false;
  requiresFinalReadiness: false;
  requiresSrpc: false;
  requiresSrt: false;
  requiresWarehouseLiveSupabase: false;
  requiresAndroidInstalledArtifactAcceptance: false;
  requiresOwnerReplay: false;
  allowsEasBuildAfterGreenPrebuild: true;
  allowsAscUploadAfterGreenBuild: true;
  appReviewSubmitted: false;
  publicBetaEnabled: false;
  productionRolloutEnabled: false;
  externalTestFlightBetaReviewSubmitted: false;
  fakeGreenClaimed: false;
};

export type CurrentReleaseWaveScopeArtifact = {
  wave: "IOS_TESTFLIGHT_INTERNAL_QA";
  internal_testflight_only: true;
  real10000_required: false;
  canary_required: false;
  release_candidate_required: false;
  final_readiness_required: false;
  srpc_required: false;
  srt_required: false;
  warehouse_live_supabase_required: false;
  android_installed_artifact_acceptance_required: false;
  owner_replay_required: false;
  eas_build_allowed_after_green_prebuild: true;
  asc_upload_allowed_after_green_build: true;
  app_review_submitted: false;
  external_beta_review_submitted: false;
  public_beta_enabled: false;
  production_rollout_enabled: false;
  fake_green_claimed: false;
};

export const CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH =
  "artifacts/S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD/current_release_wave_scope.json";

export const CURRENT_RELEASE_WAVE_SCOPE: CurrentReleaseWaveScope = {
  wave: "IOS_TESTFLIGHT_INTERNAL_QA",
  internalTestFlightOnly: true,
  requiresReal10000: false,
  requiresCanary: false,
  requiresReleaseCandidate: false,
  requiresFinalReadiness: false,
  requiresSrpc: false,
  requiresSrt: false,
  requiresWarehouseLiveSupabase: false,
  requiresAndroidInstalledArtifactAcceptance: false,
  requiresOwnerReplay: false,
  allowsEasBuildAfterGreenPrebuild: true,
  allowsAscUploadAfterGreenBuild: true,
  appReviewSubmitted: false,
  publicBetaEnabled: false,
  productionRolloutEnabled: false,
  externalTestFlightBetaReviewSubmitted: false,
  fakeGreenClaimed: false,
};

export function currentReleaseWaveScopeArtifact(
  scope: CurrentReleaseWaveScope = CURRENT_RELEASE_WAVE_SCOPE,
): CurrentReleaseWaveScopeArtifact {
  return {
    wave: scope.wave,
    internal_testflight_only: scope.internalTestFlightOnly,
    real10000_required: scope.requiresReal10000,
    canary_required: scope.requiresCanary,
    release_candidate_required: scope.requiresReleaseCandidate,
    final_readiness_required: scope.requiresFinalReadiness,
    srpc_required: scope.requiresSrpc,
    srt_required: scope.requiresSrt,
    warehouse_live_supabase_required: scope.requiresWarehouseLiveSupabase,
    android_installed_artifact_acceptance_required: scope.requiresAndroidInstalledArtifactAcceptance,
    owner_replay_required: scope.requiresOwnerReplay,
    eas_build_allowed_after_green_prebuild: scope.allowsEasBuildAfterGreenPrebuild,
    asc_upload_allowed_after_green_build: scope.allowsAscUploadAfterGreenBuild,
    app_review_submitted: scope.appReviewSubmitted,
    external_beta_review_submitted: scope.externalTestFlightBetaReviewSubmitted,
    public_beta_enabled: scope.publicBetaEnabled,
    production_rollout_enabled: scope.productionRolloutEnabled,
    fake_green_claimed: scope.fakeGreenClaimed,
  };
}

export function readCurrentReleaseWaveScopeArtifact(
  rootDir = process.cwd(),
): CurrentReleaseWaveScopeArtifact | null {
  const fullPath = path.join(rootDir, CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH);
  if (!fs.existsSync(fullPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8")) as unknown;
  return isCurrentReleaseWaveScopeArtifact(parsed) ? parsed : null;
}

export function isCurrentReleaseWaveScopeArtifact(
  value: unknown,
): value is CurrentReleaseWaveScopeArtifact {
  return JSON.stringify(value) === JSON.stringify(currentReleaseWaveScopeArtifact());
}

export function assertCurrentReleaseWaveScopeArtifact(rootDir = process.cwd()): CurrentReleaseWaveScopeArtifact {
  const artifact = readCurrentReleaseWaveScopeArtifact(rootDir);
  if (!artifact) {
    throw new Error(`Missing or invalid ${CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH}`);
  }
  return artifact;
}

export function writeCurrentReleaseWaveScopeArtifact(rootDir = process.cwd()): CurrentReleaseWaveScopeArtifact {
  const artifact = currentReleaseWaveScopeArtifact();
  const fullPath = path.join(rootDir, CURRENT_RELEASE_WAVE_SCOPE_ARTIFACT_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return artifact;
}

function gitOutput(rootDir: string, args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10000,
    }).trim();
  } catch {
    return fallback;
  }
}

function changedFilesFromHead(rootDir: string): string[] {
  const tracked = gitOutput(rootDir, ["diff", "--name-only", "HEAD"])
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = gitOutput(rootDir, ["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/)
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked].map((file) => file.replace(/\\/g, "/")))].sort();
}

function currentBranch(rootDir: string): string {
  return gitOutput(rootDir, ["branch", "--show-current"]);
}

export function isCurrentReleaseWaveScopeActive(rootDir = process.cwd()): boolean {
  if (!readCurrentReleaseWaveScopeArtifact(rootDir)) return false;
  if (process.env.IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_RUN === "1") return true;

  const changedFiles = changedFilesFromHead(rootDir);
  if (changedFiles.length > 0) {
    return changedFiles.every((file) => isAllowedIosInternalQaPath(file));
  }

  return currentBranch(rootDir) === "mobile/ios-testflight-internal-qa";
}

if (require.main === module) {
  writeCurrentReleaseWaveScopeArtifact();
}
