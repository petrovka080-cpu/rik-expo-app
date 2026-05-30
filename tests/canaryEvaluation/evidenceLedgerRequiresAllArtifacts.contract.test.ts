import { writeCanaryEvaluationEvidenceLedgerAudit } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test("canary evaluation evidence ledger requires every internal canary artifact", () => {
  const audit = writeCanaryEvaluationEvidenceLedgerAudit();
  expect(audit.evidence_ledger_passed).toBe(true);
  expect(audit.required_artifacts_present).toBe(audit.required_artifacts_total);
  expect(audit.failures_empty).toBe(true);
});
