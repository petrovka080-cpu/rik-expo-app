import { professionalCurrencyAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate no USD fallback", () => {
  it("does not use USD final totals for KG or KZ", () => {
    const result = professionalCurrencyAudit();
    expect(result.usd_final_total_for_kg).toBe(0);
    expect(result.usd_final_total_for_kz).toBe(0);
  });
});
