import { compile1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance compile audit", () => {
  it("compiles every sampled work into professional expanded estimates", () => {
    const audit = compile1560();
    expect(audit.sample_total).toBe(1560);
    expect(audit.compiled_passed).toBe(1560);
    expect(audit.compiled_failed).toBe(0);
    expect(audit.generic_rows_found).toBe(0);
    expect(audit.cross_work_contamination_found).toBe(0);
    expect(audit.fake_prices_found).toBe(0);
    expect(audit.zero_as_known_price_found).toBe(0);
    expect(audit.mojibake_found).toBe(0);
    expect(audit.english_debug_labels_visible).toBe(0);
    expect(audit.failures).toEqual([]);
  });
});
