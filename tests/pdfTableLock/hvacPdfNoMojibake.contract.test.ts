import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

describe("HVAC PDF mojibake guard", () => {
  it("does not emit mojibake in extracted PDF text", () => {
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
    const noMojibake = validateNoPdfMojibake(proof.text);

    expect(proof.mojibakeFound).toBe(false);
    expect(noMojibake.passed).toBe(true);
    expect(noMojibake.failures).toEqual([]);
  });
});
