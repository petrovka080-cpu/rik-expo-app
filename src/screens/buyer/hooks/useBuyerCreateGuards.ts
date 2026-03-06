import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";

import type { BuyerGroup } from "../buyer.types";
import type { BuyerInboxRow } from "../../../lib/catalog_api";

type AlertFn = (title: string, message?: string) => void;

export function useBuyerCreateGuards(params: {
  groups: BuyerGroup[];
  picked: Record<string, boolean>;
  meta: Record<string, { price?: number | string | null; supplier?: string | null }>;
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
    attachMissingCount,
    attachSlotsTotal,
    missingAttachSuppliers,
    setRows,
    formatRequestDisplay,
    alertUser,
  } = params;

  const validatePicked = useCallback(() => {
    const missing: string[] = [];
    for (const group of groups) {
      group.items.forEach((it, idx) => {
        const key = String(it.request_item_id || `${group.request_id}:${idx}`);
        if (!picked[key]) return;
        const itemMeta = meta[key] || {};
        if (!itemMeta.price || !itemMeta.supplier) {
          missing.push(`• ${formatRequestDisplay(group.request_id, group.request_id_old ?? null)}: ${it.name_human}`);
        }
      });
    }
    if (missing.length) {
      alertUser(
        "Заполните данные",
        `Укажи цену и поставщика:\n\n${missing.slice(0, 10).join("\n")}${missing.length > 10 ? "\n…" : ""}`
      );
      return false;
    }
    return true;
  }, [groups, picked, meta, formatRequestDisplay, alertUser]);

  const removeFromInboxLocally = useCallback(
    (ids: string[]) => {
      setRows((prev) => prev.filter((r) => !ids.includes(String(r.request_item_id))));
    },
    [setRows]
  );

  const confirmSendWithoutAttachments = useCallback(async (): Promise<boolean> => {
    if (attachMissingCount === 0) return true;
    if (attachSlotsTotal === 0) return true;

    const list = missingAttachSuppliers.slice(0, 3).join(", ");
    const more = missingAttachSuppliers.length > 3 ? ` и ещё ${missingAttachSuppliers.length - 3}` : "";

    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Не все вложения прикреплены",
        `Нет вложений для: ${list}${more}.\nПозиции этих поставщиков уйдут директору без вложений. Продолжить?`,
        [
          { text: "Отмена", style: "cancel", onPress: () => resolve(false) },
          { text: "Отправить без части вложений", style: "destructive", onPress: () => resolve(true) },
        ]
      );
    });
  }, [attachMissingCount, attachSlotsTotal, missingAttachSuppliers]);

  return { validatePicked, removeFromInboxLocally, confirmSendWithoutAttachments };
}
