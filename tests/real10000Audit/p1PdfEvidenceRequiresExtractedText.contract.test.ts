import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type PdfFreshnessArtifact = {
  pdf_extraction_cases_total: number;
  pdf_text_extractable: boolean;
};

test("Real10000 P1 PDF evidence requires extracted text", () => {
  runP1EvidenceRefreshForTest();
  const artifact = readAuditArtifact<PdfFreshnessArtifact>("pdf_evidence_freshness.json");

  expect(artifact.pdf_extraction_cases_total).toBeGreaterThanOrEqual(1000);
  expect(artifact.pdf_text_extractable).toBe(true);
});
