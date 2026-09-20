import {
  GREEN_CLAIM_ARTIFACT_RECONCILIATION_GREEN_STATUS,
  resolveGreenClaimArtifactConsistency,
  writeGreenClaimArtifactReconciliationArtifacts,
} from "./greenClaimArtifactReconciliation.shared";
import { buildFullJestEvidenceContext } from "../release/fullJestEvidence";

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const inline = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim() || null;
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() || null : null;
}

const args = new Set(process.argv.slice(2));
const policyCheck = args.has("--policy-check");
const verifyReadOnly = args.has("--verify-read-only") || policyCheck;
const receiptBundlePath = argValue("bundle") ?? process.env.RELEASE_RECEIPT_BUNDLE_PATH ?? null;
const releaseId = argValue("release-id") ?? process.env.RELEASE_CANDIDATE_ID ?? "UNSPECIFIED_RELEASE_CANDIDATE";
const current = buildFullJestEvidenceContext();
const options = {
  ...(receiptBundlePath ? { receiptBundlePath } : {}),
  validationContext: {
    expectedReleaseId: releaseId,
    expectedSubjectSha: current.headSha,
    expectedWorkspaceFingerprint: current.workspaceFingerprint,
  },
};
const report = verifyReadOnly
  ? resolveGreenClaimArtifactConsistency(process.cwd(), options)
  : writeGreenClaimArtifactReconciliationArtifacts(process.cwd(), options);

console.info(report.matrix.final_status);

if (policyCheck) {
  const pass =
    report.matrix.final_status === "BLOCKED_GREEN_CLAIM_ARTIFACT_RECONCILIATION" &&
    report.matrix.fake_green_claimed === false &&
    report.matrix.artifact_reconciliation_proof_passed === false &&
    report.receiptValidation.actual_environment_passed === false &&
    Object.values(report.replayMatrices).every((matrix) => String(matrix.final_status).startsWith("BLOCKED_"));
  console.info(pass
    ? "GREEN_GREEN_CLAIM_ARTIFACT_RECONCILIATION_POLICY_READY"
    : "STOP_GREEN_CLAIM_ARTIFACT_RECONCILIATION_POLICY");
  if (!pass) process.exitCode = 1;
} else if (report.matrix.final_status !== GREEN_CLAIM_ARTIFACT_RECONCILIATION_GREEN_STATUS) {
  process.exitCode = 1;
}
