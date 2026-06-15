import { runEstimateQualityCurrencyAudit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";

describe("regional currency quality", () => {
  it("keeps KG/KZ in governed local currencies", () => {
    const audit = runEstimateQualityCurrencyAudit({ writeArtifacts: false });

    expect(audit.kg_uses_kgs).toBe(true);
    expect(audit.kz_uses_kzt).toBe(true);
    expect(audit.usd_final_total_for_kg).toBe(0);
    expect(audit.usd_final_total_for_kz).toBe(0);
    expect(audit.wrong_currency_cases).toBe(0);
  });
});
