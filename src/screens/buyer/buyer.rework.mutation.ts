import type { SupabaseClient } from "@supabase/supabase-js";

import { clearRequestItemsDirectorRejectState } from "./buyer.actions.repo";
import type { UploadProposalAttachmentFn } from "./buyer.attachments.mutation";
import { pickInvoiceFileAction } from "./buyer.attachments.mutation";
import type { RepoProposalItemUpdate } from "./buyer.repo";
import { repoUpdateProposalItems } from "./buyer.repo";
import type {
  AlertFn,
  BuyerMutationResult,
  FileLike,
  MaybeId,
} from "./buyer.mutation.shared";
import {
  createBuyerMutationTracker,
  formatBuyerMutationFailure,
  formatBuyerMutationWarnings,
  isBuyerMutationFailure,
  logBuyerSecondaryPhaseWarning,
} from "./buyer.mutation.shared";
import {
  ACCOUNTING_STAGE_LABELS,
  runProposalAccountingMutation,
  type AccountingStage,
} from "./buyer.status.mutation";

type ProposalSendToAccountantPayload = {
  proposalId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  invoiceCurrency: string;
};

export type RwItem = {
  request_item_id: string;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: string;
  supplier?: string;
  note?: string;
};

type ReworkProposalRow = {
  status?: string | null;
  sent_to_accountant_at?: string | null;
  payment_status?: string | null;
  invoice_number?: string | null;
  redo_source?: string | null;
  redo_comment?: string | null;
  return_comment?: string | null;
  accountant_comment?: string | null;
  return_reason?: string | null;
  accountant_note?: string | null;
};

type ReworkProposalItemRow = {
  request_item_id?: string | null;
  price?: number | string | null;
  supplier?: string | null;
  note?: string | null;
};

type RequestItemNameRow = {
  id?: string | null;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
};

type OpenReworkStage =
  | "load_proposal"
  | "load_rework_items"
  | "load_request_item_names";

type SaveReworkStage = "persist_rework_items";

type ReworkDirectorStage =
  | "persist_rework_items"
  | "clear_request_item_reject_state"
  | "reset_accounting_state"
  | "submit_to_director"
  | "clear_sent_to_accountant_at"
  | "refresh_buyer_handoff";

type ReworkAccountingStage = "persist_rework_items" | AccountingStage;

const OPEN_REWORK_STAGE_LABELS: Record<OpenReworkStage, string> = {
  load_proposal: "Загрузка proposal для доработки",
  load_rework_items: "Загрузка proposal_items для доработки",
  load_request_item_names: "Загрузка названий request_items",
};

const SAVE_REWORK_STAGE_LABELS: Record<SaveReworkStage, string> = {
  persist_rework_items: "Сохранение proposal_items",
};

const REWORK_DIRECTOR_STAGE_LABELS: Record<ReworkDirectorStage, string> = {
  persist_rework_items: "Сохранение proposal_items",
  clear_request_item_reject_state: "Сброс reject-state request_items",
  reset_accounting_state: "Сброс бухгалтерских флагов proposal",
  submit_to_director: "Повторный submit директору",
  clear_sent_to_accountant_at: "Очистка sent_to_accountant_at",
  refresh_buyer_handoff: "Обновление buyer handoff после rework",
};

const REWORK_ACCOUNTING_STAGE_LABELS: Record<ReworkAccountingStage, string> = {
  persist_rework_items: "Сохранение proposal_items",
  ...ACCOUNTING_STAGE_LABELS,
};

function detectReworkSourceSafe(row: ReworkProposalRow | null | undefined): "director" | "accountant" {
  const status = String(row?.status || "").toLowerCase();
  if (status.includes("бух")) return "accountant";
  if (status.includes("дир")) return "director";

  const base = String(
    row?.return_reason || row?.accountant_comment || row?.accountant_note || "",
  ).toLowerCase();

  if (base.includes("бух") || base.includes("account")) return "accountant";
  if (base.includes("дир")) return "director";
  return "director";
}

async function rwPersistItems(supabase: SupabaseClient, proposalId: string, items: RwItem[]) {
  const payload: RepoProposalItemUpdate[] = [];

  for (const item of items || []) {
    const requestItemId = String(item?.request_item_id ?? "").trim();
    if (!requestItemId) continue;

    const update: RepoProposalItemUpdate = { request_item_id: requestItemId };
    const priceValue = Number(String(item.price ?? "").replace(",", "."));
    if (Number.isFinite(priceValue) && priceValue > 0) update.price = priceValue;
    if (item.supplier != null) update.supplier = item.supplier?.trim() || null;
    if (item.note != null) update.note = item.note?.trim() || null;
    if (Object.keys(update).length === 1) continue;
    payload.push(update);
  }

  if (!payload.length) return;
  await repoUpdateProposalItems(supabase, proposalId, payload);
}

export async function openReworkAction(p: {
  pid: string;
  supabase: SupabaseClient;
  openReworkSheet: (proposalId: string) => void;
  setRwBusy: (v: boolean) => void;
  setRwPid: (v: string | null) => void;
  setRwReason: (v: string) => void;
  setRwItems: (v: RwItem[]) => void;
  setRwInvNumber: (v: string) => void;
  setRwInvDate: (v: string) => void;
  setRwInvAmount: (v: string) => void;
  setRwInvCurrency: (v: string) => void;
  setRwInvFile: (v: FileLike | null) => void;
  setRwInvUploadedName: (v: string) => void;
  setRwSource: (v: "director" | "accountant") => void;
  alert: AlertFn;
}): Promise<BuyerMutationResult<OpenReworkStage, { itemCount: number; source: "director" | "accountant" }>> {
  const proposalId = String(p.pid || "").trim();
  const tracker = createBuyerMutationTracker<OpenReworkStage>({
    family: "rework",
    operation: "open_rework",
    proposalId,
  });

  p.openReworkSheet(proposalId);
  p.setRwBusy(true);
  p.setRwPid(proposalId);
  p.setRwReason("");
  p.setRwItems([]);
  p.setRwInvNumber("");
  p.setRwInvDate(new Date().toISOString().slice(0, 10));
  p.setRwInvAmount("");
  p.setRwInvCurrency("KGS");
  p.setRwInvFile(null);
  p.setRwInvUploadedName("");

  try {
    tracker.markStarted("load_proposal");
    let proposalRow: ReworkProposalRow | null = null;
    try {
      const primary = await p.supabase
        .from("proposals")
        .select(
          "status, sent_to_accountant_at, payment_status, invoice_number, redo_source, redo_comment, return_comment, accountant_comment",
        )
        .eq("id", proposalId)
        .maybeSingle();
      if (!primary.error && primary.data) proposalRow = primary.data;
      else if (primary.error) throw primary.error;
    } catch (error) {
      logBuyerSecondaryPhaseWarning("openRework:load_extended_proposal", error);
      try {
        const fallback = await p.supabase
          .from("proposals")
          .select("status, redo_source, redo_comment, return_comment, accountant_comment")
          .eq("id", proposalId)
          .maybeSingle();
        if (!fallback.error && fallback.data) proposalRow = fallback.data;
      } catch (fallbackError) {
        logBuyerSecondaryPhaseWarning("openRework:load_fallback_proposal", fallbackError);
      }
    }
    tracker.markCompleted("load_proposal");

    const source =
      proposalRow?.redo_source === "accountant"
        ? "accountant"
        : proposalRow?.redo_source === "director"
          ? "director"
          : detectReworkSourceSafe(proposalRow || {});
    p.setRwSource(source);

    let reason = String(
      proposalRow?.redo_comment ??
        proposalRow?.return_comment ??
        proposalRow?.accountant_comment ??
        "",
    ).trim();
    if (!/Источник:/i.test(reason)) {
      reason = reason
        ? `${reason}\nИсточник: ${source === "accountant" ? "бухгалтера" : "директора"}`
        : `Источник: ${source === "accountant" ? "бухгалтера" : "директора"}`;
    }
    p.setRwReason(reason);

    tracker.markStarted("load_rework_items");
    const proposalItems = await p.supabase
      .from("proposal_items")
      .select("request_item_id, price, supplier, note")
      .eq("proposal_id", proposalId);
    if (proposalItems.error) {
      const failure = tracker.asFailure(
        "load_rework_items",
        proposalItems.error,
        "Не удалось загрузить строки предложения",
      );
      p.alert(
        "Ошибка",
        formatBuyerMutationFailure(
          failure,
          OPEN_REWORK_STAGE_LABELS,
          "Не удалось открыть доработку",
        ),
      );
      return failure;
    }
    const items: ReworkProposalItemRow[] = Array.isArray(proposalItems.data)
      ? proposalItems.data
      : [];
    tracker.markCompleted("load_rework_items", { itemCount: items.length });

    const requestItemIds = Array.from(
      new Set(items.map((row) => String(row.request_item_id || "")).filter(Boolean)),
    );
    const names = new Map<string, RequestItemNameRow>();
    if (requestItemIds.length) {
      tracker.markStarted("load_request_item_names", { requestItemIds: requestItemIds.length });
      const requestItems = await p.supabase
        .from("request_items")
        .select("id, name_human, uom, qty")
        .in("id", requestItemIds);
      if (!requestItems.error && Array.isArray(requestItems.data)) {
        for (const row of requestItems.data) {
          names.set(String(row.id), row);
        }
      }
      tracker.markCompleted("load_request_item_names", { requestItemIds: requestItemIds.length });
    }

    p.setRwItems(
      items.map((item) => {
        const requestItem = names.get(String(item.request_item_id)) || {};
        return {
          request_item_id: String(item.request_item_id),
          name_human: requestItem.name_human ?? null,
          uom: requestItem.uom ?? null,
          qty: requestItem.qty ?? null,
          price: item.price != null ? String(item.price) : "",
          supplier: item.supplier ?? "",
          note: item.note ?? "",
        } satisfies RwItem;
      }),
    );

    return tracker.success({ itemCount: items.length, source });
  } catch (error) {
    const failure = tracker.asFailure(
      "load_proposal",
      error,
      "Не удалось открыть доработку",
    );
    p.alert(
      "Ошибка",
      formatBuyerMutationFailure(
        failure,
        OPEN_REWORK_STAGE_LABELS,
        "Не удалось открыть доработку",
      ),
    );
    return failure;
  } finally {
    p.setRwBusy(false);
  }
}

export async function rwSaveItemsAction(p: {
  pid: string;
  items: RwItem[];
  supabase: SupabaseClient;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
}): Promise<BuyerMutationResult<SaveReworkStage, { itemCount: number }>> {
  const proposalId = String(p.pid || "").trim();
  const tracker = createBuyerMutationTracker<SaveReworkStage>({
    family: "rework",
    operation: "save_rework_items",
    proposalId,
  });

  p.setBusy(true);
  try {
    tracker.markStarted("persist_rework_items", { itemCount: p.items.length });
    await rwPersistItems(p.supabase, proposalId, p.items);
    tracker.markCompleted("persist_rework_items", { itemCount: p.items.length });
    const result = tracker.success({ itemCount: p.items.length });
    p.alert("Сохранено", "Изменения по позициям сохранены");
    return result;
  } catch (error) {
    const failure = tracker.asFailure(
      "persist_rework_items",
      error,
      "Не удалось сохранить proposal_items",
    );
    p.alert(
      "Ошибка сохранения",
      formatBuyerMutationFailure(
        failure,
        SAVE_REWORK_STAGE_LABELS,
        "Не удалось сохранить proposal_items",
      ),
    );
    return failure;
  } finally {
    p.setBusy(false);
  }
}

export async function rwSendToDirectorAction<TRejected extends MaybeId = MaybeId>(p: {
  pid: string;
  items: RwItem[];
  supabase: SupabaseClient;
  proposalSubmit: (proposalId: string) => Promise<unknown>;
  fetchInbox: () => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setRejected: (fn: (prev: TRejected[]) => TRejected[]) => void;
  closeSheet: () => void;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
}): Promise<BuyerMutationResult<ReworkDirectorStage, { proposalId: string }>> {
  const proposalId = String(p.pid || "").trim();
  const tracker = createBuyerMutationTracker<ReworkDirectorStage>({
    family: "rework",
    operation: "send_rework_to_director",
    proposalId,
  });

  p.setBusy(true);
  try {
    const affectedIds = Array.from(
      new Set(
        (p.items || [])
          .map((item) => String(item?.request_item_id ?? "").trim())
          .filter(Boolean),
      ),
    );

    tracker.markStarted("persist_rework_items", { itemCount: p.items.length });
    await rwPersistItems(p.supabase, proposalId, p.items);
    tracker.markCompleted("persist_rework_items", { itemCount: p.items.length });

    if (affectedIds.length) {
      tracker.markStarted("clear_request_item_reject_state", { affectedCount: affectedIds.length });
      await clearRequestItemsDirectorRejectState(p.supabase, affectedIds);
      tracker.markCompleted("clear_request_item_reject_state", { affectedCount: affectedIds.length });
    }

    tracker.markStarted("reset_accounting_state");
    const resetAccountingState = await p.supabase
      .from("proposals")
      .update({ payment_status: null, sent_to_accountant_at: null })
      .eq("id", proposalId);
    if (resetAccountingState.error) {
      const failure = tracker.asFailure(
        "reset_accounting_state",
        resetAccountingState.error,
        "Не удалось сбросить бухгалтерские поля",
      );
      p.alert(
        "Ошибка отправки",
        formatBuyerMutationFailure(
          failure,
          REWORK_DIRECTOR_STAGE_LABELS,
          "Не удалось отправить директору",
        ),
      );
      return failure;
    }
    tracker.markCompleted("reset_accounting_state");

    tracker.markStarted("submit_to_director");
    await p.proposalSubmit(proposalId);
    tracker.markCompleted("submit_to_director");

    tracker.markStarted("clear_sent_to_accountant_at");
    const clearSentToAccountantAt = await p.supabase
      .from("proposals")
      .update({ sent_to_accountant_at: null })
      .eq("id", proposalId);
    if (clearSentToAccountantAt.error) {
      const failure = tracker.asFailure(
        "clear_sent_to_accountant_at",
        clearSentToAccountantAt.error,
        "Не удалось очистить sent_to_accountant_at",
      );
      p.alert(
        "Ошибка отправки",
        formatBuyerMutationFailure(
          failure,
          REWORK_DIRECTOR_STAGE_LABELS,
          "Не удалось отправить директору",
        ),
      );
      return failure;
    }
    tracker.markCompleted("clear_sent_to_accountant_at");

    tracker.markStarted("refresh_buyer_handoff");
    const refreshResults = await Promise.allSettled([p.fetchInbox(), p.fetchBuckets()]);
    for (const result of refreshResults) {
      if (result.status === "rejected") {
        tracker.warn("refresh_buyer_handoff", result.reason, {
          degraded: true,
        });
      }
    }
    tracker.markCompleted("refresh_buyer_handoff");

    p.setRejected((prev) => prev.filter((item) => String(item?.id ?? "") !== proposalId));
    if (tracker.warnings.length) {
      p.alert(
        "Готово с предупреждением",
        formatBuyerMutationWarnings(
          tracker.warnings,
          REWORK_DIRECTOR_STAGE_LABELS,
        ) || "Отправлено директору с предупреждениями.",
      );
    } else {
      p.alert("Готово", "Отправлено директору.");
    }
    p.closeSheet();
    return tracker.success({ proposalId });
  } catch (error) {
    const failure = tracker.asFailure(
      "submit_to_director",
      error,
      "Не удалось отправить директору",
    );
    p.alert(
      "Ошибка отправки",
      formatBuyerMutationFailure(
        failure,
        REWORK_DIRECTOR_STAGE_LABELS,
        "Не удалось отправить директору",
      ),
    );
    return failure;
  } finally {
    p.setBusy(false);
  }
}

export async function rwSendToAccountingAction<TRejected extends MaybeId = MaybeId>(p: {
  pid: string;
  items: RwItem[];
  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile?: FileLike | null;
  supabase: SupabaseClient;
  buildProposalPdfHtml: (proposalId: string) => Promise<string>;
  uploadProposalAttachment: UploadProposalAttachmentFn;
  proposalSendToAccountant: (payload: ProposalSendToAccountantPayload) => Promise<void>;
  ensureAccountingFlags: (proposalId: string, invoiceAmountNum?: number) => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setRejected: (fn: (prev: TRejected[]) => TRejected[]) => void;
  closeSheet: () => void;
  setBusy: (v: boolean) => void;
  alert: AlertFn;
}): Promise<BuyerMutationResult<ReworkAccountingStage, { proposalId: string }>> {
  const proposalId = String(p.pid || "").trim();
  const tracker = createBuyerMutationTracker<ReworkAccountingStage>({
    family: "rework",
    operation: "send_rework_to_accounting",
    proposalId,
  });

  p.setBusy(true);
  try {
    tracker.markStarted("persist_rework_items", { itemCount: p.items.length });
    await rwPersistItems(p.supabase, proposalId, p.items);
    tracker.markCompleted("persist_rework_items", { itemCount: p.items.length });

    const accountingResult = await runProposalAccountingMutation({
      operation: "rework_send_to_accounting",
      proposalId,
      invNumber: p.invNumber,
      invDate: p.invDate,
      invAmount: p.invAmount,
      invCurrency: p.invCurrency,
      invFile: p.invFile,
      buildProposalPdfHtml: p.buildProposalPdfHtml,
      proposalSendToAccountant: p.proposalSendToAccountant,
      uploadProposalAttachment: p.uploadProposalAttachment,
      ensureAccountingFlags: p.ensureAccountingFlags,
      supabase: p.supabase,
      fetchBuckets: p.fetchBuckets,
    });
    if (isBuyerMutationFailure(accountingResult)) {
      const failure = tracker.asFailure(
        accountingResult.failedStage as ReworkAccountingStage,
        accountingResult.error,
        accountingResult.message,
      );
      p.alert(
        "Ошибка отправки",
        formatBuyerMutationFailure(
          failure,
          REWORK_ACCOUNTING_STAGE_LABELS,
          "Не удалось отправить бухгалтеру",
        ),
      );
      return failure;
    }

    for (const warning of accountingResult.warnings) {
      tracker.warnings.push({
        stage: warning.stage as ReworkAccountingStage,
        message: warning.message,
        degraded: true,
      });
    }

    p.setRejected((prev) => prev.filter((item) => String(item?.id ?? "") !== proposalId));
    if (tracker.warnings.length) {
      p.alert(
        "Готово с предупреждением",
        formatBuyerMutationWarnings(
          tracker.warnings,
          REWORK_ACCOUNTING_STAGE_LABELS,
        ) || "Отправлено бухгалтеру с предупреждениями.",
      );
    } else {
      p.alert("Готово", "Отправлено бухгалтеру.");
    }
    p.closeSheet();
    return tracker.success({ proposalId });
  } catch (error) {
    const failure = tracker.asFailure(
      "ensure_accounting_flags",
      error,
      "Не удалось отправить бухгалтеру",
    );
    p.alert(
      "Ошибка отправки",
      formatBuyerMutationFailure(
        failure,
        REWORK_ACCOUNTING_STAGE_LABELS,
        "Не удалось отправить бухгалтеру",
      ),
    );
    return failure;
  } finally {
    p.setBusy(false);
  }
}

export { pickInvoiceFileAction };
