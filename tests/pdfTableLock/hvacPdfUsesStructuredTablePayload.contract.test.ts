import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

describe("HVAC PDF structured table payload", () => {
  it("renders the structured GlobalEstimateResult table rows", () => {
    const answer = answerBuiltInAi({
      text: "смета на установку системы кондиционирования на 258 кв метров",
      route: "/request",
      screenContext: "request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    if (!estimate) throw new Error("HVAC_ESTIMATE_MISSING");
    const pdf = createEstimatePdf({ estimate, generatedAt: "2026-06-01T00:00:00.000Z", language: "ru" });
    const text = extractEstimatePdfTextForProof({
      pdf: pdf.bytes,
      knownWorkKey: estimate.work.workKey,
      requiredText: ["внутренние блоки кондиционирования", "медная фреоновая трасса"],
    }).text;

    expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
    expect(pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
    expect(pdf.validation.valid).toBe(true);
    expect(text).toContain("Таблица сметы");
    expect(text).toContain("внутренние блоки кондиционирования");
    expect(text).toContain("медная фреоновая трасса");
  });
});
