import { getConsumerRepairPdfStorageObject } from "../../src/lib/consumerRequests";
import { approveCanonicalConsumerRepairAuditDraft } from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 PDF from snapshot", () => {
  it("generates the PDF from the approved revision snapshot and stores matching lineage", () => {
    const draft = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const approved = approveCanonicalConsumerRepairAuditDraft({
      bundle: draft,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );
    const pdf = approved.pdfs[0];
    const canonicalRevisionId = approved.estimateDraftRevisionState?.currentRevisionId;
    if (!revision || !pdf) throw new Error("revision or PDF missing");

    const object = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });

    expect(canonicalRevisionId).toBeTruthy();
    expect(pdf.revisionId).toBe(canonicalRevisionId);
    expect(pdf.snapshotId).toBe(`canonical_backend_snapshot:${canonicalRevisionId}`);
    expect(pdf.revisionRowsHash).toBe(pdf.revisionTotalsHash);
    expect(pdf.revisionFullSnapshotHash).toBe(pdf.revisionRowsHash);
    expect(approved.items.every((item) =>
      item.sourceParameters?.canonicalBackendRevisionId === canonicalRevisionId
    )).toBe(true);
    expect(object?.contentType).toBe("application/pdf");
    expect(object?.body.startsWith("%PDF-")).toBe(true);
    expect(revision.editable_estimate_snapshot.rows.filter((row) => !row.removed)).toHaveLength(approved.items.length);
    expect(object?.body).not.toMatch(/raw_ai_json|source_parameters|PRICE_MISSING:|round_to|normFactor/);
  });
});
