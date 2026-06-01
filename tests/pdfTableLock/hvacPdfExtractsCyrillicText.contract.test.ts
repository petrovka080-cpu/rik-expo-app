import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

describe("HVAC PDF Cyrillic extraction", () => {
  it("extracts readable Russian text from the generated PDF", () => {
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
    const proof = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey });

    expect(proof.valid).toBe(true);
    expect(proof.cyrillicReadable).toBe(true);
    expect(proof.blankText).toBe(false);
    expect(proof.text).toContain("Смета");
    expect(proof.text).toContain("кондиционирования");
  });
});
