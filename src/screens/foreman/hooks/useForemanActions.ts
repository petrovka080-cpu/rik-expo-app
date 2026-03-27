import { useCallback, type Dispatch, type SetStateAction } from "react";
import { Alert, Platform } from "react-native";

import type { ReqItemRow } from "../../../lib/catalog_api";
import {
  aggCalcRows,
  aggPickedRows,
  formatQtyInput,
  parseQtyValue,
} from "../foreman.helpers";
import type { CalcRow, PickedRow } from "../foreman.types";
import { FOREMAN_TEXT } from "../foreman.ui";
import type { ForemanLocalDraftSnapshot } from "../foreman.localDraft";

type DraftAppendRow = {
  rik_code: string;
  qty: number;
  errorLabel: string;
  meta: {
    note?: string | null;
    app_code?: string | null;
    kind?: string | null;
    name_human?: string | null;
    uom?: string | null;
  };
};

type UseForemanActionsProps = {
  requestId: string;
  scopeNote: string;
  isDraftActive: boolean;
  canEditRequestItem: (item: ReqItemRow) => boolean;
  setQtyDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setRowBusy: (id: string | number, busy: boolean) => void;
  items: ReqItemRow[];
  qtyDrafts: Record<string, string>;
  ensureEditableContext: (opts?: { draftFirst?: boolean; draftMessage?: string }) => boolean;
  ensureCanSubmitToDirector: () => boolean;
  finalizeAfterSubmit: () => Promise<void>;
  showHint: (title: string, message: string) => void;
  setBusy: (busy: boolean) => void;
  alertError: (error: unknown, fallback: string) => void;
  appendLocalDraftRows: (rows: DraftAppendRow[]) => ForemanLocalDraftSnapshot | null;
  updateLocalDraftQty: (item: ReqItemRow, qty: number) => ForemanLocalDraftSnapshot | null;
  removeLocalDraftRow: (item: ReqItemRow) => ForemanLocalDraftSnapshot | null;
  syncLocalDraftNow: (options?: {
    submit?: boolean;
    context?: string;
    overrideSnapshot?: ForemanLocalDraftSnapshot | null;
    mutationKind?:
      | "catalog_add"
      | "calc_add"
      | "ai_local_add"
      | "qty_update"
      | "row_remove"
      | "whole_cancel"
      | "submit"
      | "background_sync";
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }) => Promise<{
    requestId?: string | null;
    submitted?: unknown | null;
  } | void>;
  webUi?: {
    alert?: (message?: string) => void;
    confirm?: (message?: string) => boolean;
  };
};

export function useForemanActions({
  requestId,
  scopeNote,
  isDraftActive,
  canEditRequestItem,
  setQtyDrafts,
  setRowBusy,
  items,
  qtyDrafts,
  ensureEditableContext,
  ensureCanSubmitToDirector,
  finalizeAfterSubmit,
  showHint,
  setBusy,
  alertError,
  appendLocalDraftRows,
  updateLocalDraftQty,
  removeLocalDraftRow,
  syncLocalDraftNow,
  webUi,
}: UseForemanActionsProps) {
  const runWebConfirm = useCallback(
    (message: string) => {
      if (Platform.OS !== "web") return false;
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        return window.confirm(message);
      }
      const confirmFn = webUi?.confirm;
      if (typeof confirmFn === "function") {
        try {
          return confirmFn.call(globalThis, message);
        } catch {
          return false;
        }
      }
      return false;
    },
    [webUi],
  );

  const runWebAlert = useCallback(
    (message: string) => {
      if (Platform.OS !== "web") return;
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(message);
        return;
      }
      const alertFn = webUi?.alert;
      if (typeof alertFn === "function") {
        try {
          alertFn.call(globalThis, message);
        } catch {
          // ignore broken browser bridge alerts
        }
      }
    },
    [webUi],
  );

  const commitCatalogToDraft = useCallback(
    async (rows: PickedRow[]) => {
      if (!rows?.length) return;
      if (!ensureEditableContext()) return;

      setBusy(true);
      try {
        const aggregated = aggPickedRows(rows);
        const prepared: DraftAppendRow[] = aggregated.map((entry) => ({
          rik_code: entry.base.rik_code,
          qty: entry.qty,
          errorLabel: entry.base.name,
          meta: {
            note: scopeNote,
            app_code: entry.base.app_code ?? null,
            kind: entry.base.kind ?? null,
            name_human: entry.base.name,
            uom: entry.base.uom ?? null,
          },
        }));

        const beforeLineCount = items.length;
        const nextSnapshot = appendLocalDraftRows(prepared);
        try {
          await syncLocalDraftNow({
            context: "commitCatalogToDraft",
            overrideSnapshot: nextSnapshot,
            mutationKind: "catalog_add",
            localBeforeCount: beforeLineCount,
            localAfterCount: nextSnapshot?.items.length ?? 0,
          });
        } catch {
          showHint("Черновик сохранен", "Позиции сохранены локально и будут синхронизированы позже.");
        }
      } catch (error) {
        alertError(error, FOREMAN_TEXT.catalogAddError);
      } finally {
        setBusy(false);
      }
    },
    [alertError, appendLocalDraftRows, ensureEditableContext, items.length, scopeNote, setBusy, showHint, syncLocalDraftNow],
  );

  const commitQtyChange = useCallback(
    async (item: ReqItemRow, draftValue: string) => {
      const key = String(item.id);
      if (!isDraftActive || !canEditRequestItem(item)) {
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
        return;
      }

      const parsed = parseQtyValue(draftValue);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert(FOREMAN_TEXT.qtyTitle, FOREMAN_TEXT.qtyPositiveHint);
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
        return;
      }

      const original = Number(item.qty ?? 0);
      if (Math.abs(parsed - original) < 1e-9) {
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
        return;
      }

      setRowBusy(item.id, true);
      try {
        const beforeLineCount = items.length;
        const nextSnapshot = updateLocalDraftQty(item, parsed);
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(parsed) }));
        try {
          await syncLocalDraftNow({
            context: "commitQtyChange",
            overrideSnapshot: nextSnapshot,
            mutationKind: "qty_update",
            localBeforeCount: beforeLineCount,
            localAfterCount: nextSnapshot?.items.length ?? 0,
          });
        } catch {
          // local draft already persisted
        }
      } catch (error) {
        alertError(error, FOREMAN_TEXT.qtyUpdateError);
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
      } finally {
        setRowBusy(item.id, false);
      }
    },
    [alertError, canEditRequestItem, isDraftActive, items.length, setQtyDrafts, setRowBusy, syncLocalDraftNow, updateLocalDraftQty],
  );

  const syncPendingQtyDrafts = useCallback(async () => {
    for (const item of items) {
      if (!canEditRequestItem(item)) continue;
      const key = String(item.id);
      const draftVal = qtyDrafts[key];
      const currentFormatted = formatQtyInput(item.qty);
      if (typeof draftVal === "string" && draftVal.trim() !== "" && draftVal.trim() !== currentFormatted) {
        await commitQtyChange(item, draftVal);
      }
    }
  }, [canEditRequestItem, commitQtyChange, items, qtyDrafts]);

  const submitToDirector = useCallback(async () => {
    if (!ensureCanSubmitToDirector()) return;

    setBusy(true);
    try {
      await syncPendingQtyDrafts();
      const result = await syncLocalDraftNow({
        submit: true,
        context: "submitToDirector",
        mutationKind: "submit",
        localBeforeCount: items.length,
        localAfterCount: items.length,
      });
      const rid = String(
        result && typeof result === "object" && "requestId" in result ? result.requestId ?? requestId : requestId,
      ).trim();
      const submitted =
        result && typeof result === "object" && "submitted" in result
          ? (result.submitted as { display_no?: unknown } | null | undefined) ?? null
          : null;
      if (!rid || !submitted) {
        throw new Error("Не удалось синхронизировать черновик перед отправкой.");
      }

      const submittedLabel = String(submitted.display_no ?? rid).trim() || rid;

      showHint(
        FOREMAN_TEXT.submitSentTitle,
        `Заявка ${submittedLabel} отправлена на утверждение`,
      );
      await finalizeAfterSubmit();
    } catch (error) {
      alertError(error, FOREMAN_TEXT.submitError);
    } finally {
      setBusy(false);
    }
  }, [
    alertError,
    ensureCanSubmitToDirector,
    finalizeAfterSubmit,
    items.length,
    requestId,
    setBusy,
    showHint,
    syncLocalDraftNow,
    syncPendingQtyDrafts,
  ]);

  const handleRemoveDraftRow = useCallback(
    async (item: ReqItemRow) => {
      const confirmMsg = `${FOREMAN_TEXT.deleteConfirmTitle}\n\n${item.name_human || FOREMAN_TEXT.deleteConfirmFallback}`;
      const removeAndSync = async () => {
        const beforeLineCount = items.length;
        const nextSnapshot = removeLocalDraftRow(item);
        try {
          await syncLocalDraftNow({
            context: "handleRemoveDraftRow",
            overrideSnapshot: nextSnapshot,
            mutationKind: "row_remove",
            localBeforeCount: beforeLineCount,
            localAfterCount: nextSnapshot?.items.length ?? 0,
          });
        } catch {
          // local draft already persisted
        }
      };

      if (Platform.OS === "web") {
        const ok = runWebConfirm(confirmMsg);
        if (!ok) return;
        await removeAndSync();
        runWebAlert(FOREMAN_TEXT.deleteDone);
        return;
      }

      Alert.alert(FOREMAN_TEXT.deleteConfirmTitle, item.name_human || FOREMAN_TEXT.deleteConfirmFallback, [
        { text: "Нет", style: "cancel" },
        {
          text: "Отменить",
          style: "destructive",
          onPress: () => void removeAndSync(),
        },
      ]);
    },
    [items.length, removeLocalDraftRow, runWebAlert, runWebConfirm, syncLocalDraftNow],
  );

  const handleCalcAddToRequest = useCallback(
    async (rows: CalcRow[]) => {
      if (!rows?.length) return;
      if (!ensureEditableContext()) return;

      setBusy(true);
      try {
        const aggregated = aggCalcRows(rows);
        const prepared: DraftAppendRow[] = aggregated.map((row) => {
          const displayName = row.item_name_ru ?? row.name_human ?? row.name_ru ?? row.name ?? "—";
          return {
            rik_code: row.rik_code,
            qty: row.qty,
            errorLabel: displayName,
            meta: {
              note: scopeNote,
              app_code: null,
              kind: null,
              name_human: displayName,
              uom: row.uom_code ?? null,
            },
          };
        });

        const beforeLineCount = items.length;
        const nextSnapshot = appendLocalDraftRows(prepared);
        try {
          await syncLocalDraftNow({
            context: "handleCalcAddToRequest",
            overrideSnapshot: nextSnapshot,
            mutationKind: "calc_add",
            localBeforeCount: beforeLineCount,
            localAfterCount: nextSnapshot?.items.length ?? 0,
          });
          Alert.alert("Готово", `Добавлено позиций: ${prepared.length}`);
        } catch {
          Alert.alert("Черновик сохранен", "Позиции сохранены локально и будут синхронизированы позже.");
        }
      } catch (error) {
        alertError(error, FOREMAN_TEXT.calcAddError);
      } finally {
        setBusy(false);
      }
    },
    [alertError, appendLocalDraftRows, ensureEditableContext, items.length, scopeNote, setBusy, syncLocalDraftNow],
  );

  return {
    commitCatalogToDraft,
    commitQtyChange,
    syncPendingQtyDrafts,
    submitToDirector,
    handleRemoveDraftRow,
    handleCalcAddToRequest,
  };
}
