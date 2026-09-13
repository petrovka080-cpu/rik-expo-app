import {
  classifyRealProfessionalNormAuditOutcome,
  GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS,
  STOP_NORM_REALITY_AUDIT_NOT_FOUND,
  STOP_REAL_NORM_ACCEPTANCE_DENOMINATOR_INCOMPLETE,
  STOP_REAL_NORM_CATALOG_ADMISSION_INCOMPLETE,
  STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS,
} from "../../scripts/estimate/auditRealProfessionalNormPacks";

describe("real professional norm audit outcome", () => {
  const base = {
    previousStatusOk: true,
    green: false,
    physicalSourceCoverageComplete: true,
    acceptanceDenominatorComplete: true,
    catalogAdmissionComplete: true,
  };

  it.each([
    [{ ...base, previousStatusOk: false }, STOP_NORM_REALITY_AUDIT_NOT_FOUND],
    [{ ...base, physicalSourceCoverageComplete: false }, STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS],
    [{ ...base, acceptanceDenominatorComplete: false }, STOP_REAL_NORM_ACCEPTANCE_DENOMINATOR_INCOMPLETE],
    [{ ...base, catalogAdmissionComplete: false }, STOP_REAL_NORM_CATALOG_ADMISSION_INCOMPLETE],
    [{ ...base, green: true }, GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS],
  ])("classifies the first actual acceptance blocker", (input, expectedStatus) => {
    expect(classifyRealProfessionalNormAuditOutcome(input).finalStatus).toBe(expectedStatus);
  });
});
