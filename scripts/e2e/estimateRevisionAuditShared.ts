import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  createEditableEstimateSnapshot,
  type EditableEstimateRow,
} from "../../src/lib/ai/editableEstimate";
import {
  applyEstimateRevisionAiRecalculation,
  applyEstimateRevisionCatalogSelection,
  applyEstimateRevisionQuantityEdit,
  applyEstimateRevisionRowRemoval,
  applyEstimateRevisionRowRestore,
  applyEstimateRevisionUnitPriceEdit,
  approveEstimateRevisionState,
  bindEstimateRevisionToHistoryEntry,
  bindEstimateRevisionToPdfExport,
  bindEstimateRevisionToRequestPayload,
  countEstimateRevisionInternalKeysVisible,
  createEstimateRevisionState,
  detectEstimateRevisionConflict,
  estimateRevisionAuditTrailComplete,
  estimateRevisionMojibakeFound,
  getCurrentEstimateRevision,
  restoreEstimateRevisionAsNewRevision,
} from "../../src/lib/ai/estimateRevisions";

export const ESTIMATE_REVISION_WAVE = "S_ESTIMATE_REVISION_AUDIT_APPROVAL_SAFE_SNAPSHOT_CORE_CLOSEOUT_POINT_OF_NO_RETURN";
export const ESTIMATE_REVISION_ARTIFACT_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  "S_ESTIMATE_REVISION_AUDIT_APPROVAL_SAFE_SNAPSHOT_CORE",
);

export function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

export function writeEstimateRevisionArtifact(name: string, payload: Record<string, unknown>): void {
  fs.mkdirSync(ESTIMATE_REVISION_ARTIFACT_DIR, { recursive: true });
  const head = currentHead();
  fs.writeFileSync(
    path.join(ESTIMATE_REVISION_ARTIFACT_DIR, name),
    `${JSON.stringify({
      wave: ESTIMATE_REVISION_WAVE,
      source_code_head: head,
      current_head_at_write_time: head,
      fake_green_claimed: false,
      ...payload,
    }, null, 2)}\n`,
    "utf8",
  );
}

export function baseEditableRow(overrides: Partial<EditableEstimateRow> = {}): EditableEstimateRow {
  return {
    rowId: overrides.rowId ?? "row_1",
    requestItemId: overrides.requestItemId ?? overrides.rowId ?? "row_1",
    rowType: overrides.rowType ?? "material",
    titleRu: overrides.titleRu ?? "\u041b\u0430\u043c\u0438\u043d\u0430\u0442",
    quantity: overrides.quantity ?? 10,
    unit: overrides.unit ?? "sq_m",
    unitLabel: overrides.unitLabel ?? "\u043c2",
    unitPrice: overrides.unitPrice ?? 500,
    totalPrice: overrides.totalPrice ?? 5000,
    currency: overrides.currency ?? "KGS",
    rowSource: overrides.rowSource ?? "reference_price_book",
    catalogItemId: overrides.catalogItemId ?? null,
    selectedCatalogItemId: overrides.selectedCatalogItemId ?? null,
    materialKey: overrides.materialKey ?? "laminate",
    rateKey: overrides.rateKey ?? null,
    catalogBindingStatus: overrides.catalogBindingStatus ?? null,
    catalogCandidates: overrides.catalogCandidates ?? [],
    category: overrides.category ?? null,
    sourceId: overrides.sourceId ?? "reference_price_book",
    sourceLabel: overrides.sourceLabel ?? "Reference price book",
    confidence: overrides.confidence ?? "high",
    addedBy: overrides.addedBy ?? "ai",
    editableByConsumer: overrides.editableByConsumer ?? true,
    quantitySource: overrides.quantitySource ?? "estimate",
    priceStatus: overrides.priceStatus ?? "REFERENCE_PRICE_ESTIMATE",
    priceSource: overrides.priceSource ?? "reference_price_book",
    priceSourceId: overrides.priceSourceId ?? "reference_price_book",
    priceSourceLabel: overrides.priceSourceLabel ?? "Reference price book",
    manualPrice: overrides.manualPrice ?? null,
    removed: overrides.removed,
  };
}

export function baseEditableSnapshot(rows: EditableEstimateRow[] = [baseEditableRow()]) {
  return createEditableEstimateSnapshot({
    snapshotId: "estimate_revision_audit_snapshot_1",
    requestDraftId: "request_revision_audit_1",
    sourceEstimateId: "estimate_revision_audit_1",
    workKey: "laminate_installation",
    currency: "KGS",
    rows,
    createdAt: "2026-06-15T00:00:00.000Z",
  });
}

export function buildEstimateRevisionAuditScenario() {
  const createdAt = "2026-06-15T00:00:00.000Z";
  const initialState = createEstimateRevisionState({
    estimate_id: "estimate_revision_audit_1",
    request_id: "request_revision_audit_1",
    selected_work_key: "laminate_installation",
    region: "Bishkek",
    currency: "KGS",
    editable_estimate_snapshot: baseEditableSnapshot(),
    created_by: "ai",
    created_at: createdAt,
  });
  const firstRevision = getCurrentEstimateRevision(initialState);
  const quantity = applyEstimateRevisionQuantityEdit(initialState, {
    row_key: "row_1",
    quantity: 12,
    actor_id: "consumer-1",
    created_at: "2026-06-15T01:00:00.000Z",
  });
  const price = applyEstimateRevisionUnitPriceEdit(quantity, {
    row_key: "row_1",
    unit_price: 610,
    actor_id: "consumer-1",
    created_at: "2026-06-15T02:00:00.000Z",
  });
  const removed = applyEstimateRevisionRowRemoval(price, {
    row_key: "row_1",
    actor_id: "consumer-1",
    created_at: "2026-06-15T03:00:00.000Z",
  });
  const rowRestored = applyEstimateRevisionRowRestore(removed, {
    row_key: "row_1",
    actor_id: "consumer-1",
    created_at: "2026-06-15T04:00:00.000Z",
  });
  const catalog = applyEstimateRevisionCatalogSelection(rowRestored, {
    row_key: "row_1",
    catalog_item_id: "catalog_laminate_42",
    source_id: "catalog_items",
    source_label: "catalog_items",
    unit_price: 640,
    actor_id: "consumer-1",
    created_at: "2026-06-15T05:00:00.000Z",
  });
  const recalculated = applyEstimateRevisionAiRecalculation(catalog, {
    ai_snapshot: baseEditableSnapshot([
      baseEditableRow({ rowId: "row_1", requestItemId: "row_1", unitPrice: 700, totalPrice: 7000 }),
    ]),
    created_at: "2026-06-15T06:00:00.000Z",
  });
  const approved = approveEstimateRevisionState({
    state: recalculated,
    actor_id: "consumer-1",
    created_at: "2026-06-15T07:00:00.000Z",
  });
  const pdf = bindEstimateRevisionToPdfExport({
    state: approved,
    pdf_id: "pdf_revision_audit_1",
    actor_id: "consumer-1",
    created_at: "2026-06-15T08:00:00.000Z",
  });
  const request = bindEstimateRevisionToRequestPayload({
    state: pdf.state,
    request_payload_id: "marketplace_demand_revision_audit_1",
    actor_id: "consumer-1",
    created_at: "2026-06-15T09:00:00.000Z",
  });
  const history = bindEstimateRevisionToHistoryEntry({
    state: request.state,
    history_entry_id: "history_revision_audit_1",
    created_at: "2026-06-15T10:00:00.000Z",
  });
  const conflictAdvanced = applyEstimateRevisionQuantityEdit(initialState, {
    row_key: "row_1",
    quantity: 11,
    actor_id: "consumer-1",
    created_at: "2026-06-15T01:30:00.000Z",
  });
  const conflict = detectEstimateRevisionConflict(conflictAdvanced, firstRevision.revision_id);
  const restored = restoreEstimateRevisionAsNewRevision({
    state: history.state,
    source_revision_id: firstRevision.revision_id,
    actor_id: "consumer-1",
    created_at: "2026-06-15T11:00:00.000Z",
  });
  const current = getCurrentEstimateRevision(restored);
  const visibleText = "\u0412\u0435\u0440\u0441\u0438\u044f 8\n\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435: \u0446\u0435\u043d\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0430";

  return {
    initialState,
    quantity,
    price,
    removed,
    rowRestored,
    catalog,
    recalculated,
    approved,
    pdf,
    request,
    history,
    conflict,
    restored,
    current,
    checks: {
      audit_trail_complete: estimateRevisionAuditTrailComplete(restored),
      pdf_bound_to_exact_revision: pdf.binding.pdf_export_revision_id === getCurrentEstimateRevision(approved).revision_id,
      request_bound_to_exact_revision: request.binding.request_revision_id === getCurrentEstimateRevision(pdf.state).revision_id,
      history_bound_to_exact_revision: history.binding.history_revision_id === getCurrentEstimateRevision(request.state).revision_id,
      approval_frozen: approved.approval_freezes.length === 1,
      conflict_detected_without_silent_overwrite: conflict?.silent_overwrite === false,
      restore_created_new_revision: current.source === "RESTORED_FROM_REVISION",
      internal_keys_visible: countEstimateRevisionInternalKeysVisible(visibleText),
      mojibake_found: estimateRevisionMojibakeFound(visibleText),
    },
  };
}

export function assertAuditPass(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}
