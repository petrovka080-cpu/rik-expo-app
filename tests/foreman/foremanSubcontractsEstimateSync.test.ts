import { runForemanAiEstimateSyncDomainProof } from "../../scripts/estimate/foremanAiEstimateSyncProof";

describe("foreman subcontracts AI estimate sync", () => {
  it("opens the same AI estimate pipeline with work package focus without losing materials", () => {
    const proof = runForemanAiEstimateSyncDomainProof();
    const sample = proof.samples.find((item) => item.id === "subcontracts");

    expect(sample?.passed).toBe(true);
    expect(proof.foreman_subcontracts_estimate_button_visible).toBe(true);
    expect(proof.foreman_subcontracts_ai_estimate_opened).toBe(true);
    expect(proof.foreman_subcontracts_selected_work_active_input).toBe(true);
    expect(proof.foreman_subcontracts_real_named_boq_visible).toBe(true);
    expect(proof.foreman_subcontracts_work_service_equipment_rows_visible).toBe(true);
    expect(proof.foreman_subcontracts_material_rows_visible).toBe(true);
    expect(proof.foreman_subcontracts_pdf_created).toBe(true);
    expect(proof.foreman_subcontracts_user_confirmation_required).toBe(true);
    expect(proof.buyer_foreman_subcontracts_procurement_subset_valid).toBe(true);
  });
});
