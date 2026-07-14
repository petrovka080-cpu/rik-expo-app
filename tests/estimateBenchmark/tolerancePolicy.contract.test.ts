import {
  assertTolerancePolicyLocked,
  loadGoldenBenchmarkTolerancePolicy,
} from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark tolerance policy", () => {
  it("defines detailed, preliminary, ROM and zero-tolerance rules", () => {
    const policy = loadGoldenBenchmarkTolerancePolicy();

    expect(policy.policy_id).toBe("golden-benchmark-tolerance-v1");
    expect(policy.detailed_boq.quantity_tolerance_percent).toBeLessThanOrEqual(2);
    expect(policy.preliminary_boq.key_quantity_tolerance_percent).toBeLessThanOrEqual(10);
    expect(policy.preliminary_boq.secondary_quantity_tolerance_percent).toBeLessThanOrEqual(15);
    expect(policy.rom_concept.group_quantity_tolerance_percent).toBeLessThanOrEqual(25);
    expect(policy.zero_tolerance_rules).toEqual(expect.arrayContaining([
      "wrong_unit",
      "missing_source",
      "generic_fallback",
      "fake_price",
      "pdf_snapshot_mismatch",
      "buyer_handoff_includes_work_rows",
      "final_total_when_prices_missing",
      "silent_tolerance_widening",
    ]));
    expect(() => assertTolerancePolicyLocked(policy)).not.toThrow();
  });
});
