import {
  buildCoreProductGoldenPathsReport,
  CORE_PRODUCT_GREEN_STATUS,
} from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("core product golden paths acceptance", () => {
  it("keeps the complete core acceptance matrix green", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.final_status).toBe(CORE_PRODUCT_GREEN_STATUS);
    expect(report.matrix.fake_green_claimed).toBe(false);
    expect(report.matrix.new_product_feature_added).toBe(false);
    expect(report.matrix.second_ai_framework_created).toBe(false);
    expect(report.matrix.second_media_framework_created).toBe(false);
  });

  it("validates all golden paths covered by the wave", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.marketplace_add_product_flow_passed).toBe(true);
    expect(report.matrix.b2c_request_flow_passed).toBe(true);
    expect(report.matrix.foreman_submit_director_flow_passed).toBe(true);
    expect(report.matrix.director_approval_flow_passed).toBe(true);
    expect(report.matrix.buyer_procurement_flow_passed).toBe(true);
    expect(report.matrix.contractor_evidence_inside_expanded_work).toBe(true);
  });
});
