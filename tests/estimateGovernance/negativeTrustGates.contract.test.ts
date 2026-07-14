import { runProductionTrustNegativeGates } from "../../src/features/estimates/governance/productionTrust";

describe("production trust negative gates", () => {
  it("rejects fake green mutations", () => {
    expect(runProductionTrustNegativeGates()).toMatchObject({
      production_trust_negative_gates_passed: true,
      fake_source_rejected: true,
      rejected_review_blocks_trust: true,
      ai_price_rejected: true,
      zero_missing_price_rejected: true,
      currency_mismatch_rejected: true,
      fake_final_total_rejected: true,
      pdf_missing_price_omission_rejected: true,
      buyer_work_rows_rejected: true,
      manual_trust_override_rejected: true,
      stale_artifact_rejected: true,
      env_browser_green_rejected: true,
    });
  });
});
