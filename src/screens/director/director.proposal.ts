import type React from "react";
import { useCallback, useMemo, useRef } from "react";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { generateProposalPdfDocument } from "../../lib/catalog_api";
import { toProposalRequestItemIntegrityDegradedError } from "../../lib/api/proposalIntegrity";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import type { AppSupabaseClient } from "../../lib/dbContract.types";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { createModalAwarePdfOpener } from "../../lib/pdf/pdf.runner";
import { exportAoaWorkbookWeb } from "../../lib/exports/xlsxExport";
import type { ProposalItem } from "./director.types";
import { runDirectorApprovePipelineAction } from "./director.approve.boundary";

type BusyLike = { isBusy: (key: string) => boolean };
type Deps = {
  busy: BusyLike;
  supabase: AppSupabaseClient;
  pdfTapLockRef: React.MutableRefObject<Record<string, boolean>>;
  itemsByProp: Record<string, ProposalItem[]>;
  setItemsByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalItem[]>>>;
  setDecidingId: React.Dispatch<React.SetStateAction<string | null>>;
  setActingPropItemId: React.Dispatch<React.SetStateAction<number | null>>;
  setPropApproveId: React.Dispatch<React.SetStateAction<string | null>>;
  fetchProps: (force?: boolean) => Promise<void>;
  fetchRows: (force?: boolean) => Promise<void>;
  closeSheet: () => void;
  showSuccess: (msg: string) => void;
};

export const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const row = asRecord(error);
  if (row) {
    const message = pickTrimmedString(row.message);
    if (message) return message;

    const details = pickTrimmedString(row.details);
    const hint = pickTrimmedString(row.hint);
    const code = pickTrimmedString(row.code);
    const parts = [code, details, hint].filter(Boolean);
    if (parts.length > 0) return parts.join(": ");
  }
  return String(error ?? "");
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const pickTrimmedString = (value: unknown): string => String(value ?? "").trim();

const pickMaybeId = (value: unknown, key = "id"): string | null => {
  const row = asRecord(value);
  return row ? pickTrimmedString(row[key]) || null : null;
};

const hasSentToAccountant = (value: unknown): boolean => {
  const row = asRecord(value);
  return !!pickTrimmedString(row?.sent_to_accountant_at);
};

export function useDirectorProposalActions({
  busy,
  supabase,
  pdfTapLockRef,
  itemsByProp,
  setItemsByProp,
  setDecidingId,
  setActingPropItemId,
  setPropApproveId,
  fetchProps,
  fetchRows,
  closeSheet,
  showSuccess,
}: Deps) {
  const router = useRouter();
  // D-MODAL-PDF: Stabilize the opener — avoid recreating on every render.
  const pdfOpener = useMemo(() => createModalAwarePdfOpener(closeSheet), [closeSheet]);
  const approveInFlightRef = useRef<Record<string, boolean>>({});
  const recordDirectorProposalCatch = (
    kind: "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback",
    event: string,
    error: unknown,
    extra?: Record<string, unknown>,
  ) => {
    recordCatchDiscipline({
      screen: "director",
      surface: "proposal_actions",
      event,
      kind,
      error,
      category: "ui",
      sourceKind: "proposal:director_actions",
      errorStage: event,
      extra,
    });
  };

  const _proposalSentToAccountant = useCallback(async (proposalId: string): Promise<boolean> => {
    const plans = [
      "sent_to_accountant_at,status",
      "sent_to_accountant_at",
      "status",
      "id",
    ];
    for (const cols of plans) {
      try {
        const q = await supabase
          .from("proposals")
          .select(cols)
          .eq("id", proposalId)
          .maybeSingle();
        if (q.error) continue;
        if (hasSentToAccountant(q.data)) return true;
      } catch (error) {
        recordDirectorProposalCatch("soft_failure", "proposal_sent_to_accountant_probe_failed", error, {
          proposalId,
          columns: cols,
        });
      }
    }
    return false;
  }, [supabase]);

  const _getPurchaseIdByProposal = useCallback(async (proposalId: string): Promise<string | null> => {
    try {
      const q = await supabase
        .from("purchases")
        .select("id")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (q.error) return null;
      return pickMaybeId(q.data);
    } catch (error) {
      recordDirectorProposalCatch("degraded_fallback", "proposal_purchase_lookup_failed", error, {
        proposalId,
      });
      return null;
    }
  }, [supabase]);

  const _hasIncomingByPurchase = useCallback(async (purchaseId: string): Promise<boolean> => {
    try {
      const q = await supabase
        .from("wh_incoming")
        .select("id")
        .eq("purchase_id", purchaseId)
        .limit(1);
      if (q.error) return false;
      return Array.isArray(q.data) && q.data.length > 0;
    } catch (error) {
      recordDirectorProposalCatch("degraded_fallback", "proposal_incoming_lookup_failed", error, {
        purchaseId,
      });
      return false;
    }
  }, [supabase]);

  const refreshDirectorApprovalViews = useCallback(async () => {
    const propsRefresh = fetchProps(true);
    const rowsRefresh = fetchRows(true);
    await propsRefresh;
    void rowsRefresh;
  }, [fetchProps, fetchRows]);

  const isProposalPdfBusy = useCallback((pidStr: string) => {
    const pid = String(pidStr || "").trim();
    return pid ? busy.isBusy(`pdfshare:prop:${pid}`) : false;
  }, [busy]);

  const rejectProposalItem = useCallback(async (pidStr: string, it: ProposalItem, items: ProposalItem[]) => {
    let requestItemIdForError: string | null = null;
    try {
      setDecidingId(pidStr);
      setActingPropItemId(Number(it.id));

      const q = await supabase
        .from("proposal_items")
        .select("request_item_id")
        .eq("proposal_id", pidStr)
        .eq("id", it.id)
        .maybeSingle();
      if (q.error) throw q.error;

      const rid = String(q.data?.request_item_id || "").trim();
      requestItemIdForError = rid || null;
      if (!rid) {
        Alert.alert("Данные не найдены", "В строке предложения отсутствует request_item_id.");
        return;
      }

      const beforeCount = (itemsByProp[pidStr] || items || []).length;
      const isLast = beforeCount <= 1;
      const payload = [{ request_item_id: rid, decision: "rejected", comment: "Отклонено директором" }];

      const res = await supabase.rpc("director_decide_proposal_items", {
        p_proposal_id: pidStr,
        p_decisions: payload,
        p_finalize: isLast,
      });
      if (res.error) throw res.error;

      setItemsByProp((prev) => {
        const before = prev[pidStr] || [];
        const nextItems = before.filter((x) => Number(x.id) !== Number(it.id));
        return { ...prev, [pidStr]: nextItems };
      });

      if (isLast) {
        await fetchProps(true);
        void fetchRows(true);
        closeSheet();
      }
    } catch (e: unknown) {
      recordDirectorProposalCatch("critical_fail", "proposal_item_reject_failed", e, {
        proposalId: pidStr,
        requestItemId: requestItemIdForError,
      });
      Alert.alert("Не удалось отклонить позицию", errText(e) || "Попробуйте еще раз.");
    } finally {
      setActingPropItemId(null);
      setDecidingId(null);
    }
  }, [supabase, itemsByProp, setItemsByProp, fetchProps, fetchRows, closeSheet, setActingPropItemId, setDecidingId]);

  const openProposalPdf = useCallback(async (pidStr: string, screenLocked: boolean) => {
    const pdfKey = `pdfshare:prop:${pidStr}`;
    const pdfBusy = isProposalPdfBusy(pidStr);
    if (pdfBusy || screenLocked) return;
    if (pdfTapLockRef.current[pdfKey]) return;
    pdfTapLockRef.current[pdfKey] = true;

    try {
      const template = await generateProposalPdfDocument(pidStr, "director");
      const title = `Предложение ${pidStr.slice(0, 8)}`;
      await pdfOpener.prepareAndPreview({
        busy,
        supabase,
        key: pdfKey,
        label: "Открываю PDF…",
        descriptor: {
          ...template,
          title,
          fileName: buildPdfFileName({
            documentType: "proposal",
            title,
            entityId: pidStr,
          }),
        },
        router,
      });
    } catch (e: unknown) {
      if (String(errText(e) || "").toLowerCase().includes("busy")) {
        recordDirectorProposalCatch("soft_failure", "proposal_pdf_open_busy", e, {
          proposalId: pidStr,
        });
        return;
      }
      recordDirectorProposalCatch("critical_fail", "proposal_pdf_open_failed", e, {
        proposalId: pidStr,
      });
      Alert.alert("Не удалось открыть PDF", errText(e) || "Попробуйте еще раз.");
    } finally {
      delete pdfTapLockRef.current[pdfKey];
    }
  }, [busy, supabase, isProposalPdfBusy, pdfTapLockRef, router, pdfOpener]);

  const exportProposalExcel = useCallback(async (pidStr: string, pretty: string, items: ProposalItem[], screenLocked: boolean) => {
    if (screenLocked) return;

    try {
      if (Platform.OS !== "web") {
        Alert.alert("Excel", "Экспорт Excel сейчас доступен только в web-версии.");
        return;
      }
      if (!items.length) {
        Alert.alert("Excel", "Нет строк для выгрузки.");
        return;
      }

      const safe = (v: unknown) => (v == null ? "" : String(v).replace(/[\r\n]+/g, " ").trim());
      const title = (pretty || `PROPOSAL-${pidStr.slice(0, 8)}`).replace(/[^\w\u0400-\u04FF0-9]/g, "_");
      const sheetName = title.slice(0, 31) || "Предложение";

      const data: (string | number)[][] = [["№", "Наименование", "Кол-во", "Ед. изм.", "Применение"]];
      items.forEach((it, idx) =>
        data.push([idx + 1, safe(it.name_human), safe(it.total_qty), safe(it.uom), safe(it.app_code)])
      );

      await exportAoaWorkbookWeb({
        data,
        sheetName,
        downloadName: `${sheetName}.xlsx`,
      });
    } catch (e: unknown) {
      recordDirectorProposalCatch("critical_fail", "proposal_excel_export_failed", e, {
        proposalId: pidStr,
        itemCount: items.length,
      });
      Alert.alert("Не удалось сформировать Excel", errText(e) || "Попробуйте еще раз.");
    }
  }, []);

  const approveProposal = useCallback(async (pidStr: string, approveDisabled: boolean) => {
    if (approveDisabled) return;
    const pid = String(pidStr ?? "").trim();
    if (!pid) return;

    if (approveInFlightRef.current[pid]) {
      if (__DEV__) console.warn(`[director.approve] duplicate approve suppressed (in-flight): ${pid}`);
      return;
    }

    const clientMutationId = `dap_${pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      approveInFlightRef.current[pid] = true;
      setPropApproveId(pid);

      recordDirectorProposalCatch("cleanup_only", "director_pipeline_start", null, {
        proposalId: pid,
        clientMutationId,
      });

      const result = await runDirectorApprovePipelineAction({
        supabase,
        proposalId: pid,
        clientMutationId,
      });
      const workSeedOk = result.workSeedOk;
      const workSeedError = result.workSeedError;
      const idempotentReplay = result.idempotentReplay;

      recordDirectorProposalCatch("cleanup_only", "director_pipeline_success", null, {
        proposalId: pid,
        clientMutationId,
        purchaseId: result.purchaseId,
        workSeedOk,
        idempotentReplay,
        sentToAccountantAt: result.serverTruth.sentToAccountantAt,
      });

      await refreshDirectorApprovalViews();

      if (!workSeedOk && workSeedError) {
        Alert.alert(
          "Утверждено с предупреждением",
          `Предложение утверждено и отправлено дальше, но подготовка работ не завершилась: ${workSeedError}`,
        );
      } else {
        closeSheet();
        showSuccess("Утверждено -> бухгалтер -> склад/подрядчики");
      }
    } catch (e: unknown) {
      const normalizedError = toProposalRequestItemIntegrityDegradedError(e) ?? e;
      recordDirectorProposalCatch("critical_fail", "proposal_approve_failed", normalizedError, {
        proposalId: pid,
        clientMutationId,
      });
      Alert.alert("Не удалось утвердить", errText(normalizedError) || "Попробуйте еще раз.");
    } finally {
      delete approveInFlightRef.current[pid];
      setPropApproveId(null);
    }
  }, [
    supabase,
    setPropApproveId,
    closeSheet,
    showSuccess,
    refreshDirectorApprovalViews,
  ]);

  return {
    isProposalPdfBusy,
    rejectProposalItem,
    openProposalPdf,
    exportProposalExcel,
    approveProposal,
  };
}
