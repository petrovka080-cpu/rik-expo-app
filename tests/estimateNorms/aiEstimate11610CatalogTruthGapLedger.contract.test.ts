import {
  auditAiEstimate11610CatalogTruthGapLedger,
  GREEN_AI_ESTIMATE_11610_CATALOG_TRUTH_GAP_LEDGER_READY_NO_RELEASE,
} from "../../scripts/estimate/auditAiEstimate11610CatalogTruthGapLedger";

jest.setTimeout(240_000);

describe("AI estimate 11610 catalog truth gap ledger", () => {
  it("keeps the 11610 catalog truth ledger green without release side effects", () => {
    const { summary, ledger } = auditAiEstimate11610CatalogTruthGapLedger();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_11610_CATALOG_TRUTH_GAP_LEDGER_READY_NO_RELEASE);
    expect(summary.catalog_total).toBe(11610);
    expect(ledger).toHaveLength(11610);
    expect(summary.ready_count).toBe(11610);
    expect(summary.blocked_count).toBe(0);
    expect(summary.raw_input_binding_ready_count).toBe(11610);
    expect(summary.raw_input_binding_missing_count).toBe(0);
    expect(summary.raw_input_probe_count).toBe(34830);
    expect(summary.raw_input_probe_passed_count).toBe(34830);
    expect(summary.ignored_explicit_facts_count).toBe(0);
    expect(summary.wrong_fact_units_count).toBe(0);
    expect(summary.facts_without_passport_owner_count).toBe(0);
    expect(summary.facts_without_formula_ownership_count).toBe(0);
    expect(summary.facts_overwritten_by_defaults_count).toBe(0);
    expect(summary.parameter_passport_missing_count).toBe(0);
    expect(summary.material_assembly_missing_count).toBe(0);
    expect(summary.work_operation_missing_count).toBe(0);
    expect(summary.service_ownership_missing_count).toBe(0);
    expect(summary.equipment_ownership_missing_count).toBe(0);
    expect(summary.formula_missing_count).toBe(0);
    expect(summary.norm_source_missing_count).toBe(0);
    expect(summary.reference_estimate_ready_count).toBe(11610);
    expect(summary.reference_estimate_missing_count).toBe(0);
    expect(summary.reference_owner_unique_count).toBeGreaterThan(28);
    expect(summary.reference_family_unique_count).toBeGreaterThan(28);
    expect(summary.reference_global_singleton_violation_count).toBe(0);
    expect(summary.generic_rows_count).toBe(0);
    expect(summary.filler_rows_count).toBe(0);
    expect(summary.wrong_unit_count).toBe(0);
    expect(summary.rows_without_formula_count).toBe(0);
    expect(summary.rows_without_norm_source_count).toBe(0);
    expect(summary.release_started).toBe(false);
    expect(summary.deploy_started).toBe(false);
    expect(summary.eas_started).toBe(false);
    expect(summary.native_build_started).toBe(false);
    expect(summary.production_db_touched).toBe(false);
    expect(summary.main_changed).toBe(false);
    expect(summary.pr44_changed).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toEqual([]);
    expect(summary.blocking_reasons).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining(":raw_input_parser"),
        expect.stringContaining(":reference_estimate_missing"),
      ]),
    );
    expect(ledger.every((row) => row.raw_input_parser_status === "ready")).toBe(true);
    expect(ledger.every((row) => row.reference_estimate_status === "ready")).toBe(true);
    expect(ledger.every((row) => row.professional_readiness === "ready")).toBe(true);
  });
});
