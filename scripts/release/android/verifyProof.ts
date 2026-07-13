import { computeReleaseFingerprints } from "../computeReleaseFingerprints";
import { getCandidate, readAndroidJson, writeAndroidJson } from "./shared";

function status(value: Record<string, unknown>, expected: string): boolean {
  return value.final_status === expected;
}

function main(): void {
  const candidate = getCandidate();
  const fingerprints = computeReleaseFingerprints();
  const preflight = readAndroidJson(candidate, "preflight.json");
  const build = readAndroidJson(candidate, "build.json");
  const install = readAndroidJson(candidate, "install.json");
  const smoke = readAndroidJson(candidate, "smoke.json");
  const failures: string[] = [];

  if (!status(preflight, "GREEN_ANDROID_API34_PIPELINE_PREFLIGHT_READY")) failures.push("PREFLIGHT_NOT_GREEN");
  if (!status(build, "GREEN_ANDROID_API34_PIPELINE_BUILD_READY")) failures.push("BUILD_NOT_GREEN");
  if (!status(install, "GREEN_ANDROID_API34_PIPELINE_INSTALL_READY")) failures.push("INSTALL_NOT_GREEN");
  if (!status(smoke, "GREEN_ANDROID_API34_PIPELINE_SMOKE_READY")) failures.push("SMOKE_NOT_GREEN");
  if (preflight.android_actual_api !== 34) failures.push("ANDROID_ACTUAL_API_NOT_34");
  if (preflight.api36_used === true) failures.push("API36_USED");
  if (build.android_apk_contains_embedded_bundle !== true) failures.push("EMBEDDED_BUNDLE_NOT_PROVEN");
  if (build.android_build_cache_valid !== true) failures.push("BUILD_CACHE_NOT_VALID");
  if (smoke.android_app_root_ready !== true) failures.push("APP_ROOT_NOT_READY");
  if (smoke.android_build_identity_matches !== true) failures.push("BUILD_IDENTITY_MISMATCH");
  if (candidate.candidateHash !== fingerprints.candidateHash) failures.push("CANDIDATE_HASH_MISMATCH");

  const passed = failures.length === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PIPELINE_READY" : "BLOCKED_ANDROID_API34_PIPELINE_VERIFY",
    candidate_id: candidate.candidate_id,
    product_source_hash: candidate.productSourceHash,
    proof_harness_hash: candidate.proofHarnessHash,
    native_build_hash: candidate.nativeBuildHash,
    candidate_hash: candidate.candidateHash,
    apk_build_key: candidate.apkBuildKey,
    android_actual_api: preflight.android_actual_api,
    api36_used: preflight.api36_used === true,
    android_uses_dev_client: false,
    android_uses_metro: false,
    android_apk_contains_embedded_bundle: build.android_apk_contains_embedded_bundle === true,
    android_build_cache_valid: build.android_build_cache_valid === true,
    android_app_root_ready: smoke.android_app_root_ready === true,
    android_build_identity_matches: smoke.android_build_identity_matches === true,
    auth_login_attempted: false,
    business_route_opened: false,
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "verify.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
