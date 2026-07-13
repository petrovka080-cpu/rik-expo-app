import { auditWorkPassportsAndRealBoqContentPacks } from "../../scripts/estimate/auditWorkPassportsAndRealBoqContentPacks";

jest.setTimeout(120_000);

describe("work content packs coverage", () => {
  it("binds passports to formulas, norm sources, PDF mapping, and buyer mapping", () => {
    const result = auditWorkPassportsAndRealBoqContentPacks({
      requireGateFlags: false,
      writeLedger: false,
      writeSummary: false,
    });

    expect(result.summary.content_packs_created_or_verified).toBe(11610);
    expect(result.summary.compiled_boq_rows_created_or_verified).toBe(11610);
    expect(result.summary.compiled_boq_row_instances_created_or_verified).toBeGreaterThan(300_000);
    expect(result.summary.rows_without_norm_source_count).toBe(0);
    expect(result.summary.rows_without_formula_count).toBe(0);
    expect(result.summary.rows_without_calculation_trace_count).toBe(0);
    expect(result.summary.missing_pdf_mapping_count).toBe(0);
    expect(result.summary.missing_buyer_handoff_mapping_count).toBe(0);
    expect(result.summary.fake_price_count).toBe(0);
    expect(result.summary.fake_final_total_count).toBe(0);
  });
});
