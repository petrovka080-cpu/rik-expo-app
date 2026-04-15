import type { SupabaseClient } from "@supabase/supabase-js";

import type { UploadProposalAttachmentFn } from "./buyer.attachments.mutation";
import {
  ensureProposalHtmlAttachmentMutation,
  uploadInvoiceAttachmentMutation,
} from "./buyer.attachments.mutation";
import {
  clearRequestItemsDirectorRejectState,
  sendProposalToAccountingMin,
  setRequestItemsDirectorStatus,
  setRequestItemsDirectorStatusFallback,
} from "./buyer.actions.repo";
import type {
  AlertFn,
  BuyerMutationResult,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BuyerMutationWarning,
  FileLike,
  MaybeId,
} from "./buyer.mutation.shared";
import {
  createBuyerMutationTracker,
  errMessage,
  formatBuyerMutationFailure,
  formatBuyerMutationWarnings,
  isBuyerMutationFailure,
  logBuyerActionDebug,
} from "./buyer.mutation.shared";

type ProposalSendToAccountantPayload = {
  proposalId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  invoiceCurrency: string;
};

export type SubmitStatusStage =
  | "set_request_items_director_status"
  | "clear_request_item_reject_state";

export type AccountingStage =
  | "validate_invoice_fields"
  | "upload_invoice_attachment"
  | "ensure_proposal_html"
  | "send_to_accountant"
  | "ensure_accounting_flags"
  | "verify_accountant_state"
  | "refresh_bucket_lists";

const SUBMIT_STATUS_STAGE_LABELS: Record<SubmitStatusStage, string> = {
  set_request_items_director_status: "Синхронизация статусов request_items",
  clear_request_item_reject_state: "Сброс reject-state request_items",
};

export const ACCOUNTING_STAGE_LABELS: Record<AccountingStage, string> = {
  validate_invoice_fields: "Проверка реквизитов счёта",
  upload_invoice_attachment: "Загрузка счёта",
  ensure_proposal_html: "Обновление HTML-вложения",
  send_to_accountant: "Передача бухгалтеру",
  ensure_accounting_flags: "Фиксация бухгалтерских флагов",
  verify_accountant_state: "Проверка proposal после handoff",
  refresh_bucket_lists: "Обновление buyer buckets",
};

async function sendToAccountingWithFallback(params: {
  proposalSendToAccountant: (payload: ProposalSendToAccountantPayload) => Promise<void>;
  supabase: SupabaseClient;
  payload: ProposalSendToAccountantPayload;
}) {
  try {
    await params.proposalSendToAccountant(params.payload);
    return { mode: "adapter" as const, warning: null };
  } catch (primaryError: unknown) {
    const { error } = await sendProposalToAccountingMin(params.supabase, {
      p_proposal_id: params.payload.proposalId,
      p_invoice_number: params.payload.invoiceNumber,
      p_invoice_date: params.payload.invoiceDate,
      p_invoice_amount: params.payload.invoiceAmount,
      p_invoice_currency: params.payload.invoiceCurrency,
    });
    if (error) throw error;

    logBuyerActionDebug("warn", "[buyer.accounting] adapter failed, fallback RPC used", {
      proposalId: params.payload.proposalId,
      error: errMessage(primaryError),
    });
    return {
      mode: "fallback_rpc" as const,
      warning: `Основной adapter не сработал, использован fallback RPC: ${errMessage(primaryError)}`,
    };
  }
}

export async function syncSubmittedRequestItemsStatusMutation(params: {
  supabase: SupabaseClient;
  affectedIds: string[];
}): Promise<BuyerMutationResult<SubmitStatusStage, { affectedIds: string[] }>> {
  const affectedIds = Array.from(
    new Set((params.affectedIds || []).map((id) => String(id).trim()).filter(Boolean)),
  );
  const tracker = createBuyerMutationTracker<SubmitStatusStage>({
    family: "status",
    operation: "sync_submit_request_items",
    requestId: affectedIds[0] ?? null,
  });

  if (!affectedIds.length) {
    return tracker.success({ affectedIds: [] }, { skipped: true });
  }

  tracker.markStarted("set_request_items_director_status", { affectedCount: affectedIds.length });
  try {
    const rpc = await setRequestItemsDirectorStatus(params.supabase, affectedIds);
    if (rpc.error) throw rpc.error;
  } catch (primaryStatusError: unknown) {
    try {
      await setRequestItemsDirectorStatusFallback(params.supabase, affectedIds);
      tracker.warn(
        "set_request_items_director_status",
        new Error(`Использован fallback статусов: ${errMessage(primaryStatusError)}`),
        {
          affectedCount: affectedIds.length,
          fallbackUsed: true,
        },
      );
    } catch (fallbackStatusError: unknown) {
      tracker.warn(
        "set_request_items_director_status",
        new Error(
          `Основной и fallback статусный sync не сработали: ${errMessage(primaryStatusError)}; ${errMessage(fallbackStatusError)}`,
        ),
        {
          affectedCount: affectedIds.length,
          fallbackUsed: true,
        },
      );
    }
  }
  tracker.markCompleted("set_request_items_director_status", { affectedCount: affectedIds.length });

  tracker.markStarted("clear_request_item_reject_state", { affectedCount: affectedIds.length });
  try {
    await clearRequestItemsDirectorRejectState(params.supabase, affectedIds);
  } catch (error) {
    tracker.warn("clear_request_item_reject_state", error, {
      affectedCount: affectedIds.length,
    });
  }
  tracker.markCompleted("clear_request_item_reject_state", { affectedCount: affectedIds.length });

  return tracker.success({ affectedIds });
}

export async function runProposalAccountingMutation(params: {
  operation: "send_to_accounting" | "rework_send_to_accounting";
  proposalId: string;
  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile?: FileLike | null;
  invoiceUploadedName?: string;
  buildProposalPdfHtml: (proposalId: string) => Promise<string>;
  proposalSendToAccountant: (payload: ProposalSendToAccountantPayload) => Promise<void>;
  uploadProposalAttachment: UploadProposalAttachmentFn;
  ensureAccountingFlags: (proposalId: string, invoiceAmountNum?: number) => Promise<void>;
  supabase: SupabaseClient;
  fetchBuckets: () => Promise<void>;
}): Promise<BuyerMutationResult<AccountingStage, { proposalId: string; amount: number }>> {
  const proposalId = String(params.proposalId || "").trim();
  const tracker = createBuyerMutationTracker<AccountingStage>({
    family: "status",
    operation: params.operation,
    proposalId,
  });

  tracker.markStarted("validate_invoice_fields");
  const amount = Number(String(params.invAmount).replace(",", "."));
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(String(params.invDate || "").trim());
  if (!String(params.invNumber || "").trim()) {
    return tracker.asFailure(
      "validate_invoice_fields",
      new Error("Укажите номер счёта"),
      "Укажите номер счёта",
    );
  }
  if (!dateOk) {
    return tracker.asFailure(
      "validate_invoice_fields",
      new Error("Формат YYYY-MM-DD"),
      "Формат YYYY-MM-DD",
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return tracker.asFailure(
      "validate_invoice_fields",
      new Error("Введите положительную сумму"),
      "Введите положительную сумму",
    );
  }
  tracker.markCompleted("validate_invoice_fields", { amount });

  if (!params.invoiceUploadedName && params.invFile) {
    tracker.markStarted("upload_invoice_attachment");
    const invoiceUpload = await uploadInvoiceAttachmentMutation({
      proposalId,
      invoiceFile: params.invFile,
      uploadProposalAttachment: params.uploadProposalAttachment,
    });
    if (isBuyerMutationFailure(invoiceUpload)) {
      return tracker.asFailure(
        "upload_invoice_attachment",
        invoiceUpload.error,
        invoiceUpload.message,
      );
    }
    tracker.markCompleted("upload_invoice_attachment", {
      uploaded: invoiceUpload.data?.uploaded ?? false,
    });
  }

  tracker.markStarted("ensure_proposal_html");
  const htmlAttachment = await ensureProposalHtmlAttachmentMutation({
    proposalId,
    supabase: params.supabase,
    buildProposalPdfHtml: params.buildProposalPdfHtml,
    uploadProposalAttachment: params.uploadProposalAttachment,
  });
  if (isBuyerMutationFailure(htmlAttachment)) {
    return tracker.asFailure(
      "ensure_proposal_html",
      htmlAttachment.error,
      htmlAttachment.message,
    );
  }
  for (const warning of htmlAttachment.warnings) {
    tracker.warnings.push({
      stage: "ensure_proposal_html",
      message: warning.message,
      degraded: warning.degraded,
    });
  }
  tracker.markCompleted("ensure_proposal_html", {
    warningCount: htmlAttachment.warnings.length,
    mode: htmlAttachment.data?.mode ?? null,
  });

  tracker.markStarted("send_to_accountant");
  try {
    const accountingResult = await sendToAccountingWithFallback({
      proposalSendToAccountant: params.proposalSendToAccountant,
      supabase: params.supabase,
      payload: {
        proposalId,
        invoiceNumber: String(params.invNumber).trim(),
        invoiceDate: String(params.invDate).trim(),
        invoiceAmount: amount,
        invoiceCurrency: String(params.invCurrency || "KGS").trim(),
      },
    });
    if (accountingResult.warning) {
      tracker.warn("send_to_accountant", new Error(accountingResult.warning), {
        mode: accountingResult.mode,
      });
    }
  } catch (error) {
    return tracker.asFailure(
      "send_to_accountant",
      error,
      "Не удалось отправить бухгалтеру",
    );
  }
  tracker.markCompleted("send_to_accountant");

  tracker.markStarted("ensure_accounting_flags");
  try {
    await params.ensureAccountingFlags(proposalId, amount);
  } catch (error) {
    return tracker.asFailure(
      "ensure_accounting_flags",
      error,
      "Не удалось зафиксировать бухгалтерские флаги",
    );
  }
  tracker.markCompleted("ensure_accounting_flags");

  tracker.markStarted("verify_accountant_state");
  try {
    const chk = await params.supabase
      .from("proposals")
      .select("payment_status, sent_to_accountant_at")
      .eq("id", proposalId)
      .maybeSingle();
    if (chk.error) throw chk.error;
  } catch (error) {
    return tracker.asFailure(
      "verify_accountant_state",
      error,
      "Не удалось проверить состояние предложения",
    );
  }
  tracker.markCompleted("verify_accountant_state");

  tracker.markStarted("refresh_bucket_lists");
  try {
    await params.fetchBuckets();
  } catch (error) {
    return tracker.asFailure(
      "refresh_bucket_lists",
      error,
      "Не удалось обновить buyer buckets",
    );
  }
  tracker.markCompleted("refresh_bucket_lists");

  return tracker.success({ proposalId, amount });
}

export async function sendToAccountingAction<TApproved extends MaybeId = MaybeId>(p: {
  acctProposalId: string;
  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile?: FileLike | null;
  invoiceUploadedName?: string;
  buildProposalPdfHtml: (proposalId: string) => Promise<string>;
  proposalSendToAccountant: (payload: ProposalSendToAccountantPayload) => Promise<void>;
  uploadProposalAttachment: UploadProposalAttachmentFn;
  ensureAccountingFlags: (proposalId: string, invoiceAmountNum?: number) => Promise<void>;
  supabase: SupabaseClient;
  fetchBuckets: () => Promise<void>;
  closeSheet: () => void;
  setApproved: (fn: (prev: TApproved[]) => TApproved[]) => void;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
}): Promise<BuyerMutationResult<AccountingStage, { proposalId: string; amount: number }>> {
  const proposalId = String(p.acctProposalId || "").trim();
  p.setBusy(true);
  try {
    const result = await runProposalAccountingMutation({
      operation: "send_to_accounting",
      proposalId,
      invNumber: p.invNumber,
      invDate: p.invDate,
      invAmount: p.invAmount,
      invCurrency: p.invCurrency,
      invFile: p.invFile,
      invoiceUploadedName: p.invoiceUploadedName,
      buildProposalPdfHtml: p.buildProposalPdfHtml,
      proposalSendToAccountant: p.proposalSendToAccountant,
      uploadProposalAttachment: p.uploadProposalAttachment,
      ensureAccountingFlags: p.ensureAccountingFlags,
      supabase: p.supabase,
      fetchBuckets: p.fetchBuckets,
    });

    if (isBuyerMutationFailure(result)) {
      p.alert(
        "Ошибка отправки",
        formatBuyerMutationFailure(
          result,
          ACCOUNTING_STAGE_LABELS,
          "Не удалось отправить бухгалтеру",
        ),
      );
      return result;
    }

    p.setApproved((prev) => prev.filter((item) => String(item?.id ?? "") !== proposalId));
    if (result.status === "partial_success") {
      const warningMessage = formatBuyerMutationWarnings(
        result.warnings,
        ACCOUNTING_STAGE_LABELS,
      );
      p.alert(
        "Готово с предупреждением",
        warningMessage || "Счёт отправлен бухгалтеру с предупреждениями.",
      );
    } else {
      p.alert("Готово", "Счёт отправлен бухгалтеру.");
    }
    p.closeSheet();
    return result;
  } finally {
    p.setBusy(false);
  }
}

export const STATUS_MUTATION_STAGE_LABELS = {
  ...SUBMIT_STATUS_STAGE_LABELS,
  ...ACCOUNTING_STAGE_LABELS,
} as const;
