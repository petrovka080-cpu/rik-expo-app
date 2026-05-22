import { writeReleasePipelineNoTimeoutMobileRuntimeArtifacts } from "./releasePipelineNoTimeoutMobileRuntime.shared";

const report = writeReleasePipelineNoTimeoutMobileRuntimeArtifacts();

console.info(JSON.stringify(report.iosRuntime, null, 2));

if (!report.matrix.ios_runtime_resolved_or_external_blocker_exact) {
  process.exitCode = 1;
}
