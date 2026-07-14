import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox no generic fallback", () => {
  it("does not accept family defaults, generic row names, or missing catalog IDs", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());

    expect(results.every((item) => item.no_generic_fallback)).toBe(true);
    expect(results.every((item) => item.no_generic_row_names)).toBe(true);
    expect(results.every((item) => item.no_missing_catalog_item_id)).toBe(true);
    expect(results.flatMap((item) => item.blocking_reasons)).toEqual([]);
  });
});
