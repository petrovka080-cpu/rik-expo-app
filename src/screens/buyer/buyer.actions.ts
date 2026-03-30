import type { SupabaseClient } from "@supabase/supabase-js";

import {
  repoGetProposalItemLinks,
  repoGetProposalItemsForView,
  repoGetProposalRequestItemIntegrity,
  repoGetRequestItemsByIds,
  repoGetRequestItemToRequestMap,
  repoSetProposalBuyerFio,
  repoUpdateProposalItems,
  type RepoProposalItemUpdate,
} from "./buyer.repo";
import type { AlertFn, LogFn } from "./buyer.mutation.shared";
import {
  getProposalIntegritySummaryLabel,
  isProposalItemIntegrityDegraded,
  type ProposalRequestItemIntegrityReason,
  type ProposalRequestItemIntegrityState,
} from "../../lib/api/proposalIntegrity";
import {
  errMessage,
  logBuyerSecondaryPhaseWarning,
  reportBuyerWriteFailure,
} from "./buyer.mutation.shared";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

export { handleCreateProposalsBySupplierAction } from "./buyer.submit.mutation";
export { sendToAccountingAction } from "./buyer.status.mutation";
export { publishRfqAction } from "./buyer.rfq.mutation";
export {
  openReworkAction,
  rwSaveItemsAction,
  rwSendToAccountingAction,
  rwSendToDirectorAction,
} from "./buyer.rework.mutation";
export type { RwItem } from "./buyer.rework.mutation";

type RequestItemViewRow = {
  id?: string | null;
  request_item_id?: string | null;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  rik_code?: string | null;
  app_code?: string | null;
  status?: string | null;
  cancelled_at?: string | null;
  request_item_integrity_state?: "active" | "source_cancelled" | "source_missing";
  request_item_integrity_reason?: "request_item_cancelled" | "request_item_missing" | null;
  request_item_source_status?: string | null;
  request_item_cancelled_at?: string | null;
};

type ProposalItemLinkRow = {
  proposal_id?: string | null;
  request_item_id?: string | null;
};

type RequestItemToRequestRow = {
  id?: string | null;
  request_id?: string | null;
};

type BuyerInboxLikeRow = {
  request_item_id?: string | null;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  app_code?: string | null;
  rik_code?: string | null;
};

type SnapshotMetaRow = {
  price?: string;
  note?: string;
};

type OpenProposalViewDeps = {
  pidStr: string;
  head: Record<string, unknown> | null;
  supabase: SupabaseClient;
  openPropDetailsSheet: (pid: string) => void;
  setPropViewId: (v: string | null) => void;
  setPropViewHead: (v: Record<string, unknown> | null) => void;
  setPropViewLines: (v: RequestItemViewRow[]) => void;
  setPropViewBusy: (v: boolean) => void;
  log?: LogFn;
};

type PreloadProposalTitlesDeps = {
  proposalIds: string[];
  supabase: SupabaseClient;
  batchResolveRequestLabels: (reqIds: string[]) => Promise<Record<string, string>>;
  getExisting: () => Record<string, string>;
  setTitleByPid: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
};

export async function openProposalViewAction(p: OpenProposalViewDeps) {
  p.openPropDetailsSheet(p.pidStr);
  p.setPropViewId(p.pidStr);
  p.setPropViewHead(p.head || null);
  p.setPropViewLines([]);
  p.setPropViewBusy(true);

  try {
    const baseLines: RequestItemViewRow[] = await repoGetProposalItemsForView(p.supabase, p.pidStr);
    const ids = Array.from(
      new Set(baseLines.map((row) => String(row?.request_item_id || "")).filter(Boolean)),
    );

    let byId: Record<string, RequestItemViewRow> = {};
    if (ids.length) {
      const requestItems: RequestItemViewRow[] = await repoGetRequestItemsByIds(p.supabase, ids);
      for (const row of requestItems) byId[String(row.id)] = row;
    }
    const integrityById = new Map(
      (await repoGetProposalRequestItemIntegrity(p.supabase, p.pidStr)).map((row) => [
        row.request_item_id,
        row,
      ]),
    );

    const merged: RequestItemViewRow[] = baseLines.map((line) => {
      const requestItem = byId[String(line.request_item_id)] || {};
      const integrity = integrityById.get(String(line.request_item_id ?? "").trim());
      const requestItemIntegrityState: ProposalRequestItemIntegrityState =
        (integrity?.integrity_state ?? "active") as ProposalRequestItemIntegrityState;
      const requestItemIntegrityReason: ProposalRequestItemIntegrityReason =
        (integrity?.integrity_reason ?? null) as ProposalRequestItemIntegrityReason;
      return {
        ...line,
        name_human: requestItem.name_human ?? line.name_human ?? null,
        uom: requestItem.uom ?? line.uom ?? null,
        qty: line.qty ?? requestItem.qty ?? null,
        rik_code: requestItem.rik_code ?? line.rik_code ?? null,
        app_code: requestItem.app_code ?? line.app_code ?? null,
        request_item_integrity_state: requestItemIntegrityState,
        request_item_integrity_reason: requestItemIntegrityReason,
        request_item_source_status:
          integrity?.request_item_status ?? requestItem.status ?? null,
        request_item_cancelled_at:
          integrity?.request_item_cancelled_at ?? requestItem.cancelled_at ?? null,
      };
    });

    const degradedLines = merged.filter((line) => isProposalItemIntegrityDegraded(line));
    if (degradedLines.length) {
      recordPlatformObservability({
        screen: "buyer",
        surface: "proposal_view",
        category: "ui",
        event: "proposal_view_integrity_degraded",
        result: "error",
        sourceKind: "rpc:proposal_request_item_integrity_v1",
        rowCount: degradedLines.length,
        errorStage: "request_item_integrity",
        errorClass: "ProposalRequestItemIntegrityDegraded",
        errorMessage: getProposalIntegritySummaryLabel(merged) ?? "proposal integrity degraded",
        extra: {
          proposalId: p.pidStr,
          degradedRequestItemIds: degradedLines
            .map((line) => String(line.request_item_id ?? "").trim())
            .filter(Boolean),
          publishState: "degraded",
        },
      });
    }

    p.setPropViewLines(merged);
  } catch (error) {
    p.log?.("[openProposalViewAction] error:", errMessage(error));
    p.setPropViewLines([]);
  } finally {
    p.setPropViewBusy(false);
  }
}

export async function preloadProposalTitlesAction(p: PreloadProposalTitlesDeps) {
  const uniq = Array.from(new Set((p.proposalIds || []).map(String).filter(Boolean)));
  const existing = p.getExisting?.() || {};
  const need = uniq.filter((id) => !existing[id]);
  if (!need.length) return;

  try {
    const proposalItemLinks = await repoGetProposalItemLinks(p.supabase, need);
    const links: ProposalItemLinkRow[] = Array.isArray(proposalItemLinks) ? proposalItemLinks : [];
    const requestItemIds = Array.from(
      new Set(links.map((row) => String(row?.request_item_id || "")).filter(Boolean)),
    );
    if (!requestItemIds.length) return;

    const requestItems: RequestItemToRequestRow[] = await repoGetRequestItemToRequestMap(
      p.supabase,
      requestItemIds,
    );

    const requestIdByItem: Record<string, string> = {};
    for (const row of requestItems || []) {
      const itemId = String(row?.id || "");
      const requestId = String(row?.request_id || "");
      if (itemId && requestId) requestIdByItem[itemId] = requestId;
    }

    const requestIdsByProposal: Record<string, string[]> = {};
    for (const row of links) {
      const proposalId = String(row?.proposal_id || "");
      const requestId = requestIdByItem[String(row?.request_item_id || "")];
      if (!proposalId || !requestId) continue;
      (requestIdsByProposal[proposalId] ||= []).push(requestId);
    }

    const allRequestIds = Array.from(new Set(Object.values(requestIdsByProposal).flat()));
    if (!allRequestIds.length) return;

    let requestLabels: Record<string, string> = {};
    try {
      requestLabels = await p.batchResolveRequestLabels(allRequestIds);
    } catch (error) {
      logBuyerSecondaryPhaseWarning("buildTitleByProposal:resolve_request_labels", error);
      requestLabels = {};
    }

    const next: Record<string, string> = {};
    Object.entries(requestIdsByProposal).forEach(([proposalId, requestIds]) => {
      const uniqRequestIds = Array.from(new Set(requestIds));
      const labels = uniqRequestIds.map(
        (id) => requestLabels?.[id] || (id.length > 8 ? id.slice(0, 8) : id),
      );

      next[proposalId] =
        labels.length === 1
          ? `Заявка ${labels[0]}`
          : labels.length === 2
            ? `Заявки ${labels[0]} + ${labels[1]}`
            : `Заявки ${labels[0]} + ${labels[1]} + … (${labels.length})`;
    });

    p.setTitleByPid((prev) => ({ ...prev, ...next }));
  } catch (error) {
    logBuyerSecondaryPhaseWarning("buildTitleByProposal", error);
  }
}

export async function setProposalBuyerFioAction(opts: {
  supabase: SupabaseClient;
  propId: string | number;
  typedFio?: string;
  alert?: AlertFn;
  log?: (...args: unknown[]) => void;
}) {
  const { supabase, propId, typedFio, alert, log } = opts;
  const warn = (message: string) => {
    if (__DEV__) {
      console.warn(message);
    }
  };

  try {
    let fio = String(typedFio ?? "").trim();

    if (!fio) {
      const { data } = await supabase.auth.getUser();
      fio =
        data?.user?.user_metadata?.full_name?.trim() ||
        data?.user?.user_metadata?.name?.trim() ||
        "Снабженец";
    }

    await repoSetProposalBuyerFio(supabase, propId, fio);
  } catch (error) {
    reportBuyerWriteFailure(alert, "Не удалось сохранить ФИО снабженца", error, log ?? warn);
  }
}

export async function snapshotProposalItemsAction(opts: {
  supabase: SupabaseClient;
  proposalId: string | number;
  ids: string[];
  rows: BuyerInboxLikeRow[];
  meta: Record<string, SnapshotMetaRow>;
  alert?: AlertFn;
  log?: (...args: unknown[]) => void;
}) {
  const { supabase, proposalId, ids, rows, meta, alert, log } = opts;
  const warn = (message: string) => {
    if (__DEV__) {
      console.warn(message);
    }
  };

  try {
    const cleanIds = Array.from(new Set((ids || []).map(String).filter(Boolean)));
    if (!cleanIds.length) return;

    let requestItemData: RequestItemViewRow[] = [];
    try {
      const requestItems = await supabase
        .from("request_items")
        .select("id, name_human, uom, qty, app_code, rik_code")
        .in("id", cleanIds);

      if (!requestItems.error && Array.isArray(requestItems.data)) {
        requestItemData = requestItems.data;
      }
    } catch (error) {
      logBuyerSecondaryPhaseWarning("snapshotProposalItems:request_items_lookup", error);
    }

    if (!requestItemData.length) {
      const byId = new Map((rows || []).map((row) => [String(row.request_item_id), row]));
      requestItemData = cleanIds.map((id) => {
        const row: BuyerInboxLikeRow = byId.get(String(id)) || {};
        return {
          id,
          name_human: row?.name_human ?? null,
          uom: row?.uom ?? null,
          qty: row?.qty ?? null,
          app_code: row?.app_code ?? null,
          rik_code: row?.rik_code ?? null,
        };
      });
    }

    const payload: RepoProposalItemUpdate[] = [];
    for (const row of requestItemData) {
      const requestItemId = String(row?.id || "").trim();
      if (!requestItemId) continue;

      const rowMeta: SnapshotMetaRow = meta?.[requestItemId] || {};
      const update: RepoProposalItemUpdate = {
        request_item_id: requestItemId,
        name_human: row?.name_human ?? null,
        uom: row?.uom ?? null,
        qty: row?.qty ?? null,
        app_code: row?.app_code ?? null,
        rik_code: row?.rik_code ?? null,
      };

      if (rowMeta.price != null && String(rowMeta.price).trim() !== "") {
        const priceValue = Number(String(rowMeta.price).replace(",", "."));
        if (Number.isFinite(priceValue)) update.price = priceValue;
      }

      if (rowMeta.note) update.note = rowMeta.note;
      payload.push(update);
    }

    await repoUpdateProposalItems(supabase, proposalId, payload);
  } catch (error) {
    reportBuyerWriteFailure(
      alert,
      "Не удалось сохранить позиции предложения",
      error,
      log ?? warn,
    );
  }
}
