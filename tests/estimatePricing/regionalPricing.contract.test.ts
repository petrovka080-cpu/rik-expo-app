import { auditGovernedPricebookCoverage } from "../../scripts/estimate/auditPricebookCoverage";

describe("regional pricing governance", () => {
  it("requires region, currency, pricebook version and FX source for conversion", () => {
    const audit = auditGovernedPricebookCoverage();

    expect(audit.estimate_region_required).toBe(true);
    expect(audit.estimate_currency_required).toBe(true);
    expect(audit.pricebook_version_visible).toBe(true);
    expect(audit.fx_source_required_for_currency_conversion).toBe(true);
    expect(audit.no_cross_currency_total_without_fx).toBe(true);
    expect(audit.region_specific_pricebook_selected).toBe(true);
    expect(audit.pricebook_coverage_audit_passed).toBe(true);
    expect(audit.blockers).toEqual([]);
  });
});
