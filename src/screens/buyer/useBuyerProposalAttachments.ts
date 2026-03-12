import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { createPdfDocumentDescriptor } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { getLatestProposalAttachmentPreview, isPdfLike, openSignedUrlUniversal } from "../../lib/files";
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
  busy?: unknown;
}) {
  const { supabase, pickFileAny, uploadProposalAttachment, alert, busy } = params;
  const router = useRouter();
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
        const attId = String(att?.id ?? "").trim();
        if (!url && attId) {
          const q = await supabase
            .from("proposal_attachments")
            .select("id, proposal_id, file_name, url, bucket_id, storage_path")
            .eq("id", attId)
            .maybeSingle();

          const row = (q?.data || null) as { proposal_id?: string | null; file_name?: string | null } | null;
          const pid = String(row?.proposal_id || "").trim();
          const fileName = String(row?.file_name || att?.file_name || att?.name || "file").trim();
          if (pid) {
            const latest = await getLatestProposalAttachmentPreview(pid, String(att?.group_key || "proposal_pdf"));
            url = latest.url;
            if (isPdfLike(fileName, url)) {
              const template = createPdfDocumentDescriptor({
                uri: url,
                title: fileName.replace(/\.pdf$/i, "") || "Вложение",
                fileName,
                documentType: "attachment_pdf",
                source: "attachment",
                originModule: "buyer",
                entityId: pid,
              });
              const doc = await preparePdfDocument({
                busy,
                supabase,
                key: `pdf:buyer:attachment:${attId || pid}`,
                label: "Открываю вложение…",
                descriptor: template,
                getRemoteUrl: () => url,
              });
              await previewPdfDocument(doc, { router });
              return;
            }
          }
        }

        if (!url) {
          alert("Вложение", "Нет ссылки на файл");
          return;
        }
        await openSignedUrlUniversal(url, String(att?.file_name ?? att?.name ?? "file"));
      } catch (e: unknown) {
        alert("Вложение", errText(e) || "Не удалось открыть файл");
      }
    },
    [alert, busy, router, supabase],
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
