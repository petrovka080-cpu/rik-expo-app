import { auditMultiDomainAsphaltDepthParityV4 } from "../../src/lib/estimate/v4/auditMultiDomainAsphaltDepthParityV4";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";

describe("ASPHALT-DEPTH PROFESSIONAL PARITY gate", () => {
  test("does not promote aggregated resource compositions as asphalt-depth passports", () => {
    const audits = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4);
    expect(audits.filter((audit) => audit.ready)).toHaveLength(0);
    expect(audits.every((audit) => !audit.blockers.includes("PRODUCT_PROJECTION_NOT_READY"))).toBe(true);
    expect(audits.every((audit) =>
      audit.blockers.includes("FULL_MATERIAL_RESOURCE_DECOMPOSITION_NOT_PROVEN"))).toBe(true);
    expect(audits.every((audit) =>
      audit.formulaNodeCount >= 8 &&
      audit.boqRowCount >= 10 &&
      audit.parameterLevels.P1 > 0 &&
      audit.parameterLevels.P2 > 0)).toBe(true);
  });

  test("requires twelve distinct technology signatures", () => {
    const audits = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4);
    expect(new Set(audits.map((audit) => audit.distinctionSignature)).size).toBe(12);
  });
});
