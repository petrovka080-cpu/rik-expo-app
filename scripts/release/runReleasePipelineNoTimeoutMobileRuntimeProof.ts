import { writeReleasePipelineNoTimeoutMobileRuntimeArtifacts } from "./releasePipelineNoTimeoutMobileRuntime.shared";

const report = writeReleasePipelineNoTimeoutMobileRuntimeArtifacts();

console.info(JSON.stringify({
  wave: report.matrix.wave,
  final_status: report.matrix.final_status,
  release_verify_step_timing_enabled: report.matrix.release_verify_step_timing_enabled,
  full_jest_timeout: report.matrix.full_jest_timeout,
  release_verify_timeout: report.matrix.release_verify_timeout,
  jest_shard_isolation_ready: report.matrix.jest_shard_isolation_ready,
  android_runtime_verified: report.matrix.android_runtime_verified,
  ios_runtime_resolved_or_external_blocker_exact: report.matrix.ios_runtime_resolved_or_external_blocker_exact,
  post_push_verify_passed: report.matrix.post_push_verify_passed,
  full_jest_passed: report.matrix.full_jest_passed,
  release_verify_passed: report.matrix.release_verify_passed,
  fake_green_claimed: report.matrix.fake_green_claimed,
}, null, 2));

if (report.matrix.final_status !== "GREEN_RELEASE_PIPELINE_NO_TIMEOUT_MOBILE_RUNTIME_READY") {
  process.exitCode = 1;
}
