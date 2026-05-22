import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("contractor evidence golden path", () => {
  it("keeps evidence controls inside the expanded work and away from the bottom nav", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.contractor_evidence_inside_expanded_work).toBe(true);
    expect(report.contractor_evidence.media_inside_expanded_work).toBe(true);
    expect(report.contractor_evidence.media_visible_in_collapsed_list).toBe(false);
    expect(report.contractor_evidence.floating_media_block_found).toBe(false);
  });
});
