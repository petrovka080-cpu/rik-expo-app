import { runForemanAiEstimateSyncDomainProof } from "../../scripts/estimate/foremanAiEstimateSyncProof";

describe("foreman materials AI estimate sync", () => {
  it("uses the shared professional BOQ pipeline and keeps buyer handoff complete", () => {
    const proof = runForemanAiEstimateSyncDomainProof();
    const sample = proof.samples.find((item) => item.id === "materials");

    expect(sample?.passed).toBe(true);
    expect(proof.foreman_materials_estimate_button_visible).toBe(true);
    expect(proof.foreman_materials_ai_estimate_opened).toBe(true);
    expect(proof.foreman_materials_selected_work_active_input).toBe(true);
    expect(proof.foreman_materials_real_named_boq_visible).toBe(true);
    expect(proof.foreman_materials_material_rows_visible).toBe(true);
    expect(proof.foreman_materials_pdf_created).toBe(true);
    expect(proof.foreman_materials_buyer_handoff_created).toBe(true);
    expect(proof.foreman_materials_user_confirmation_required).toBe(true);
    expect(proof.buyer_foreman_materials_procurement_rows_visible).toBe(true);
    expect(proof.buyer_foreman_materials_no_item_truncation).toBe(true);
    expect(proof.buyer_foreman_work_rows_not_in_materials_handoff).toBe(true);
  });
});
