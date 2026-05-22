import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("core product no bottom nav overlap architecture", () => {
  it("keeps shared layout primitives above the main bottom nav", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.layout_rects.sticky_action_bar_above_bottom_nav).toBe(true);
    expect(report.layout_rects.sheet_footers_above_bottom_nav).toBe(true);
    expect(report.layout_rects.chat_composer_above_bottom_nav).toBe(true);
    expect(report.matrix.bottom_nav_overlap_found).toBe(0);
  });
});
