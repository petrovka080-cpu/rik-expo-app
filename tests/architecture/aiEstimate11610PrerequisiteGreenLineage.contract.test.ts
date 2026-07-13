import { auditAiEstimate11610PrerequisiteGreenLineage } from "../../scripts/estimate/auditAiEstimate11610PrerequisiteGreenLineage";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(240000);

describe("AI estimate 11610 prerequisite green lineage", () => {
  it("uses current source checks instead of stale prerequisite artifacts", () => {
    const summary = auditAiEstimate11610PrerequisiteGreenLineage();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.professional_boq_11610_green_found).toBe(true);
    expect(summary.parameter_cards_11610_green_found).toBe(true);
    expect(summary.normative_parameter_green_found).toBe(true);
    expect(summary.platform_core_v2_green_found).toBe(true);
    expect(summary.durable_ledger_green_found).toBe(true);
    expect(summary.architecture_seal_green_found).toBe(true);
    expect(summary.ai_kernel_green_found).toBe(true);
    expect(summary.evalops_green_found).toBe(true);
    expect(summary.stale_prerequisite_artifacts_not_used).toBe(true);
  });
});
