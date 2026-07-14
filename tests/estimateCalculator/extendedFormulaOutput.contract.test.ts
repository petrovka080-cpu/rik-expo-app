import { extended10000TemplateSummary } from "../estimateGolden/extended100TestHelpers";

describe("extended template formula output", () => {
  it("keeps formula, norm, source parameters, units and procurement flags on every compiled row", () => {
    const summary = extended10000TemplateSummary();

    expect(summary.all_templates_have_formula_trace).toBe(true);
    expect(summary.all_templates_have_norm_trace).toBe(true);
    expect(summary.all_templates_have_template_version).toBe(true);
    expect(summary.all_templates_have_source_parameters).toBe(true);
    expect(summary.all_templates_have_procurement_flags).toBe(true);
    expect(summary.all_templates_have_valid_units).toBe(true);
    expect(summary.all_templates_have_positive_quantities).toBe(true);
  });
});
