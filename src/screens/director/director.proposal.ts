import type React from "react";
import { useCallback, useRef } from "react";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as XLSX from "xlsx";
import { generateProposalPdfDocument } from "../../lib/catalog_api";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import type { ProposalItem } from "./director.types";

type BusyLike = { isBusy: (key: string) => boolean };

type Deps = {
  busy: BusyLike;
  supabase: any;
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

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
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
  const approveInFlightRef = useRef<Record<string, boolean>>({});
  const approveDoneAtRef = useRef<Record<string, number>>({});
  const APPROVE_DONE_COOLDOWN_MS = 15_000;

  const proposalSentToAccountant = useCallback(async (proposalId: string): Promise<boolean> => {
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
        const row = q.data as any;
        const sentAt = String(row?.sent_to_accountant_at ?? "").trim();
        if (sentAt) return true;
      } catch {}
    }
    return false;
  }, [supabase]);

  const getPurchaseIdByProposal = useCallback(async (proposalId: string): Promise<string | null> => {
    try {
      const q = await supabase
        .from("purchases")
        .select("id")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (q.error) return null;
      const id = String((q.data as any)?.id ?? "").trim();
      return id || null;
    } catch {
      return null;
    }
  }, [supabase]);

  const hasIncomingByPurchase = useCallback(async (purchaseId: string): Promise<boolean> => {
    try {
      const q = await supabase
        .from("wh_incoming")
        .select("id")
        .eq("purchase_id", purchaseId)
        .limit(1);
      if (q.error) return false;
      return Array.isArray(q.data) && q.data.length > 0;
    } catch {
      return false;
    }
  }, [supabase]);

  const isProposalPdfBusy = useCallback((pidStr: string) => {
    const pid = String(pidStr || "").trim();
    return pid ? busy.isBusy(`pdfshare:prop:${pid}`) : false;
  }, [busy]);

  const rejectProposalItem = useCallback(async (pidStr: string, it: ProposalItem, items: ProposalItem[]) => {
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
      const doc = await preparePdfDocument({
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
        getRemoteUrl: () => template.uri,
      });
      await previewPdfDocument(doc, { router });
    } catch (e: unknown) {
      if (String(errText(e) || "").toLowerCase().includes("busy")) return;
      Alert.alert("Не удалось открыть PDF", errText(e) || "Попробуйте еще раз.");
    } finally {
      setTimeout(() => { pdfTapLockRef.current[pdfKey] = false; }, 450);
    }
  }, [busy, supabase, isProposalPdfBusy, pdfTapLockRef, router]);

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

      const data: Array<Array<string | number>> = [["№", "Наименование", "Кол-во", "Ед. изм.", "Применение"]];
      items.forEach((it, idx) =>
        data.push([idx + 1, safe(it.name_human), safe(it.total_qty), safe(it.uom), safe(it.app_code)])
      );

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sheetName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
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

    const doneAt = approveDoneAtRef.current[pid] ?? 0;
    if (doneAt > 0 && Date.now() - doneAt < APPROVE_DONE_COOLDOWN_MS) {
      if (__DEV__) console.warn(`[director.approve] duplicate approve suppressed (cooldown): ${pid}`);
      return;
    }

    try {
      approveInFlightRef.current[pid] = true;
      setPropApproveId(pid);

      const [alreadySent, existingPurchaseId] = await Promise.all([
        proposalSentToAccountant(pid),
        getPurchaseIdByProposal(pid),
      ]);
      const hasIncoming = existingPurchaseId
        ? await hasIncomingByPurchase(existingPurchaseId)
        : false;

      if (!alreadySent) {
        const { error } = await supabase.rpc("director_approve_min_auto", {
          p_proposal_id: pid,
          p_comment: null,
        });
        if (error) throw error;
      }

      let ensuredPurchaseId: string | null = existingPurchaseId ?? null;
      if (!existingPurchaseId || !hasIncoming) {
        const rInc = await supabase.rpc("ensure_purchase_and_incoming_strict", {
          p_proposal_id: pid,
        });
        if (rInc?.error) throw rInc.error;
        const rpcPurchaseId = String(((rInc?.data as { purchase_id?: string | number | null } | null)?.purchase_id ?? "")).trim();
        ensuredPurchaseId = rpcPurchaseId || ensuredPurchaseId;
      }

      try {
        if (ensuredPurchaseId) {
          const rW = await supabase.rpc("work_seed_from_purchase", { p_purchase_id: ensuredPurchaseId });
          if (__DEV__ && rW.error) console.warn("[work_seed_from_purchase] error:", rW.error.message);
        }
      } catch { }

      if (!alreadySent) {
        const { error: accErr } = await supabase.rpc("proposal_send_to_accountant_min", {
          p_proposal_id: pid,
          p_invoice_number: null,
          p_invoice_date: null,
          p_invoice_amount: null,
          p_invoice_currency: "KGS",
        });
        if (accErr) throw accErr;
      }

      await fetchProps(true);
      void fetchRows(true);
      closeSheet();
      approveDoneAtRef.current[pid] = Date.now();
      showSuccess("Утверждено -> бухгалтер -> склад/подрядчики");
    } catch (e: unknown) {
      Alert.alert("Не удалось утвердить", errText(e) || "Попробуйте еще раз.");
    } finally {
      delete approveInFlightRef.current[pid];
      setPropApproveId(null);
    }
  }, [
    supabase,
    setPropApproveId,
    fetchProps,
    fetchRows,
    closeSheet,
    showSuccess,
    proposalSentToAccountant,
    getPurchaseIdByProposal,
    hasIncomingByPurchase,
  ]);

  return {
    isProposalPdfBusy,
    rejectProposalItem,
    openProposalPdf,
    exportProposalExcel,
    approveProposal,
  };
}
