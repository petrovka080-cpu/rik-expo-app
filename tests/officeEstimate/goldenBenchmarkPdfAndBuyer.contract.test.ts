import {
  buildGeneratedBenchmarkEstimate,
  loadGoldenBenchmarkCases,
} from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark PDF and buyer handoff", () => {
  it("keeps PDF rows equal to snapshot and buyer package procurement-only", () => {
    const criticalCases = loadGoldenBenchmarkCases().filter((item) => item.critical);
    const generated = criticalCases.map((item) => ({
      caseDef: item,
      estimate: buildGeneratedBenchmarkEstimate(item),
    }));
    let needsInputGateCount = 0;

    for (const { caseDef, estimate } of generated) {
      const snapshotCodes = new Set(estimate.rows.map((row) => row.code));
      expect(estimate.pdf_row_codes.every((code) => snapshotCodes.has(code))).toBe(true);
      expect(estimate.rows.every((row) => !estimate.buyer_row_codes.includes(row.code) || (
        row.included_in_procurement &&
        row.line_type !== "work" &&
        row.line_type !== "helper"
      ))).toBe(true);
      expect(estimate.final_total_displayed).toBe(false);

      if (caseDef.current_runtime_contract?.expected_outcome === "NEEDS_INPUT") {
        needsInputGateCount += 1;
        expect(caseDef.current_runtime_contract.version).toBe("canonical-pump-p0-gate-v1");
        expect(caseDef.current_runtime_contract.historical_reference_status).toBe("READ_ONLY_SUPERSEDED_BY_P0_GATE");
        expect(estimate.estimate_level).toBe("NEEDS_INPUT");
        expect(estimate.missing_design_inputs.length).toBeGreaterThan(0);
        expect(estimate.rows).toEqual([]);
        expect(estimate.pdf_row_codes).toEqual([]);
        expect(estimate.buyer_row_codes).toEqual([]);
        expect(estimate.procurement_subset).toEqual([]);
        expect(estimate.total).toBeNull();
      } else {
        expect(estimate.rows.some((row) => row.price_state === "PRICE_MISSING")).toBe(true);
      }
    }

    expect(needsInputGateCount).toBe(2);
  });
});
