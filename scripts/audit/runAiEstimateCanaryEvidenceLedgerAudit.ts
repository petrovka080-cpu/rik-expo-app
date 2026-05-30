import { writeCanaryEvaluationEvidenceLedgerAudit } from "../e2e/aiEstimateCanaryEvaluationCore";

export function runAiEstimateCanaryEvidenceLedgerAudit() {
  const audit = writeCanaryEvaluationEvidenceLedgerAudit();
  if (!audit.evidence_ledger_passed) {
    throw new Error(`NO_GO_EVIDENCE_MISSING:${audit.issues.join(";")}`);
  }
  return audit;
}

if (require.main === module) {
  runAiEstimateCanaryEvidenceLedgerAudit();
}
