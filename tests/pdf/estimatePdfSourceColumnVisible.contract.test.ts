import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

describe("estimate PDF source column", () => {
  it("keeps source evidence visible in the structured PDF table", () => {
    const answer = answerBuiltInAi({
      text: "смета на мониторинг температуры ЦОД 24 датчика",
      route: "/request",
      screenContext: "request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    expect(estimate?.work.workKey).toBe("dynamic_bms_estimate");

    const pdf = createEstimatePdf({
      estimate: estimate!,
      runtimeTrace: answer.runtimeTrace,
      generatedAt: "2026-06-03T00:00:00.000+06:00",
      language: "ru",
    });
    const text = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate!.work.workKey }).text;

    expect(pdf.validation.valid).toBe(true);
    expect(validateNoPdfMojibake(text).passed).toBe(true);
    expect(text).toContain("Источник");
    expect(text).toContain("датчики температуры");
    expect(text).not.toContain("| ---");
  });
});
