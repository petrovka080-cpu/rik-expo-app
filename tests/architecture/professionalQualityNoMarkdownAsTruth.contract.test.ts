import fs from "node:fs";
import path from "node:path";

describe("professional quality PDF architecture", () => {
  it("keeps markdown out of the estimate PDF source of truth", () => {
    const pdfSource = [
      fs.readFileSync(path.join(process.cwd(), "src/lib/estimatePdf/createEstimatePdf.ts"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/lib/estimatePdf/buildEstimatePdfViewModel.ts"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/lib/ai/estimatePresentation/buildProfessionalEstimateTableViewModel.ts"), "utf8"),
    ].join("\n");

    expect(pdfSource).toContain("professional_boq");
    expect(pdfSource).toContain("markdown_parsed_as_pdf_truth: false");
    expect(pdfSource).not.toMatch(/parseMarkdown|markdownTable|markdown\s+as\s+truth/i);
  });
});
