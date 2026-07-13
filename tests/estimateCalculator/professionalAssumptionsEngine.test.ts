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
});
