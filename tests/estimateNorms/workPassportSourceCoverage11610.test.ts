import { validateWorkPassportSources } from "../../src/lib/estimate/validateWorkPassportSources";

jest.setTimeout(180_000);

describe("work passport source coverage 11610", () => {
  it("covers every work passport BOQ row with governed source citations", () => {
    const { summary } = validateWorkPassportSources();

    expect(summary.templates_audited).toBe(11610);
    expect(summary.rows_audited).toBeGreaterThan(600000);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.rows_without_norm_source_count).toBe(0);
    expect(summary.rows_without_source_citation_count).toBe(0);
    expect(summary.formulas_without_provenance_count).toBe(0);
    expect(summary.rows_without_quantity_trace_count).toBe(0);
    expect(summary.price_rows_without_pricebook_source_count).toBe(0);
    expect(summary.unverified_sources_used_as_trusted_count).toBe(0);
    expect(summary.all_11610_work_passports_have_norm_source_citations).toBe(true);
    expect(summary.all_boq_rows_have_norm_source_citation).toBe(true);
    expect(summary.all_boq_rows_have_formula_provenance).toBe(true);
    expect(summary.all_boq_rows_have_quantity_trace).toBe(true);
  });
});
