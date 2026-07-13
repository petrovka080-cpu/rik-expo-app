import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import type { ApprovedEstimateHistoryRecord } from "../../src/lib/consumerRequests";
import { replayApprovedEstimateHistoryRecords } from "../../src/lib/consumerRequests";
import { buildEstimateReplayRecord } from "../../src/lib/estimate/buildEstimateReplayRecord";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { EstimateReplayRecord } from "../../src/lib/estimate/replayableEstimateCoreContract";

function buildHistoryCase(index: number): {
  historyRecord: ApprovedEstimateHistoryRecord;
  replayRecord: EstimateReplayRecord;
} {
  const createdAt = "2026-07-09T00:00:00.000Z";
  const revision = createEstimateDraftRevision({
    estimateDraftId: `approved-history-replay-test-${index}`,
    rawInput: `approved history replay fence ${100 + index} linear meters`,
    selectedTemplateId: "profile_sheet_fence",
    createdAt,
  });
  const snapshot = createSnapshotFromDraftRevision(revision);
  const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  return {
    historyRecord: {
      approvedEstimateId: `approved-history-replay-test-${index}`,
      sourceDraftId: revision.estimateDraftId,
      sourceRevisionId: revision.revisionId,
      sourceSnapshotId: snapshot.snapshot.snapshotId,
      createdAt,
      updatedAt: createdAt,
      title: `approved history replay test ${index}`,
      prompt: revision.rawInput,
      selectedTemplateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
      rowCount: revision.boq.rows.length,
      materialRowsCount: revision.boq.rows.filter((row) => row.rowType === "material").length,
      workRowsCount: revision.boq.rows.filter((row) => row.rowType === "work" || row.rowType === "labor").length,
      pdfArtifactId: pdf.pdf.pdfArtifactId,
      buyerHandoffId: buyer.buyerHandoff.buyerHandoffId,
      status: "approved",
    },
    replayRecord: buildEstimateReplayRecord({
      caseId: `approved_history_replay_test_${index}`,
      revision: buyer.revision,
      snapshot: buyer.snapshot,
      pdf: pdf.pdf,
      buyerHandoff: buyer.buyerHandoff,
      sourceSha: "test-source-sha",
      createdAt,
    }),
  };
}

describe("approved history replay contract", () => {
  it("replays approved history by page without loading all payloads", () => {
    const cases = Array.from({ length: 25 }, (_, index) => buildHistoryCase(index + 1));
    const result = replayApprovedEstimateHistoryRecords({
      records: cases.map((item) => item.historyRecord),
      pageSize: 20,
      loadReplayRecord: (record) =>
        cases.find((item) => item.historyRecord.approvedEstimateId === record.approvedEstimateId)?.replayRecord ?? null,
    });

    expect(result.passed).toBe(true);
    expect(result.approved_history_records_checked).toBe(20);
    expect(result.replay_payloads_loaded).toBe(20);
    expect(result.history_replay_does_not_load_all_payloads).toBe(true);
  });
});
