import { recalculateEditableEstimateTotals, roundEditableEstimateMoney } from "./recalculateEditableEstimateTotals";
import { computeEditableEstimateSnapshotHash } from "./editableEstimateSnapshotHash";
import {
  isEditableEstimateUserConfirmedMarketPriceStatus,
  isEditableEstimateUserPriceStatus,
} from "./manualPricePolicy";
import type {
  EditableEstimateSnapshot,
  EditableEstimateValidationIssue,
  EditableEstimateValidationResult,
} from "./editableEstimateTypes";

function issue(code: string, message: string, rowId?: string): EditableEstimateValidationIssue {
  return { code, message, rowId };
}

export function validateEditableEstimateSnapshot(snapshot: EditableEstimateSnapshot): EditableEstimateValidationResult {
  const issues: EditableEstimateValidationIssue[] = [];
  const rowIds = new Set<string>();

  if (snapshot.version !== "editable-estimate-v1") {
    issues.push(issue("SNAPSHOT_VERSION_INVALID", "Editable estimate snapshot version is invalid."));
  }
  if (!snapshot.requestDraftId.trim()) {
    issues.push(issue("REQUEST_DRAFT_ID_REQUIRED", "Editable estimate snapshot requires requestDraftId."));
  }

  for (const row of snapshot.rows) {
    if (!row.rowId.trim()) {
      issues.push(issue("ROW_ID_REQUIRED", "Editable estimate row requires rowId."));
      continue;
    }
    if (rowIds.has(row.rowId)) {
      issues.push(issue("ROW_ID_DUPLICATE", "Editable estimate row id must be unique.", row.rowId));
    }
    rowIds.add(row.rowId);

    if (!row.titleRu.trim()) issues.push(issue("ROW_TITLE_REQUIRED", "Editable estimate row requires title.", row.rowId));
    if (row.quantity != null && (!Number.isFinite(row.quantity) || row.quantity < 0)) {
      issues.push(issue("ROW_QUANTITY_INVALID", "Editable estimate row quantity must be non-negative.", row.rowId));
    }
    if (row.unitPrice != null && (!Number.isFinite(row.unitPrice) || row.unitPrice < 0)) {
      issues.push(issue("ROW_UNIT_PRICE_INVALID", "Editable estimate row unit price must be non-negative.", row.rowId));
    }
    if (row.unitPrice == null && row.totalPrice != null) {
      issues.push(issue("ROW_TOTAL_WITHOUT_PRICE", "Editable estimate row cannot keep total without unit price.", row.rowId));
    }
    if (row.quantity != null && row.unitPrice != null) {
      const expectedTotal = roundEditableEstimateMoney(row.quantity * row.unitPrice);
      if (row.totalPrice !== expectedTotal) {
        issues.push(issue("ROW_TOTAL_STALE", "Editable estimate row total must match quantity and unit price.", row.rowId));
      }
    }
    if (isEditableEstimateUserPriceStatus(row.priceStatus)) {
      if (row.priceSource !== "user") {
        issues.push(issue("USER_PRICE_SOURCE_INVALID", "User price rows must use user price source.", row.rowId));
      }
      if (row.priceSourceId) {
        issues.push(issue("USER_PRICE_SOURCE_ID_FORBIDDEN", "User price rows must not claim supplier or pricebook source id.", row.rowId));
      }
      if (!row.manualPrice || row.manualPrice.unitPrice !== row.unitPrice) {
        issues.push(issue("USER_PRICE_AUDIT_REQUIRED", "User price rows require manual price audit metadata.", row.rowId));
      }
    }
    if (isEditableEstimateUserConfirmedMarketPriceStatus(row.priceStatus)) {
      if (row.priceSource !== "photo_material_scan") {
        issues.push(issue("PHOTO_PRICE_SOURCE_INVALID", "Photo-confirmed market prices must use photo scan source.", row.rowId));
      }
      if (!row.priceSourceId || !row.selectedProductBinding) {
        issues.push(issue("PHOTO_PRICE_EVIDENCE_REQUIRED", "Photo-confirmed market prices require scan evidence.", row.rowId));
      }
    }
    if (
      (row.priceStatus === "CATALOG_PRICE_VERIFIED" ||
        row.priceStatus === "PRICEBOOK_VERIFIED" ||
        row.priceStatus === "REFERENCE_PRICE_ESTIMATE") &&
      row.unitPrice != null &&
      !row.priceSourceId &&
      !row.sourceId
    ) {
      issues.push(issue("TRUSTED_PRICE_SOURCE_REQUIRED", "Trusted price rows require source evidence.", row.rowId));
    }
  }

  const expectedTotals = recalculateEditableEstimateTotals(snapshot.rows, snapshot.currency);
  if (expectedTotals.grandTotal !== snapshot.totals.grandTotal) {
    issues.push(issue("SNAPSHOT_TOTALS_STALE", "Editable estimate totals must match rows."));
  }
  const { hash: _hash, ...snapshotWithoutHash } = snapshot;
  const expectedHash = computeEditableEstimateSnapshotHash(snapshotWithoutHash);
  if (snapshot.hash !== expectedHash) {
    issues.push(issue("SNAPSHOT_HASH_STALE", "Editable estimate snapshot hash must match rows and totals."));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
