// src/screens/buyer/buyer.selectors.ts
import type { BuyerInboxRow } from "../../lib/catalog_api";
import type { LineMeta, DraftAttachmentMap, BuyerTab, BuyerSheetKind, BuyerGroup } from "./buyer.types";
import { selectBuyerBaseListData, selectFilteredBuyerListData } from "./buyer.list.selectors";
import { selectBuyerSheetData, type SheetHdrRow } from "./buyer.sheet.selectors";
import { SUPP_NONE, normName } from "./buyerUtils";
import { buildRfqPickedPreview } from "./buyer.helpers";

export type { BuyerTab, BuyerSheetKind, BuyerGroup } from "./buyer.types";
type BuyerInboxRowWithKeys = BuyerInboxRow & {
  request_id?: string | number | null;
  request_id_old?: number | null;
};

export function selectPickedIds(picked: Record<string, boolean>) {
  return Object.keys(picked || {}).filter((k) => !!picked[k]);
}

export function selectGroups(rows: BuyerInboxRow[]): BuyerGroup[] {
  const map = new Map<string, BuyerGroup>();
  for (const r of rows || []) {
    const row = r as BuyerInboxRowWithKeys;
    const rid = String(row.request_id ?? "");
    const ridOld = row.request_id_old ?? null;

    if (!map.has(rid)) {
      map.set(rid, { request_id: rid, request_id_old: ridOld, items: [] });
    }
    map.get(rid)!.items.push(r);
  }
  // Sort groups by request_id descending (newest first)
  return Array.from(map.values()).sort((a, b) => {
    const aid = String(a.request_id);
    const bid = String(b.request_id);
    return bid.localeCompare(aid, undefined, { numeric: true });
  });
}

export function selectRfqPickedPreview(rows: BuyerInboxRow[], pickedIds: string[]) {
  return buildRfqPickedPreview(rows || [], pickedIds || []);
}

export function selectSupplierGroups(pickedIds: string[], meta: Record<string, LineMeta>) {
  const map = new Map<string, string>(); // key: normalized, val: display

  for (const id of pickedIds || []) {
    const raw = (meta?.[id]?.supplier || "").trim();
    const key = normName(raw) || SUPP_NONE;
    const display = raw || SUPP_NONE;
    if (!map.has(key)) map.set(key, display);
  }

  const out = Array.from(map.values());
  return out.length ? out : [SUPP_NONE];
}

export function selectRequiredSuppliers(supplierGroups: string[]) {
  const noneKey = normName(SUPP_NONE) || SUPP_NONE;
  return (supplierGroups || []).filter((label) => (normName(label) || SUPP_NONE) !== noneKey);
}

export function selectMissingAttachSuppliers(
  requiredSuppliers: string[],
  attachments: DraftAttachmentMap
) {
  const miss: string[] = [];
  for (const label of requiredSuppliers || []) {
    const k = normName(label) || SUPP_NONE;
    if (!attachments?.[k]?.file) miss.push(label);
  }
  return miss;
}

export function selectAttachStats(requiredSuppliers: string[], missingAttachSuppliers: string[]) {
  const attachSlotsTotal = (requiredSuppliers || []).length;
  const attachMissingCount = (missingAttachSuppliers || []).length;
  const attachFilledCount = Math.max(0, attachSlotsTotal - attachMissingCount);

  return { attachSlotsTotal, attachMissingCount, attachFilledCount };
}

export function selectNeedAttachWarn(pickedIdsLen: number, attachSlotsTotal: number, attachMissingCount: number) {
  return pickedIdsLen > 0 && attachSlotsTotal > 0 && attachMissingCount > 0;
}

export function selectSheetData(sheetKind: BuyerSheetKind, sheetGroup: BuyerGroup | null) {
  return selectBuyerSheetData(sheetKind, sheetGroup);
}

export function selectListData(
  tab: BuyerTab,
  groups: BuyerGroup[],
  pending: any[],
  approved: any[],
  rejected: any[],
  search?: string,
  titleByPid?: Record<string, string>
) {
  const base = selectBuyerBaseListData(tab, groups, pending, approved, rejected);
  return selectFilteredBuyerListData(base, search, titleByPid);
}
