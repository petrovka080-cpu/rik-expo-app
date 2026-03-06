import { useCallback, useState } from "react";
import { openSignedUrlUniversal } from "../../lib/files";
import { attachFileToProposalAction } from "./buyer.attachments.actions";
import { repoListProposalAttachments, type PropAttachmentRow } from "./buyer.repo";
import type { PickedFile } from "./buyer.attachments.actions";
import type { SupabaseClient } from "@supabase/supabase-js";

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const pickUrl = (x: unknown) => {
  const row = (x as Record<string, unknown> | null) ?? null;
  return String(row?.signed_url || row?.public_url || row?.url || row?.file_url || row?.file_public_url || "").trim();
};

export function useBuyerProposalAttachments(params: {
  supabase: SupabaseClient;
  pickFileAny: () => Promise<PickedFile | null>;
  uploadProposalAttachment: (proposalId: string, file: PickedFile, fileName: string, groupKey: string) => Promise<void>;
  alert: (title: string, msg: string) => void;
}) {
  const { supabase, pickFileAny, uploadProposalAttachment, alert } = params;
  const [propAttBusy, setPropAttBusy] = useState(false);
  const [propAttByPid, setPropAttByPid] = useState<Record<string, PropAttachmentRow[]>>({});
  const [propAttErrByPid, setPropAttErrByPid] = useState<Record<string, string>>({});

  const loadProposalAttachments = useCallback(
    async (pidStr: string) => {
      const pid = String(pidStr || "").trim();
      if (!pid) return;

      setPropAttErrByPid((prev) => ({ ...prev, [pid]: "" }));
      setPropAttBusy(true);
      try {
        const rows = await repoListProposalAttachments(supabase, pid);
        setPropAttByPid((prev) => ({ ...prev, [pid]: rows }));
      } catch (e: unknown) {
        setPropAttErrByPid((prev) => ({ ...prev, [pid]: errText(e) }));
      } finally {
        setPropAttBusy(false);
      }
    },
    [supabase],
  );

  const openPropAttachment = useCallback(
    async (att: Record<string, unknown>) => {
      try {
        let url = pickUrl(att);
        if (!url && att?.id) {
          const q = await supabase
            .from("proposal_attachments")
            .select("id, file_name, url, bucket_id, storage_path")
            .eq("id", String(att.id))
            .maybeSingle();

          const row = (q?.data || null) as { bucket_id?: string | null; storage_path?: string | null } | null;
          url = pickUrl(row);
          const bucket = String(row?.bucket_id || "").trim();
          const path = String(row?.storage_path || "").trim();
          if (!url && bucket && path) {
            const s = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
            url = String(s?.data?.signedUrl || "").trim();
          }
        }

        if (!url) {
          alert("Вложение", "Нет ссылки на файл (url пустой и нет bucket_id/storage_path)");
          return;
        }
        await openSignedUrlUniversal(url, String(att?.file_name ?? att?.name ?? "file"));
      } catch (e: unknown) {
        alert("Вложение", errText(e) || "Не удалось открыть файл");
      }
    },
    [alert, supabase],
  );

  const attachFileToProposal = useCallback(
    async (pidStr: string, groupKey: string) => {
      await attachFileToProposalAction({
        proposalId: String(pidStr),
        groupKey,
        pickFileAny,
        uploadProposalAttachment,
        loadProposalAttachments,
        setBusy: setPropAttBusy,
        alert,
      });
    },
    [alert, loadProposalAttachments, pickFileAny, uploadProposalAttachment],
  );

  return {
    propAttBusy,
    propAttByPid,
    propAttErrByPid,
    loadProposalAttachments,
    openPropAttachment,
    attachFileToProposal,
  };
}
