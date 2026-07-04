import { validateGoldenBenchmarkDataset } from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark dataset", () => {
  it("contains the expert benchmark corpus required by CEO acceptance", () => {
    const validation = validateGoldenBenchmarkDataset();

    expect(validation.golden_cases_count).toBeGreaterThanOrEqual(250);
    expect(validation.golden_cases_count).toBe(validation.index_cases_count);
    expect(validation.mandatory_golden_cases_created).toBe(true);
    expect(validation.all_required_work_family_groups_covered).toBe(true);
    expect(validation.missing_case_fields).toEqual([]);
    expect(validation.missing_reference_files).toEqual([]);
    expect(validation.golden_cases_have_reference_boq).toBe(true);
    expect(validation.golden_cases_have_tolerance_policy).toBe(true);
    expect(validation.golden_cases_have_expert_review_status).toBe(true);
  });
});
