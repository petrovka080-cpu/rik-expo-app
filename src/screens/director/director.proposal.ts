import type React from "react";
import { useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as XLSX from "xlsx";
import { runPdfTop } from "../../lib/pdfRunner";
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
  fetchProps: () => Promise<void>;
  fetchRows: () => Promise<void>;
  closeSheet: () => void;
  showSuccess: (msg: string) => void;
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
        Alert.alert("Ошибка", "В строке предложения нет request_item_id (в базе).");
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
        await fetchProps();
        void fetchRows();
        closeSheet();
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось отклонить позицию");
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
      await runPdfTop({
        busy,
        supabase,
        key: pdfKey,
        label: "Готовлю файл…",
        mode: "share",
        fileName: `Предложение_${pidStr}`,
        getRemoteUrl: async () => {
          const { exportProposalPdf } = await import("../../lib/rik_api");
          return await exportProposalPdf(pidStr as any, "share");
        },
      });
    } catch (e: any) {
      if (String(e?.message ?? "").toLowerCase().includes("busy")) return;
      Alert.alert("Ошибка", e?.message ?? "Не удалось отправить PDF");
    } finally {
      setTimeout(() => { pdfTapLockRef.current[pdfKey] = false; }, 450);
    }
  }, [busy, supabase, isProposalPdfBusy, pdfTapLockRef]);

  const exportProposalExcel = useCallback(async (pidStr: string, pretty: string, items: ProposalItem[], screenLocked: boolean) => {
    if (screenLocked) return;

    try {
      if (Platform.OS !== "web") {
        Alert.alert("Excel", "Excel экспорт сейчас реализован только для Web-версии.");
        return;
      }
      if (!items.length) {
        Alert.alert("Excel", "Нет строк для выгрузки.");
        return;
      }

      const safe = (v: any) => (v == null ? "" : String(v).replace(/[\r\n]+/g, " ").trim());
      const title = (pretty || `PROPOSAL-${pidStr.slice(0, 8)}`).replace(/[^\w\u0400-\u04FF0-9]/g, "_");
      const sheetName = title.slice(0, 31) || "Предложение";

      const data: any[][] = [["№", "Наименование", "Кол-во", "Ед. изм.", "Применение"]];
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
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось сформировать Excel");
    }
  }, []);

  const approveProposal = useCallback(async (pidStr: string, approveDisabled: boolean) => {
    if (approveDisabled) return;

    try {
      setPropApproveId(pidStr);

      const { error } = await supabase.rpc("director_approve_min_auto", {
        p_proposal_id: pidStr,
        p_comment: null,
      });
      if (error) throw error;

      const rInc = await supabase.rpc("ensure_purchase_and_incoming_strict", {
        p_proposal_id: pidStr,
      });
      if ((rInc as any)?.error) throw (rInc as any).error;

      try {
        const purchaseId = String((rInc as any)?.data?.purchase_id ?? "").trim();
        if (purchaseId) {
          const rW = await supabase.rpc("work_seed_from_purchase" as any, { p_purchase_id: purchaseId } as any);
          if (rW.error) console.warn("[work_seed_from_purchase] error:", rW.error.message);
        }
      } catch { }

      const { error: accErr } = await supabase.rpc("proposal_send_to_accountant_min", {
        p_proposal_id: pidStr,
        p_invoice_number: null,
        p_invoice_date: null,
        p_invoice_amount: null,
        p_invoice_currency: "KGS",
      });
      if (accErr) throw accErr;

      await fetchProps();
      void fetchRows();
      closeSheet();
      showSuccess("Утверждено → бухгалтер → склад/подрядчики");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось утвердить");
    } finally {
      setPropApproveId(null);
    }
  }, [supabase, setPropApproveId, fetchProps, fetchRows, closeSheet, showSuccess]);

  return {
    isProposalPdfBusy,
    rejectProposalItem,
    openProposalPdf,
    exportProposalExcel,
    approveProposal,
  };
}
