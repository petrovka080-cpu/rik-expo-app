import type { BuyerInboxRow } from "../../lib/catalog_api";
import type { BuyerGroup, LineMeta } from "./buyer.types";
import { getBuyerItemProcurementType, getCounterpartyLabel, getCounterpartyRoleGate } from "./procurementTyping";
import { mergeNote, splitNote } from "./buyerUtils";

export function selectBuyerItemPrettyText(row: BuyerInboxRow) {
  return `${row.qty} ${row.uom || ""}`.trim();
}

export function selectBuyerItemRejectedByDirector(row: BuyerInboxRow) {
  const rejectInfo = row as Partial<{ director_reject_at: unknown; director_reject_note: unknown }>;
  return !!rejectInfo.director_reject_at || !!rejectInfo.director_reject_note;
}

export function selectBuyerCounterpartyUi(row: BuyerInboxRow) {
  const procurementType = getBuyerItemProcurementType(row);
  return {
    counterpartyLabel: getCounterpartyLabel(procurementType),
    roleGate: getCounterpartyRoleGate(procurementType),
  };
}

export function selectBuyerGroupHeaderMeta(group: BuyerGroup, requestSum: (group: BuyerGroup) => number) {
  const total = group.items.length;
  const rejectedCount = group.items.filter(selectBuyerItemRejectedByDirector).length;
  const allRejected = total > 0 && rejectedCount === total;
  const gsum = requestSum(group);
  const baseMeta = `${total} позиций${gsum ? ` • итого ${gsum.toLocaleString()} сом` : ""}`;

  return {
    gsum,
    allRejected,
    headerMeta: allRejected
      ? "ОТКЛОНЕНА"
      : rejectedCount > 0
        ? `${baseMeta} • отклонено ${rejectedCount}/${total}`
        : baseMeta,
  };
}

export function selectBuyerSupplierAutoText(match: {
  inn?: string | null;
  bank_account?: string | null;
  phone?: string | null;
  email?: string | null;
} | null) {
  if (!match) return "";

  const partsAuto: string[] = [];
  if (match.inn) partsAuto.push(`ИНН: ${match.inn}`);
  if (match.bank_account) partsAuto.push(`Счёт: ${match.bank_account}`);
  if (match.phone) partsAuto.push(`Тел.: ${match.phone}`);
  if (match.email) partsAuto.push(`Email: ${match.email}`);
  return partsAuto.join(" • ");
}

export function selectBuyerSupplierMetaPatch(currentMeta: Partial<LineMeta>, supplierName: string, supplierAutoText: string) {
  const parts = splitNote(currentMeta.note);
  const user = parts.user;
  return {
    supplier: supplierName,
    note: mergeNote(user, supplierAutoText),
  } satisfies Partial<LineMeta>;
}

export function selectBuyerSupplierSuggestions(supplierSuggestions: string[], supplierQueryDraft: string) {
  const all = Array.from(new Set((supplierSuggestions || []).map((name) => String(name || "").trim()).filter(Boolean)));
  const needle = String(supplierQueryDraft || "").trim().toLowerCase();
  if (!needle) return all;
  return all.filter((name) => String(name).toLowerCase().includes(needle));
}

export function selectBuyerMobileEditorViewModel(
  row: BuyerInboxRow,
  meta: Partial<LineMeta>,
  supplierSuggestions: string[],
  supplierQueryDraft: string
) {
  const { counterpartyLabel, roleGate } = selectBuyerCounterpartyUi(row);
  return {
    counterpartyLabel,
    roleGate,
    filteredSuppliers: selectBuyerSupplierSuggestions(supplierSuggestions, supplierQueryDraft),
    selectedSupplierLabel: String(meta.supplier ?? ""),
  };
}
