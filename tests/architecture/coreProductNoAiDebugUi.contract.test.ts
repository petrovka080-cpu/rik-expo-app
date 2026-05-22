import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("core product no AI debug UI architecture", () => {
  it("does not expose sourceRef, media ids, storage keys, or runtime debug UI", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.ai_debug_ui_visible).toBe(false);
    expect(report.matrix.sourceRef_visible).toBe(false);
    expect(report.matrix.mediaAssetId_visible).toBe(false);
    expect(report.matrix.storageKey_visible).toBe(false);
    expect(report.matrix.runtime_debug_visible).toBe(false);
    expect(report.ai_role_scorecard.details.every((item) => item.does_not_show_debug)).toBe(true);
  });
});
