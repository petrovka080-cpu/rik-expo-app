import {
  collectRequestEstimateSelectedWorkUxMojibakeScan,
  type MojibakeScanSurface,
} from "../../scripts/e2e/runRequestEstimateSelectedWorkUxMojibakeRootCauseScan";

jest.setTimeout(60000);

describe("request estimate selected-work visible surfaces", () => {
  it("keeps UI, PDF, catalog, and request payload text free of mojibake", () => {
    const requiredSurfaces: MojibakeScanSurface[] = ["ui", "pdf", "catalog", "request"];
    const result = collectRequestEstimateSelectedWorkUxMojibakeScan({ caseCount: 8 });

    for (const surface of requiredSurfaces) {
      expect(result.surface_totals[surface]).toBeGreaterThan(0);
      expect(result.sources.filter((source) => source.surface === surface)).toEqual([]);
    }
    expect(result.mojibake_found).toBe(0);
  });
});
