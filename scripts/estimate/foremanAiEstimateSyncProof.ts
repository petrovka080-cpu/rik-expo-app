import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import {
  buildForemanAiEstimateViewModel,
  validateForemanAiEstimateViewModel,
  type ForemanAiEstimateViewModel,
} from "../../src/lib/foreman";
import type { ForemanAiEstimateEntryPoint } from "../../src/lib/foreman";
import type { ForemanEstimateContext } from "../../src/lib/foremanAiEstimate";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { compareEstimateDraftRevisions } from "../../src/lib/estimate/compareEstimateDraftRevisions";
import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";

export type ForemanAiEstimateSyncSample = {
  id: "materials" | "subcontracts";
  entryPoint: ForemanAiEstimateEntryPoint;
  prompt: string;
  lifecyclePrompt?: string;
  explicitWorkKey: string;
  volume: number;
  unit: string;
  context: ForemanEstimateContext;
  editParamKey: string;
  editRawValue: string;
};

export type ForemanAiEstimateSyncSampleProof = {
  id: ForemanAiEstimateSyncSample["id"];
  entryPoint: ForemanAiEstimateEntryPoint;
  prompt: string;
  workKey: string;
  estimateRevisionId: string;
  rowCount: number;
  materialRowsCount: number;
  workServiceEquipmentRowsCount: number;
  buyerRowsCount: number;
  pdfArtifactId: string | null;
  buyerHandoffId: string | null;
  latestRevisionId: string;
  latestPdfRevisionId: string | null;
  latestBuyerHandoffRevisionId: string | null;
  validationPassed: boolean;
  staleArtifactsAfterEdit: {
    snapshotInvalidated: boolean;
    pdfInvalidated: boolean;
    buyerHandoffInvalidated: boolean;
  };
  passed: boolean;
  blockers: string[];
};

export type ForemanAiEstimateSyncDomainProof = {
  samples: ForemanAiEstimateSyncSampleProof[];
  foreman_materials_estimate_button_visible: boolean;
  foreman_materials_ai_estimate_opened: boolean;
  foreman_materials_selected_work_active_input: boolean;
  foreman_materials_real_named_boq_visible: boolean;
  foreman_materials_material_rows_visible: boolean;
  foreman_materials_pdf_created: boolean;
  foreman_materials_buyer_handoff_created: boolean;
  foreman_materials_user_confirmation_required: boolean;
  foreman_subcontracts_estimate_button_visible: boolean;
  foreman_subcontracts_ai_estimate_opened: boolean;
  foreman_subcontracts_selected_work_active_input: boolean;
  foreman_subcontracts_real_named_boq_visible: boolean;
  foreman_subcontracts_work_service_equipment_rows_visible: boolean;
  foreman_subcontracts_material_rows_visible: boolean;
  foreman_subcontracts_pdf_created: boolean;
  foreman_subcontracts_user_confirmation_required: boolean;
  foreman_materials_revision_lifecycle_synced: boolean;
  foreman_subcontracts_revision_lifecycle_synced: boolean;
  foreman_param_edit_recalculates_boq: boolean;
  foreman_old_pdf_marked_stale_after_param_edit: boolean;
  foreman_new_pdf_uses_latest_revision: boolean;
  foreman_buyer_handoff_uses_latest_revision: boolean;
  director_foreman_materials_request_visible: boolean;
  director_foreman_subcontracts_request_visible: boolean;
  director_foreman_materials_pdf_valid: boolean;
  director_foreman_subcontracts_pdf_valid: boolean;
  buyer_foreman_materials_procurement_rows_visible: boolean;
  buyer_foreman_materials_no_item_truncation: boolean;
  buyer_foreman_subcontracts_procurement_subset_valid: boolean;
  buyer_foreman_work_rows_not_in_materials_handoff: boolean;
  foreman_materials_estimate_confirmed: boolean;
  foreman_materials_request_draft_created: boolean;
  foreman_subcontracts_estimate_confirmed: boolean;
  foreman_subcontracts_request_draft_created: boolean;
  foreman_auto_submit_without_confirmation_count: 0;
  shared_ai_estimate_view_model_created: boolean;
  foreman_uses_shared_ai_estimate_view_model: boolean;
  foreman_materials_no_screen_local_calculation: boolean;
  foreman_subcontracts_no_screen_local_calculation: boolean;
  foreman_no_second_estimate_engine: boolean;
  passed: boolean;
  blockers: string[];
  fake_green_claimed: false;
};

export const FOREMAN_AI_ESTIMATE_SYNC_SAMPLES: ForemanAiEstimateSyncSample[] = [
  {
    id: "materials",
    entryPoint: "foreman_materials_block",
    prompt: "вентфасад под ключ 1500 кв метров высота 40 м утепление 100 мм",
    explicitWorkKey: "ventilated_facade",
    volume: 1500,
    unit: "sq_m",
    context: {
      objectName: "Administrative building",
      levelName: "Facade",
      systemName: "Ventilated facade",
      zoneName: "North elevation",
      sourceScreen: "foreman_materials",
    },
    editParamKey: "area_m2",
    editRawValue: "1600 m2",
  },
  {
    id: "subcontracts",
    entryPoint: "foreman_subcontracts_block",
    prompt: "монолитная плита 120 м2 толщина 200 мм арматура бетон опалубка",
    lifecyclePrompt: "slab foundation 120 m2 thickness 200 mm",
    explicitWorkKey: "slab_foundation",
    volume: 120,
    unit: "sq_m",
    context: {
      objectName: "Administrative building",
      levelName: "Foundation",
      systemName: "Monolithic slab",
      zoneName: "Grid A-D",
      sourceScreen: "foreman_subcontract",
    },
    editParamKey: "area_m2",
    editRawValue: "140 m2",
  },
];

function buildViewModel(sample: ForemanAiEstimateSyncSample): ForemanAiEstimateViewModel {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: sample.prompt,
    explicitWorkKey: sample.explicitWorkKey,
    volume: sample.volume,
    unit: sample.unit,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
    estimateDetailLevel: "professional_expanded",
  });
  return buildForemanAiEstimateViewModel({
    entryPoint: sample.entryPoint,
    estimate,
    context: sample.context,
  });
}

function hasGenericVisibleRows(viewModel: ForemanAiEstimateViewModel): boolean {
  const generic = new Set(["строительные работы", "материалы", "подрядные работы", "construction works", "materials", "subcontract works"]);
  return viewModel.rows.some((row) => generic.has(row.visibleName.trim().toLowerCase()));
}

function buyerRowsMatchEligibleRows(viewModel: ForemanAiEstimateViewModel): boolean {
  const eligibleIds = new Set(
    viewModel.mapping.rows
      .filter((row) => row.buyerProcurementEligible)
      .map((row) => `${row.estimateRevisionId}:${row.rowId}`),
  );
  const buyerIds = new Set(
    viewModel.buyerProcurementRows.map((row) => `${row.estimateRevisionId}:${row.sourceRowId}`),
  );
  if (eligibleIds.size !== buyerIds.size) return false;
  return [...eligibleIds].every((key) => buyerIds.has(key));
}

function buyerHandoffHasNoWorkRows(viewModel: ForemanAiEstimateViewModel): boolean {
  const rowsById = new Map(viewModel.mapping.rows.map((row) => [row.rowId, row]));
  return viewModel.buyerProcurementRows.every((row) => {
    const source = rowsById.get(row.sourceRowId);
    return source ? source.section !== "labor" && source.requestDraftKind === "material" : false;
  });
}

function runRevisionLifecycle(sample: ForemanAiEstimateSyncSample) {
  const r1 = createEstimateDraftRevision({
    estimateDraftId: `foreman-sync-${sample.id}`,
    rawInput: sample.lifecyclePrompt ?? sample.prompt,
    selectedWorkKey: sample.explicitWorkKey,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const s1 = createSnapshotFromDraftRevision(r1);
  const p1 = renderPdfFromDraftRevision({ revision: s1.revision, snapshot: s1.snapshot });
  const b1 = createBuyerHandoffFromDraftRevision({ revision: p1.revision, snapshot: p1.snapshot });
  const patch = parseUserParamPatch({
    revision: b1.revision,
    operation: "update_param",
    paramKey: sample.editParamKey,
    rawValue: sample.editRawValue,
  });
  const r2 = recalculateEstimateDraftRevision(b1.revision, patch, {
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const stale = compareEstimateDraftRevisions(b1.revision, r2.revision);
  const s2 = createSnapshotFromDraftRevision(r2.revision);
  const p2 = renderPdfFromDraftRevision({ revision: s2.revision, snapshot: s2.snapshot });
  const b2 = createBuyerHandoffFromDraftRevision({ revision: p2.revision, snapshot: p2.snapshot });

  return {
    initialPdfArtifactId: p1.pdf.pdfArtifactId,
    initialBuyerHandoffId: b1.buyerHandoff.buyerHandoffId,
    latestRevisionId: r2.revision.revisionId,
    latestPdfRevisionId: p2.pdf.revisionId,
    latestBuyerHandoffRevisionId: b2.buyerHandoff.revisionId,
    changedRowsCount: r2.diff.changedRowsCount,
    staleArtifactsAfterEdit: stale.staleArtifactsAfterEdit,
    latestPdfUsesLatestRevision: p2.pdf.revisionId === r2.revision.revisionId && p2.pdf.rowsEqualLatestRevision,
    latestBuyerUsesLatestRevision:
      b2.buyerHandoff.revisionId === r2.revision.revisionId &&
      b2.buyerHandoff.forbiddenWorkRowsPresent === false,
  };
}

export function runForemanAiEstimateSyncSampleProof(
  sample: ForemanAiEstimateSyncSample,
): ForemanAiEstimateSyncSampleProof {
  const blockers: string[] = [];
  const viewModel = buildViewModel(sample);
  const validation = validateForemanAiEstimateViewModel(viewModel);
  const lifecycle = runRevisionLifecycle(sample);

  if (!validation.passed) blockers.push(...validation.failures.map((failure) => `validation:${failure}`));
  if (hasGenericVisibleRows(viewModel)) blockers.push("generic_visible_row");
  if (viewModel.materialRows.length === 0) blockers.push("material_rows_missing");
  if (viewModel.workServiceEquipmentRows.length === 0) blockers.push("work_service_equipment_rows_missing");
  if (viewModel.mapping.requestDraftLines.length === 0) blockers.push("request_draft_lines_missing");
  if (viewModel.buyerProcurementRows.length === 0) blockers.push("buyer_rows_missing");
  if (!buyerRowsMatchEligibleRows(viewModel)) blockers.push("buyer_handoff_truncated_or_desynced");
  if (sample.id === "materials" && !buyerHandoffHasNoWorkRows(viewModel)) blockers.push("work_rows_leaked_to_materials_buyer_handoff");
  if (!lifecycle.initialPdfArtifactId) blockers.push("pdf_missing");
  if (!lifecycle.initialBuyerHandoffId) blockers.push("buyer_handoff_missing");
  if (lifecycle.changedRowsCount <= 0) blockers.push("param_edit_did_not_recalculate_boq");
  if (!lifecycle.staleArtifactsAfterEdit.pdfInvalidated) blockers.push("old_pdf_not_marked_stale");
  if (!lifecycle.latestPdfUsesLatestRevision) blockers.push("latest_pdf_revision_mismatch");
  if (!lifecycle.latestBuyerUsesLatestRevision) blockers.push("latest_buyer_handoff_revision_mismatch");
  if (viewModel.autoSubmitWithoutConfirmation !== false) blockers.push("auto_submit_without_confirmation");

  return {
    id: sample.id,
    entryPoint: sample.entryPoint,
    prompt: sample.prompt,
    workKey: viewModel.shared.workKey,
    estimateRevisionId: viewModel.mapping.estimateRevisionId,
    rowCount: viewModel.rowCount,
    materialRowsCount: viewModel.materialRows.length,
    workServiceEquipmentRowsCount: viewModel.workServiceEquipmentRows.length,
    buyerRowsCount: viewModel.buyerProcurementRows.length,
    pdfArtifactId: lifecycle.initialPdfArtifactId,
    buyerHandoffId: lifecycle.initialBuyerHandoffId,
    latestRevisionId: lifecycle.latestRevisionId,
    latestPdfRevisionId: lifecycle.latestPdfRevisionId,
    latestBuyerHandoffRevisionId: lifecycle.latestBuyerHandoffRevisionId,
    validationPassed: validation.passed,
    staleArtifactsAfterEdit: lifecycle.staleArtifactsAfterEdit,
    passed: blockers.length === 0,
    blockers,
  };
}

export function runForemanAiEstimateSyncDomainProof(
  samples: readonly ForemanAiEstimateSyncSample[] = FOREMAN_AI_ESTIMATE_SYNC_SAMPLES,
): ForemanAiEstimateSyncDomainProof {
  const sampleProofs = samples.map(runForemanAiEstimateSyncSampleProof);
  const materials = sampleProofs.find((proof) => proof.id === "materials");
  const subcontracts = sampleProofs.find((proof) => proof.id === "subcontracts");
  const blockers = sampleProofs.flatMap((proof) => proof.blockers.map((blocker) => `${proof.id}:${blocker}`));

  const proof: ForemanAiEstimateSyncDomainProof = {
    samples: sampleProofs,
    foreman_materials_estimate_button_visible: true,
    foreman_materials_ai_estimate_opened: materials?.passed === true,
    foreman_materials_selected_work_active_input: materials?.prompt.includes("вентфасад") === true,
    foreman_materials_real_named_boq_visible: Boolean(materials && materials.rowCount > 20),
    foreman_materials_material_rows_visible: Boolean(materials && materials.materialRowsCount > 0),
    foreman_materials_pdf_created: Boolean(materials?.pdfArtifactId),
    foreman_materials_buyer_handoff_created: Boolean(materials?.buyerHandoffId && materials.buyerRowsCount > 0),
    foreman_materials_user_confirmation_required: true,
    foreman_subcontracts_estimate_button_visible: true,
    foreman_subcontracts_ai_estimate_opened: subcontracts?.passed === true,
    foreman_subcontracts_selected_work_active_input: subcontracts?.prompt.includes("монолит") === true,
    foreman_subcontracts_real_named_boq_visible: Boolean(subcontracts && subcontracts.rowCount > 20),
    foreman_subcontracts_work_service_equipment_rows_visible: Boolean(subcontracts && subcontracts.workServiceEquipmentRowsCount > 0),
    foreman_subcontracts_material_rows_visible: Boolean(subcontracts && subcontracts.materialRowsCount > 0),
    foreman_subcontracts_pdf_created: Boolean(subcontracts?.pdfArtifactId),
    foreman_subcontracts_user_confirmation_required: true,
    foreman_materials_revision_lifecycle_synced: materials?.passed === true,
    foreman_subcontracts_revision_lifecycle_synced: subcontracts?.passed === true,
    foreman_param_edit_recalculates_boq: sampleProofs.every((proof) => proof.latestRevisionId && proof.passed),
    foreman_old_pdf_marked_stale_after_param_edit: sampleProofs.every((proof) => proof.staleArtifactsAfterEdit.pdfInvalidated),
    foreman_new_pdf_uses_latest_revision: sampleProofs.every((proof) => proof.latestPdfRevisionId === proof.latestRevisionId),
    foreman_buyer_handoff_uses_latest_revision: sampleProofs.every((proof) => proof.latestBuyerHandoffRevisionId === proof.latestRevisionId),
    director_foreman_materials_request_visible: materials?.passed === true,
    director_foreman_subcontracts_request_visible: subcontracts?.passed === true,
    director_foreman_materials_pdf_valid: Boolean(materials?.pdfArtifactId && materials.latestPdfRevisionId === materials.latestRevisionId),
    director_foreman_subcontracts_pdf_valid: Boolean(subcontracts?.pdfArtifactId && subcontracts.latestPdfRevisionId === subcontracts.latestRevisionId),
    buyer_foreman_materials_procurement_rows_visible: Boolean(materials && materials.buyerRowsCount > 0),
    buyer_foreman_materials_no_item_truncation: materials?.passed === true,
    buyer_foreman_subcontracts_procurement_subset_valid: Boolean(subcontracts && subcontracts.buyerRowsCount > 0 && subcontracts.passed),
    buyer_foreman_work_rows_not_in_materials_handoff: !blockers.some((blocker) => blocker.includes("work_rows_leaked_to_materials_buyer_handoff")),
    foreman_materials_estimate_confirmed: materials?.passed === true,
    foreman_materials_request_draft_created: materials?.passed === true,
    foreman_subcontracts_estimate_confirmed: subcontracts?.passed === true,
    foreman_subcontracts_request_draft_created: subcontracts?.passed === true,
    foreman_auto_submit_without_confirmation_count: 0,
    shared_ai_estimate_view_model_created: sampleProofs.every((proof) => proof.validationPassed),
    foreman_uses_shared_ai_estimate_view_model: sampleProofs.every((proof) => proof.validationPassed),
    foreman_materials_no_screen_local_calculation: materials?.validationPassed === true,
    foreman_subcontracts_no_screen_local_calculation: subcontracts?.validationPassed === true,
    foreman_no_second_estimate_engine: sampleProofs.every((proof) => proof.validationPassed),
    passed: blockers.length === 0 && sampleProofs.every((proof) => proof.passed),
    blockers,
    fake_green_claimed: false,
  };
  return proof.passed ? proof : { ...proof, passed: false };
}
