import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox buyer handoff", () => {
  it("keeps procurement parity while blocking unproven quantities from approved handoff", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());
    const concreteBuyerRows = results.filter((item) => item.row_count > 0);
    const proven = results.filter((item) => item.professional);
    const blocked = results.filter((item) => !item.professional);

    expect(results).toHaveLength(530);
    expect(concreteBuyerRows).toHaveLength(526);
    expect(concreteBuyerRows.every((item) => item.buyer_row_count > 0)).toBe(true);
    expect(results.every((item) => item.buyer_handoff_created)).toBe(true);
    expect(results.every((item) => item.buyer_handoff_subset_valid)).toBe(true);
    expect(results.every((item) => item.no_ai_generated_prices)).toBe(true);
    expect(proven).toHaveLength(7);
    expect(proven.every((item) => item.no_ai_generated_quantities)).toBe(true);
    expect(blocked).toHaveLength(523);
    expect(blocked.every((item) => !item.no_ai_generated_quantities)).toBe(true);
    expect(blocked.every((item) => !item.estimate_revision_created && !item.director_payload_created)).toBe(true);
  });
});
