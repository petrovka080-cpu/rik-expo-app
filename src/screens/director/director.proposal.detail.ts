import { Alert } from "react-native";
import { useCallback } from "react";
import type React from "react";
import type { ProposalAttachmentRow, ProposalItem } from "./director.types";

type Deps = {
  supabase: any;
  propAttBusyByProp: Record<string, boolean>;
  setPropAttBusyByProp: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPropAttByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalAttachmentRow[]>>>;
  setPropAttErrByProp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPropReturnId: React.Dispatch<React.SetStateAction<string | null>>;
  setItemsByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalItem[]>>>;
  setLoadedByProp: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPdfHtmlByProp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fetchProps: (force?: boolean) => Promise<void>;
  closeSheet: () => void;
};

const errText = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch {}
  }
  return "";
};

export function useDirectorProposalDetail({
  supabase,
  propAttBusyByProp,
  setPropAttBusyByProp,
  setPropAttByProp,
  setPropAttErrByProp,
  setPropReturnId,
  setItemsByProp,
  setLoadedByProp,
  setPdfHtmlByProp,
  fetchProps,
  closeSheet,
}: Deps) {
  const loadProposalAttachments = useCallback(async (pidStr: string) => {
    const pid = String(pidStr || "").trim();
    if (!pid) return;

    if (propAttBusyByProp[pid]) return;
    setPropAttBusyByProp((prev) => ({ ...prev, [pid]: true }));
    setPropAttErrByProp((prev) => ({ ...prev, [pid]: "" }));

    try {
      let raw: Array<Record<string, unknown>> = [];

      const rpc = await supabase.rpc("proposal_attachments_list", { p_proposal_id: pid });
      if (!rpc.error && Array.isArray(rpc.data)) {
        raw = rpc.data as Array<Record<string, unknown>>;
      } else {
        const q = await supabase
          .from("proposal_attachments")
          .select("id, proposal_id, file_name, url, group_key, created_at, bucket_id, storage_path")
          .eq("proposal_id", pid)
          .order("created_at", { ascending: false });

        if (q.error) throw q.error;
        raw = (q.data || []) as Array<Record<string, unknown>>;
      }

      const rows: ProposalAttachmentRow[] = [];
      const seen = new Set<string>();

      for (const r of raw) {
        const id = String(r.id ?? "").trim();
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);

        rows.push({
          id,
          proposal_id: String(r.proposal_id ?? "").trim() || pid,
          file_name: String(r.file_name ?? "").trim() || "file",
          url: (r.url as string | null | undefined) ?? null,
          group_key: (r.group_key as string | null | undefined) ?? null,
          created_at: (r.created_at as string | null | undefined) ?? null,
          bucket_id: (r.bucket_id as string | null | undefined) ?? null,
          storage_path: (r.storage_path as string | null | undefined) ?? null,
        });
      }

      setPropAttByProp((prev) => ({ ...prev, [pid]: rows }));
    } catch (e: unknown) {
      const message = errText(e) || "Не удалось загрузить вложения предложения";
      if (__DEV__) console.warn("[director] loadProposalAttachments:", message);
      setPropAttErrByProp((prev) => ({ ...prev, [pid]: message }));
      setPropAttByProp((prev) => ({ ...prev, [pid]: [] }));
    } finally {
      setPropAttBusyByProp((prev) => ({ ...prev, [pid]: false }));
    }
  }, [supabase, propAttBusyByProp, setPropAttBusyByProp, setPropAttByProp, setPropAttErrByProp]);

  const onDirectorReturn = useCallback(async (proposalId: string | number, note?: string) => {
    const pidStr = String(proposalId);

    try {
      const chk = await supabase
        .from("proposals")
        .select("sent_to_accountant_at")
        .eq("id", pidStr)
        .maybeSingle();

      if (!chk.error && chk.data?.sent_to_accountant_at) {
        Alert.alert("Нельзя вернуть", "Документ уже у бухгалтерии. Вернуть может только бухгалтер.");
        return;
      }

      setPropReturnId(pidStr);

      const q = await supabase
        .from("proposal_items")
        .select("request_item_id")
        .eq("proposal_id", pidStr);

      if (q.error) throw q.error;

      const ids = Array.from(
        new Set(
          ((q.data || []) as Array<{ request_item_id?: string | null }>)
            .map((r) => String(r.request_item_id || "").trim())
            .filter(Boolean),
        ),
      );

      if (!ids.length) {
        Alert.alert("Пусто", "В предложении нет строк для возврата.");
        return;
      }

      const comment = (note || "").trim() || "Отклонено директором";
      const payload = ids.map((rid) => ({
        request_item_id: rid,
        decision: "rejected",
        comment,
      }));

      const res = await supabase.rpc("director_decide_proposal_items", {
        p_proposal_id: pidStr,
        p_decisions: payload,
        p_finalize: true,
      });
      if (res.error) throw res.error;

      setItemsByProp((m) => { const c = { ...m }; delete c[pidStr]; return c; });
      setLoadedByProp((m) => { const c = { ...m }; delete c[pidStr]; return c; });
      setPdfHtmlByProp((m) => { const c = { ...m }; delete c[pidStr]; return c; });

      await fetchProps(true);
      closeSheet();
    } catch (e: unknown) {
      Alert.alert("Не удалось вернуть предложение", errText(e) || "Попробуйте еще раз.");
    } finally {
      setPropReturnId(null);
    }
  }, [
    supabase,
    setPropReturnId,
    setItemsByProp,
    setLoadedByProp,
    setPdfHtmlByProp,
    fetchProps,
    closeSheet,
  ]);

  return {
    loadProposalAttachments,
    onDirectorReturn,
  };
}
