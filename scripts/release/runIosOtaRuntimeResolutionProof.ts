import {
  writeReleasePipelineNoTimeoutMobileRuntimeArtifacts,
  writeReleasePipelineNoTimeoutMobileRuntimeRunArtifacts,
} from "./releasePipelineNoTimeoutMobileRuntime.shared";

const report = process.argv.includes("--write-canonical")
  ? writeReleasePipelineNoTimeoutMobileRuntimeArtifacts()
  : writeReleasePipelineNoTimeoutMobileRuntimeRunArtifacts().report;

console.info(JSON.stringify(report.iosRuntime, null, 2));

if (!report.matrix.ios_runtime_resolved_or_external_blocker_exact) {
  process.exitCode = 1;
}
