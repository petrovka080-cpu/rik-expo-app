import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import { openAppAttachment } from "../../lib/documents/attachmentOpener";
import { createPdfDocumentDescriptor } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import {
  ensureProposalAttachmentUrl,
  getLatestCanonicalProposalAttachment,
  listCanonicalProposalAttachments,
  toProposalAttachmentLegacyRow,
} from "../../lib/api/proposalAttachments.service";
import { isPdfLike } from "../../lib/files";
import { attachFileToProposalAction } from "./buyer.attachments.actions";
import type { PickedFile } from "./buyer.attachments.actions";
import type { PropAttachmentRow } from "./buyer.repo";

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const pickUrl = (value: unknown) => {
  const row = (value as Record<string, unknown> | null) ?? null;
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
        const result = await listCanonicalProposalAttachments(supabase, pid, { screen: "buyer" });
        const rows = result.rows.map((row) => toProposalAttachmentLegacyRow(row));
        setPropAttByPid((prev) => ({ ...prev, [pid]: rows }));
        setPropAttErrByPid((prev) => ({
          ...prev,
          [pid]:
            result.state === "degraded"
              ? result.errorMessage || "Вложения загружены через compatibility path."
              : result.state === "error"
                ? result.errorMessage || "Не удалось загрузить вложения."
                : "",
        }));
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
        const pid = String(att?.proposal_id ?? "").trim();
        const groupKey = String(att?.group_key ?? "proposal_pdf").trim();
        const fileName = String(att?.file_name ?? att?.name ?? "file").trim();

        if (!url && attId) {
          const latest = await getLatestCanonicalProposalAttachment(supabase, pid, groupKey || "proposal_pdf", {
            screen: "buyer",
          });
          url = await ensureProposalAttachmentUrl(supabase, latest.row);
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

        if (!url) {
          alert("Вложение", "Нет ссылки на файл");
          return;
        }

        await openAppAttachment({
          url,
          bucketId: String(att?.bucket_id ?? "").trim() || null,
          storagePath: String(att?.storage_path ?? "").trim() || null,
          fileName,
        });
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
