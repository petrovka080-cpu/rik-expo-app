import { professionalCurrencyAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate KZ currency", () => {
  it("uses KZT for Kazakhstan regions", () => {
    const result = professionalCurrencyAudit();
    expect(result.kz_uses_kzt).toBe(true);
    expect(result.usd_final_total_for_kz).toBe(0);
  });
});
