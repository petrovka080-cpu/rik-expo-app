import { benchmarkEstimatePdfBuyerPackages } from "../../scripts/estimate/benchmarkEstimatePdfBuyerPackages";

describe("PDF and buyer performance", () => {
  it("keeps 100 critical PDF and buyer packages complete without truncation", () => {
    const audit = benchmarkEstimatePdfBuyerPackages({ casesLimit: 100 }).artifact;

    expect(audit.pdf_package_performance_passed).toBe(true);
    expect(audit.buyer_handoff_performance_passed).toBe(true);
    expect(audit.pdf_no_truncation_under_load).toBe(true);
    expect(audit.buyer_no_truncation_under_load).toBe(true);
    expect(audit.pdf_rows_truncated_for_speed).toBe(false);
    expect(audit.buyer_rows_truncated_for_speed).toBe(false);
    expect(audit.final_status).toBe("GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE");
  });
});
