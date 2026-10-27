import type { TextStyle } from "react-native";
import type { IncomingRow, ReqHeadRow, StockRow } from "./warehouse.types";

export function selectWarehouseEmptyTextStyle(emptyColor: string): TextStyle {
  return {
    color: emptyColor,
    paddingHorizontal: 16,
    fontWeight: "800",
  };
}

export function selectWarehouseIncomingKey(row: IncomingRow): string {
  return String(row.incoming_id || `${row.purchase_id || ""}:${row.po_no || ""}:${row.purchase_created_at || ""}`);
}

export function selectWarehouseReqHeadKey(row: ReqHeadRow): string {
  return String(row.request_id || row.display_no || "");
}

export function selectWarehouseStockKey(row: StockRow): string {
  return String(row.material_id || `${row.code || ""}:${row.uom_id || ""}`);
}
