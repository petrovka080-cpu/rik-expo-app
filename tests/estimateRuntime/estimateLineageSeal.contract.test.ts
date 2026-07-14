import { validateEstimateLineage } from "../../src/lib/estimate/validateEstimateLineage";

describe("AI estimate snapshot/revision lineage seal", () => {
  it("binds downstream artifacts to the same draft revision and snapshot", () => {
    const validation = validateEstimateLineage();

    expect(validation.estimate_lineage_contract_created).toBe(true);
    expect(validation.all_artifacts_have_source_snapshot).toBe(true);
    expect(validation.pdf_snapshot_binding_passed).toBe(true);
    expect(validation.buyer_snapshot_binding_passed).toBe(true);
    expect(validation.history_snapshot_binding_passed).toBe(true);
    expect(validation.foreman_snapshot_binding_passed).toBe(true);
    expect(validation.stale_artifact_policy_passed).toBe(true);
    expect(validation.pdf_without_snapshot).toBe(false);
    expect(validation.buyer_handoff_without_snapshot).toBe(false);
    expect(validation.approved_history_without_snapshot).toBe(false);
    expect(validation.foreman_draft_without_revision).toBe(false);
    expect(validation.costing_without_boq_hash).toBe(false);
    expect(validation.material_quantity_without_boq_hash).toBe(false);
    expect(validation.passed).toBe(true);
  });
});
