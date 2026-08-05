import { buildProfessionalAssumptionEngineResult } from "../../src/lib/estimate/professionalAssumptionEngine";
import { buildProfessionalBoqRiskPolicy } from "../../src/lib/estimate/professionalBoqRiskPolicy";
import {
  buildProfessionalMissingInputPolicy,
  DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ,
  promptHasBasicProfessionalParameters,
} from "../../src/lib/estimate/missingInputPolicy";

describe("professional assumption engine", () => {
  it("applies professional defaults and never requires drawings for a preliminary BOQ", () => {
    const prompt = "забор из профлиста 80 м высота 2 м";
    const riskPolicy = buildProfessionalBoqRiskPolicy({ prompt });
    const missingPolicy = buildProfessionalMissingInputPolicy({ prompt, riskPolicy });
    const assumptions = buildProfessionalAssumptionEngineResult({
      prompt,
      rowCount: 18,
      hasAnySourceBackedPrice: false,
      riskPolicy,
    });

    expect(DRAWINGS_NOT_REQUIRED_FOR_PRELIMINARY_BOQ).toBe(true);
    expect(promptHasBasicProfessionalParameters(prompt)).toBe(true);
    expect(missingPolicy.drawingsRequiredForDraft).toBe(false);
    expect(missingPolicy.draftEstimateGeneratedWhenDrawingsMissing).toBe(true);
    expect(assumptions.drawingsNotRequiredForPreliminaryBoq).toBe(true);
    expect(assumptions.professionalDefaultsApplied).toBe(true);
    expect(assumptions.defaultAssumptionsRu.join(" ")).toContain("2.5");
    expect(assumptions.missingInputsRu.length).toBeGreaterThan(0);
    expect(assumptions.finalContractStatusBlockedUntilReview).toBe(true);
    expect(assumptions.pricePolicyRu).toContain("финальный итог не рассчитывается");
  });

  it("keeps source-backed price notes non-final until region and supplier are confirmed", () => {
    const prompt = "покраска стен 200 м2 2 слоя грунтовка";
    const riskPolicy = buildProfessionalBoqRiskPolicy({ prompt });
    const assumptions = buildProfessionalAssumptionEngineResult({
      prompt,
      rowCount: 41,
      hasAnySourceBackedPrice: true,
      riskPolicy,
    });

    expect(assumptions.professionalDefaultsApplied).toBe(true);
    expect(assumptions.pricePolicyRu).toContain("источником");
    expect(assumptions.pricePolicyRu).toContain("подтвердить");
    expect(assumptions.finalContractStatusBlockedUntilReview).toBe(true);
  });

  it("classifies a Cyrillic full-road request as elevated risk", () => {
    const riskPolicy = buildProfessionalBoqRiskPolicy({
      prompt:
        "\u041f\u043e\u043b\u043d\u043e\u0435 \u0441\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u0434\u043e\u0440\u043e\u0436\u043d\u043e\u0439 \u043e\u0434\u0435\u0436\u0434\u044b, \u0434\u043b\u0438\u043d\u0430 1 \u043a\u043c, \u0448\u0438\u0440\u0438\u043d\u0430 6 \u043c",
    });

    expect(riskPolicy.riskLevel).toBe("elevated");
    expect(riskPolicy.riskCodes).toContain("road_traffic");
    expect(riskPolicy.requiresSpecialist).toBe(true);
  });
});
