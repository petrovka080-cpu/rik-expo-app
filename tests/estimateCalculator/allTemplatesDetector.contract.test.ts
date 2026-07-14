import { validateAllProductionTemplatesBoq10000 } from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(60_000);

describe("all 10000 estimate templates detector", () => {
  it("validates the full production template catalog with trace, units, and no fake area rows", () => {
    const result = validateAllProductionTemplatesBoq10000({ sampleMatrixCount: 100 });

    expect(result.all_10000_templates_boq_validation_passed).toBe(true);
    expect(result.templates_validated_count).toBeGreaterThanOrEqual(10_000);
    expect(result.templates_failed_count).toBe(0);
    expect(result.all_templates_generate_calculation_trace).toBe(true);
    expect(result.all_templates_have_valid_units).toBe(true);
    expect(result.no_templates_generate_all_rows_same_area).toBe(true);
    expect(result.no_templates_generate_fake_default_price).toBe(true);
  });
});
