import type { EditableEstimateRow } from "../editableEstimate";
import {
  getCurrentEstimateRevision,
  type EstimateRevisionState,
} from "../estimateRevisions";
import { resolvePhotoMaterialExistingRowFeature, type PhotoMaterialExistingRowFeaturePolicy } from "./photoMaterialExistingRowFeatureFlag";
import type {
  PhotoMaterialRevisionParityMarker,
  PhotoMaterialRowActionState,
  PhotoMaterialScanSession,
} from "./photoMaterialExistingRowTypes";
import { findActivePhotoMaterialScanForRow } from "./photoMaterialExistingRowScanSession";

export function buildPhotoMaterialRowActionState(input: {
  row: EditableEstimateRow;
  estimateAccessible: boolean;
  revisionExists: boolean;
  revisionEditableOrDraftAllowed: boolean;
  userCanEdit: boolean;
  featurePolicy?: PhotoMaterialExistingRowFeaturePolicy;
  userId: string;
  tenantId?: string | null;
  estimateId: string;
  baseRevisionId: string;
  activeSessions?: PhotoMaterialScanSession[];
}): PhotoMaterialRowActionState {
  const testID = `estimate-material-row-photo-button-${input.row.requestItemId ?? input.row.rowId}`;
  const feature = resolvePhotoMaterialExistingRowFeature({
    policy: input.featurePolicy,
    userId: input.userId,
    tenantId: input.tenantId,
  });
  const active = findActivePhotoMaterialScanForRow({
    sessions: input.activeSessions ?? [],
    userId: input.userId,
    estimateId: input.estimateId,
    baseRevisionId: input.baseRevisionId,
    targetRowId: input.row.requestItemId ?? input.row.rowId,
  });
  if (input.row.rowType !== "material") return { visible: false, enabled: false, testID, reason: "not_material_row" };
  if (!input.estimateAccessible) return { visible: false, enabled: false, testID, reason: "estimate_not_accessible" };
  if (!input.revisionExists) return { visible: false, enabled: false, testID, reason: "revision_missing" };
  if (!input.revisionEditableOrDraftAllowed) return { visible: false, enabled: false, testID, reason: "revision_not_editable" };
  if (!input.userCanEdit) return { visible: false, enabled: false, testID, reason: "edit_permission_missing" };
  if (!feature.enabled) return { visible: false, enabled: false, testID, reason: "feature_disabled" };
  if (active) return { visible: true, enabled: false, testID, reason: "active_scan_exists" };
  return { visible: true, enabled: true, testID, reason: "ready" };
}

export function formatPhotoMaterialRequirementAndProduct(row: EditableEstimateRow): string {
  const product = row.selectedProductBinding;
  return [
    row.titleRu,
    product ? `Selected product: ${product.visibleName}${product.packageLabel ? `, ${product.packageLabel}` : ""}` : null,
  ].filter(Boolean).join("\n");
}

export function buildPhotoMaterialRevisionParityMarker(input: {
  uiRevisionId: string;
  historyRevisionId: string;
  pdfRevisionId: string;
}): PhotoMaterialRevisionParityMarker {
  return {
    ...input,
    sameRevision:
      input.uiRevisionId === input.historyRevisionId &&
      input.uiRevisionId === input.pdfRevisionId,
  };
}

export function buildPhotoMaterialParityMarkerFromState(state: EstimateRevisionState): PhotoMaterialRevisionParityMarker {
  const current = getCurrentEstimateRevision(state);
  const history = state.history_bindings.find((binding) => binding.history_revision_id === current.revision_id);
  const pdf = state.pdf_exports.find((binding) => binding.pdf_export_revision_id === current.revision_id);
  return buildPhotoMaterialRevisionParityMarker({
    uiRevisionId: current.revision_id,
    historyRevisionId: history?.history_revision_id ?? current.revision_id,
    pdfRevisionId: pdf?.pdf_export_revision_id ?? current.revision_id,
  });
}

export function photoMaterialVisibleTextHasInternalKeys(text: string): boolean {
  return /\b(?:scanId|storagePath|storageBucket|contentSha256|payloadHash|revision_id|rows_hash|signedUrl)\b/.test(text);
}
