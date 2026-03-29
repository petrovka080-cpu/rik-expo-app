import type { SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import type {
  BuyerMutationResult,
  BuyerMutationWarning,
  FileLike,
} from "./buyer.mutation.shared";
import {
  createBuyerMutationTracker,
  errMessage,
  formatBuyerMutationFailure,
  formatBuyerMutationWarnings,
  isBuyerMutationFailure,
} from "./buyer.mutation.shared";

type AlertFn = (title: string, message: string) => void;

type NativePickedFile = {
  name?: string | null;
  uri?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type PickedFile = File | NativePickedFile;

export type UploadProposalAttachmentFn = (
  proposalId: string,
  file: FileLike,
  fileName: string,
  groupKey: string,
) => Promise<void>;

type LoadAttachmentsFn = (proposalId: string) => Promise<void>;

type AttachFileStage = "pick_file" | "upload_attachment" | "reload_attachments";
type SupplierAttachmentsStage = "upload_supplier_attachments";
type InvoiceAttachmentStage = "upload_invoice_attachment";
type ProposalHtmlStage = "ensure_proposal_html";

const ATTACH_FILE_STAGE_LABELS: Record<AttachFileStage, string> = {
  pick_file: "Выбор файла",
  upload_attachment: "Загрузка вложения",
  reload_attachments: "Обновление списка вложений",
};

const INVOICE_ATTACHMENT_STAGE_LABELS: Record<InvoiceAttachmentStage, string> = {
  upload_invoice_attachment: "Загрузка счёта",
};

const PROPOSAL_HTML_STAGE_LABELS: Record<ProposalHtmlStage, string> = {
  ensure_proposal_html: "Обновление HTML-вложения предложения",
};

export async function attachFileToProposalAction(p: {
  proposalId: string;
  groupKey: string;
  pickFileAny: () => Promise<PickedFile | null>;
  uploadProposalAttachment: UploadProposalAttachmentFn;
  loadProposalAttachments: LoadAttachmentsFn;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
}): Promise<BuyerMutationResult<AttachFileStage, { proposalId: string; groupKey: string; skipped: boolean }>> {
  const proposalId = String(p.proposalId || "").trim();
  const tracker = createBuyerMutationTracker<AttachFileStage>({
    family: "attachments",
    operation: "attach_file_to_proposal",
    proposalId,
  });

  if (!proposalId) {
    return tracker.asFailure("pick_file", new Error("Не выбран документ"), "Не выбран документ");
  }

  tracker.markStarted("pick_file");
  const file = await p.pickFileAny();
  if (!file) {
    tracker.markCompleted("pick_file", { skipped: true });
    return tracker.success({ proposalId, groupKey: p.groupKey, skipped: true }, { skipped: true });
  }
  tracker.markCompleted("pick_file", { skipped: false });

  const fileName =
    String((file as { name?: string | null })?.name ?? `file_${Date.now()}`).trim() ||
    `file_${Date.now()}`;

  p.setBusy(true);
  try {
    tracker.markStarted("upload_attachment", { groupKey: p.groupKey, fileName });
    try {
      await p.uploadProposalAttachment(proposalId, file, fileName, p.groupKey);
    } catch (error) {
      const failure = tracker.asFailure(
        "upload_attachment",
        error,
        "Не удалось прикрепить файл",
      );
      p.alert(
        "Ошибка",
        formatBuyerMutationFailure(failure, ATTACH_FILE_STAGE_LABELS, "Не удалось прикрепить файл"),
      );
      return failure;
    }
    tracker.markCompleted("upload_attachment", { groupKey: p.groupKey, fileName });

    tracker.markStarted("reload_attachments");
    try {
      await p.loadProposalAttachments(proposalId);
    } catch (error) {
      const failure = tracker.asFailure(
        "reload_attachments",
        error,
        "Не удалось обновить список вложений",
      );
      p.alert(
        "Ошибка",
        formatBuyerMutationFailure(
          failure,
          ATTACH_FILE_STAGE_LABELS,
          "Не удалось обновить список вложений",
        ),
      );
      return failure;
    }
    tracker.markCompleted("reload_attachments");

    return tracker.success({ proposalId, groupKey: p.groupKey, skipped: false });
  } finally {
    p.setBusy(false);
  }
}

export async function uploadSupplierProposalAttachmentsMutation(params: {
  createdProposals: Array<{ id?: string | null; proposal_id?: string | null; supplier?: string | null }>;
  attachmentsNow: Record<string, { file?: FileLike; name?: string }>;
  uploadProposalAttachment: UploadProposalAttachmentFn;
}): Promise<BuyerMutationResult<SupplierAttachmentsStage, { uploadCount: number; failedCount: number }>> {
  const tracker = createBuyerMutationTracker<SupplierAttachmentsStage>({
    family: "attachments",
    operation: "upload_supplier_attachments",
  });
  const proposalRows = Array.isArray(params.createdProposals) ? params.createdProposals : [];
  const attachmentEntries = Object.entries(params.attachmentsNow || {});

  tracker.markStarted("upload_supplier_attachments", {
    proposalCount: proposalRows.length,
    attachmentKeys: attachmentEntries.map(([key]) => key),
  });

  const uploads: Promise<void>[] = [];
  for (const proposal of proposalRows) {
    const proposalId = String(proposal?.proposal_id ?? proposal?.id ?? "").trim();
    if (!proposalId) continue;
    const supplierKey = String(proposal?.supplier ?? "").trim();
    const attachment = params.attachmentsNow?.[supplierKey];
    if (!attachment?.file) continue;
    const fileName = String(attachment.name || `file_${Date.now()}`).trim();
    uploads.push(
      params.uploadProposalAttachment(proposalId, attachment.file, fileName, "supplier_quote"),
    );
  }

  if (!uploads.length) {
    tracker.markCompleted("upload_supplier_attachments", { uploadCount: 0, failedCount: 0 });
    return tracker.success({ uploadCount: 0, failedCount: 0 });
  }

  const settled = await Promise.allSettled(uploads);
  const failedCount = settled.filter((entry) => entry.status === "rejected").length;
  if (failedCount > 0) {
    tracker.warn(
      "upload_supplier_attachments",
      new Error(`Не удалось загрузить ${failedCount} вложений`),
      {
        uploadCount: uploads.length,
        failedCount,
      },
    );
  }

  tracker.markCompleted("upload_supplier_attachments", {
    uploadCount: uploads.length,
    failedCount,
  });
  return tracker.success({ uploadCount: uploads.length, failedCount });
}

export async function uploadInvoiceAttachmentMutation(params: {
  proposalId: string;
  invoiceFile: FileLike | null | undefined;
  uploadProposalAttachment: UploadProposalAttachmentFn;
}): Promise<BuyerMutationResult<InvoiceAttachmentStage, { proposalId: string; uploaded: boolean }>> {
  const proposalId = String(params.proposalId || "").trim();
  const tracker = createBuyerMutationTracker<InvoiceAttachmentStage>({
    family: "attachments",
    operation: "upload_invoice_attachment",
    proposalId,
  });

  if (!proposalId || !params.invoiceFile) {
    return tracker.success({ proposalId, uploaded: false }, { skipped: true });
  }

  try {
    const fileName =
      String((params.invoiceFile as { name?: string | null })?.name ?? "invoice.pdf").trim() ||
      "invoice.pdf";
    tracker.markStarted("upload_invoice_attachment", { fileName });
    await params.uploadProposalAttachment(proposalId, params.invoiceFile, fileName, "invoice");
    tracker.markCompleted("upload_invoice_attachment", { fileName });
    return tracker.success({ proposalId, uploaded: true });
  } catch (error) {
    return tracker.asFailure("upload_invoice_attachment", error, "Не удалось загрузить счёт");
  }
}

export async function ensureProposalHtmlAttachmentMutation(params: {
  proposalId: string;
  supabase: Pick<SupabaseClient<any, any, any>, "from">;
  buildProposalPdfHtml: (proposalId: string) => Promise<string>;
  uploadProposalAttachment: UploadProposalAttachmentFn;
}): Promise<
  BuyerMutationResult<ProposalHtmlStage, { proposalId: string; mode: "existing" | "uploaded" | "warning" }>
> {
  const proposalId = String(params.proposalId || "").trim();
  const tracker = createBuyerMutationTracker<ProposalHtmlStage>({
    family: "attachments",
    operation: "ensure_proposal_html",
    proposalId,
  });

  try {
    tracker.markStarted("ensure_proposal_html");
    const existing = await params.supabase
      .from("proposal_attachments")
      .select("id")
      .eq("proposal_id", proposalId)
      .eq("group_key", "proposal_pdf")
      .limit(1);

    if (!existing.error && Array.isArray(existing.data) && existing.data.length > 0) {
      tracker.markCompleted("ensure_proposal_html", { mode: "existing" });
      return tracker.success({ proposalId, mode: "existing" });
    }

    const html = await params.buildProposalPdfHtml(proposalId);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    await params.uploadProposalAttachment(
      proposalId,
      blob,
      `proposal_${proposalId.slice(0, 8)}.html`,
      "proposal_html",
    );
    tracker.markCompleted("ensure_proposal_html", { mode: "uploaded" });
    return tracker.success({ proposalId, mode: "uploaded" });
  } catch (error) {
    tracker.warn("ensure_proposal_html", error, { proposalId });
    tracker.markCompleted("ensure_proposal_html", { mode: "warning" });
    return tracker.success({ proposalId, mode: "warning" });
  }
}

export async function openInvoicePickerWebAction(p: {
  proposalId: string;
  uploadProposalAttachment: UploadProposalAttachmentFn;
  setInvoiceUploadedName: (name: string) => void;
  alert: AlertFn;
}) {
  if (Platform.OS !== "web") return;

  const proposalId = String(p.proposalId || "").trim();
  if (!proposalId) {
    p.alert("Ошибка", "Не выбран документ");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.jpg,.jpeg,.png";

  input.onchange = async () => {
    const tracker = createBuyerMutationTracker<"pick_file" | "upload_invoice_attachment">({
      family: "attachments",
      operation: "open_invoice_picker_web",
      proposalId,
    });

    tracker.markStarted("pick_file");
    try {
      const file = (input.files && input.files[0]) || null;
      if (!file) {
        tracker.markCompleted("pick_file", { skipped: true });
        return;
      }
      tracker.markCompleted("pick_file", { skipped: false, fileName: file.name });

      const uploadResult = await uploadInvoiceAttachmentMutation({
        proposalId,
        invoiceFile: file,
        uploadProposalAttachment: p.uploadProposalAttachment,
      });
      if (isBuyerMutationFailure(uploadResult)) {
        p.alert(
          "Ошибка загрузки",
          formatBuyerMutationFailure(
            uploadResult,
            INVOICE_ATTACHMENT_STAGE_LABELS,
            "Не удалось загрузить счёт",
          ),
        );
        return;
      }
      p.setInvoiceUploadedName(file.name);
      p.alert("Готово", `Счёт прикреплён: ${file.name}`);
    } catch (error) {
      p.alert("Ошибка загрузки", errMessage(error));
    } finally {
      try {
        input.remove();
      } catch {
        // cleanup-only
      }
    }
  };

  input.click();
}

export async function pickInvoiceFileAction(): Promise<PickedFile | null> {
  try {
    if (Platform.OS === "web") {
      return await new Promise<PickedFile | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.jpg,.jpeg,.png";
        input.onchange = () => {
          const file = (input.files && input.files[0]) || null;
          resolve(file);
        };
        input.click();
      });
    }

    const docPicker = await import("expo-document-picker");
    const result = await docPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result?.canceled) return null;
    return result?.assets?.[0] ?? null;
  } catch {
    return null;
  }
}

export const formatAttachmentWarnings = <Stage extends string>(
  warnings: BuyerMutationWarning<Stage>[],
  labels: Record<Stage, string>,
) => formatBuyerMutationWarnings(warnings, labels);

export const ATTACHMENT_STAGE_LABELS = {
  ...ATTACH_FILE_STAGE_LABELS,
  ...INVOICE_ATTACHMENT_STAGE_LABELS,
  ...PROPOSAL_HTML_STAGE_LABELS,
  upload_supplier_attachments: "Загрузка supplier-вложений",
} as const;
