import { Share } from "react-native";
import { router } from "expo-router";

import { exportProposalPdf } from "../../lib/catalog_api";
import { openAppAttachment } from "../../lib/documents/attachmentOpener";
import {
  getLatestProposalAttachmentPreview,
  isPdfLike,
  uploadProposalAttachment,
} from "../../lib/files";
import { supabase } from "../../lib/supabaseClient";
import { buildPdfFileName, createPdfDocumentDescriptor } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { safeAlert } from "./helpers";
import { pickAnyFile } from "./pickAnyFile";

export async function shareProposalCard(proposalId: string): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;

  const uriOrUrl = await exportProposalPdf(pid, "preview");
  await Share.share({ message: String(uriOrUrl) });
}

async function previewProposalAttachment(
  proposalId: string,
  groupKey: "proposal_pdf" | "invoice" | "payment",
  title: string,
): Promise<void> {
  const preview = await getLatestProposalAttachmentPreview(proposalId, groupKey);
  if (!isPdfLike(preview.fileName, preview.url)) {
    await openAppAttachment({ url: preview.url, fileName: preview.fileName });
    return;
  }

  const doc = await preparePdfDocument({
    supabase,
    descriptor: createPdfDocumentDescriptor({
      uri: preview.url,
      title,
      fileName: buildPdfFileName({
        documentType: "attachment_pdf",
        title,
        entityId: proposalId,
      }),
      documentType: "attachment_pdf",
      source: "attachment",
      originModule: "accountant",
      entityId: proposalId,
    }),
    getRemoteUrl: () => preview.url,
  });

  await previewPdfDocument(doc, { router });
}

export async function openProposalSourceDoc(proposalId: string): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  await previewProposalAttachment(pid, "proposal_pdf", "Документ предложения");
}

export async function openInvoiceDoc(proposalId: string): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  await previewProposalAttachment(pid, "invoice", "Счёт");
}

export async function openPaymentDocsOrUpload(p: {
  proposalId: string;
  reload: () => Promise<void>;
}): Promise<void> {
  const pid = String(p.proposalId || "").trim();
  if (!pid) return;

  try {
    await previewProposalAttachment(pid, "payment", "Платёжный документ");
    return;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const low = msg.toLowerCase();
    const notFound = low.includes("not found") || low.includes("не найден");
    if (!notFound) {
      safeAlert("Платёжные документы", msg);
      return;
    }
  }

  const f = await pickAnyFile();
  if (!f) return;

  const filename = String(f?.name ?? f?.fileName ?? `payment_${Date.now()}.pdf`);
  await uploadProposalAttachment(pid, f, filename, "payment");
  await p.reload();

  try {
    await previewProposalAttachment(pid, "payment", "Платёжный документ");
  } catch {
    safeAlert("Загружено", "Файл загружен, но предпросмотр открыть не удалось. Попробуйте ещё раз.");
  }
}
