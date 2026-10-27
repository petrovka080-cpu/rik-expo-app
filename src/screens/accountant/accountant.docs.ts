import { Share } from "react-native";
import { router } from "expo-router";

import { exportProposalPdf } from "../../lib/catalog_api";
import { openAppAttachment } from "../../lib/documents/attachmentOpener";
import { uploadProposalAttachment } from "../../lib/files";
import { supabase } from "../../lib/supabaseClient";
import { prepareAndPreviewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { resolveAccountantAttachmentPreview } from "./accountantAttachmentPdf.service";
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
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null,
): Promise<void> {
  const preview = await resolveAccountantAttachmentPreview({
    proposalId,
    groupKey,
    title,
  });
  if (preview.kind === "file") {
    await openAppAttachment({ url: preview.url, fileName: preview.fileName });
    return;
  }

  await prepareAndPreviewPdfDocument({
    supabase,
    key: `pdf:acc:attachment:${groupKey}:${proposalId}`,
    label: "Открываю документ…",
    descriptor: preview.descriptor,
    router,
    // XR-PDF: dismiss parent modal before pushing PDF viewer route
    onBeforeNavigate,
  });
}

export async function openProposalSourceDoc(
  proposalId: string,
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null,
): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  await previewProposalAttachment(pid, "proposal_pdf", "Документ предложения", onBeforeNavigate);
}

export async function openInvoiceDoc(
  proposalId: string,
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null,
): Promise<void> {
  const pid = String(proposalId || "").trim();
  if (!pid) return;
  await previewProposalAttachment(pid, "invoice", "Счёт", onBeforeNavigate);
}

export async function openPaymentDocsOrUpload(p: {
  proposalId: string;
  reload: () => Promise<void>;
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
}): Promise<void> {
  const pid = String(p.proposalId || "").trim();
  if (!pid) return;

  try {
    await previewProposalAttachment(pid, "payment", "Платёжный документ", p.onBeforeNavigate);
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
    await previewProposalAttachment(pid, "payment", "Платёжный документ", p.onBeforeNavigate);
  } catch {
    safeAlert("Загружено", "Файл загружен, но предпросмотр открыть не удалось. Попробуйте ещё раз.");
  }
}
