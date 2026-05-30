import { runReal10000UiPdfParityAudit } from "../../scripts/audit/real10000EstimateAuditCore";

test("PDF parity audit catches mojibake", () => {
  const result = runReal10000UiPdfParityAudit(
    [{ caseId: "pdf_1", text: "Смета РЎ broken" }],
    [{ caseId: "pdf_1", pdfRowsMatchUiRows: true }],
  );

  expect(result.holes.map((hole) => hole.classification)).toContain("PDF_MOJIBAKE_FOUND");
});
