import { buildFastAcceptanceSummary } from "./blackboxAcceptanceTestHelpers";

jest.setTimeout(240_000);

describe("blackbox prompt to snapshot acceptance", () => {
  it("covers the full prompt corpus without promoting generic evidence to normative GREEN", () => {
    const summary = buildFastAcceptanceSummary();

    expect(summary.final_status).toBe("STOP_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_FAILED_NO_COMMIT");
    expect(summary.blackbox_corpus_total).toBe(530);
    expect(summary.blackbox_random_sample_size).toBe(500);
    expect(summary.blackbox_acceptance_passed).toBe(false);
    expect(summary.manifest_total_templates).toBe(10000);
    expect(summary.ready_professional_count).toBe(0);
    expect(summary.not_ready_count).toBe(10000);
    expect(summary.failed_case_count).toBe(523);
    expect(summary.all_work_families_represented).toBe(true);
    expect(summary.previous_full_green_verified).toBe(false);
    expect(summary.no_manual_green_status_override).toBe(true);
    expect(summary.artifact_lineage_valid).toBe(false);
    expect(summary.negative_tests_prove_gates_fail).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toContain("previous_full_green_not_verified");
    expect(summary.blocking_reasons).toContain(
      "masonry_400_gas_block:blackbox_norm_source_missing",
    );
  });
});
