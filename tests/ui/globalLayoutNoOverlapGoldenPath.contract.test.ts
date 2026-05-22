import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("global layout no-overlap golden path", () => {
  it("keeps primary actions, sheet footers, and chat composers above the bottom nav", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.bottom_nav_overlap_found).toBe(0);
    expect(report.matrix.all_primary_actions_clickable).toBe(true);
    expect(report.matrix.all_chat_composers_above_bottom_nav).toBe(true);
    expect(report.matrix.all_sheet_footers_above_bottom_nav).toBe(true);
    expect(report.layout_rects.routes_checked).toEqual(
      expect.arrayContaining(["/office", "/market", "/add", "/request", "/ai?context=accountant"]),
    );
  });
});
