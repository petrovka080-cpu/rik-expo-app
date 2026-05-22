import { assertEnterpriseReleaseCandidateGreen } from "./enterpriseReleaseCandidate.shared";

const report = assertEnterpriseReleaseCandidateGreen();
if (!report.ota.ota_runtime_compatible || !report.ota.build_channel_matrix_ready) {
  throw new Error("BLOCKED_OTA_RUNTIME_CHANNEL_MISMATCH");
}
console.log("GREEN_ENTERPRISE_RELEASE_CANDIDATE_OTA_RUNTIME_READY");

