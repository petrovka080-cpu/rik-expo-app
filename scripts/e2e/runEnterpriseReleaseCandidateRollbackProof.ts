import { assertEnterpriseReleaseCandidateGreen } from "./enterpriseReleaseCandidate.shared";

const report = assertEnterpriseReleaseCandidateGreen();
if (!report.rollback.rollback_proof_passed) {
  throw new Error("Enterprise release candidate rollback proof failed");
}
console.log("GREEN_ENTERPRISE_RELEASE_CANDIDATE_ROLLBACK_READY");

