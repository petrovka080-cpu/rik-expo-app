import { assertEnterpriseReleaseCandidateGreen } from "./enterpriseReleaseCandidate.shared";

const report = assertEnterpriseReleaseCandidateGreen();
if (!report.android.android_emulator_proof_passed || !report.android.maestro_proof_passed) {
  throw new Error("Enterprise release candidate Android/Maestro proof failed");
}
console.log("GREEN_ENTERPRISE_RELEASE_CANDIDATE_ANDROID_READY");

