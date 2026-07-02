import { validateAllProductionTemplatesBoq10000 } from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(120000);

describe("all templates BOQ validation", () => {
  it("passes every 10000 template through the universal BOQ engine", () => {
    const validation = validateAllProductionTemplatesBoq10000();

    expect(validation.final_status).toBe("GREEN_AI_ESTIMATE_10000_TEMPLATE_BOQ_VALIDATION_READY");
    expect(validation.templates_validated_count).toBe(10000);
    expect(validation.templates_failed_count).toBe(0);
    expect(validation.all_10000_templates_boq_validation_passed).toBe(true);
    expect(validation.all_templates_generate_calculation_trace).toBe(true);
    expect(validation.all_templates_have_non_zero_quantities).toBe(true);
    expect(validation.all_templates_have_valid_units).toBe(true);
    expect(validation.no_templates_generate_all_rows_same_area).toBe(true);
    expect(validation.no_templates_generate_fake_default_price).toBe(true);
  });
});
