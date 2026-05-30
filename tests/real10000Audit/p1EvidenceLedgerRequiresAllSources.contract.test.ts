import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type EvidenceLedgerArtifact = {
  sources: Array<{ artifact: string; present: boolean }>;
  android: { passed: boolean };
  web: { passed: boolean };
  pdf: { passed: boolean };
};

test("Real10000 P1 evidence ledger requires all sources", () => {
  runP1EvidenceRefreshForTest();
  const ledger = readAuditArtifact<EvidenceLedgerArtifact>("evidence_ledger.json");

  expect(ledger.sources).toHaveLength(8);
  expect(ledger.sources.every((item) => item.present)).toBe(true);
  expect(ledger.android.passed).toBe(true);
  expect(ledger.web.passed).toBe(true);
  expect(ledger.pdf.passed).toBe(true);
});
