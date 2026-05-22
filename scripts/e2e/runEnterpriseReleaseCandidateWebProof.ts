import { assertEnterpriseReleaseCandidateGreen } from "./enterpriseReleaseCandidate.shared";

const report = assertEnterpriseReleaseCandidateGreen();
if (!report.web.web_runtime_proof_passed) {
  throw new Error("Enterprise release candidate web proof failed");
}
console.log("GREEN_ENTERPRISE_RELEASE_CANDIDATE_WEB_READY");

