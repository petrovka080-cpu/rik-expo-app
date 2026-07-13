import {
  refreshEditableEstimateSnapshot,
  type EditableEstimateRow,
  type EditableEstimateSelectedProductBinding,
  type EditableEstimateSnapshot,
} from "../editableEstimate";
import {
  createEstimateRevisionFromSnapshot,
  getCurrentEstimateRevision,
  type EstimateRevisionState,
} from "../estimateRevisions";
import { checkPhotoMaterialCandidateCompatibility } from "./photoMaterialExistingRowCompatibility";
import {
  photoMaterialCandidatePayloadHash,
  photoMaterialConfirmationPayloadHash,
} from "./photoMaterialExistingRowHash";
import type {
  PhotoMaterialAtomicApplyInput,
  PhotoMaterialCandidate,
  PhotoMaterialConfirmationResult,
  PhotoMaterialPriceDecision,
  PhotoMaterialQuantityDecision,
  PhotoMaterialScanSession,
} from "./photoMaterialExistingRowTypes";

function rowMatches(row: EditableEstimateRow, rowId: string): boolean {
  return row.rowId === rowId || row.requestItemId === rowId;
}

function targetRow(snapshot: EditableEstimateSnapshot, rowId: string): EditableEstimateRow {
  const row = snapshot.rows.find((candidate) => rowMatches(candidate, rowId));
  if (!row) throw new Error("PHOTO_MATERIAL_TARGET_ROW_NOT_FOUND");
  return row;
}

function assertSessionCanApply(session: PhotoMaterialScanSession): void {
  if (session.scanPurpose !== "BIND_EXISTING_ESTIMATE_ROW") throw new Error("PHOTO_MATERIAL_SCAN_PURPOSE_NOT_SUPPORTED");
  if (session.status !== "NEEDS_CONFIRMATION") {
    throw new Error(`PHOTO_MATERIAL_SCAN_CONFIRMATION_STATUS_INVALID:${session.status}`);
  }
}

function assertCandidateUntampered(candidate: PhotoMaterialCandidate): void {
  const { payloadHash: _payloadHash, ...withoutHash } = candidate;
  const expected = photoMaterialCandidatePayloadHash(withoutHash);
  if (candidate.payloadHash !== expected) throw new Error("PHOTO_MATERIAL_CANDIDATE_TAMPERING_REJECTED");
}

function priceFieldsForDecision(input: {
  row: EditableEstimateRow;
  candidate: PhotoMaterialCandidate;
  priceDecision: PhotoMaterialPriceDecision;
}) {
  const { row, candidate, priceDecision } = input;
  if (priceDecision === "KEEP_EXISTING_PRICE") {
    return {
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice,
      priceStatus: row.priceStatus,
      priceSource: row.priceSource,
      priceSourceId: row.priceSourceId ?? null,
      priceSourceLabel: row.priceSourceLabel ?? null,
      manualPrice: row.manualPrice ?? null,
    };
  }
  if (priceDecision === "KEEP_PRICE_MISSING") {
    return {
      unitPrice: null,
      totalPrice: null,
      priceStatus: "PRICE_MISSING" as const,
      priceSource: "missing" as const,
      priceSourceId: null,
      priceSourceLabel: null,
      manualPrice: null,
    };
  }
  if (priceDecision === "APPLY_PHOTO_PRICE") {
    if (candidate.photoUnitPrice == null) throw new Error("PHOTO_MATERIAL_PHOTO_PRICE_MISSING");
    return {
      unitPrice: candidate.photoUnitPrice,
      totalPrice: row.quantity != null ? Math.round(row.quantity * candidate.photoUnitPrice * 100) / 100 : null,
      priceStatus: "USER_CONFIRMED_MARKET_PRICE" as const,
      priceSource: "photo_material_scan" as const,
      priceSourceId: candidate.scanId,
      priceSourceLabel: "photo_material_scan_user_confirmed",
      manualPrice: null,
    };
  }
  if (candidate.governedUnitPrice == null) throw new Error("PHOTO_MATERIAL_GOVERNED_PRICE_MISSING");
  return {
    unitPrice: candidate.governedUnitPrice,
    totalPrice: row.quantity != null ? Math.round(row.quantity * candidate.governedUnitPrice * 100) / 100 : null,
    priceStatus: candidate.governedPriceSourceId ? "CATALOG_PRICE_VERIFIED" as const : "PRICEBOOK_VERIFIED" as const,
    priceSource: candidate.governedPriceSourceId ? "catalog_item" as const : "pricebook" as const,
    priceSourceId: candidate.governedPriceSourceId ?? candidate.productId,
    priceSourceLabel: candidate.governedPriceSourceLabel ?? "governed_pricebook",
    manualPrice: null,
  };
}

function quantityFieldsForDecision(input: {
  row: EditableEstimateRow;
  candidate: PhotoMaterialCandidate;
  quantityDecision: PhotoMaterialQuantityDecision;
}) {
  if (input.quantityDecision === "KEEP_REQUIREMENT_QUANTITY") {
    return {
      quantity: input.row.quantity,
      unit: input.row.unit,
      unitLabel: input.row.unitLabel,
      quantitySource: input.row.quantitySource,
    };
  }
  if (!input.candidate.packageQuantity || input.candidate.packageQuantity <= 0) {
    throw new Error("PHOTO_MATERIAL_PACKAGE_RECALCULATION_REQUIRES_PACKAGE_QUANTITY");
  }
  if (input.row.quantity == null) {
    throw new Error("PHOTO_MATERIAL_PACKAGE_RECALCULATION_REQUIRES_REQUIREMENT_QUANTITY");
  }
  return {
    quantity: Math.ceil(input.row.quantity / input.candidate.packageQuantity),
    unit: input.candidate.packageUnit ?? input.row.unit,
    unitLabel: input.candidate.packageLabel ?? input.row.unitLabel,
    quantitySource: "user_override" as const,
  };
}

function selectedProductBinding(input: {
  candidate: PhotoMaterialCandidate;
  confirmedByUserId: string;
  confirmedAt: string;
}): EditableEstimateSelectedProductBinding {
  return {
    productId: input.candidate.productId,
    visibleName: input.candidate.visibleName,
    packageLabel: input.candidate.packageLabel ?? null,
    barcode: input.candidate.barcode ?? null,
    materialKey: input.candidate.materialKey,
    catalogItemId: input.candidate.catalogItemId ?? null,
    scanId: input.candidate.scanId,
    candidateId: input.candidate.candidateId,
    evidenceRefs: [...input.candidate.evidenceObservationIds],
    source: "photo_material_scan",
    confirmedByUserId: input.confirmedByUserId,
    confirmedAt: input.confirmedAt,
  };
}

function applyCandidateToSnapshot(input: {
  snapshot: EditableEstimateSnapshot;
  row: EditableEstimateRow;
  candidate: PhotoMaterialCandidate;
  priceDecision: PhotoMaterialPriceDecision;
  quantityDecision: PhotoMaterialQuantityDecision;
  confirmedByUserId: string;
  confirmedAt: string;
}): EditableEstimateSnapshot {
  const price = priceFieldsForDecision({
    row: input.row,
    candidate: input.candidate,
    priceDecision: input.priceDecision,
  });
  const quantity = quantityFieldsForDecision({
    row: input.row,
    candidate: input.candidate,
    quantityDecision: input.quantityDecision,
  });
  const rows = input.snapshot.rows.map((row) => {
    if (!rowMatches(row, input.row.rowId)) return row;
    const nextUnitPrice = price.unitPrice;
    const nextQuantity = quantity.quantity;
    return {
      ...row,
      ...quantity,
      catalogItemId: input.candidate.catalogItemId ?? row.catalogItemId ?? null,
      selectedCatalogItemId: input.candidate.catalogItemId ?? row.selectedCatalogItemId ?? null,
      unitPrice: nextUnitPrice,
      totalPrice: nextQuantity != null && nextUnitPrice != null
        ? Math.round(nextQuantity * nextUnitPrice * 100) / 100
        : null,
      priceStatus: price.priceStatus,
      priceSource: price.priceSource,
      priceSourceId: price.priceSourceId,
      priceSourceLabel: price.priceSourceLabel,
      manualPrice: price.manualPrice,
      selectedProductBinding: selectedProductBinding({
        candidate: input.candidate,
        confirmedByUserId: input.confirmedByUserId,
        confirmedAt: input.confirmedAt,
      }),
    };
  });
  return refreshEditableEstimateSnapshot({
    ...input.snapshot,
    rows,
    updatedAt: input.confirmedAt,
  });
}

function assertCurrencyDecision(input: {
  state: EstimateRevisionState;
  candidate: PhotoMaterialCandidate;
  priceDecision: PhotoMaterialPriceDecision;
}): void {
  if (input.priceDecision !== "APPLY_PHOTO_PRICE" && input.priceDecision !== "APPLY_GOVERNED_CATALOG_PRICE") return;
  const current = getCurrentEstimateRevision(input.state);
  if (input.candidate.currency !== current.currency) {
    throw new Error(`PHOTO_MATERIAL_CURRENCY_MISMATCH:${input.candidate.currency}->${current.currency}`);
  }
}

export function confirmPhotoMaterialExistingRowBinding(input: PhotoMaterialAtomicApplyInput): PhotoMaterialConfirmationResult {
  const ledger = [...(input.ledger ?? [])];
  const payloadHash = photoMaterialConfirmationPayloadHash(input.payload);
  const existingLedger = ledger.find((entry) => entry.idempotencyKey === input.payload.idempotencyKey);
  if (existingLedger) {
    if (existingLedger.payloadHash !== payloadHash) throw new Error("PHOTO_MATERIAL_IDEMPOTENCY_PAYLOAD_MISMATCH_REJECTED");
    return {
      state: input.state,
      session: { ...input.session, status: "APPLIED", updatedAt: existingLedger.createdAt },
      ledger,
      createdRevisionId: existingLedger.createdRevisionId,
      selectedRow: targetRow(getCurrentEstimateRevision(input.state).editable_estimate_snapshot, input.payload.targetRowId),
      idempotentReplay: true,
      automatic_estimate_mutations_before_confirmation: 0,
      automatic_revisions_before_confirmation: 0,
      approved_revisions_modified: 0,
      atomic_partial_writes: 0,
      fake_green_claimed: false,
    };
  }

  assertSessionCanApply(input.session);
  if (input.session.scanId !== input.payload.scanId) throw new Error("PHOTO_MATERIAL_SCAN_PAYLOAD_MISMATCH");
  if (input.session.targetRowId !== input.payload.targetRowId) throw new Error("PHOTO_MATERIAL_TARGET_ROW_IMMUTABLE");
  const current = getCurrentEstimateRevision(input.state);
  if (current.revision_id !== input.payload.baseRevisionId || input.session.baseRevisionId !== input.payload.baseRevisionId) {
    throw new Error("REVISION_CONFLICT");
  }
  if (current.status === "APPROVED") throw new Error("PHOTO_MATERIAL_APPROVED_REVISION_IMMUTABLE");
  const row = targetRow(current.editable_estimate_snapshot, input.payload.targetRowId);
  const candidate = input.recognition.candidates.find((item) => item.candidateId === input.payload.candidateId);
  if (!candidate) throw new Error("PHOTO_MATERIAL_CANDIDATE_NOT_FOUND_FOR_SCAN");
  assertCandidateUntampered(candidate);
  if (candidate.payloadHash !== input.payload.candidatePayloadHash) {
    throw new Error("PHOTO_MATERIAL_CANDIDATE_TAMPERING_REJECTED");
  }
  const compatibility = checkPhotoMaterialCandidateCompatibility({ row, candidate });
  if (!compatibility.compatible) throw new Error(compatibility.status);
  assertCurrencyDecision({
    state: input.state,
    candidate,
    priceDecision: input.payload.priceDecision,
  });
  if (input.simulateFailureAfterValidation) throw new Error("PHOTO_MATERIAL_ATOMIC_SIMULATED_FAILURE");

  const confirmedAt = input.payload.confirmedAt ?? new Date().toISOString();
  const nextSnapshot = applyCandidateToSnapshot({
    snapshot: current.editable_estimate_snapshot,
    row,
    candidate,
    priceDecision: input.payload.priceDecision,
    quantityDecision: input.payload.quantityDecision,
    confirmedByUserId: input.payload.confirmedByUserId,
    confirmedAt,
  });
  const nextState = createEstimateRevisionFromSnapshot(input.state, {
    base_revision_id: input.payload.baseRevisionId,
    editable_estimate_snapshot: nextSnapshot,
    source: "PHOTO_MATERIAL_BOUND",
    actor: "user",
    actor_id: input.payload.confirmedByUserId,
    event_type: "PHOTO_MATERIAL_PRODUCT_BOUND",
    row_key: input.payload.targetRowId,
    before_value: {
      requirementVisibleName: row.titleRu,
      selectedProductBinding: row.selectedProductBinding ?? null,
    },
    after_value: {
      requirementVisibleName: row.titleRu,
      selectedProductVisibleName: candidate.visibleName,
      priceDecision: input.payload.priceDecision,
      quantityDecision: input.payload.quantityDecision,
    },
    reason_ru: "Photo product binding confirmed by user.",
    created_at: confirmedAt,
  });
  const createdRevision = getCurrentEstimateRevision(nextState);
  const nextLedger = [
    ...ledger,
    {
      idempotencyKey: input.payload.idempotencyKey,
      payloadHash,
      scanId: input.payload.scanId,
      candidateId: input.payload.candidateId,
      createdRevisionId: createdRevision.revision_id,
      createdAt: confirmedAt,
    },
  ];
  const selectedRow = targetRow(createdRevision.editable_estimate_snapshot, input.payload.targetRowId);
  return {
    state: nextState,
    session: { ...input.session, status: "APPLIED", version: input.session.version + 1, updatedAt: confirmedAt },
    ledger: nextLedger,
    createdRevisionId: createdRevision.revision_id,
    selectedRow,
    idempotentReplay: false,
    automatic_estimate_mutations_before_confirmation: 0,
    automatic_revisions_before_confirmation: 0,
    approved_revisions_modified: 0,
    atomic_partial_writes: 0,
    fake_green_claimed: false,
  };
}
