import { buildEnterpriseReleaseCandidateReport } from "../../scripts/e2e/enterpriseReleaseCandidate.shared";

let cached: ReturnType<typeof buildEnterpriseReleaseCandidateReport> | null = null;

export function getEnterpriseReleaseCandidateReport() {
  cached ??= buildEnterpriseReleaseCandidateReport();
  return cached;
}

