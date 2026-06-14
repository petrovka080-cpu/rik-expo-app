import { professionalCoverage } from "./professionalEstimateTestHelpers";

describe("professional estimate no paid control rows", () => {
  it("does not put QA/control rows into paid estimate rows", () => {
    const result = professionalCoverage();
    expect(result.paid_control_rows).toBe(0);
  });
});
