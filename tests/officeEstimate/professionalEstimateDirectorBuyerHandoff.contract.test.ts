import {
  confirmProfessionalEstimateCalculatorHandoff,
  createProfessionalEstimateCalculatorPreview,
  representativeProfessionalEstimateCalculatorInput,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("professional estimate office director buyer handoff", () => {
  it("binds director PDF, buyer request, and history to the same revision snapshot", () => {
    const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    const confirmed = confirmProfessionalEstimateCalculatorHandoff({
      preview,
      userConfirmed: true,
      actorUserId: "user:test",
      createdAt: "2026-07-01T00:03:00.000Z",
    });

    expect(confirmed.allHandoffHashesMatchRevision).toBe(true);
    expect(confirmed.directorPdfHandoff.revisionId).toBe(confirmed.currentRevisionId);
    expect(confirmed.buyerProcurementHandoff.revisionId).toBe(confirmed.currentRevisionId);
    expect(confirmed.directorPdfHandoff.snapshotId).toBe(confirmed.currentSnapshotId);
    expect(confirmed.buyerProcurementHandoff.snapshotId).toBe(confirmed.currentSnapshotId);
    expect(confirmed.pdfBinding.pdf_recalculated_separately).toBe(false);
    expect(confirmed.requestBinding.request_recalculated_separately).toBe(false);
    expect(confirmed.historyBinding.history_recalculated_separately).toBe(false);
    expect(confirmed.buyerProcurementHandoff.rows.length).toBe(preview.requestDraftLines.length);
  });

  it("persists manual price overrides inside the revision snapshot before handoff", () => {
    const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    const manualRows = preview.editableSnapshot.rows.filter((row) => row.manualPrice);

    expect(manualRows.length).toBeGreaterThan(0);
    expect(manualRows.every((row) => row.priceStatus === "USER_ENTERED_PRICE")).toBe(true);
    expect(preview.templateSnapshot.manualOverrides.length).toBeGreaterThan(0);
    expect(preview.revisionState.revisions[0]?.editable_estimate_snapshot.hash).toBe(preview.editableSnapshot.hash);
  });
});
