// src/screens/warehouse/components/reqIssueModal.row.model.ts
//
// Pure row-shaping for ReqIssueModal items.
// No React, no side effects — deterministic given the same inputs.

import { nz } from "../warehouse.utils";
import { uomLabelRu } from "../warehouse.uom";
import type { ReqItemUiRow } from "../warehouse.types";

export type ReqIssueModalRowShape = {
  /** Stable row key without positional index */
  rowKey: string;
  /** Human-readable material name */
  nameHuman: string;
  /** Localised unit of measure label */
  uomLabel: string;
  /** Meta text shown below the name */
  metaText: string;
  /** Maximum quantity user may enter (min of available stock and qty_left) */
  maxUi: number;
  /** Placeholder hint for the quantity input */
  qtyPlaceholder: string;
  /** True when issuance is blocked by stock or busy state */
  disabledByStock: boolean;
  /** True when the Add button should be disabled (no stock, no recipient, or busy) */
  disabledAdd: boolean;
  /** True when max issuable by this request is 0 (over-issue warning) */
  showReqZeroWarn: boolean;
  /** True when max issuable overall is 0 (no stock warning) */
  showStockZeroWarn: boolean;
  /** Current text value for the qty input field */
  qtyValue: string;
  /** Raw item reference kept opaque for callbacks */
  item: ReqItemUiRow;
};

/**
 * Shape a single ReqIssueModal row from raw item + UI state.
 * All derived values are computed here, not inside renderItem.
 */
export function selectReqIssueModalRowShape(
  item: ReqItemUiRow,
  reqQtyInputByItem: Record<string, string>,
  issueBusy: boolean,
  recipientText: string,
): ReqIssueModalRowShape {
  const canByStock = nz(item.qty_available, 0);
  const left = nz(item.qty_left, 0);
  const canByReqNow = nz(item.qty_can_issue_now, 0);
  const maxUi = Math.max(0, Math.min(canByStock, left));

  const uomLabel = uomLabelRu(item.uom);
  const qtyValue = reqQtyInputByItem[item.request_item_id] ?? "";

  const disabledByStock = issueBusy || maxUi <= 0;
  const disabledAdd = disabledByStock || !recipientText.trim();

  const metaText = `${uomLabel} · лимит ${item.qty_limit} · выдано ${item.qty_issued} · осталось ${left} · склад ${canByStock} · по заявке можно ${item.qty_can_issue_now}`;

  return {
    rowKey: `${item.request_item_id}:${String(item.rik_code ?? "")}:${String(item.uom ?? "")}`,
    nameHuman: String(item.name_human || "Позиция"),
    uomLabel,
    metaText,
    maxUi,
    qtyPlaceholder: `0 (макс ${maxUi})`,
    qtyValue,
    disabledByStock,
    disabledAdd,
    showReqZeroWarn: maxUi > 0 && canByReqNow <= 0,
    showStockZeroWarn: maxUi <= 0,
    item,
  };
}

/**
 * Stable key extractor for the ReqIssueModal FlashList.
 * Does NOT include positional index to avoid virtualization restarts.
 */
export function selectReqIssueModalRowKey(item: ReqItemUiRow): string {
  return `${item.request_item_id}:${String(item.rik_code ?? "")}:${String(item.uom ?? "")}`;
}
