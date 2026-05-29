import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";
import { requestEstimate, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("universal estimator PDF rows match UI", () => {
  it("keeps selected professional rows in both UI and PDF text", () => {
    const estimate = requestEstimate(UNIVERSAL_PROMPTS.drainage);
    const viewModel = buildEstimatePresentationViewModel(estimate);
    const pdf = createEstimatePdf({ estimate, generatedAt: "2026-05-29T00:00:00.000Z", language: "ru" });
    const text = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey }).text.toLocaleLowerCase("ru-RU");
    for (const token of ["дренажные лотки", "решётки", "проверка проливом"]) {
      expect(viewModel.rows.map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU")).toContain(token);
      expect(text).toContain(token);
    }
  });
});
