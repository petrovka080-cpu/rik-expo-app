import { professionalCases } from "./professionalEstimateTestHelpers";

describe("professional estimate 1500 cases", () => {
  it("builds exactly 1500 unique no-hint cases with at least 900 canonical work keys", () => {
    const cases = professionalCases();
    expect(cases).toHaveLength(1500);
    expect(new Set(cases.map((item) => item.user_input_ru)).size).toBe(1500);
    expect(new Set(cases.map((item) => item.expected_canonical_work_key)).size).toBeGreaterThanOrEqual(900);
    expect(cases.filter((item) => /[a-z0-9]+_[a-z0-9_]+/.test(item.user_input_ru))).toHaveLength(0);
    expect(cases.filter((item) => item.required_material_names_ru_min.length === 0)).toHaveLength(0);
  });
});
