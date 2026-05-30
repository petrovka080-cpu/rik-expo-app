import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type PdfFreshnessArtifact = {
  pdf_mojibake_found: boolean;
  pdf_rows_match_ui_rows: boolean;
};

test("Real10000 P1 PDF evidence rejects mojibake", () => {
  runP1EvidenceRefreshForTest();
  const artifact = readAuditArtifact<PdfFreshnessArtifact>("pdf_evidence_freshness.json");

  expect(artifact.pdf_mojibake_found).toBe(false);
  expect(artifact.pdf_rows_match_ui_rows).toBe(true);
});
