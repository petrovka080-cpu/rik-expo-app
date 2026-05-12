import { scanAppActionGraphCoverage } from "../../scripts/ai/scanAppActionGraphCoverage";

describe("AI app button action coverage scanner", () => {
  it("proves every registered AI-relevant business button has stable registry metadata", () => {
    const report = scanAppActionGraphCoverage(process.cwd());

    expect(report.final_status).toBe("GREEN_APP_ACTION_GRAPH_COVERAGE");
    expect(report.majorScreensRegistered).toBe(true);
    expect(report.aiRelevantButtonsMapped).toBe(true);
    expect(report.buttonActionCoveragePercent).toBe(100);
    expect(report.registryButtonCount).toBeGreaterThan(0);
    expect(report.mutationCount).toBe(0);
    expect(report.findings).toEqual([]);
  });

  it("scans the expected mobile action component kinds without executing actions", () => {
    const report = scanAppActionGraphCoverage(process.cwd());

    expect(report.scannedComponentKinds).toEqual(
      expect.arrayContaining(["Pressable", "Button", "IconButton"]),
    );
    expect(report.mutationCount).toBe(0);
  });
});
