import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { buildEstimateReplayRecord } from "../../src/lib/estimate/buildEstimateReplayRecord";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { replayEstimateFromRecord } from "../../src/lib/estimate/replayEstimateFromRecord";
import { validateEstimateReplayRecord } from "../../src/lib/estimate/validateEstimateReplayRecord";

describe("replayable estimate core contract", () => {
  it("builds a replay record with lineage and replays it without drift", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "replay-contract",
      rawInput: "ventilated facade 900 square meters with insulation and anchors",
      selectedTemplateId: "ventilated_facade",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const snapshot = createSnapshotFromDraftRevision(revision);
    const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const record = buildEstimateReplayRecord({
      caseId: "replay_contract_case",
      revision: buyer.revision,
      snapshot: buyer.snapshot,
      pdf: pdf.pdf,
      buyerHandoff: buyer.buyerHandoff,
      sourceSha: "test-source-sha",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const validation = validateEstimateReplayRecord(record);
    const replay = replayEstimateFromRecord(record);

    expect(validation.valid).toBe(true);
    expect(validation.all_replay_records_have_snapshot).toBe(true);
    expect(validation.all_replay_records_have_version_lineage).toBe(true);
    expect(replay.comparison.status).toBe("passed");
    expect(replay.comparison.drift_detected).toBe(false);
  });
});
