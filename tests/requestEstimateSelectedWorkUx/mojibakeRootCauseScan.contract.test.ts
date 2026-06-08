import {
  collectRequestEstimateSelectedWorkUxMojibakeScan,
} from "../../scripts/e2e/runRequestEstimateSelectedWorkUxMojibakeRootCauseScan";

jest.setTimeout(60000);

describe("request estimate selected-work mojibake root-cause scan", () => {
  it("finds no mojibake sources across the selected-work UX proof sample", () => {
    const result = collectRequestEstimateSelectedWorkUxMojibakeScan({ caseCount: 8 });

    expect(result.mojibake_found).toBe(0);
    expect(result.sources).toEqual([]);
    expect(result.surface_totals.ui).toBeGreaterThan(0);
    expect(result.surface_totals.pdf).toBeGreaterThan(0);
    expect(result.surface_totals.catalog).toBeGreaterThan(0);
    expect(result.surface_totals.request).toBeGreaterThan(0);
    expect(result.fake_green_claimed).toBe(false);
  });
});
