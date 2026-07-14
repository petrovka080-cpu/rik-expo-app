import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusyLike } from "../../lib/pdfRunner";

import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import {
  getPdfFlowErrorMessage,
  prepareAndPreviewPdfDocument,
} from "../../lib/documents/pdfDocumentActions";
import { createGeneratedPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { renderPdfHtmlToUri } from "../../lib/pdf/pdf.runner";
import { validateRpcResponse } from "../../lib/api/queryBoundary";
import { callRateLimitedSupabaseRpc } from "../../lib/api/supabaseRpcAdapter";
import {
  buildBuyerProcurementPdfView,
  renderBuyerProcurementPdfHtml,
  type BuyerProcurementLineMeta,
} from "../../features/office/buyerProcurementPdf";
import {
  enrichBuyerRowsWithRequestContext,
  type BuyerRequestContextQueryClient,
} from "../../features/office/buyerRequestContextEnrichment";
import type { BuyerInboxRow } from "../../lib/api/types";
import type { BuyerGroup, ProposalHeadLite, ProposalViewLine } from "./buyer.types";
import { generateBuyerProposalPdfDocument } from "./buyerProposalPdf.service";

type BuyerPdfBusyMember = "run" | "isBusy" | "show" | "hide";
type BuyerPdfBusyRecord = Partial<Record<BuyerPdfBusyMember, unknown>>;

export type BuyerPdfBusyInvalidReason =
  | "missing_flow_key"
  | "invalid_value"
  | "empty_payload"
  | "invalid_run"
  | "invalid_is_busy"
  | "invalid_show"
  | "invalid_hide"
  | "incomplete_manual_contract"
  | "missing_execution_contract";

export type BuyerPdfBusyBoundaryState =
  | {
      kind: "missing";
      flowKey: string;
    }
  | {
      kind: "invalid";
      flowKey: string;
      reason: BuyerPdfBusyInvalidReason;
      errorMessage: string;
    }
  | {
      kind: "loading";
      flowKey: string;
      busy: BusyLike;
    }
  | {
      kind: "ready";
      flowKey: string;
      busy: BusyLike;
    }
  | {
      kind: "terminal";
      flowKey: string;
      errorMessage: string;
    };

const BUYER_PDF_BUSY_MEMBERS: readonly BuyerPdfBusyMember[] = [
  "run",
  "isBusy",
  "show",
  "hide",
];
const BUYER_PROCUREMENT_REQUEST_ITEMS_SELECT =
  "id,request_id,rik_code,name_human,qty,uom,app_code,note,kind,item_kind,status,created_at,director_reject_note,director_reject_at";
const BUYER_PROCUREMENT_REQUEST_ITEMS_RPC = "request_items_by_request";
const BUYER_PROCUREMENT_REQUEST_ITEMS_PAGE_SIZE = 1000;
const BUYER_PROCUREMENT_REQUEST_ITEMS_MAX_ROWS = 10000;

type BuyerProcurementCanonicalRequestItemRow = {
  id?: string | number | null;
  request_id?: string | number | null;
  rik_code?: string | null;
  name_human?: string | null;
  qty?: string | number | null;
  uom?: string | null;
  app_code?: string | null;
  note?: string | null;
  kind?: string | null;
  item_kind?: string | null;
  status?: string | null;
  created_at?: string | null;
  director_reject_note?: string | null;
  director_reject_at?: string | null;
};

const isBuyerPdfBusyFunction = (
  value: unknown,
): value is (...args: unknown[]) => unknown => typeof value === "function";

const readBuyerPdfBusyText = (value: unknown) => String(value ?? "").trim();
const isBuyerProcurementRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isBuyerProcurementCanonicalRequestItemRow = (
  value: unknown,
): value is BuyerProcurementCanonicalRequestItemRow => {
  if (!isBuyerProcurementRecord(value)) return false;
  return Boolean(readBuyerPdfBusyText(value.id) && readBuyerPdfBusyText(value.request_id));
};

const isBuyerProcurementCanonicalRequestItemRows = (
  value: unknown,
): value is BuyerProcurementCanonicalRequestItemRow[] =>
  Array.isArray(value) &&
  value.every(isBuyerProcurementCanonicalRequestItemRow);

const readBuyerProcurementNumber = (value: unknown): number | string => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = readBuyerPdfBusyText(value);
  if (!text) return 0;
  const parsed = Number(text.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : text;
};

const canonicalRequestItemToBuyerProcurementPdfRow = (
  row: BuyerProcurementCanonicalRequestItemRow,
  base: BuyerInboxRow | null | undefined,
): BuyerInboxRow => {
  const requestId = readBuyerPdfBusyText(row.request_id) || readBuyerPdfBusyText(base?.request_id);
  const requestItemId = readBuyerPdfBusyText(row.id) || readBuyerPdfBusyText(base?.request_item_id);
  const kind = readBuyerPdfBusyText(row.kind) || readBuyerPdfBusyText(row.item_kind) || readBuyerPdfBusyText(base?.kind);

  return {
    request_id: requestId,
    request_id_old: base?.request_id_old ?? null,
    request_item_id: requestItemId,
    rik_code: readBuyerPdfBusyText(row.rik_code) || null,
    name_human: readBuyerPdfBusyText(row.name_human) || base?.name_human || "-",
    qty: readBuyerProcurementNumber(row.qty),
    uom: readBuyerPdfBusyText(row.uom) || null,
    app_code: readBuyerPdfBusyText(row.app_code) || null,
    note: readBuyerPdfBusyText(row.note) || null,
    kind: kind || null,
    object_name: base?.object_name ?? null,
    object: base?.object ?? null,
    site_address_snapshot: base?.site_address_snapshot ?? null,
    request_no: base?.request_no ?? null,
    display_no: base?.display_no ?? null,
    level_code: base?.level_code ?? null,
    system_code: base?.system_code ?? null,
    zone_code: base?.zone_code ?? null,
    request_note: base?.request_note ?? null,
    request_comment: base?.request_comment ?? null,
    need_by: base?.need_by ?? null,
    submitted_at: base?.submitted_at ?? null,
    approved_at: base?.approved_at ?? null,
    status: readBuyerPdfBusyText(row.status) || base?.status || "procurement_ready",
    created_at: readBuyerPdfBusyText(row.created_at) || base?.created_at,
    director_reject_note:
      readBuyerPdfBusyText(row.director_reject_note) || base?.director_reject_note || null,
    director_reject_at:
      readBuyerPdfBusyText(row.director_reject_at) || base?.director_reject_at || null,
    director_reject_reason: base?.director_reject_reason ?? null,
    last_offer_supplier: base?.last_offer_supplier ?? null,
    last_offer_price: base?.last_offer_price ?? null,
    last_offer_note: base?.last_offer_note ?? null,
  };
};

const mergeBuyerProcurementPdfItems = (
  canonicalRows: readonly BuyerProcurementCanonicalRequestItemRow[],
  fallbackItems: readonly BuyerInboxRow[],
): BuyerInboxRow[] => {
  if (!canonicalRows.length) return [...fallbackItems];

  const fallbackById = new Map<string, BuyerInboxRow>();
  for (const item of fallbackItems) {
    const id = readBuyerPdfBusyText(item.request_item_id);
    if (id) fallbackById.set(id, item);
  }

  const merged: BuyerInboxRow[] = [];
  const seen = new Set<string>();
  const base = fallbackItems[0] ?? null;
  for (const row of canonicalRows) {
    const id = readBuyerPdfBusyText(row.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(
      canonicalRequestItemToBuyerProcurementPdfRow(
        row,
        fallbackById.get(id) ?? base,
      ),
    );
  }

  for (const item of fallbackItems) {
    const id = readBuyerPdfBusyText(item.request_item_id);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    merged.push(item);
  }

  return merged;
};

async function loadBuyerProcurementPdfRowsFromRpc(params: {
  supabase: SupabaseClient;
  requestId: string;
}): Promise<BuyerProcurementCanonicalRequestItemRow[]> {
  const result = await callRateLimitedSupabaseRpc(
    params.supabase,
    BUYER_PROCUREMENT_REQUEST_ITEMS_RPC,
    { p_request_id: params.requestId },
    {
      context: {
        owner: "buyer.procurement_pdf",
        source: "parent_scoped_read",
      },
    },
  );
  const { data, error } = result as { data?: unknown; error?: unknown };
  if (error) throw error;

  return validateRpcResponse(
    data,
    isBuyerProcurementCanonicalRequestItemRows,
    {
      rpcName: BUYER_PROCUREMENT_REQUEST_ITEMS_RPC,
      caller: "useBuyerDocuments.loadBuyerProcurementPdfRowsFromRpc",
      domain: "buyer",
    },
  );
}

async function loadBuyerProcurementPdfRowsFromTable(params: {
  supabase: SupabaseClient;
  requestId: string;
}): Promise<BuyerProcurementCanonicalRequestItemRow[]> {
  const rows: BuyerProcurementCanonicalRequestItemRow[] = [];
  let offset = 0;

  for (;;) {
    if (rows.length >= BUYER_PROCUREMENT_REQUEST_ITEMS_MAX_ROWS) {
      throw new Error(
        `buyer procurement PDF request_items exceeded max row ceiling (${BUYER_PROCUREMENT_REQUEST_ITEMS_MAX_ROWS})`,
      );
    }

    const { data, error } = await params.supabase
      .from("request_items")
      .select(BUYER_PROCUREMENT_REQUEST_ITEMS_SELECT)
      .eq("request_id", params.requestId)
      .order("id", { ascending: true })
      .range(offset, offset + BUYER_PROCUREMENT_REQUEST_ITEMS_PAGE_SIZE - 1);

    if (error) throw error;
    const pageRows = Array.isArray(data)
      ? data.filter(isBuyerProcurementCanonicalRequestItemRow)
      : [];
    rows.push(...pageRows);

    if (pageRows.length < BUYER_PROCUREMENT_REQUEST_ITEMS_PAGE_SIZE) break;
    offset += BUYER_PROCUREMENT_REQUEST_ITEMS_PAGE_SIZE;
  }

  return rows;
}

async function loadBuyerProcurementPdfItems(params: {
  supabase: SupabaseClient;
  requestId: string;
  fallbackItems: readonly BuyerInboxRow[];
}): Promise<BuyerInboxRow[]> {
  const rpcRows = await loadBuyerProcurementPdfRowsFromRpc(params);
  const tableRows =
    params.fallbackItems.length > 0 &&
    rpcRows.length > params.fallbackItems.length
      ? []
      : await loadBuyerProcurementPdfRowsFromTable(params);
  const canonicalRows =
    tableRows.length > rpcRows.length ? tableRows : rpcRows;

  if (
    params.fallbackItems.length > 0 &&
    canonicalRows.length < params.fallbackItems.length
  ) {
    throw new Error(
      `buyer procurement PDF canonical row count mismatch (${canonicalRows.length}<${params.fallbackItems.length})`,
    );
  }

  return enrichBuyerRowsWithRequestContext(
    mergeBuyerProcurementPdfItems(canonicalRows, params.fallbackItems),
    {
      client: params.supabase as unknown as BuyerRequestContextQueryClient,
    },
  );
}

const hasBuyerPdfBusyMember = (
  record: BuyerPdfBusyRecord,
  key: BuyerPdfBusyMember,
) => Object.prototype.hasOwnProperty.call(record, key);

const toInvalidBuyerPdfBusyState = (
  flowKey: string,
  reason: BuyerPdfBusyInvalidReason,
  errorMessage: string,
): BuyerPdfBusyBoundaryState => ({
  kind: "invalid",
  flowKey,
  reason,
  errorMessage,
});

const getBuyerPdfBusyTerminalErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }

  return fallback;
};

export type OpenBuyerProposalPdfSnapshot = {
  head?: ProposalHeadLite | null;
  lines?: ProposalViewLine[] | null;
};

export function resolveBuyerPdfBusyBoundary(params: {
  busy: unknown;
  flowKey: unknown;
}): BuyerPdfBusyBoundaryState {
  const flowKey = readBuyerPdfBusyText(params.flowKey);
  if (!flowKey) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "missing_flow_key",
      "Buyer PDF busy flow key is missing",
    );
  }

  if (params.busy == null) {
    return {
      kind: "missing",
      flowKey,
    };
  }

  if (typeof params.busy !== "object") {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_value",
      "Buyer PDF busy contract is invalid",
    );
  }

  const candidate = params.busy as BuyerPdfBusyRecord;
  const hasBusyMember = BUYER_PDF_BUSY_MEMBERS.some((member) =>
    hasBuyerPdfBusyMember(candidate, member),
  );
  if (!hasBusyMember) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "empty_payload",
      "Buyer PDF busy contract is empty",
    );
  }

  if (hasBuyerPdfBusyMember(candidate, "run") && !isBuyerPdfBusyFunction(candidate.run)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_run",
      "Buyer PDF busy run handler is invalid",
    );
  }
  if (
    hasBuyerPdfBusyMember(candidate, "isBusy") &&
    !isBuyerPdfBusyFunction(candidate.isBusy)
  ) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_is_busy",
      "Buyer PDF busy state reader is invalid",
    );
  }
  if (hasBuyerPdfBusyMember(candidate, "show") && !isBuyerPdfBusyFunction(candidate.show)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_show",
      "Buyer PDF busy show handler is invalid",
    );
  }
  if (hasBuyerPdfBusyMember(candidate, "hide") && !isBuyerPdfBusyFunction(candidate.hide)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_hide",
      "Buyer PDF busy hide handler is invalid",
    );
  }

  const hasRun = isBuyerPdfBusyFunction(candidate.run);
  const hasIsBusy = isBuyerPdfBusyFunction(candidate.isBusy);
  const hasShow = isBuyerPdfBusyFunction(candidate.show);
  const hasHide = isBuyerPdfBusyFunction(candidate.hide);

  if (hasShow !== hasHide) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "incomplete_manual_contract",
      "Buyer PDF busy manual contract requires both show and hide handlers",
    );
  }

  if (!hasRun && !(hasShow && hasHide)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "missing_execution_contract",
      "Buyer PDF busy contract is missing execution controls",
    );
  }

  const normalizedBusy: BusyLike = {};
  if (hasRun) normalizedBusy.run = candidate.run as BusyLike["run"];
  if (hasIsBusy) normalizedBusy.isBusy = candidate.isBusy as BusyLike["isBusy"];
  if (hasShow) normalizedBusy.show = candidate.show as BusyLike["show"];
  if (hasHide) normalizedBusy.hide = candidate.hide as BusyLike["hide"];

  if (hasIsBusy) {
    try {
      if (normalizedBusy.isBusy?.(flowKey)) {
        return {
          kind: "loading",
          flowKey,
          busy: normalizedBusy,
        };
      }
    } catch (error) {
      return {
        kind: "terminal",
        flowKey,
        errorMessage: getBuyerPdfBusyTerminalErrorMessage(
          error,
          "Buyer PDF busy state inspection failed",
        ),
      };
    }
  }

  return {
    kind: "ready",
    flowKey,
    busy: normalizedBusy,
  };
}

export function normalizeBuyerPdfBusy(params: {
  busy: unknown;
  flowKey: unknown;
}): BusyLike | undefined {
  const state = resolveBuyerPdfBusyBoundary(params);
  if (state.kind === "ready" || state.kind === "loading") {
    return state.busy;
  }
  return undefined;
}

export function useBuyerDocuments(params: {
  busy: unknown;
  supabase: SupabaseClient;
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
}) {
  const { busy, supabase, onBeforeNavigate } = params;
  const router = useRouter();

  const openProposalPdf = useCallback(
    async (pid: string | number, snapshot?: OpenBuyerProposalPdfSnapshot | null) => {
      const id = String(pid || "").trim();
      if (!id) return;

      try {
        const title = `Предложение ${id.slice(0, 8)}`;
        const flowKey = `pdf:proposal:${id}`;
        const safeBusy = normalizeBuyerPdfBusy({
          busy,
          flowKey,
        });
        const fileName = buildPdfFileName({
          documentType: "proposal",
          title: "predlozhenie",
          entityId: id,
        });
        const template = await generateBuyerProposalPdfDocument({
          proposalId: id,
          title,
          fileName,
          head: snapshot?.head ?? null,
          lines: snapshot?.lines ?? null,
        });
        await prepareAndPreviewPdfDocument({
          busy: safeBusy,
          supabase,
          key: flowKey,
          label: "Открываю PDF…",
          descriptor: {
            ...template,
            title,
            fileName,
          },
          router,
          // XR-PDF: dismiss parent modal before pushing PDF viewer route
          onBeforeNavigate,
        });
      } catch (error) {
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
    },
    [busy, onBeforeNavigate, supabase, router],
  );

  const openProcurementPdf = useCallback(
    async (args: {
      group: BuyerGroup;
      requestLabel?: string | null;
      metaByRequestItemId?: Record<string, Partial<BuyerProcurementLineMeta> | undefined>;
    }) => {
      const id = String(args.group?.request_id || "").trim();
      if (!id) return;

      try {
        const items = await loadBuyerProcurementPdfItems({
          supabase,
          requestId: id,
          fallbackItems: args.group.items,
        });
        const view = buildBuyerProcurementPdfView({
          requestId: id,
          requestLabel: args.requestLabel,
          items,
          metaByRequestItemId: args.metaByRequestItemId,
        });
        const html = renderBuyerProcurementPdfHtml(view);
        const uri = await renderPdfHtmlToUri({
          html,
          documentType: "request",
          source: "buyer_procurement_pdf",
        });
        const title = view.title;
        const flowKey = `pdf:buyer:procurement:${id}`;
        const safeBusy = normalizeBuyerPdfBusy({
          busy,
          flowKey,
        });
        const descriptor = await createGeneratedPdfDocument({
          uri,
          title,
          fileName: buildPdfFileName({
            documentType: "request",
            title: "zakupochny_list",
            entityId: id,
          }),
          documentType: "request",
          originModule: "buyer",
          entityId: id,
        });

        await prepareAndPreviewPdfDocument({
          busy: safeBusy,
          supabase,
          key: flowKey,
          label: "Открываю закупочный лист…",
          descriptor,
          router,
          onBeforeNavigate,
        });
      } catch (error) {
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть закупочный лист"));
      }
    },
    [busy, onBeforeNavigate, router, supabase],
  );

  return { openProposalPdf, openProcurementPdf };
}
