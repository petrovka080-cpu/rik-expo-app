import { assertEnterpriseReleaseCandidateGreen } from "./enterpriseReleaseCandidate.shared";

const report = assertEnterpriseReleaseCandidateGreen();
if (!report.backendProof.backend_deployment_ready || !report.backendProof.rls_live_proof_passed) {
  throw new Error("Enterprise release candidate backend proof failed");
}
console.log("GREEN_ENTERPRISE_RELEASE_CANDIDATE_BACKEND_READY");

