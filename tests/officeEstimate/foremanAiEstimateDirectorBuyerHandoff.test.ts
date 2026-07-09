import { runForemanAiEstimateSyncDomainProof } from "../../scripts/estimate/foremanAiEstimateSyncProof";

describe("foreman AI estimate director and buyer handoff", () => {
  it("keeps director PDFs and buyer procurement rows bound to the same latest snapshot", () => {
    const proof = runForemanAiEstimateSyncDomainProof();

    expect(proof.director_foreman_materials_request_visible).toBe(true);
    expect(proof.director_foreman_subcontracts_request_visible).toBe(true);
    expect(proof.director_foreman_materials_pdf_valid).toBe(true);
    expect(proof.director_foreman_subcontracts_pdf_valid).toBe(true);
    expect(proof.buyer_foreman_materials_procurement_rows_visible).toBe(true);
    expect(proof.buyer_foreman_materials_no_item_truncation).toBe(true);
    expect(proof.buyer_foreman_subcontracts_procurement_subset_valid).toBe(true);
    expect(proof.buyer_foreman_work_rows_not_in_materials_handoff).toBe(true);
    expect(proof.foreman_auto_submit_without_confirmation_count).toBe(0);
  });
});
