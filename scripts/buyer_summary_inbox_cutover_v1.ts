import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";
import type { BuyerInboxRow } from "../src/lib/api/types";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
  summarizePlatformObservabilityEvents,
} from "../src/lib/observability/platformObservability";
import {
  loadBuyerInboxWindowData,
  type BuyerInboxLoadResult,
} from "../src/screens/buyer/buyer.fetchers";
import { matchesBuyerSearchQuery } from "../src/screens/buyer/buyer.list.selectors";
import { selectGroups } from "../src/screens/buyer/buyer.selectors";

type Timed<T> = {
  result: T;
  durationMs: number;
};

type LegacyStage = {
  stageName: string;
  sourceOwner: string;
  durationMs: number;
  rowCount: number;
  requiredForFirstPaint: boolean;
  canBeLazy: boolean;
  fallbackCapable: boolean;
  duplicateOrOverlapping: boolean;
};

type ProposalLifecycleRow = {
  proposal_id?: string | null;
  status?: string | null;
  sent_to_accountant_at?: string | null;
  submitted_at?: string | null;
};

type RejectContextRow = {
  id?: number | null;
  request_item_id?: string | null;
  supplier?: string | null;
  price?: number | null;
  note?: string | null;
  director_comment?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type LegacyInboxDetailed = {
  rows: BuyerInboxRow[];
  chain: LegacyStage[];
};

type BuyerInboxParityWindow = Omit<BuyerInboxLoadResult, "sourceMeta"> & {
  sourceMeta: {
    primaryOwner: string;
    fallbackUsed: boolean;
    sourceKind: string;
    parityStatus: "not_checked";
    backendFirstPrimary: boolean;
  };
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "buyer-summary-inbox-cutover-v1" } },
});

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const measure = async <T>(fn: () => Promise<T>): Promise<Timed<T>> => {
  const startedAt = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - startedAt,
  };
};

const normalizeStatusToken = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const isRequestApprovedForProcurement = (raw: unknown): boolean => {
  const status = normalizeStatusToken(raw);
  if (!status) return false;
  if (status.includes("на утверждении") || status.includes("pending")) return false;
  if (status === "approved") return true;
  if (
    status.includes("утверждено")
    || status.includes("утверждена")
    || status.includes("утверждёно")
    || status.includes("утверждёна")
  ) {
    return true;
  }
  return status.includes("закуп");
};

const isRejectedStatus = (raw: unknown): boolean => {
  const status = normalizeStatusToken(raw);
  return status.includes("отклон") || status.includes("reject");
};

const isReworkStatus = (raw: unknown): boolean => {
  const status = normalizeStatusToken(raw);
  return status.includes("доработ") || status.includes("rework");
};

const isRejectedInboxRow = (row: Partial<BuyerInboxRow> | null | undefined): boolean =>
  !!row && (!!row.director_reject_at || !!row.director_reject_note || isRejectedStatus(row.status));

const rowTimestampMs = (...values: (string | null | undefined)[]): number => {
  for (const value of values) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return 0;
};

async function loadLatestProposalLifecycleByRequestItem(
  client: SupabaseClient<Database>,
  requestItemIds: string[],
): Promise<{
  map: Map<string, ProposalLifecycleRow>;
  linksMs: number;
  linksRows: number;
  summaryMs: number;
  summaryRows: number;
}> {
  const ids = Array.from(new Set(requestItemIds.map((id) => String(id ?? "").trim()).filter(Boolean)));
  if (!ids.length) {
    return {
      map: new Map(),
      linksMs: 0,
      linksRows: 0,
      summaryMs: 0,
      summaryRows: 0,
    };
  }

  const proposalLinks = await measure(async () => {
    const { data, error } = await client
      .from("proposal_items_view")
      .select("proposal_id, request_item_id")
      .in("request_item_id", ids);
    if (error) throw error;
    return Array.isArray(data)
      ? data.map((row) => ({
          proposal_id: String(row.proposal_id ?? "").trim() || null,
          request_item_id: String(row.request_item_id ?? "").trim() || null,
        }))
      : [];
  });

  const proposalIds = Array.from(
    new Set(
      proposalLinks.result
        .map((row) => String(row.proposal_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  if (!proposalIds.length) {
    return {
      map: new Map(),
      linksMs: proposalLinks.durationMs,
      linksRows: proposalLinks.result.length,
      summaryMs: 0,
      summaryRows: 0,
    };
  }

  const summaries = await measure(async () => {
    const { data, error } = await client
      .from("v_proposals_summary")
      .select("proposal_id, status, sent_to_accountant_at, submitted_at")
      .in("proposal_id", proposalIds);
    if (error) throw error;
    return Array.isArray(data) ? (data as ProposalLifecycleRow[]) : [];
  });

  const proposalById = new Map<string, ProposalLifecycleRow>();
  for (const row of summaries.result) {
    const id = String(row.proposal_id ?? "").trim();
    if (!id) continue;
    proposalById.set(id, row);
  }

  const latestByRequestItem = new Map<string, { row: ProposalLifecycleRow; ts: number }>();
  for (const link of proposalLinks.result) {
    const requestItemId = String(link.request_item_id ?? "").trim();
    const proposalId = String(link.proposal_id ?? "").trim();
    const proposal = proposalById.get(proposalId);
    if (!requestItemId || !proposal) continue;
    const ts = rowTimestampMs(proposal.sent_to_accountant_at, proposal.submitted_at);
    const previous = latestByRequestItem.get(requestItemId);
    if (!previous || ts >= previous.ts) {
      latestByRequestItem.set(requestItemId, { row: proposal, ts });
    }
  }

  return {
    map: new Map(Array.from(latestByRequestItem.entries()).map(([key, value]) => [key, value.row])),
    linksMs: proposalLinks.durationMs,
    linksRows: proposalLinks.result.length,
    summaryMs: summaries.durationMs,
    summaryRows: summaries.result.length,
  };
}

async function filterInboxByRequestStatus(
  client: SupabaseClient<Database>,
  rows: BuyerInboxRow[],
): Promise<{
  rows: BuyerInboxRow[];
  requestStatusMs: number;
  requestStatusRows: number;
  linksMs: number;
  linksRows: number;
  summaryMs: number;
  summaryRows: number;
}> {
  const requestIds = Array.from(new Set(rows.map((row) => String(row.request_id ?? "").trim()).filter(Boolean)));
  if (!requestIds.length) {
    return {
      rows: [],
      requestStatusMs: 0,
      requestStatusRows: 0,
      linksMs: 0,
      linksRows: 0,
      summaryMs: 0,
      summaryRows: 0,
    };
  }

  const requestStatuses = await measure(async () => {
    const { data, error } = await client
      .from("requests")
      .select("id, status")
      .in("id", requestIds);
    if (error) throw error;
    return Array.isArray(data)
      ? data.map((row) => ({
          id: String(row.id ?? "").trim(),
          status: String(row.status ?? ""),
        }))
      : [];
  });

  const statusByRequestId = new Map<string, string>();
  for (const row of requestStatuses.result) {
    if (!row.id) continue;
    statusByRequestId.set(row.id, row.status);
  }

  const rejectedItemIds = rows
    .filter((row) => isRejectedInboxRow(row))
    .map((row) => String(row.request_item_id ?? "").trim())
    .filter(Boolean);

  const latestProposal = await loadLatestProposalLifecycleByRequestItem(client, rejectedItemIds);

  const filteredRows = rows.filter((row) => {
    const requestStatus = statusByRequestId.get(String(row.request_id ?? "").trim()) ?? "";
    const requestReady = isRequestApprovedForProcurement(requestStatus);
    const itemReady = isRequestApprovedForProcurement(row.status);

    if (isRejectedInboxRow(row)) {
      const latestProposalRow = latestProposal.map.get(String(row.request_item_id ?? "").trim());
      if (latestProposalRow) return isReworkStatus(latestProposalRow.status);
      return !requestReady && !itemReady;
    }

    if (itemReady) return true;
    return requestReady;
  });

  return {
    rows: filteredRows,
    requestStatusMs: requestStatuses.durationMs,
    requestStatusRows: requestStatuses.result.length,
    linksMs: latestProposal.linksMs,
    linksRows: latestProposal.linksRows,
    summaryMs: latestProposal.summaryMs,
    summaryRows: latestProposal.summaryRows,
  };
}

async function enrichRejectedRows(
  client: SupabaseClient<Database>,
  rows: BuyerInboxRow[],
): Promise<{
  rows: BuyerInboxRow[];
  rejectContextMs: number;
  rejectContextRows: number;
}> {
  const rejectedIds = Array.from(
    new Set(
      rows
        .filter((row) => isRejectedInboxRow(row))
        .map((row) => String(row.request_item_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  if (!rejectedIds.length) {
    return {
      rows,
      rejectContextMs: 0,
      rejectContextRows: 0,
    };
  }

  const rejectContext = await measure(async () => {
    const { data, error } = await client
      .from("proposal_items")
      .select("*")
      .in("request_item_id", rejectedIds);
    if (error) throw error;
    const rowsData = Array.isArray(data) ? (data as RejectContextRow[]) : [];
    rowsData.sort((left, right) => {
      const leftMs = rowTimestampMs(left.updated_at, left.created_at);
      const rightMs = rowTimestampMs(right.updated_at, right.created_at);
      return rightMs - leftMs;
    });
    return rowsData;
  });

  const byRequestItemId = new Map<string, RejectContextRow>();
  for (const row of rejectContext.result) {
    const requestItemId = String(row.request_item_id ?? "").trim();
    if (!requestItemId || byRequestItemId.has(requestItemId)) continue;
    byRequestItemId.set(requestItemId, row);
  }

  return {
    rows: rows.map((row) => {
      const requestItemId = String(row.request_item_id ?? "").trim();
      if (!requestItemId || !isRejectedInboxRow(row)) return row;
      const context = byRequestItemId.get(requestItemId);
      if (!context) return row;
      const reason = String(row.director_reject_note ?? context.director_comment ?? "").trim();
      return {
        ...row,
        director_reject_reason: reason || null,
        last_offer_supplier: String(context.supplier ?? "").trim() || null,
        last_offer_price:
          typeof context.price === "number" && Number.isFinite(context.price) ? Number(context.price) : null,
        last_offer_note: String(context.note ?? "").trim() || null,
      };
    }),
    rejectContextMs: rejectContext.durationMs,
    rejectContextRows: rejectContext.result.length,
  };
}

async function listBuyerInboxLegacyDetailed(client: SupabaseClient<Database>): Promise<LegacyInboxDetailed> {
  const baseRpc = await measure(async () => {
    const { data, error } = await client.rpc("list_buyer_inbox" as never, { p_company_id: null } as never);
    if (error) throw error;
    return Array.isArray(data) ? (data as BuyerInboxRow[]) : [];
  });

  const gated = await filterInboxByRequestStatus(client, baseRpc.result);
  const enriched = await enrichRejectedRows(client, gated.rows);

  return {
    rows: enriched.rows,
    chain: [
      {
        stageName: "base_rpc",
        sourceOwner: "rpc:list_buyer_inbox",
        durationMs: baseRpc.durationMs,
        rowCount: baseRpc.result.length,
        requiredForFirstPaint: true,
        canBeLazy: false,
        fallbackCapable: true,
        duplicateOrOverlapping: false,
      },
      {
        stageName: "request_status_gate",
        sourceOwner: "table:requests",
        durationMs: gated.requestStatusMs,
        rowCount: gated.requestStatusRows,
        requiredForFirstPaint: true,
        canBeLazy: false,
        fallbackCapable: false,
        duplicateOrOverlapping: false,
      },
      {
        stageName: "proposal_lifecycle_links",
        sourceOwner: "view:proposal_items_view",
        durationMs: gated.linksMs,
        rowCount: gated.linksRows,
        requiredForFirstPaint: false,
        canBeLazy: true,
        fallbackCapable: false,
        duplicateOrOverlapping: false,
      },
      {
        stageName: "proposal_lifecycle_summary",
        sourceOwner: "view:v_proposals_summary",
        durationMs: gated.summaryMs,
        rowCount: gated.summaryRows,
        requiredForFirstPaint: false,
        canBeLazy: true,
        fallbackCapable: false,
        duplicateOrOverlapping: false,
      },
      {
        stageName: "reject_context",
        sourceOwner: "table:proposal_items",
        durationMs: enriched.rejectContextMs,
        rowCount: enriched.rejectContextRows,
        requiredForFirstPaint: false,
        canBeLazy: true,
        fallbackCapable: false,
        duplicateOrOverlapping: false,
      },
    ],
  };
}

function sliceLegacyInboxWindow(params: {
  rows: BuyerInboxRow[];
  offsetGroups: number;
  limitGroups: number;
  search?: string | null;
}): BuyerInboxParityWindow {
  const { rows, offsetGroups, limitGroups, search } = params;
  const groups = selectGroups(rows);
  const filteredGroups = search?.trim()
    ? groups.filter((group) => matchesBuyerSearchQuery(group, search))
    : groups;
  const pageGroups = filteredGroups.slice(offsetGroups, offsetGroups + limitGroups);
  const pageRows = pageGroups.flatMap((group) => group.items);
  const requestIds = Array.from(
    new Set(pageRows.map((row) => String(row.request_id ?? "").trim()).filter(Boolean)),
  );

  return {
    rows: pageRows,
    requestIds,
    meta: {
      offsetGroups,
      limitGroups,
      returnedGroupCount: pageGroups.length,
      totalGroupCount: filteredGroups.length,
      hasMore: offsetGroups + pageGroups.length < filteredGroups.length,
      search: search?.trim() ? search.trim() : null,
    },
    sourceMeta: {
      primaryOwner: "legacy_client_group_window",
      fallbackUsed: false,
      sourceKind: "rpc:list_buyer_inbox+client_group_window",
      parityStatus: "not_checked",
      backendFirstPrimary: false,
    },
  };
}

const inboxRowSignature = (row: BuyerInboxRow) =>
  [
    row.request_id,
    row.request_item_id,
    row.request_id_old ?? "",
    row.rik_code ?? "",
    row.name_human ?? "",
    row.qty ?? "",
    row.uom ?? "",
    row.app_code ?? "",
    row.note ?? "",
    row.object_name ?? "",
    row.status ?? "",
    row.created_at ?? "",
    row.director_reject_note ?? "",
    row.director_reject_at ?? "",
    row.director_reject_reason ?? "",
    row.last_offer_supplier ?? "",
    row.last_offer_price ?? "",
    row.last_offer_note ?? "",
  ].join("|");

const compareInboxWindows = (
  legacy: BuyerInboxParityWindow,
  primary: BuyerInboxLoadResult,
) => {
  const legacyGroups = selectGroups(legacy.rows).map((group) => String(group.request_id));
  const primaryGroups = selectGroups(primary.rows).map((group) => String(group.request_id));
  const legacyRowSignatures = legacy.rows.map(inboxRowSignature).sort();
  const primaryRowSignatures = primary.rows.map(inboxRowSignature).sort();

  return {
    requestGroupOrderParityOk:
      legacyGroups.length === primaryGroups.length
      && legacyGroups.every((requestId, index) => requestId === primaryGroups[index]),
    rowSignatureParityOk:
      legacyRowSignatures.length === primaryRowSignatures.length
      && legacyRowSignatures.every((signature, index) => signature === primaryRowSignatures[index]),
    totalGroupCountParityOk: legacy.meta.totalGroupCount === primary.meta.totalGroupCount,
    returnedGroupCountParityOk: legacy.meta.returnedGroupCount === primary.meta.returnedGroupCount,
    hasMoreParityOk: legacy.meta.hasMore === primary.meta.hasMore,
    legacyGroupCount: legacy.meta.totalGroupCount,
    primaryGroupCount: primary.meta.totalGroupCount,
    legacyReturnedGroups: legacy.meta.returnedGroupCount,
    primaryReturnedGroups: primary.meta.returnedGroupCount,
    legacyRows: legacy.rows.length,
    primaryRows: primary.rows.length,
  };
};

const pickSearchSeed = (rows: BuyerInboxRow[]): string | null => {
  const firstRow = rows[0];
  if (!firstRow) return null;
  const rikCode = String(firstRow.rik_code ?? "").trim();
  if (rikCode) return rikCode.slice(0, Math.min(rikCode.length, 6));
  const nameHuman = String(firstRow.name_human ?? "").trim();
  if (nameHuman) return nameHuman.split(/\s+/).find((part) => part.length >= 3) ?? nameHuman.slice(0, 4);
  const objectName = String(firstRow.object_name ?? "").trim();
  if (objectName) return objectName.split(/\s+/).find((part) => part.length >= 3) ?? objectName.slice(0, 4);
  const requestId = String(firstRow.request_id ?? "").trim();
  return requestId ? requestId.slice(0, 6) : null;
};

async function main() {
  resetPlatformObservabilityEvents();

  const offsetGroups = 0;
  const limitGroups = 12;
  const legacyFull = await measure(async () => listBuyerInboxLegacyDetailed(supabase));
  const legacy = await measure(async () =>
    sliceLegacyInboxWindow({
      rows: legacyFull.result.rows,
      offsetGroups,
      limitGroups,
      search: null,
    }),
  );
  const primary = await measure(async () =>
    loadBuyerInboxWindowData({
      supabase,
      listBuyerInbox: async () => legacyFull.result.rows,
      offsetGroups,
      limitGroups,
      search: null,
    }),
  );

  const parity = compareInboxWindows(legacy.result, primary.result);
  const fullLegacyDurationMs = legacyFull.durationMs + legacy.durationMs;
  const searchSeed = pickSearchSeed(legacyFull.result.rows);

  let searchScenario: Record<string, unknown> | null = null;
  if (searchSeed) {
    const legacySearch = await measure(async () =>
      sliceLegacyInboxWindow({
        rows: legacyFull.result.rows,
        offsetGroups,
        limitGroups,
        search: searchSeed,
      }),
    );
    const primarySearch = await measure(async () =>
      loadBuyerInboxWindowData({
        supabase,
        listBuyerInbox: async () => legacyFull.result.rows,
        offsetGroups,
        limitGroups,
        search: searchSeed,
      }),
    );
    searchScenario = {
      search: searchSeed,
      legacyDurationMs: legacySearch.durationMs,
      primaryDurationMs: primarySearch.durationMs,
      parity: compareInboxWindows(legacySearch.result, primarySearch.result),
      fallbackUsed: primarySearch.result.sourceMeta.fallbackUsed,
    };
  }

  const clientWindowStage: LegacyStage = {
    stageName: "client_group_window",
    sourceOwner: "client:selectGroups+matchesBuyerSearchQuery",
    durationMs: legacy.durationMs,
    rowCount: legacy.result.rows.length,
    requiredForFirstPaint: true,
    canBeLazy: false,
    fallbackCapable: false,
    duplicateOrOverlapping: false,
  };

  const artifact = {
    status:
      primary.result.sourceMeta.primaryOwner === "rpc_scope_v1"
      && !primary.result.sourceMeta.fallbackUsed
      && parity.requestGroupOrderParityOk
      && parity.rowSignatureParityOk
      && parity.totalGroupCountParityOk
      && parity.returnedGroupCountParityOk
      && parity.hasMoreParityOk
      && (!searchScenario || Boolean((searchScenario.parity as Record<string, unknown>).rowSignatureParityOk))
      && primary.durationMs <= fullLegacyDurationMs
        ? "passed"
        : "failed",
    chainMap: {
      currentLegacyContour: legacyFull.result.chain.concat(clientWindowStage),
      requiredForFirstPaint: ["base_rpc", "request_status_gate", "client_group_window"],
      lazySupportOnly: legacyFull.result.chain.filter((stage) => stage.canBeLazy).map((stage) => stage.stageName),
    },
    legacy: {
      durationMs: fullLegacyDurationMs,
      loadDurationMs: legacyFull.durationMs,
      windowDurationMs: legacy.durationMs,
      rows: legacy.result.rows.length,
      groups: legacy.result.meta.totalGroupCount,
      sourceMeta: legacy.result.sourceMeta,
      meta: legacy.result.meta,
    },
    primary: {
      durationMs: primary.durationMs,
      rows: primary.result.rows.length,
      groups: primary.result.meta.totalGroupCount,
      sourceMeta: primary.result.sourceMeta,
      meta: primary.result.meta,
    },
    parity,
    searchScenario,
    events: getPlatformObservabilityEvents(),
    summary: summarizePlatformObservabilityEvents(getPlatformObservabilityEvents()),
  };

  writeArtifact("artifacts/buyer-summary-inbox-cutover-v1.json", artifact);
  writeArtifact("artifacts/buyer-summary-inbox-cutover-v1.summary.json", {
    status: artifact.status,
    chainMap: artifact.chainMap,
    legacy: artifact.legacy,
    primary: artifact.primary,
    parity: artifact.parity,
    searchScenario: artifact.searchScenario,
    topSlowFetches: artifact.summary.topSlowFetches.slice(0, 5),
  });

  console.log(
    JSON.stringify(
      {
        status: artifact.status,
        primaryOwner: primary.result.sourceMeta.primaryOwner,
        fallbackUsed: primary.result.sourceMeta.fallbackUsed,
        legacyDurationMs: fullLegacyDurationMs,
        primaryDurationMs: primary.durationMs,
        requestGroupOrderParityOk: parity.requestGroupOrderParityOk,
        rowSignatureParityOk: parity.rowSignatureParityOk,
        totalGroupCountParityOk: parity.totalGroupCountParityOk,
        hasMoreParityOk: parity.hasMoreParityOk,
      },
      null,
      2,
    ),
  );
}

void main();
