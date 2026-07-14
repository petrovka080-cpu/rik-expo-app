import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox no blind quantity copy", () => {
  it("proves quantities come from catalog formulas and traces, not AI copy-through", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());

    expect(results.every((item) => item.no_blind_quantity_copy)).toBe(true);
    expect(results.every((item) => item.no_missing_formula_trace)).toBe(true);
    expect(results.every((item) => item.user_confirmation_required)).toBe(true);
    expect(results.every((item) => item.estimate_revision_created || item.missing_parameters.length > 0)).toBe(true);
    expect(results.every((item) => item.director_payload_created || item.missing_parameters.length > 0)).toBe(true);
  });
});
