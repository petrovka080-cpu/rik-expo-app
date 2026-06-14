import { professionalPricebookAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate no fake suppliers", () => {
  it("does not claim fake suppliers", () => {
    const result = professionalPricebookAudit();
    expect(result.fake_suppliers_found).toBe(0);
  });
});
