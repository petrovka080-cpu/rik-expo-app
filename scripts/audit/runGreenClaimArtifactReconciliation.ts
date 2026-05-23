import {
  GREEN_CLAIM_ARTIFACT_RECONCILIATION_GREEN_STATUS,
  writeGreenClaimArtifactReconciliationArtifacts,
} from "./greenClaimArtifactReconciliation.shared";

const report = writeGreenClaimArtifactReconciliationArtifacts(process.cwd());

console.log(report.matrix.final_status);

if (report.matrix.final_status !== GREEN_CLAIM_ARTIFACT_RECONCILIATION_GREEN_STATUS) {
  process.exitCode = 1;
}
