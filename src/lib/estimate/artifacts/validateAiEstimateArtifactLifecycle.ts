import { createSnapshotFromDraftRevision } from "../../../features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../../features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import { applyAiEstimateParameterOverride } from "../applyAiEstimateParameterOverrides";
import { createEstimateDraftRevision } from "../createEstimateDraftRevision";
import type { AiEstimateArtifactLifecycleValidation } from "./AiEstimateArtifactLifecycle";
import { validateAiEstimateBuyerPackageParity } from "./validateAiEstimateBuyerPackageParity";
import { validateAiEstimatePdfSnapshotParity } from "./validateAiEstimatePdfSnapshotParity";

export function validateAiEstimateArtifactLifecycle(): AiEstimateArtifactLifecycleValidation {
  const revision = createEstimateDraftRevision({
    estimateDraftId: "artifact-lifecycle-v2",
    rawInput: "capital apartment repair 98 m2 2 bathrooms ceiling height 2.7 m",
    selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const snapshotResult = createSnapshotFromDraftRevision(revision);
  const pdfResult = renderPdfFromDraftRevision({ revision: snapshotResult.revision, snapshot: snapshotResult.snapshot });
  const buyerResult = createBuyerHandoffFromDraftRevision({ revision: pdfResult.revision, snapshot: pdfResult.snapshot });
  const changed = applyAiEstimateParameterOverride({
    revision: buyerResult.revision,
    operation: buyerResult.revision.params.q ? "update_param" : "add_param",
    paramKey: "q",
    rawValue: "120",
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const regeneratedPdf = renderPdfFromDraftRevision({ revision: changed.revision });
  const regeneratedBuyer = createBuyerHandoffFromDraftRevision({ revision: regeneratedPdf.revision, snapshot: regeneratedPdf.snapshot });
  const hasUnpricedRows = regeneratedPdf.snapshot.rows.some((row) =>
    row.unitPrice == null
      || row.priceStatus === "PRICE_MISSING"
      || row.priceStatus === null,
  );
  const claimsCompleteFinalTotal = /(?:fake final total|полный итог|final total)/i.test(regeneratedPdf.pdf.body)
    && !/не рассчитан|уточнить|PRICE_MISSING|missing/i.test(regeneratedPdf.pdf.body);
  const checks = {
    artifact_lifecycle_created: true,
    snapshot_bound_to_revision_id: snapshotResult.snapshot.revisionId === revision.revisionId,
    pdf_bound_to_snapshot_id: pdfResult.pdf.snapshotId === snapshotResult.snapshot.snapshotId,
    buyer_package_bound_to_snapshot_id: buyerResult.buyerHandoff.snapshotId === snapshotResult.snapshot.snapshotId,
    pdf_rows_equal_snapshot_rows: validateAiEstimatePdfSnapshotParity({ snapshot: snapshotResult.snapshot, pdf: pdfResult.pdf }),
    buyer_package_is_procurement_subset: validateAiEstimateBuyerPackageParity({
      snapshot: buyerResult.snapshot,
      buyerPackage: buyerResult.buyerHandoff,
    }),
    pdf_invalidated_after_parameter_change: changed.revision.artifacts.pdfArtifactId === null,
    buyer_package_invalidated_after_parameter_change: changed.revision.artifacts.buyerHandoffId === null,
    pdf_regeneration_uses_latest_revision: regeneratedPdf.pdf.revisionId === changed.revision.revisionId,
    buyer_regeneration_uses_latest_revision: regeneratedBuyer.buyerHandoff.revisionId === changed.revision.revisionId,
    no_debug_rows_in_buyer_package: regeneratedBuyer.buyerHandoff.items.every((item) => !/debug|formula|sourceParameters/i.test(item.titleRu)),
    no_fake_final_total: hasUnpricedRows ? !claimsCompleteFinalTotal : true,
    missing_price_state_preserved: /PRICE_MISSING|missing/i.test(regeneratedPdf.pdf.body),
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    artifactLifecycleCreated: true,
    snapshotBoundToRevisionId: checks.snapshot_bound_to_revision_id,
    pdfBoundToSnapshotId: checks.pdf_bound_to_snapshot_id,
    buyerPackageBoundToSnapshotId: checks.buyer_package_bound_to_snapshot_id,
    pdfRowsEqualSnapshotRows: checks.pdf_rows_equal_snapshot_rows,
    buyerPackageIsProcurementSubset: checks.buyer_package_is_procurement_subset,
    pdfInvalidatedAfterParameterChange: checks.pdf_invalidated_after_parameter_change,
    buyerPackageInvalidatedAfterParameterChange: checks.buyer_package_invalidated_after_parameter_change,
    pdfRegenerationUsesLatestRevision: checks.pdf_regeneration_uses_latest_revision,
    buyerRegenerationUsesLatestRevision: checks.buyer_regeneration_uses_latest_revision,
    noDebugRowsInBuyerPackage: checks.no_debug_rows_in_buyer_package,
    noFakeFinalTotal: checks.no_fake_final_total,
    missingPriceStatePreserved: checks.missing_price_state_preserved,
    blockingReasons,
  };
}
