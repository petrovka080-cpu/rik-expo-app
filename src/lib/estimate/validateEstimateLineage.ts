import { createSnapshotFromDraftRevision } from "../../features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../features/procurement/createBuyerHandoffFromDraftRevision";
import { buildForemanAiEstimateEntry } from "../foreman";
import { compareEstimateDraftRevisions } from "./compareEstimateDraftRevisions";
import { createEstimateDraftRevision } from "./createEstimateDraftRevision";
import type { EstimateLineageSeal, EstimateLineageValidation, EstimateArtifactLineageRef } from "./estimateLineageContract";
import { parseUserParamPatch } from "./parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "./recalculateEstimateDraftRevision";

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function artifactRef(input: {
  artifactId: string;
  revisionId: string;
  snapshotId: string;
  selectedTemplateId: string;
  family: string;
  paramsHash: string;
  boqHash: string;
  costHash: string;
}): EstimateArtifactLineageRef {
  return {
    artifactId: input.artifactId,
    draftRevisionId: input.revisionId,
    sourceSnapshotId: input.snapshotId,
    selectedTemplateId: input.selectedTemplateId,
    family: input.family,
    paramsHash: input.paramsHash,
    boqHash: input.boqHash,
    costHash: input.costHash,
  };
}

function createLineageSeal(): EstimateLineageSeal {
  const r1 = createEstimateDraftRevision({
    estimateDraftId: "platform-core-lineage",
    rawInput: "ventilated facade 1500 m2 height 40 m insulation 100 mm",
    selectedWorkKey: "ventilated_facade",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const s1 = createSnapshotFromDraftRevision(r1);
  const p1 = renderPdfFromDraftRevision({ revision: s1.revision, snapshot: s1.snapshot });
  const b1 = createBuyerHandoffFromDraftRevision({ revision: p1.revision, snapshot: p1.snapshot });
  const paramsHash = hashText(JSON.stringify(b1.revision.params));
  const shared = {
    revisionId: b1.revision.revisionId,
    snapshotId: b1.snapshot.snapshotId,
    selectedTemplateId: b1.revision.selectedTemplateId,
    family: b1.revision.matchedFamily,
    paramsHash,
    boqHash: b1.snapshot.rowsHash,
    costHash: b1.snapshot.totalsHash,
  };
  const patch = parseUserParamPatch({
    revision: b1.revision,
    operation: "update_param",
    paramKey: "area_m2",
    rawValue: "1600 m2",
  });
  const r2 = recalculateEstimateDraftRevision(b1.revision, patch, {
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const stale = compareEstimateDraftRevisions(b1.revision, r2.revision).staleArtifactsAfterEdit;
  const foremanEntry = buildForemanAiEstimateEntry("foreman_materials_block");
  return {
    draftRevisionId: b1.revision.revisionId,
    sourceSnapshotId: b1.snapshot.snapshotId,
    selectedTemplateId: b1.revision.selectedTemplateId,
    family: b1.revision.matchedFamily,
    paramsHash,
    boqHash: b1.snapshot.rowsHash,
    costHash: b1.snapshot.totalsHash,
    pdfArtifactId: p1.pdf.pdfArtifactId,
    buyerHandoffId: b1.buyerHandoff.buyerHandoffId,
    historyRecordId: `history_${b1.snapshot.snapshotId}`,
    foremanEntryId: foremanEntry.entryPoint,
    pdf: artifactRef({ artifactId: p1.pdf.pdfArtifactId, ...shared }),
    buyerHandoff: artifactRef({ artifactId: b1.buyerHandoff.buyerHandoffId, ...shared }),
    history: artifactRef({ artifactId: `history_${b1.snapshot.snapshotId}`, ...shared }),
    foreman: artifactRef({ artifactId: foremanEntry.entryPoint, ...shared }),
    staleArtifactsAfterRecalc: {
      stale_pdf_not_marked_stale_after_recalc: !stale.pdfInvalidated,
      stale_buyer_handoff_not_marked_stale_after_recalc: !stale.buyerHandoffInvalidated,
      pdfInvalidated: stale.pdfInvalidated,
      buyerHandoffInvalidated: stale.buyerHandoffInvalidated,
    },
  };
}

function hasSnapshot(ref: EstimateArtifactLineageRef): boolean {
  return Boolean(ref.sourceSnapshotId && ref.draftRevisionId && ref.boqHash && ref.costHash);
}

export function validateEstimateLineage(lineage: EstimateLineageSeal = createLineageSeal()): EstimateLineageValidation {
  const pdfSnapshotBinding = hasSnapshot(lineage.pdf) && lineage.pdf.sourceSnapshotId === lineage.sourceSnapshotId;
  const buyerSnapshotBinding = hasSnapshot(lineage.buyerHandoff) && lineage.buyerHandoff.sourceSnapshotId === lineage.sourceSnapshotId;
  const historySnapshotBinding = hasSnapshot(lineage.history) && lineage.history.sourceSnapshotId === lineage.sourceSnapshotId;
  const foremanSnapshotBinding = hasSnapshot(lineage.foreman) && lineage.foreman.draftRevisionId === lineage.draftRevisionId;
  const pdfWithoutSnapshot = !lineage.pdf.sourceSnapshotId;
  const buyerWithoutSnapshot = !lineage.buyerHandoff.sourceSnapshotId;
  const historyWithoutSnapshot = !lineage.history.sourceSnapshotId;
  const foremanWithoutRevision = !lineage.foreman.draftRevisionId;
  const costingWithoutBoqHash = !lineage.costHash || !lineage.boqHash;
  const materialQuantityWithoutBoqHash = !lineage.boqHash;
  const stalePolicyPassed =
    lineage.staleArtifactsAfterRecalc.pdfInvalidated &&
    lineage.staleArtifactsAfterRecalc.buyerHandoffInvalidated &&
    !lineage.staleArtifactsAfterRecalc.stale_pdf_not_marked_stale_after_recalc &&
    !lineage.staleArtifactsAfterRecalc.stale_buyer_handoff_not_marked_stale_after_recalc;
  const allArtifactsHaveSnapshot =
    pdfSnapshotBinding &&
    buyerSnapshotBinding &&
    historySnapshotBinding &&
    foremanSnapshotBinding;
  const failures = [
    lineage.draftRevisionId ? "" : "draft_revision_missing",
    pdfSnapshotBinding ? "" : "pdf_without_snapshot",
    buyerSnapshotBinding ? "" : "buyer_handoff_without_snapshot",
    historySnapshotBinding ? "" : "approved_history_without_snapshot",
    foremanSnapshotBinding ? "" : "foreman_draft_without_revision",
    costingWithoutBoqHash ? "costing_without_boq_hash" : "",
    materialQuantityWithoutBoqHash ? "material_quantity_without_boq_hash" : "",
    stalePolicyPassed ? "" : "stale_artifact_policy_failed",
  ].filter(Boolean);

  return {
    estimate_lineage_contract_created: true,
    all_artifacts_have_source_snapshot: allArtifactsHaveSnapshot,
    pdf_snapshot_binding_passed: pdfSnapshotBinding,
    buyer_snapshot_binding_passed: buyerSnapshotBinding,
    history_snapshot_binding_passed: historySnapshotBinding,
    foreman_snapshot_binding_passed: foremanSnapshotBinding,
    stale_artifact_policy_passed: stalePolicyPassed,
    pdf_without_snapshot: pdfWithoutSnapshot,
    buyer_handoff_without_snapshot: buyerWithoutSnapshot,
    approved_history_without_snapshot: historyWithoutSnapshot,
    foreman_draft_without_revision: foremanWithoutRevision,
    costing_without_boq_hash: costingWithoutBoqHash,
    material_quantity_without_boq_hash: materialQuantityWithoutBoqHash,
    stale_pdf_not_marked_stale_after_recalc: lineage.staleArtifactsAfterRecalc.stale_pdf_not_marked_stale_after_recalc,
    stale_buyer_handoff_not_marked_stale_after_recalc: lineage.staleArtifactsAfterRecalc.stale_buyer_handoff_not_marked_stale_after_recalc,
    passed: failures.length === 0,
    failures,
    lineage,
  };
}
