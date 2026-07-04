import {
  buildGeneratedBenchmarkEstimate,
  loadGoldenBenchmarkCases,
} from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark PDF and buyer handoff", () => {
  it("keeps PDF rows equal to snapshot and buyer package procurement-only", () => {
    const generated = loadGoldenBenchmarkCases()
      .filter((item) => item.critical)
      .map((item) => buildGeneratedBenchmarkEstimate(item));

    for (const estimate of generated) {
      const snapshotCodes = new Set(estimate.rows.map((row) => row.code));
      expect(estimate.pdf_row_codes.every((code) => snapshotCodes.has(code))).toBe(true);
      expect(estimate.rows.every((row) => !estimate.buyer_row_codes.includes(row.code) || (
        row.included_in_procurement &&
        row.line_type !== "work" &&
        row.line_type !== "helper"
      ))).toBe(true);
      expect(estimate.rows.some((row) => row.price_state === "PRICE_MISSING")).toBe(true);
      expect(estimate.final_total_displayed).toBe(false);
    }
  });
});
