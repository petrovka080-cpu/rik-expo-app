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

  it("keeps full foundation concrete scopes out of rebar-only template routing", async () => {
    const prompts = [
      "estimate cost for concrete slab foundation formwork rebar pouring curing baseline phase2 domain 01 variant 004 commercial alpha 57 sq_m",
      "estimate cost for concrete slab foundation formwork rebar pouring curing retail phase2 domain 11 variant 001 residential alpha 72 sq_m",
    ];

    for (const text of prompts) {
      const { result } = calculateUniversalRoutedEstimate(text, {
        countryCode: "KG",
        city: "Bishkek",
        language: "en",
      });

      expect(result.work.workKey).toBe("foundation_concrete");
      expect(result.work.category).toBe("foundation");
      expect(result.work.workKey).not.toBe("foundation_rebar_reinforcement");
    }
  });

  it("keeps explicit foundation rebar installation on the rebar reinforcement template", async () => {
    const { result } = calculateUniversalRoutedEstimate("estimate cost for foundation rebar installation 2000 kg", {
      countryCode: "KG",
      city: "Bishkek",
      language: "en",
    });

    expect(result.work.workKey).toBe("foundation_rebar_reinforcement");
  });

  it("keeps generic rebar installation as its own public work type", async () => {
    const { result } = calculateUniversalRoutedEstimate("Estimate rebar_installation 96 linear_m", {
      countryCode: "KG",
      city: "Bishkek",
      language: "en",
      explicitWorkKey: "rebar_installation",
    });

    expect(result.work.workKey).toBe("rebar_installation");
    expect(result.work.title).toMatch(/rebar|арматур|армирован/i);
    expect(result.work.title).not.toMatch(/foundation|фундамент/i);
    expect(result.input).toMatchObject({
      volume: 96,
      unit: "linear_m",
    });
  });
});
