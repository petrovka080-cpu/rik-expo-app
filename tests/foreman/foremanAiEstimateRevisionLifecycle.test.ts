import { runForemanAiEstimateSyncDomainProof } from "../../scripts/estimate/foremanAiEstimateSyncProof";

describe("foreman AI estimate revision lifecycle", () => {
  it("reuses editable revisions, stale artifact policy, latest PDF, and latest buyer handoff", () => {
    const proof = runForemanAiEstimateSyncDomainProof();

    expect(proof.foreman_materials_revision_lifecycle_synced).toBe(true);
    expect(proof.foreman_subcontracts_revision_lifecycle_synced).toBe(true);
    expect(proof.foreman_param_edit_recalculates_boq).toBe(true);
    expect(proof.foreman_old_pdf_marked_stale_after_param_edit).toBe(true);
    expect(proof.foreman_new_pdf_uses_latest_revision).toBe(true);
    expect(proof.foreman_buyer_handoff_uses_latest_revision).toBe(true);
    expect(proof.samples.every((sample) => sample.staleArtifactsAfterEdit.snapshotInvalidated)).toBe(true);
    expect(proof.samples.every((sample) => sample.staleArtifactsAfterEdit.pdfInvalidated)).toBe(true);
    expect(proof.samples.every((sample) => sample.staleArtifactsAfterEdit.buyerHandoffInvalidated)).toBe(true);
  });
});
