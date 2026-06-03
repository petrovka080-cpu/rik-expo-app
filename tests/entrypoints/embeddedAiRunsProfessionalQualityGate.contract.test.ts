import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { evaluateProfessionalEstimatorQuality } from "../../src/lib/ai/professionalQuality";
import { QUALITY_PROMPTS } from "../professionalQuality/professionalEstimatorQualityTestHelpers";

describe("embedded AI professional estimator quality gate", () => {
  it("returns a quality-gated structured estimate for foreman context before UI/PDF presentation", () => {
    const answer = answerBuiltInAi({
      text: QUALITY_PROMPTS.roofWaterproofing,
      route: "/ai?context=foreman",
      screenContext: "foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    expect(estimate).toBeDefined();
    const report = evaluateProfessionalEstimatorQuality(estimate!);
    const presentation = buildEstimatePresentationViewModel(estimate!);
    expect(report.passed).toBe(true);
    expect(presentation.rows.length).toBe(estimate!.sections.flatMap((section) => section.rows).length);
    expect(report.weakGenericRows).toEqual([]);
  });
});
