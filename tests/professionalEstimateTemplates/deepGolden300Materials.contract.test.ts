import { professionalGolden } from "./professionalEstimateTestHelpers";

describe("professional estimate deep golden materials", () => {
  it("passes 300 deep material composition checks", () => {
    const result = professionalGolden();
    expect(result.deep_golden_cases).toBe(300);
    expect(result.must_include_material_failures).toBe(0);
    expect(result.forbidden_material_failures).toBe(0);
    expect(result.row_kind_failures).toBe(0);
    expect(result.wrong_currency_cases).toBe(0);
  });
});
