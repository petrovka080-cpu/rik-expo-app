import { auditMultiDomainAsphaltDepthParityV4 } from "../../src/lib/estimate/v4/auditMultiDomainAsphaltDepthParityV4";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";

describe("ASPHALT-DEPTH PROFESSIONAL PARITY gate", () => {
  test("promotes only fully decomposed resource compositions as asphalt-depth passports", () => {
    const audits = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4);
    expect(audits.filter((audit) => audit.ready)).toHaveLength(12);
    expect(audits.every((audit) => !audit.blockers.includes("PRODUCT_PROJECTION_NOT_READY"))).toBe(true);
    expect(audits.every((audit) => audit.blockers.length === 0)).toBe(true);
    expect(audits.every((audit) =>
      audit.formulaNodeCount >= 8 &&
      audit.boqRowCount >= 10 &&
      audit.materialResourceCount >= 4 &&
      audit.parameterLevels.P1 > 0 &&
      audit.parameterLevels.P2 > 0)).toBe(true);
    expect(audits.every((audit) =>
      audit.blockers.every((blocker) =>
        !blocker.startsWith("AGGREGATED_MATERIAL_ROW") &&
        blocker !== "MATERIAL_FORMULA_OWNERSHIP_NOT_UNIQUE"))).toBe(true);
  });

  test("requires twelve distinct technology signatures", () => {
    const audits = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4);
    expect(new Set(audits.map((audit) => audit.distinctionSignature)).size).toBe(12);
  });
});
