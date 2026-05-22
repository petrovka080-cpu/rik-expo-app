import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("core product no raw route labels architecture", () => {
  it("does not expose raw request/index or add/index labels in the bottom nav", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.marketplace_add.raw_request_index_visible).toBe(false);
    expect(report.marketplace_add.raw_add_index_visible).toBe(false);
    expect(report.marketplace_add.add_route_visible_as_tab).toBe(false);
  });
});
