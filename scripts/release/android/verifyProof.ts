import { computeReleaseFingerprints } from "../computeReleaseFingerprints";
import { getCandidate, readAndroidJson, writeAndroidJson } from "./shared";

function status(value: Record<string, unknown>, expected: string): boolean {
  return value.final_status === expected;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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
  if (build.android_public_runtime_env_embedded !== true) failures.push("PUBLIC_RUNTIME_ENV_NOT_EMBEDDED");
  if (build.android_cached_build_env_digest_matches !== true) failures.push("PUBLIC_RUNTIME_ENV_DIGEST_MISMATCH");
  if (build.android_public_runtime_env_raw_values_persisted !== false) failures.push("PUBLIC_RUNTIME_ENV_RAW_VALUES_PERSISTED");
  if (install.installed_apk_byte_exact !== true) failures.push("INSTALLED_APK_NOT_BYTE_EXACT");
  if (install.installed_apk_sha256 !== build.apk_sha256) failures.push("INSTALLED_APK_BUILD_SHA_MISMATCH");
  if (smoke.android_app_root_ready !== true) failures.push("APP_ROOT_NOT_READY");
  if (smoke.android_build_identity_matches !== true) failures.push("BUILD_IDENTITY_MISMATCH");
  if (smoke.android_uses_dev_client !== false) failures.push("DEV_CLIENT_USED");
  if (smoke.android_uses_metro !== false) failures.push("METRO_USED");
  if (smoke.business_route_opened !== true) failures.push("BUSINESS_ROUTE_NOT_OPENED");
  if (smoke.auth_login_attempted !== true) failures.push("AUTH_LOGIN_NOT_ATTEMPTED");
  if (smoke.auth_green !== true) failures.push("AUTH_NOT_GREEN");
  const routeToScreenAck = record(smoke.route_to_screen_ack);
  if (
    routeToScreenAck?.status !==
    "GREEN_ANDROID_NORMAL_APK_ROUTE_TO_SCREEN_ACK"
  ) {
    failures.push("ROUTE_TO_SCREEN_ACK_NOT_GREEN");
  }
  if (routeToScreenAck?.expected_cases !== 4) {
    failures.push("ROUTE_TO_SCREEN_ACK_EXPECTED_CASES_MISMATCH");
  }
  if (routeToScreenAck?.passed_cases !== 4) {
    failures.push("ROUTE_TO_SCREEN_ACK_PASSED_CASES_MISMATCH");
  }
  if (routeToScreenAck?.isolated_probe_substitution_allowed !== false) {
    failures.push("ISOLATED_PROBE_SUBSTITUTION_NOT_FORBIDDEN");
  }
  const cleanup = record(smoke.temporary_user_cleanup);
  if (
    cleanup?.attempted !== true ||
    cleanup.companyRemoved !== true ||
    cleanup.userRemoved !== true
  ) {
    failures.push("TEMPORARY_USER_CLEANUP_NOT_GREEN");
  }
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
    android_public_runtime_env_digest: build.android_public_runtime_env_digest ?? null,
    android_public_runtime_env_embedded: build.android_public_runtime_env_embedded === true,
    android_cached_build_env_digest_matches: build.android_cached_build_env_digest_matches === true,
    android_public_runtime_env_raw_values_persisted: false,
    installed_apk_sha256: install.installed_apk_sha256 ?? null,
    installed_apk_byte_exact: install.installed_apk_byte_exact === true,
    android_app_root_ready: smoke.android_app_root_ready === true,
    android_build_identity_matches: smoke.android_build_identity_matches === true,
    auth_login_attempted: smoke.auth_login_attempted === true,
    auth_green: smoke.auth_green === true,
    business_route_opened: smoke.business_route_opened === true,
    route_to_screen_ack: routeToScreenAck,
    temporary_user_cleanup: cleanup,
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "verify.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
