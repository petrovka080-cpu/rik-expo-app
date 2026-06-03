import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

describe("estimate PDF professional table", () => {
  it("renders structured estimate rows as a PDF table", () => {
    const answer = answerBuiltInAi({
      text: "смета на дренажные каналы 80 пог м",
      route: "/request",
      screenContext: "request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    expect(estimate?.work.workKey).toBe("drainage_channel_installation");

    const pdf = createEstimatePdf({
      estimate: estimate!,
      runtimeTrace: answer.runtimeTrace,
      generatedAt: "2026-06-03T00:00:00.000+06:00",
      language: "ru",
    });
    const text = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate!.work.workKey }).text;

    expect(pdf.validation.valid).toBe(true);
    expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
    expect(pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
    expect(text).toContain("Таблица сметы");
    expect(text).toContain("дренажные лотки");
    expect(text).toContain("проверка проливом");
  });
});
