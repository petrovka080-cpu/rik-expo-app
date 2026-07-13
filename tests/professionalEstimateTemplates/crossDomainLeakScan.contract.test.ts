import { professionalCrossDomainLeakAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate cross-domain leak scan", () => {
  it("scans all 1500 professional estimate cases with zero row-domain leaks", () => {
    const result = professionalCrossDomainLeakAudit();

    expect(result.cases_scanned).toBe(1500);
    expect(result.cross_domain_row_leaks).toBe(0);
    expect(result.selected_work_key_lost).toBe(0);
    expect(result.wrong_group_template_used).toBe(0);
    expect(result.group_only_generic_templates_used).toBe(0);
  });
});
