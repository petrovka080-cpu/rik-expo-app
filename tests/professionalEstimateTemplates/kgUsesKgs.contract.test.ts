import { professionalCurrencyAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate KG currency", () => {
  it("uses KGS for Kyrgyzstan regions", () => {
    const result = professionalCurrencyAudit();
    expect(result.kg_uses_kgs).toBe(true);
    expect(result.usd_final_total_for_kg).toBe(0);
  });
});
