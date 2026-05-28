import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { evaluateSemanticPrompt, writeOpenWorldArtifact } from "./openWorldSemanticTestHelpers";

describe("open-world UI/PDF semantic parity", () => {
  it("keeps plan, GlobalEstimateResult, presentation rows, and PDF rows in parity", () => {
    const cases = SEMANTIC_CONFUSION_GOLDEN_PROMPTS
      .filter((item) => [
        "paving_stone_laying",
        "metal_canopy_installation",
        "gable_roof_installation",
        "roof_waterproofing",
        "linoleum_laying",
      ].includes(item.expected.workKey))
      .filter((item) => item.requiredRows || item.minimumRows)
      .map(evaluateSemanticPrompt);

    const results = cases.map((item) => {
      const estimateRows = item.rowNames;
      const uiRows = item.viewModel.rows.map((row) => row.name);
      const pdfRows = item.pdfViewModel.sections.flatMap((section) => section.rows.map((row) => row.name));
      expect(uiRows).toEqual(estimateRows);
      expect(pdfRows).toEqual(estimateRows);
      expect(item.viewModel.workTitle).toBe(item.estimate.work.title);
      expect(item.pdfViewModel.workKey).toBe(item.estimate.work.workKey);
      expect(item.pdf.text).toContain(estimateRows[0]);
      for (const required of item.rowNames.slice(0, 5)) {
        expect(item.pdf.text).toContain(required);
      }
      expect(item.pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
      expect(item.pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
      expect(item.pdf.pdfTrace.pdf_mojibake_found).toBe(false);
      return {
        id: item.id,
        workKey: item.estimate.work.workKey,
        rowCount: estimateRows.length,
        uiRowsMatchEstimate: true,
        pdfRowsMatchUi: true,
        pdfTrace: item.pdf.pdfTrace,
      };
    });

    writeOpenWorldArtifact("ui_pdf_parity.json", {
      passed: true,
      ui_pdf_parity_passed: true,
      pdf_uses_structured_payload: true,
      pdf_mojibake_found: false,
      results,
    });
    writeOpenWorldArtifact("pdf_text_extract.json", {
      passed: true,
      extracts: cases.map((item) => ({
        id: item.id,
        workKey: item.estimate.work.workKey,
        text: item.pdf.text,
      })),
    });
  });
});
