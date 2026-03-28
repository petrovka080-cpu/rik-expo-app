import { normalizeRuText } from "../text/encoding";

import type {
  CodeNameRow,
  JoinedWarehouseIssueFactRow,
  JoinedWarehouseIssueItemFactRow,
  LegacyByObjectRow,
  LegacyFastMaterialRow,
  ObjectLookupRow,
  ProposalItemPriceRow,
  PurchaseItemPriceRow,
  PurchaseItemRequestPriceRow,
  RefSystemLookupRow,
  RequestItemRequestLinkRow,
  RequestLookupRow,
  WarehouseIssueFactRow,
  WarehouseIssueItemFactRow,
} from "./director_reports.types";

const toNum = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const firstNonEmpty = (...vals: unknown[]): string => {
  for (const v of vals) {
    const s = String(normalizeRuText(String(v ?? ""))).trim();
    if (s) return s;
  }
  return "";
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeCodeNameRow = (value: unknown): CodeNameRow | null => {
  const row = asRecord(value);
  const code = row.code == null ? null : String(row.code).trim();
  if (!code) return null;
  return {
    code,
    name_human_ru: row.name_human_ru == null ? null : String(row.name_human_ru),
    display_name: row.display_name == null ? null : String(row.display_name),
    alias_ru: row.alias_ru == null ? null : String(row.alias_ru),
    name_ru: row.name_ru == null ? null : String(row.name_ru),
    name: row.name == null ? null : String(row.name),
  };
};

const normalizeRequestLookupRow = (value: unknown): RequestLookupRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    object_id: row.object_id == null ? null : String(row.object_id).trim(),
    object_name: row.object_name == null ? null : String(row.object_name),
    object_type_code: row.object_type_code == null ? null : String(row.object_type_code).trim(),
    system_code: row.system_code == null ? null : String(row.system_code).trim(),
    level_code: row.level_code == null ? null : String(row.level_code).trim(),
    zone_code: row.zone_code == null ? null : String(row.zone_code).trim(),
    object: row.object == null ? null : String(row.object),
  };
};

const normalizeRequestItemRequestLinkRow = (value: unknown): RequestItemRequestLinkRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    request_id: row.request_id == null ? null : String(row.request_id).trim(),
  };
};

const normalizeObjectLookupRow = (value: unknown): ObjectLookupRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    name: row.name == null ? null : String(row.name),
  };
};

const normalizeLegacyFastMaterialRow = (value: unknown): LegacyFastMaterialRow => {
  const row = asRecord(value);
  return {
    material_code: row.material_code == null ? null : String(row.material_code),
    material_name: row.material_name == null ? null : String(row.material_name),
    uom: row.uom == null ? null : String(row.uom),
    sum_total: row.sum_total == null ? null : (row.sum_total as number | string),
    docs_cnt: row.docs_cnt == null ? null : (row.docs_cnt as number | string),
    sum_free: row.sum_free == null ? null : (row.sum_free as number | string),
    docs_free: row.docs_free == null ? null : (row.docs_free as number | string),
    lines_cnt: row.lines_cnt == null ? null : (row.lines_cnt as number | string),
    lines_free: row.lines_free == null ? null : (row.lines_free as number | string),
  };
};

const normalizeLegacyByObjectRow = (value: unknown): LegacyByObjectRow => {
  const row = asRecord(value);
  return {
    object_id: row.object_id == null ? null : String(row.object_id),
    object_name: row.object_name == null ? null : String(row.object_name),
    work_name: row.work_name == null ? null : String(row.work_name),
    lines_cnt: row.lines_cnt == null ? null : (row.lines_cnt as number | string),
    docs_cnt: row.docs_cnt == null ? null : (row.docs_cnt as number | string),
  };
};

const normalizePurchaseItemPriceRow = (value: unknown): PurchaseItemPriceRow => {
  const row = asRecord(value);
  return {
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    code: row.code == null ? null : String(row.code),
    price: row.price == null ? null : (row.price as number | string),
    qty: row.qty == null ? null : (row.qty as number | string),
  };
};

const normalizeProposalItemPriceRow = (value: unknown): ProposalItemPriceRow => {
  const row = asRecord(value);
  return {
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    price: row.price == null ? null : (row.price as number | string),
    qty: row.qty == null ? null : (row.qty as number | string),
  };
};

const normalizePurchaseItemRequestPriceRow = (value: unknown): PurchaseItemRequestPriceRow => {
  const row = asRecord(value);
  return {
    request_item_id: row.request_item_id == null ? null : String(row.request_item_id),
    price: row.price == null ? null : (row.price as number | string),
    qty: row.qty == null ? null : (row.qty as number | string),
  };
};

const normalizeWarehouseIssueFactRow = (value: unknown): WarehouseIssueFactRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? "" : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    iss_date: row.iss_date == null ? null : String(row.iss_date),
    object_name: row.object_name == null ? null : String(row.object_name),
    work_name: row.work_name == null ? null : String(row.work_name),
    request_id: row.request_id == null ? null : String(row.request_id).trim(),
    status: row.status == null ? null : String(row.status),
    note: row.note == null ? null : String(row.note),
    target_object_id: row.target_object_id == null ? null : String(row.target_object_id).trim(),
  };
};

const normalizeWarehouseIssueItemFactRow = (value: unknown): WarehouseIssueItemFactRow | null => {
  const row = asRecord(value);
  return {
    id: row.id == null ? null : String(row.id).trim(),
    issue_id: row.issue_id == null ? null : String(row.issue_id).trim(),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    uom_id: row.uom_id == null ? null : String(row.uom_id),
    qty: row.qty == null ? null : (row.qty as number | string),
    request_item_id: row.request_item_id == null ? null : String(row.request_item_id).trim(),
  };
};

const normalizeJoinedWarehouseIssueFactRow = (value: unknown): JoinedWarehouseIssueFactRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? null : String(row.id).trim();
  return {
    id,
    iss_date: row.iss_date == null ? null : String(row.iss_date),
    object_name: row.object_name == null ? null : String(row.object_name),
    work_name: row.work_name == null ? null : String(row.work_name),
    status: row.status == null ? null : String(row.status),
    note: row.note == null ? null : String(row.note),
  };
};

const normalizeJoinedWarehouseIssueItemFactRow = (value: unknown): JoinedWarehouseIssueItemFactRow | null => {
  const row = asRecord(value);
  const item = normalizeWarehouseIssueItemFactRow(value);
  if (!item) return null;
  const nestedRaw = row.warehouse_issues;
  const warehouse_issues = Array.isArray(nestedRaw)
    ? nestedRaw
        .map(normalizeJoinedWarehouseIssueFactRow)
        .filter((nested): nested is JoinedWarehouseIssueFactRow => !!nested)
    : normalizeJoinedWarehouseIssueFactRow(nestedRaw);
  return {
    ...item,
    warehouse_issues,
  };
};

const extractJoinedWarehouseIssueFactRow = (
  item: JoinedWarehouseIssueItemFactRow,
): JoinedWarehouseIssueFactRow | null =>
  Array.isArray(item.warehouse_issues)
    ? (item.warehouse_issues[0] ?? null)
    : (item.warehouse_issues ?? null);

const normalizeRefSystemLookupRow = (value: unknown): RefSystemLookupRow | null => {
  const row = asRecord(value);
  const code = row.code == null ? "" : String(row.code).trim();
  if (!code) return null;
  return {
    code,
    name_human_ru: row.name_human_ru == null ? null : String(row.name_human_ru),
    display_name: row.display_name == null ? null : String(row.display_name),
    alias_ru: row.alias_ru == null ? null : String(row.alias_ru),
    name: row.name == null ? null : String(row.name),
  };
};

export {
  toNum,
  firstNonEmpty,
  asRecord,
  normalizeCodeNameRow,
  normalizeRequestLookupRow,
  normalizeRequestItemRequestLinkRow,
  normalizeObjectLookupRow,
  normalizeLegacyFastMaterialRow,
  normalizeLegacyByObjectRow,
  normalizePurchaseItemPriceRow,
  normalizeProposalItemPriceRow,
  normalizePurchaseItemRequestPriceRow,
  normalizeWarehouseIssueFactRow,
  normalizeWarehouseIssueItemFactRow,
  normalizeJoinedWarehouseIssueFactRow,
  normalizeJoinedWarehouseIssueItemFactRow,
  extractJoinedWarehouseIssueFactRow,
  normalizeRefSystemLookupRow,
};
