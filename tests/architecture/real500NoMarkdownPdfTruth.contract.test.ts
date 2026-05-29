import fs from "node:fs";

test("real 500 PDFs use structured estimate payload, not markdown as truth", () => {
  const createPdf = fs.readFileSync("src/lib/estimatePdf/createEstimatePdf.ts", "utf8");
  expect(createPdf).toContain("Estimate PDF requires a structured GlobalEstimateResult");
  expect(createPdf).toContain("markdown_parsed_as_pdf_truth: false");
});
