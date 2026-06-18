import { useCallback, type Dispatch, type SetStateAction } from "react";
import { Alert, Platform } from "react-native";

import type { ReqItemRow } from "../../../lib/catalog_api";
import type { ForemanAiEstimateDraftMapping } from "../../../lib/foremanAiEstimate";
import {
  aggPickedRows,
  formatQtyInput,
  parseQtyValue,
} from "../foreman.helpers";
import { reportAndSwallow } from "../../../lib/observability/catchDiscipline";
import type { PickedRow } from "../foreman.types";
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
        } catch (error) {
          reportAndSwallow({
            screen: "foreman",
            surface: "draft_actions",
            event: "web_confirm_bridge_failed",
            error,
            kind: "soft_failure",
            category: "ui",
            errorStage: "web_confirm",
            extra: {
              requestId,
            },
          });
          return false;
        }
      }
      return false;
    },
    [requestId, webUi],
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
        } catch (error) {
          reportAndSwallow({
            screen: "foreman",
            surface: "draft_actions",
            event: "web_alert_bridge_failed",
            error,
            kind: "cleanup_only",
            category: "ui",
            errorStage: "web_alert",
            extra: {
              requestId,
            },
          });
        }
      }
    },
    [requestId, webUi],
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
        } catch (error) {
          reportAndSwallow({
            screen: "foreman",
            surface: "draft_actions",
            event: "catalog_add_sync_failed",
            error,
            kind: "degraded_fallback",
            sourceKind: "local_draft_sync",
            errorStage: "commit_catalog_to_draft",
            extra: {
              requestId,
              localBeforeCount: beforeLineCount,
              localAfterCount: nextSnapshot?.items.length ?? 0,
            },
          });
          showHint("Черновик сохранен", "Позиции сохранены локально и будут синхронизированы позже.");
        }
      } catch (error) {
        alertError(error, FOREMAN_TEXT.catalogAddError);
      } finally {
        setBusy(false);
      }
    },
    [alertError, appendLocalDraftRows, ensureEditableContext, items.length, requestId, scopeNote, setBusy, showHint, syncLocalDraftNow],
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
        } catch (error) {
          reportAndSwallow({
            screen: "foreman",
            surface: "draft_actions",
            event: "qty_update_sync_failed",
            error,
            kind: "degraded_fallback",
            sourceKind: "local_draft_sync",
            errorStage: "commit_qty_change",
            extra: {
              requestId,
              itemId: String(item.id),
              localBeforeCount: beforeLineCount,
              localAfterCount: nextSnapshot?.items.length ?? 0,
            },
          });
        }
      } catch (error) {
        alertError(error, FOREMAN_TEXT.qtyUpdateError);
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
      } finally {
        setRowBusy(item.id, false);
      }
    },
    [alertError, canEditRequestItem, isDraftActive, items.length, requestId, setQtyDrafts, setRowBusy, syncLocalDraftNow, updateLocalDraftQty],
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
        } catch (error) {
          reportAndSwallow({
            screen: "foreman",
            surface: "draft_actions",
            event: "row_remove_sync_failed",
            error,
            kind: "degraded_fallback",
            sourceKind: "local_draft_sync",
            errorStage: "remove_draft_row",
            extra: {
              requestId,
              itemId: String(item.id),
              localBeforeCount: beforeLineCount,
              localAfterCount: nextSnapshot?.items.length ?? 0,
            },
          });
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
    [items.length, removeLocalDraftRow, requestId, runWebAlert, runWebConfirm, syncLocalDraftNow],
  );

  const handleAiEstimateAddToDraft = useCallback(
    async (mapping: ForemanAiEstimateDraftMapping) => {
      const prepared = mapping?.requestDraftLines ?? [];
      if (!prepared.length) return;
      if (!ensureEditableContext()) return;

      setBusy(true);
      try {
        const beforeLineCount = items.length;
        const nextSnapshot = appendLocalDraftRows(prepared);
        try {
          await syncLocalDraftNow({
            context: "handleAiEstimateAddToDraft",
            overrideSnapshot: nextSnapshot,
            mutationKind: "ai_local_add",
            localBeforeCount: beforeLineCount,
            localAfterCount: nextSnapshot?.items.length ?? 0,
          });
          showHint(
            "\u0421\u043c\u0435\u0442\u0430 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430",
            `\u0412 \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a\u0435: ${prepared.length}`,
          );
        } catch (error) {
          reportAndSwallow({
            screen: "foreman",
            surface: "draft_actions",
            event: "ai_estimate_add_sync_failed",
            error,
            kind: "degraded_fallback",
            sourceKind: "local_draft_sync",
            errorStage: "ai_estimate_add_to_draft",
            extra: {
              requestId,
              estimateId: mapping.estimateRevisionId,
              localBeforeCount: beforeLineCount,
              localAfterCount: nextSnapshot?.items.length ?? 0,
              preparedCount: prepared.length,
            },
          });
          showHint(
            "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d",
            "\u041f\u043e\u0437\u0438\u0446\u0438\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u0438 \u0431\u0443\u0434\u0443\u0442 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u044b \u043f\u043e\u0437\u0436\u0435.",
          );
        }
      } catch (error) {
        alertError(error, FOREMAN_TEXT.calcAddError);
      } finally {
        setBusy(false);
      }
    },
    [alertError, appendLocalDraftRows, ensureEditableContext, items.length, requestId, setBusy, showHint, syncLocalDraftNow],
  );

  return {
    commitCatalogToDraft,
    commitQtyChange,
    syncPendingQtyDrafts,
    submitToDirector,
    handleRemoveDraftRow,
    handleAiEstimateAddToDraft,
  };
}
