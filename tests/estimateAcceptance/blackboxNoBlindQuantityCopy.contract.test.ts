import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox no blind quantity copy", () => {
  it("separates formula-backed quantities from independent normative-source proof", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());
    const proven = results.filter((item) => item.no_missing_norm_source);
    const blocked = results.filter((item) => !item.no_missing_norm_source);

    expect(results).toHaveLength(530);
    expect(results.every((item) => item.no_blind_quantity_copy)).toBe(true);
    expect(proven).toHaveLength(7);
    expect(blocked).toHaveLength(523);
    expect(results.every((item) => item.no_missing_formula_trace)).toBe(true);
    expect(results.every((item) => item.user_confirmation_required)).toBe(true);
    expect(proven.every((item) => item.estimate_revision_created && item.director_payload_created)).toBe(true);
    expect(blocked.every((item) => !item.estimate_revision_created && !item.director_payload_created)).toBe(true);
    expect(blocked.every((item) => item.blocking_reasons.includes("blackbox_norm_source_missing"))).toBe(true);
    expect(blocked.every((item) => !item.blocking_reasons.includes("blackbox_blind_quantity_copy_detected"))).toBe(true);
  });
});
