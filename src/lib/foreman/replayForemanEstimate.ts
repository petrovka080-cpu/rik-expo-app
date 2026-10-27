import { createSnapshotFromDraftRevision } from "../../features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../features/procurement/createBuyerHandoffFromDraftRevision";
import { buildEstimateReplayRecord } from "../estimate/buildEstimateReplayRecord";
import { replayEstimateFromRecord } from "../estimate/replayEstimateFromRecord";
import { createAiEstimateRuntime } from "../estimate/runtime/createAiEstimateRuntime";
import { buildForemanAiEstimateEntry } from "./buildForemanAiEstimateEntry";
import type { ForemanAiEstimateEntryPoint } from "./foremanAiEstimateEntryContract";

export type ForemanEstimateReplayProof = {
  foreman_estimate_replay_guard_created: true;
  foreman_materials_replay_passed: boolean;
  foreman_subcontracts_replay_passed: boolean;
  foreman_pdf_uses_latest_revision: boolean;
  foreman_buyer_uses_latest_revision: boolean;
  foreman_buyer_has_no_work_rows: boolean;
  passed: boolean;
  blocking_reasons: string[];
};

function runForemanCase(input: {
  entryPoint: ForemanAiEstimateEntryPoint;
  prompt: string;
  selectedWorkKey: string;
  caseId: string;
  sourceSha: string;
}) {
  const entry = buildForemanAiEstimateEntry(input.entryPoint);
  const runtime = createAiEstimateRuntime();
  const createdAt = "2026-07-09T00:00:00.000Z";
  const { revision } = runtime.createDraft({
    estimateDraftId: `foreman-replay-${input.caseId}`,
    rawInput: input.prompt,
    selectedWorkKey: input.selectedWorkKey,
    selectedTemplateId: input.selectedWorkKey,
    createdAt,
  });
  const snapshot = createSnapshotFromDraftRevision(revision);
  const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  const record = buildEstimateReplayRecord({
    caseId: input.caseId,
    revision: buyer.revision,
    snapshot: buyer.snapshot,
    pdf: pdf.pdf,
    buyerHandoff: buyer.buyerHandoff,
    sourceSha: input.sourceSha,
    createdAt,
  });
  const replay = replayEstimateFromRecord(record);
  return {
    entry,
    record,
    replay,
    pdfUsesLatestRevision: pdf.pdf.revisionId === buyer.revision.revisionId && pdf.pdf.rowsEqualLatestRevision,
    buyerUsesLatestRevision: buyer.buyerHandoff.revisionId === buyer.revision.revisionId,
    buyerHasNoWorkRows: buyer.buyerHandoff.forbiddenWorkRowsPresent === false,
  };
}

export function replayForemanEstimateProof(sourceSha: string): ForemanEstimateReplayProof {
  const materials = runForemanCase({
    entryPoint: "foreman_materials_block",
    prompt: "profile sheet fence 120 linear meters with posts, concrete, gates and delivery",
    selectedWorkKey: "profile_sheet_fence",
    caseId: "foreman_materials_replay",
    sourceSha,
  });
  const subcontracts = runForemanCase({
    entryPoint: "foreman_subcontracts_block",
    prompt: "ventilated facade 900 square meters with insulation, anchors, labor and equipment",
    selectedWorkKey: "ventilated_facade",
    caseId: "foreman_subcontracts_replay",
    sourceSha,
  });
  const materialsPassed = materials.entry.mode === "materials_procurement_focus" &&
    materials.replay.comparison.status === "passed";
  const subcontractsPassed = subcontracts.entry.mode === "subcontract_work_package_focus" &&
    subcontracts.replay.comparison.status === "passed";
  const pdfUsesLatest = materials.pdfUsesLatestRevision && subcontracts.pdfUsesLatestRevision;
  const buyerUsesLatest = materials.buyerUsesLatestRevision && subcontracts.buyerUsesLatestRevision;
  const buyerNoWorkRows = materials.buyerHasNoWorkRows && subcontracts.buyerHasNoWorkRows;
  const blockers = [
    materialsPassed ? "" : "foreman_materials_replay_failed",
    subcontractsPassed ? "" : "foreman_subcontracts_replay_failed",
    pdfUsesLatest ? "" : "foreman_pdf_latest_revision_failed",
    buyerUsesLatest ? "" : "foreman_buyer_latest_revision_failed",
    buyerNoWorkRows ? "" : "foreman_buyer_work_rows_leaked",
  ].filter(Boolean);
  return {
    foreman_estimate_replay_guard_created: true,
    foreman_materials_replay_passed: materialsPassed,
    foreman_subcontracts_replay_passed: subcontractsPassed,
    foreman_pdf_uses_latest_revision: pdfUsesLatest,
    foreman_buyer_uses_latest_revision: buyerUsesLatest,
    foreman_buyer_has_no_work_rows: buyerNoWorkRows,
    passed: blockers.length === 0,
    blocking_reasons: blockers,
  };
}
