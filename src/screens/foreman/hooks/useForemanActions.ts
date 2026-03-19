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
  applySubmittedRequestState: (rid: string, submitted: any) => void;
  finalizeAfterSubmit: () => Promise<void>;
  showHint: (title: string, message: string) => void;
  setBusy: (busy: boolean) => void;
  alertError: (error: unknown, fallback: string) => void;
  appendLocalDraftRows: (rows: DraftAppendRow[]) => void;
  updateLocalDraftQty: (item: ReqItemRow, qty: number) => void;
  removeLocalDraftRow: (item: ReqItemRow) => void;
  syncLocalDraftNow: (options?: { submit?: boolean; context?: string }) => Promise<{
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
  applySubmittedRequestState,
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

        appendLocalDraftRows(prepared);
        try {
          await syncLocalDraftNow({ context: "commitCatalogToDraft" });
        } catch {
          showHint("Черновик сохранен", "Позиции сохранены локально и будут синхронизированы позже.");
        }
      } catch (error) {
        alertError(error, FOREMAN_TEXT.catalogAddError);
      } finally {
        setBusy(false);
      }
    },
    [alertError, appendLocalDraftRows, ensureEditableContext, scopeNote, setBusy, showHint, syncLocalDraftNow],
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
        updateLocalDraftQty(item, parsed);
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(parsed) }));
        try {
          await syncLocalDraftNow({ context: "commitQtyChange" });
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
    [alertError, canEditRequestItem, isDraftActive, setQtyDrafts, setRowBusy, syncLocalDraftNow, updateLocalDraftQty],
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
      const result = await syncLocalDraftNow({ submit: true, context: "submitToDirector" });
      const rid = String(
        result && typeof result === "object" && "requestId" in result ? result.requestId ?? requestId : requestId,
      ).trim();
      const submitted =
        result && typeof result === "object" && "submitted" in result ? result.submitted ?? null : null;
      if (!rid || !submitted) {
        throw new Error("Не удалось синхронизировать черновик перед отправкой.");
      }

      applySubmittedRequestState(rid, submitted);
      const submittedLabel =
        submitted && typeof submitted === "object" && "display_no" in submitted
          ? String((submitted as { display_no?: unknown }).display_no ?? rid).trim() || rid
          : rid;

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
    applySubmittedRequestState,
    ensureCanSubmitToDirector,
    finalizeAfterSubmit,
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
        removeLocalDraftRow(item);
        try {
          await syncLocalDraftNow({ context: "handleRemoveDraftRow" });
        } catch {
          // local draft already persisted
        }
      };

      if (Platform.OS === "web") {
        const ok = webUi?.confirm?.(confirmMsg) ?? false;
        if (!ok) return;
        await removeAndSync();
        webUi?.alert?.(FOREMAN_TEXT.deleteDone);
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
    [removeLocalDraftRow, syncLocalDraftNow, webUi],
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

        appendLocalDraftRows(prepared);
        try {
          await syncLocalDraftNow({ context: "handleCalcAddToRequest" });
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
    [alertError, appendLocalDraftRows, ensureEditableContext, scopeNote, setBusy, syncLocalDraftNow],
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
