import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox buyer handoff", () => {
  it("hands only procurement subset rows to the buyer and keeps material quantities aligned", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());
    const concreteBuyerRows = results.filter((item) => item.row_count > 0);

    expect(concreteBuyerRows.every((item) => item.buyer_row_count > 0)).toBe(true);
    expect(results.every((item) => item.buyer_handoff_created)).toBe(true);
    expect(results.every((item) => item.buyer_handoff_subset_valid)).toBe(true);
    expect(results.every((item) => item.no_ai_generated_quantities)).toBe(true);
    expect(results.every((item) => item.no_ai_generated_prices)).toBe(true);
  });
});
