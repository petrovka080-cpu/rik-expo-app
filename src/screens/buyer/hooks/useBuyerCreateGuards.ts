import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";

import type { BuyerGroup , DraftAttachmentMap } from "../buyer.types";
import type { BuyerInboxRow } from "../../../lib/catalog_api";

import { getBuyerItemProcurementType, getCounterpartyLabel } from "../procurementTyping";
import { SUPP_NONE, normName } from "../buyerUtils";

type AlertFn = (title: string, message?: string) => void;

export function useBuyerCreateGuards(params: {
  groups: BuyerGroup[];
  picked: Record<string, boolean>;
  meta: Record<string, { price?: number | string | null; supplier?: string | null }>;
  attachments: DraftAttachmentMap;
  attachMissingCount: number;
  attachSlotsTotal: number;
  missingAttachSuppliers: string[];
  setRows: Dispatch<SetStateAction<BuyerInboxRow[]>>;
  formatRequestDisplay: (requestId: string | number | null | undefined, requestIdOld?: number | null) => string;
  alertUser: AlertFn;
}) {
  const {
    groups,
    picked,
    meta,
    attachments,
    attachMissingCount,
    attachSlotsTotal,
    missingAttachSuppliers,
    setRows,
    formatRequestDisplay,
    alertUser,
  } = params;

  const hasPositivePrice = (raw: unknown) => {
    const n = Number(String(raw ?? "").replace(",", ".").trim());
    return Number.isFinite(n) && n > 0;
  };

  const validatePicked = useCallback(() => {
    const missing: string[] = [];
    let missingSupplierCount = 0;
    let missingPriceCount = 0;
    let missingAttachmentCount = 0;
    const pickedSnapshot: {
      requestItemId: string;
      supplier: string;
      price: string;
      hasAttachment: boolean;
    }[] = [];

    for (const group of groups) {
      group.items.forEach((it, idx) => {
        const key = String(it.request_item_id || `${group.request_id}:${idx}`);
        if (!picked[key]) return;
        const itemMeta = meta[key] || {};
        const counterpartyLabel = getCounterpartyLabel(getBuyerItemProcurementType(it));
        const supplierLabel = String(itemMeta.supplier ?? "").trim();
        const supplierKey = normName(supplierLabel) || SUPP_NONE;
        pickedSnapshot.push({
          requestItemId: key,
          supplier: supplierLabel,
          price: String(itemMeta.price ?? "").trim(),
          hasAttachment: !!attachments?.[supplierKey]?.file,
        });

        if (!supplierLabel || supplierKey === (normName(SUPP_NONE) || SUPP_NONE)) {
          missingSupplierCount += 1;
          missing.push(
            `• ${formatRequestDisplay(group.request_id, group.request_id_old ?? null)}: ${it.name_human} — Не выбран ${counterpartyLabel.toLowerCase()}`,
          );
        }

        if (!hasPositivePrice(itemMeta.price)) {
          missingPriceCount += 1;
          missing.push(
            `• ${formatRequestDisplay(group.request_id, group.request_id_old ?? null)}: ${it.name_human} — Не выбрана цена поставщика`,
          );
        }

        if (supplierLabel && supplierKey !== (normName(SUPP_NONE) || SUPP_NONE) && !attachments?.[supplierKey]?.file) {
          missingAttachmentCount += 1;
          missing.push(
            `• ${formatRequestDisplay(group.request_id, group.request_id_old ?? null)}: ${it.name_human} — Не выбраны вложения (${supplierLabel})`,
          );
        }
      });
    }

    if (__DEV__) console.info("[buyer.validatePicked]", {
      pickedCount: pickedSnapshot.length,
      pickedSnapshot,
      missingSupplierCount,
      missingPriceCount,
      missingAttachmentCount,
    });

    if (missing.length) {
      alertUser(
        "Исправьте данные перед отправкой",
        [
          "Submit заблокирован.",
          missingSupplierCount > 0 ? `• Не выбран поставщик/подрядчик: ${missingSupplierCount}` : null,
          missingPriceCount > 0 ? `• Не выбрана цена поставщика: ${missingPriceCount}` : null,
          missingAttachmentCount > 0 ? `• Не выбраны вложения: ${missingAttachmentCount}` : null,
          "",
          ...missing.slice(0, 12),
          missing.length > 12 ? "…" : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      if (__DEV__) console.info("[buyer.validatePicked] blocked");
      return false;
    }
    if (__DEV__) console.info("[buyer.validatePicked] passed");
    return true;
  }, [groups, picked, meta, attachments, formatRequestDisplay, alertUser]);

  const removeFromInboxLocally = useCallback(
    (ids: string[]) => {
      setRows((prev) => prev.filter((r) => !ids.includes(String(r.request_item_id))));
    },
    [setRows],
  );

  const confirmSendWithoutAttachments = useCallback(async (): Promise<boolean> => {
    if (attachMissingCount === 0) return true;
    if (attachSlotsTotal === 0) return true;
    const list = missingAttachSuppliers.slice(0, 6).join(", ");
    Alert.alert(
      "Не выбраны вложения",
      `Заполните обязательные вложения для поставщиков:\n${list}${missingAttachSuppliers.length > 6 ? ` и ещё ${missingAttachSuppliers.length - 6}` : ""}`,
    );
    return false;
  }, [attachMissingCount, attachSlotsTotal, missingAttachSuppliers]);

  return { validatePicked, removeFromInboxLocally, confirmSendWithoutAttachments };
}
