import { WATERPROOFING_DISAMBIGUATION_CASES, expectCaseResolves } from "./waterproofingDisambiguationTestHelpers";

describe("waterproofing basement and pool disambiguation", () => {
  it("distinguishes basement, pool, and floor-under-tile waterproofing", () => {
    const expected = new Map([
      ["basement", "basement_waterproofing"],
      ["pool", "pool_waterproofing"],
      ["floor_under_tile", "waterproofing_under_tile"],
    ]);

    for (const [id, workKey] of expected) {
      const testCase = WATERPROOFING_DISAMBIGUATION_CASES.find((candidate) => candidate.id === id);

      expect(testCase).toBeDefined();
      const estimate = expectCaseResolves(testCase!);

      expect(estimate.work.workKey).toBe(workKey);
    }
  });
});
