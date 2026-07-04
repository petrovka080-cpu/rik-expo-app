import {
  expandBlackboxCorpus,
  loadBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";
import { PRODUCTION_WORK_DEFINITIONS_10000 } from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(240_000);

describe("blackbox 10000 acceptance corpus", () => {
  it("keeps mandatory broken-history cases plus representative and random coverage", () => {
    const corpus = loadBlackboxCorpus();
    const expanded = expandBlackboxCorpus(corpus);
    const allProductionCategories = new Set(PRODUCTION_WORK_DEFINITIONS_10000.map((item) => item.category));
    const representedCategories = new Set(
      expanded
        .map((item) => item.work_key)
        .filter(Boolean)
        .map((workKey) => PRODUCTION_WORK_DEFINITIONS_10000.find((item) => item.workKey === workKey)?.category)
        .filter(Boolean),
    );

    expect(corpus.random_sample.minimum_template_count).toBeGreaterThanOrEqual(500);
    expect(corpus.random_sample.no_easy_case_bias).toBe(true);
    expect(expanded.filter((item) => item.source === "mandatory_broken_history")).toHaveLength(10);
    expect(expanded.filter((item) => item.source === "deterministic_random_sample")).toHaveLength(500);
    expect(expanded.length).toBeGreaterThanOrEqual(530);
    expect([...allProductionCategories].every((category) => representedCategories.has(category))).toBe(true);
    expect(expanded.map((item) => item.case_id)).toEqual(expect.arrayContaining([
      "diamond_drilling_bare",
      "diamond_drilling_full",
      "profile_sheet_fence_bare",
      "profile_sheet_fence_full",
      "mansard_roof_bare",
      "mansard_roof_full",
      "apartment_54",
    ]));
  });
});
