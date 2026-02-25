// src/screens/warehouse/warehouse.types.ts

export type IncomingRow = {
  incoming_id: string;
  purchase_id: string;
  incoming_status: string;
  po_no: string | null;
  purchase_status: string | null;
  purchase_created_at: string | null;
  confirmed_at: string | null;
  qty_expected_sum: number;
  qty_received_sum: number;
  qty_left_sum: number;
  items_cnt: number;
  pending_cnt: number;
  partial_cnt: number;
};

export type ItemRow = {
  incoming_item_id: string | null;
  purchase_item_id: string;
  code: string | null;
  name: string;
  uom: string | null;
  qty_expected: number;
  qty_received: number;
  sort_key: number;
};

export type StockRow = {
  material_id: string;
  code: string | null;
  name: string | null;
  uom_id: string | null;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  updated_at: string | null;
  object_name?: string | null;
  warehouse_name?: string | null;
};

export type ReqHeadRow = {
  request_id: string;
  display_no: string | null;

  // ✅ как у директора (объект может быть null, пока requests.object_id не пишется)
  object_name: string | null;

  // ✅ коды
  level_code: string | null;
  system_code: string | null;
  zone_code: string | null;

  // ✅ человеко-читабельные названия (из ref_levels/ref_systems/ref_zones)
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;

  submitted_at: string | null;

  items_cnt: number;
  ready_cnt: number;
  done_cnt: number;

  qty_limit_sum: number;
  qty_issued_sum: number;
  qty_left_sum: number;

  issue_status: "READY" | "WAITING_STOCK" | "PARTIAL" | "DONE" | string;
};

export type ReqItemUiRow = {
  request_id: string;
  request_item_id: string;

  display_no: string | null;

  // ✅ объект (может быть null)
  object_name: string | null;

  // ✅ коды
  level_code: string | null;
  system_code: string | null;
  zone_code: string | null;

  // ✅ человеко-читабельные названия (из ref_levels/ref_systems/ref_zones)
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;

  rik_code: string;
  name_human: string;
  uom: string | null;

  qty_limit: number;
  qty_issued: number;
  qty_left: number;

  qty_available: number;
  qty_can_issue_now: number;
};

export type ReqPickLine = {
  request_item_id: string;
  rik_code: string;
  name_human: string;
  uom: string | null;
  qty: number;
};

export type Option = { id: string; label: string };

export type Tab = "К приходу" | "Склад факт" | "Расход" | "Отчёты";

export type StockPickLine = {
  pick_key: string;
  code: string;
  name: string;
  uom_id: string | null; // текстовый uom
  qty: number;
};
