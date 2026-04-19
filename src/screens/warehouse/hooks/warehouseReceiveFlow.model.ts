import type { PlatformTerminalTruth } from "../../../lib/offline/platformTerminalRecovery";
import type { WarehouseReceiveDraftItem } from "../warehouse.receiveDraft.store";
import { nz, parseQtySelected } from "../warehouse.utils";

export type WarehouseReceiveFlowRow = {
  incoming_item_id?: string | null;
  purchase_item_id?: string | number | null;
  qty_expected?: number | string | null;
  qty_received?: number | string | null;
  qty_left?: number | string | null;
};

export type WarehouseReceiveSelectionPayloadItem = {
  purchase_item_id: string;
  qty: number;
};

export type WarehouseReceiveSelection = {
  items: WarehouseReceiveDraftItem[];
  payload: WarehouseReceiveSelectionPayloadItem[];
};

export const normalizeWarehouseReceiveFlowText = (value: unknown) =>
  String(value ?? "").trim();

export const toWarehouseReceiveDraftItemsFromInputMap = (
  qtyInputByItem: Record<string, string>,
): WarehouseReceiveDraftItem[] =>
  Object.entries(qtyInputByItem)
    .map(([itemId, raw]) => {
      const normalized = String(raw ?? "")
        .replace(",", ".")
        .replace(/\s+/g, "")
        .trim();
      const qty = Number(normalized);
      return {
        itemId: normalizeWarehouseReceiveFlowText(itemId),
        qty,
        localUpdatedAt: Date.now(),
      };
    })
    .filter((item) => item.itemId && Number.isFinite(item.qty) && item.qty > 0);

export const toWarehouseReceiveQtyInputMap = (
  items: WarehouseReceiveDraftItem[],
) => Object.fromEntries(items.map((item) => [item.itemId, String(item.qty)]));

export const buildWarehouseReceiveSelection = (
  rows: WarehouseReceiveFlowRow[],
  qtyInputByItem: Record<string, string>,
): WarehouseReceiveSelection => {
  const items: WarehouseReceiveDraftItem[] = [];
  const payload: WarehouseReceiveSelectionPayloadItem[] = [];

  for (const row of rows) {
    const purchaseItemId = normalizeWarehouseReceiveFlowText(
      row.purchase_item_id,
    );
    if (!purchaseItemId) continue;

    const exp = nz(row.qty_expected, 0);
    const rec = nz(row.qty_received, 0);
    const left = Math.max(0, nz(row.qty_left, exp - rec));
    if (!left) continue;

    const raw = qtyInputByItem[purchaseItemId];
    if (raw == null || normalizeWarehouseReceiveFlowText(raw) === "") continue;

    const qty = parseQtySelected(raw, left);
    if (qty <= 0) continue;

    items.push({
      itemId: purchaseItemId,
      qty,
      localUpdatedAt: Date.now(),
    });
    payload.push({
      purchase_item_id: purchaseItemId,
      qty,
    });
  }

  return {
    items,
    payload,
  };
};

export const buildWarehouseReceiveRemoteTruth = (
  incomingId: string,
  rows: WarehouseReceiveFlowRow[],
): PlatformTerminalTruth => {
  const remainingCount = rows.reduce((sum, row) => {
    const expected = nz(row.qty_expected, 0);
    const received = nz(row.qty_received, 0);
    return sum + Math.max(0, nz(row.qty_left, expected - received));
  }, 0);
  const terminal = rows.length === 0 || remainingCount <= 0;

  return {
    kind: "warehouse_receive",
    entityId: incomingId,
    present: rows.length > 0,
    remainingCount,
    terminal,
    terminalWhenMissing: true,
    status: terminal ? "completed" : "pending",
    reason:
      rows.length === 0
        ? "not_in_receive_scope"
        : "receive_remaining_qty_zero",
  };
};
