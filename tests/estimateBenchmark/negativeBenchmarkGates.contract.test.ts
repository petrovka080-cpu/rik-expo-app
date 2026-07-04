import { runNegativeBenchmarkGates } from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark negative gates", () => {
  it("rejects row, unit, quantity, source, PDF, buyer and fake-green mutations", () => {
    const gates = runNegativeBenchmarkGates();

    expect(gates.negative_benchmark_gates_passed).toBe(true);
    expect(gates.wrong_unit_mutation_rejected).toBe(true);
    expect(gates.quantity_outside_tolerance_rejected).toBe(true);
    expect(gates.missing_row_mutation_rejected).toBe(true);
    expect(gates.source_removed_mutation_rejected).toBe(true);
    expect(gates.formula_trace_removed_mutation_rejected).toBe(true);
    expect(gates.generic_fallback_mutation_rejected).toBe(true);
    expect(gates.fake_price_mutation_rejected).toBe(true);
    expect(gates.final_total_with_missing_prices_rejected).toBe(true);
    expect(gates.pdf_mismatch_mutation_rejected).toBe(true);
    expect(gates.buyer_work_row_mutation_rejected).toBe(true);
    expect(gates.route_marker_smoke_rejected).toBe(true);
    expect(gates.env_flag_browser_proof_rejected).toBe(true);
    expect(gates.silent_tolerance_widening_rejected).toBe(true);
  });
});
