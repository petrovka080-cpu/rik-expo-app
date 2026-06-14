import {
  auditEstimateRowDomainGuard,
  buildProfessionalEstimateSnapshot,
} from "../../src/lib/ai/professionalEstimateTemplates";

describe("rowProvenanceRequired", () => {
  it("requires provenance on every compiled estimate row", () => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: "carpet_laying",
      quantity: 1500,
      unit: "m2",
      region: "KG_BISHKEK",
    });
    const guard = auditEstimateRowDomainGuard({
      selected_work_key: snapshot.selected_work_key,
      expected_domain: snapshot.group_key,
      rows: snapshot.lines,
    });

    expect(guard.rows_checked).toBeGreaterThan(0);
    expect(guard.row_without_provenance).toBe(0);
    expect(guard.generic_material_rows).toBe(0);
    expect(guard.paid_control_rows).toBe(0);
  });
});
