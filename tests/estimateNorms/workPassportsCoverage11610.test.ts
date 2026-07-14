import { professionalWorkPassportRegistryStats } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import { validateProfessionalWorkPassportRegistry } from "../../src/lib/estimate/validateProfessionalWorkPassport";

jest.setTimeout(120_000);

describe("work passports coverage for 11610 catalog", () => {
  it("creates one real professional work passport per template", () => {
    const stats = professionalWorkPassportRegistryStats();
    const validation = validateProfessionalWorkPassportRegistry();

    expect(stats.expected_total).toBe(11610);
    expect(stats.actual_total).toBe(11610);
    expect(stats.base_10000_total).toBe(10000);
    expect(stats.expanded_complex_1610_total).toBe(1610);
    expect(validation.summary.templates_processed).toBe(11610);
    expect(validation.summary.work_passports_created).toBe(11610);
    expect(validation.summary.ready_professional_work_passports).toBe(11610);
    expect(validation.summary.blocked_templates_count).toBe(0);
    expect(validation.summary.passport_missing_for_template).toBe(0);
    expect(validation.summary.passport_has_only_template_name).toBe(0);
    expect(validation.summary.minimum_professional_boq_rows_required).toBe(45);
    expect(validation.summary.short_professional_boq_count).toBe(0);
    expect(validation.summary.templates_below_professional_depth_count).toBe(0);
    expect(validation.summary.min_compiled_boq_rows_per_template).toBeGreaterThanOrEqual(45);
  });
});
