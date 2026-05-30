import { runReal10000UiPdfParityAudit } from "../../scripts/audit/real10000EstimateAuditCore";

test("PDF parity audit catches markdown-as-truth", () => {
  const result = runReal10000UiPdfParityAudit(
    [{ caseId: "pdf_1", text: "# Markdown estimate\n| --- |" }],
    [{ caseId: "pdf_1", pdfRowsMatchUiRows: true }],
  );

  expect(result.holes.map((hole) => hole.classification)).toContain("MARKDOWN_AS_PDF_TRUTH_FOUND");
});
