import { auditMultiDomainAsphaltDepthParityV4 } from "../../src/lib/estimate/v4/auditMultiDomainAsphaltDepthParityV4";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";

describe("ASPHALT-DEPTH PROFESSIONAL PARITY gate", () => {
  test("does not misrepresent the current formula skeletons as deep professional passports", () => {
    const audits = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4);
    expect(audits.filter((audit) => audit.ready)).toHaveLength(0);
    expect(audits.every((audit) =>
      audit.blockers.some((blocker) =>
        blocker.startsWith("BOQ_TOO_SHALLOW") ||
        blocker.startsWith("MISSING_CATEGORY") ||
        blocker === "MISSING_P1_PARAMETERS" ||
        blocker === "MISSING_P2_PARAMETERS"))).toBe(true);
  });

  test("requires twelve distinct technology signatures", () => {
    const audits = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.map(auditMultiDomainAsphaltDepthParityV4);
    expect(new Set(audits.map((audit) => audit.distinctionSignature)).size).toBe(12);
  });
});
