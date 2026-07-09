import { createSnapshotFromDraftRevision } from "../../features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../features/procurement/createBuyerHandoffFromDraftRevision";
import { createEstimateDraftRevision } from "./createEstimateDraftRevision";
import { buildEstimateReplayRecord } from "./buildEstimateReplayRecord";
import { compareEstimateReplayRecords } from "./compareEstimateReplayResult";
import type {
  EstimateReplayComparison,
  EstimateReplayRecord,
} from "./replayableEstimateCoreContract";

export type EstimateReplayRunResult = {
  expected: EstimateReplayRecord;
  actual: EstimateReplayRecord;
  comparison: EstimateReplayComparison;
  replay_runner_created: true;
};

export function replayEstimateFromRecord(record: EstimateReplayRecord): EstimateReplayRunResult {
  const revision = createEstimateDraftRevision({
    estimateDraftId: record.estimate_draft_id,
    rawInput: record.source_prompt,
    selectedTemplateId: record.selected_template_id,
    createdAt: record.created_at,
    source: "initial_prompt",
    revisionIndex: 1,
  });
  const snapshot = createSnapshotFromDraftRevision(revision);
  const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  const actual = buildEstimateReplayRecord({
    caseId: record.case_id,
    revision: buyer.revision,
    snapshot: buyer.snapshot,
    pdf: pdf.pdf,
    buyerHandoff: buyer.buyerHandoff,
    sourceSha: record.version_lineage.source_sha,
    createdAt: record.created_at,
    versionLineage: record.version_lineage,
  });
  return {
    expected: record,
    actual,
    comparison: compareEstimateReplayRecords(record, actual),
    replay_runner_created: true,
  };
}
