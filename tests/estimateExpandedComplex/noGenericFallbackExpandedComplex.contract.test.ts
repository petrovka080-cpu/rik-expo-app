import {
  classifyExpandedComplexProfessionalReadiness,
  EXPANDED_COMPLEX_WORK_FAMILIES,
} from "../../src/lib/ai/expandedComplexWorks";

describe("expanded complex no generic fallback", () => {
  it("rejects names-only, fake-source and generic fallback readiness", () => {
    for (const family of EXPANDED_COMPLEX_WORK_FAMILIES) {
      const status = classifyExpandedComplexProfessionalReadiness(family);
      expect(status).not.toBe("NOT_READY_GENERIC_FALLBACK");
      expect(status).not.toBe("NOT_READY_FAKE_SOURCE");
      expect(status).not.toBe("NOT_READY_RAW_DUMP_UI");
      expect(status).not.toBe("NOT_READY_MISSING_FORMULA");
      expect(family.normSource.provenance).toBe("engineering_reference_formula");
      expect(family.normSource.sourceId).not.toMatch(/unknown|generated_family_default|synthetic_family_default/i);
    }
  });
});
