import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { buildEstimateReplayRecord } from "../../src/lib/estimate/buildEstimateReplayRecord";
import { compareEstimateReplayRecords } from "../../src/lib/estimate/compareEstimateReplayResult";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";

describe("PDF and buyer replay hashes", () => {
  it("detects stale PDF or buyer handoff package drift", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "pdf-buyer-replay",
      rawInput: "industrial foundation 760 cubic meters with reinforcement and anchor bolts",
      selectedTemplateId: "industrial_foundation",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const snapshot = createSnapshotFromDraftRevision(revision);
    const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const record = buildEstimateReplayRecord({
      caseId: "pdf_buyer_hash_case",
      revision: buyer.revision,
      snapshot: buyer.snapshot,
      pdf: pdf.pdf,
      buyerHandoff: buyer.buyerHandoff,
      sourceSha: "test-source-sha",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const stale = {
      ...record,
      hashes: {
        ...record.hashes,
        pdf_package_hash: "stale_pdf_hash",
        buyer_handoff_hash: "stale_buyer_hash",
      },
    };
    const comparison = compareEstimateReplayRecords(record, stale);

    expect(comparison.status).toBe("failed");
    expect(comparison.mismatches.map((item) => item.hash_name)).toContain("pdf_package_hash");
    expect(comparison.mismatches.map((item) => item.hash_name)).toContain("buyer_handoff_hash");
  });
});
