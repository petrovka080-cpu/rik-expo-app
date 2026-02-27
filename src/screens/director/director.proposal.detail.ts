import { Alert } from "react-native";
import { useCallback } from "react";
import type React from "react";
import type { ProposalAttachmentRow, ProposalItem } from "./director.types";

type Deps = {
  supabase: any;
  propAttBusyByProp: Record<string, boolean>;
  setPropAttBusyByProp: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPropAttByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalAttachmentRow[]>>>;
  setPropReturnId: React.Dispatch<React.SetStateAction<string | null>>;
  setItemsByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalItem[]>>>;
  setLoadedByProp: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPdfHtmlByProp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fetchProps: () => Promise<void>;
  closeSheet: () => void;
};

export function useDirectorProposalDetail({
  supabase,
  propAttBusyByProp,
  setPropAttBusyByProp,
  setPropAttByProp,
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

    try {
      const q = await supabase
        .from("proposal_attachments")
        .select("id, file_name, url, group_key, created_at, bucket_id, storage_path")
        .eq("proposal_id", pid)
        .order("created_at", { ascending: false });

      if (q.error) throw q.error;

      const raw = (q.data || []) as any[];
      const rows: ProposalAttachmentRow[] = [];
      const seen = new Set<string>();

      for (const r of raw) {
        const id = String(r?.id ?? "").trim();
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);

        let url = (r.url ?? null) as string | null;

        if (!url) {
          const bucket = String(r.bucket_id ?? "").trim();
          const path = String(r.storage_path ?? "").trim();
          if (bucket && path) {
            try {
              const s = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
              if (!s.error && s.data?.signedUrl) url = s.data.signedUrl;
            } catch { }
          }
        }

        rows.push({
          id,
          file_name: String(r?.file_name ?? "").trim() || "file",
          url,
          group_key: r?.group_key ?? null,
          created_at: r?.created_at ?? null,
          bucket_id: r?.bucket_id ?? null,
          storage_path: r?.storage_path ?? null,
        });
      }

      setPropAttByProp((prev) => ({ ...prev, [pid]: rows }));
    } catch (e: any) {
      console.warn("[director] loadProposalAttachments:", e?.message ?? e);
      setPropAttByProp((prev) => ({ ...prev, [pid]: [] }));
    } finally {
      setPropAttBusyByProp((prev) => ({ ...prev, [pid]: false }));
    }
  }, [supabase, propAttBusyByProp, setPropAttBusyByProp, setPropAttByProp]);

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

      const ids = Array.from(new Set(
        (q.data || []).map((r: any) => String(r?.request_item_id || "").trim()).filter(Boolean),
      ));

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

      await fetchProps();
      closeSheet();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось вернуть предложение");
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
