import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("marketplace add product golden path", () => {
  it("keeps the add plus after market and opens a service-backed product flow", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.bottom_nav_order_correct).toBe(true);
    expect(report.matrix.marketplace_add_plus_visible_after_market).toBe(true);
    expect(report.matrix.marketplace_add_product_flow_passed).toBe(true);
    expect(report.matrix.marketplace_publish_backend_validation_passed).toBe(true);
    expect(report.marketplace_add.add_route_reachable_from_ui).toBe(true);
    expect(report.marketplace_add.raw_add_index_visible).toBe(false);
    expect(report.marketplace_add.raw_request_index_visible).toBe(false);
  });
});
