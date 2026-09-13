import {
  classifyCurrentCoreUnitNormBindingStatus,
  jestSummary,
} from "../../scripts/release/buildCurrentCoreUnitAndNormBindingSummary";

describe("current core unit and norm binding summary", () => {
  it("records missing prerequisite evidence as an honest failed input", () => {
    expect(jestSummary(".release-runtime/does-not-exist/norm-evidence.json")).toMatchObject({
      exists: false,
      success: false,
      suites: { total: 0, passed: 0, failed: 0 },
    });
  });

  it("cannot become green with a vacuous empty professional registry", () => {
    expect(classifyCurrentCoreUnitNormBindingStatus({
      registeredProfessionalNormPackCount: 0,
      professionalDimensionalFailures: [],
      genericDimensionalFailures: [],
      genericSourceMasqueradingAsProfessional: false,
      targetedEvidenceComplete: true,
      formulaInvariantEvidenceComplete: true,
    })).toBe("STOP_UNIT_DIMENSIONAL_CATALOG_NORM_ADMISSION_INCOMPLETE");
  });

  it("keeps the local green predicate explicit when every prerequisite exists", () => {
    expect(classifyCurrentCoreUnitNormBindingStatus({
      registeredProfessionalNormPackCount: 1,
      professionalDimensionalFailures: [],
      genericDimensionalFailures: [],
      genericSourceMasqueradingAsProfessional: false,
      targetedEvidenceComplete: true,
      formulaInvariantEvidenceComplete: true,
    })).toBe("GREEN_UNIT_DIMENSIONAL_AND_HONEST_NORM_BINDING_CURRENT_CORE");
  });
});
