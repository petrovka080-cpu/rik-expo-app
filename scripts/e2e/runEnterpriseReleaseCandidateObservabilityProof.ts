import { assertEnterpriseReleaseCandidateGreen } from "./enterpriseReleaseCandidate.shared";

const report = assertEnterpriseReleaseCandidateGreen();
if (!report.observability.observability_ready || !report.redaction.redaction_passed) {
  throw new Error("Enterprise release candidate observability/redaction proof failed");
}
console.log("GREEN_ENTERPRISE_RELEASE_CANDIDATE_OBSERVABILITY_READY");

