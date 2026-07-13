import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { compareEstimateDraftRevisions } from "../../src/lib/estimate/compareEstimateDraftRevisions";
import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";

describe("artifact revision binding", () => {
  it("binds snapshot PDF and buyer handoff to exact revision and invalidates old artifacts after edit", () => {
    const r1 = createEstimateDraftRevision({
      estimateDraftId: "artifact-draft",
      rawInput: "вентфасад под ключ 1500 кв метров",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const snap = createSnapshotFromDraftRevision(r1);
    const pdf = renderPdfFromDraftRevision({ revision: snap.revision, snapshot: snap.snapshot });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const boundR1 = buyer.revision;
    const patch = parseUserParamPatch({
      revision: boundR1,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "800 м2",
    });
    const { revision: r2 } = recalculateEstimateDraftRevision(boundR1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    });
    const diff = compareEstimateDraftRevisions(boundR1, r2);
    const r2Snap = createSnapshotFromDraftRevision(r2);
    const r2Pdf = renderPdfFromDraftRevision({ revision: r2Snap.revision, snapshot: r2Snap.snapshot });
    const r2Buyer = createBuyerHandoffFromDraftRevision({ revision: r2Pdf.revision, snapshot: r2Pdf.snapshot });

    expect(boundR1.artifacts.artifactsValidForRevisionId).toBe(boundR1.revisionId);
    expect(diff.staleArtifactsAfterEdit.snapshotInvalidated).toBe(true);
    expect(diff.staleArtifactsAfterEdit.pdfInvalidated).toBe(true);
    expect(diff.staleArtifactsAfterEdit.buyerHandoffInvalidated).toBe(true);
    expect(r2Pdf.pdf.revisionId).toBe(r2.revisionId);
    expect(r2Buyer.buyerHandoff.revisionId).toBe(r2.revisionId);
    expect(validateEstimateDraftRevision(r2Buyer.revision).valid).toBe(true);
  });
});
