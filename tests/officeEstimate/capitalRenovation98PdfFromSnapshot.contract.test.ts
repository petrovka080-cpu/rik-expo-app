import {
  approveConsumerRepairRequestDraft,
  getConsumerRepairPdfStorageObject,
} from "../../src/lib/consumerRequests";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 PDF from snapshot", () => {
  it("generates the PDF from the approved revision snapshot and stores matching lineage", () => {
    const draft = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: draft.draft.id,
      userId: draft.draft.consumerUserId,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );
    const pdf = approved.pdfs[0];
    if (!revision || !pdf) throw new Error("revision or PDF missing");

    const object = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });

    expect(pdf.revisionId).toBe(revision.revision_id);
    expect(pdf.snapshotId).toBe(revision.snapshot_id);
    expect(pdf.revisionRowsHash).toBe(revision.rows_hash);
    expect(pdf.revisionFullSnapshotHash).toBe(revision.full_snapshot_hash);
    expect(object?.contentType).toBe("application/pdf");
    expect(object?.body.startsWith("%PDF-")).toBe(true);
    expect(revision.editable_estimate_snapshot.rows.filter((row) => !row.removed)).toHaveLength(approved.items.length);
    expect(object?.body).not.toMatch(/raw_ai_json|source_parameters|PRICE_MISSING:|round_to|normFactor/);
  });
});
