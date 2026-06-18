import { currency1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance KG/KZ currency audit", () => {
  it("uses KGS for Bishkek/KG and KZT for Almaty/KZ without USD final totals", () => {
    const audit = currency1560();
    expect(audit.kg_cases_tested).toBe(1560);
    expect(audit.kg_uses_kgs).toBe(1560);
    expect(audit.kz_cases_tested).toBe(1560);
    expect(audit.kz_uses_kzt).toBe(1560);
    expect(audit.usd_final_total_for_kg_kz).toBe(0);
    expect(audit.failures).toEqual([]);
  });
});
