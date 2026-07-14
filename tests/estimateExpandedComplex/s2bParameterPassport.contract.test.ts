import { getExpandedComplexWorkFamily } from "../../src/lib/ai/expandedComplexWorks";
import { S2B_INFRASTRUCTURE_FAMILY_MANIFEST } from "../../src/lib/ai/expandedComplexWorks/s2b/manifest";

describe("S2B parameter passport manifest", () => {
  it("defines complete manifest metadata for all required infrastructure families", () => {
    expect(S2B_INFRASTRUCTURE_FAMILY_MANIFEST).toHaveLength(18);

    for (const entry of S2B_INFRASTRUCTURE_FAMILY_MANIFEST) {
      const family = getExpandedComplexWorkFamily(entry.work_family_id);
      expect(family?.calculatorId).toBe(entry.calculator_id);
      expect(entry.parameter_passport_id).toMatch(/^expanded_complex\./);
      expect(entry.required_p0_parameters.length).toBeGreaterThan(0);
      expect(entry.required_domain_blocks.length).toBeGreaterThan(0);
      expect(entry.allowed_units.length).toBeGreaterThan(0);
      expect(entry.formula_trace_required).toBe(true);
      expect(entry.price_policy).toBe("PRICE_MISSING_NO_FINAL_TOTAL");
      expect(entry.blocking_reasons).toEqual([]);
    }
  });
});
