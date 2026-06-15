import { runEstimateQualityPriceIntegrityAudit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";

describe("price integrity quality", () => {
  it("finds no fake/random/zero/missing-total issues in normal estimates", () => {
    const audit = runEstimateQualityPriceIntegrityAudit({ writeArtifacts: false });

    expect(audit.random_prices_found).toBe(0);
    expect(audit.fake_suppliers_found).toBe(0);
    expect(audit.zero_as_known_price_found).toBe(0);
    expect(audit.line_total_from_missing_price).toBe(0);
  });
});
