import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox no generic fallback", () => {
  it("keeps catalog-source rows blocked without losing exact row names or catalog identities", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());
    const blocked = results.filter((item) => !item.professional);

    expect(results).toHaveLength(530);
    expect(blocked).toHaveLength(523);
    expect(results.filter((item) => item.professional)).toHaveLength(7);
    expect(results.every((item) => item.no_generic_row_names)).toBe(true);
    expect(results.every((item) => item.no_missing_catalog_item_id)).toBe(true);
    expect(blocked.every((item) => !item.no_generic_fallback)).toBe(true);
    expect(blocked.every((item) =>
      item.blocking_reasons.includes("blackbox_generic_fallback_detected")
    )).toBe(true);
    expect(blocked.every((item) =>
      item.blocking_reasons.includes("blackbox_norm_source_missing")
    )).toBe(true);
  });
});
