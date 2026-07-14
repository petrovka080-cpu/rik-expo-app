import { runBlackboxNegativeMutations } from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

describe("truth audit negative mutations", () => {
  it("proves the gates fail on fake sources, traces, units, prices and env-only browser green", () => {
    const summary = runBlackboxNegativeMutations();

    expect(summary.mutation_cases_checked).toBeGreaterThanOrEqual(20);
    expect(summary.negative_tests_prove_gates_fail).toBe(true);
    expect(summary.fake_source_mutation_rejected).toBe(true);
    expect(summary.missing_trace_mutation_rejected).toBe(true);
    expect(summary.wrong_unit_mutation_rejected).toBe(true);
    expect(summary.blind_quantity_copy_mutation_rejected).toBe(true);
    expect(summary.invalid_price_mutation_rejected).toBe(true);
    expect(summary.env_browser_green_mutation_rejected).toBe(true);
  });
});
