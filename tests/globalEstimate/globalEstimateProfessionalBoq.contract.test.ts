import { buildGlobalEstimateFixture, expectProfessionalBoqShape } from "./globalEstimateTestHarness";
import { calculateUniversalRoutedEstimate } from "../../src/lib/ai/estimateRouting/universalEstimateIntentRouter";

describe("global estimate professional BOQ delivery contract", () => {
  it("renders materials, labor, totals, tax status and clarifying questions", async () => {
    const { answer, result } = await buildGlobalEstimateFixture({
      text: "Need laminate installation for 1000 sq ft in Dallas TX 75201",
      language: "en",
    });

    expectProfessionalBoqShape(answer);
    expect(result.sections.some((section) => section.type === "materials")).toBe(true);
    expect(result.sections.some((section) => section.type === "labor")).toBe(true);
    expect(result.totals.grandTotal).toBeGreaterThan(0);
    expect(result.clarifyingQuestions.length).toBeGreaterThan(0);
  });

  it("keeps substation and power line infrastructure out of generic electrical renovation", async () => {
    const prompts = [
      "estimate cost for substation grounding power line electrical cable protection testing renovation phase2 domain 02 variant 001 apartment alpha 92 sq_m",
      "estimate cost for substation grounding power line electrical cable protection testing retail phase2 domain 11 variant 001 residential alpha 92 sq_m",
    ];

    for (const text of prompts) {
      const { result } = calculateUniversalRoutedEstimate(text, {
        countryCode: "KG",
        city: "Bishkek",
        language: "en",
      });

      expect(result.work.workKey).toBe("transformer_substation");
      expect(result.work.category).toBe("electrical");
      expect(result.work.category).not.toBe("renovation");
      expect(result.work.category).not.toBe("commercial_fit_out");
    }
  });
});
