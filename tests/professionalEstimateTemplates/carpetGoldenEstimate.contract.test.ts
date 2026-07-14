import { professionalCarpetGolden } from "./professionalEstimateTestHelpers";

describe("professional estimate carpet golden cases", () => {
  it("passes 25 carpet cases without masonry or wrong-domain rows", () => {
    const result = professionalCarpetGolden();

    expect(result.carpet_cases_total).toBeGreaterThanOrEqual(25);
    expect(result.carpet_cases_passed).toBe(true);
    expect(result.masonry_rows_in_carpet).toBe(0);
    expect(result.brick_rows_in_carpet).toBe(0);
    expect(result.concrete_rows_in_carpet).toBe(0);
    expect(result.wrong_domain_rows_in_carpet).toBe(0);
    expect(result.carpet_required_rows_present).toBe(true);
  });
});
