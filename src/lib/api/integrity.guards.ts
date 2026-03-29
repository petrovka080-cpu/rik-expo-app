import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { recordPlatformObservability } from "../observability/platformObservability";
import type { ProposalItemRow } from "./types";

type IntegrityGuardScreen = Parameters<typeof recordPlatformObservability>[0]["screen"];
type GuardContext = {
  screen: IntegrityGuardScreen;
  surface: string;
  sourceKind: string;
};

type ProposalContextRow = Pick<Database["public"]["Tables"]["proposals"]["Row"], "id" | "request_id">;
type RequestIdRow = Pick<Database["public"]["Tables"]["requests"]["Row"], "id">;
type RequestItemLinkRow = Pick<Database["public"]["Tables"]["request_items"]["Row"], "id" | "request_id">;

export type IntegrityGuardCode =
  | "missing_request"
  | "missing_proposal"
  | "missing_request_items"
  | "mismatched_request_items";

export class IntegrityGuardError extends Error {
  code: IntegrityGuardCode;
  details: Record<string, unknown>;

  constructor(code: IntegrityGuardCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "IntegrityGuardError";
    this.code = code;
    this.details = details;
  }
}

const trim = (value: unknown) => String(value ?? "").trim();

const chunkIds = <T,>(values: T[], size: number): T[][] => {
  if (size <= 0) return [values.slice()];
  const out: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    out.push(values.slice(index, index + size));
  }
  return out;
};

const normalizeIds = (values: readonly (string | null | undefined)[]) =>
  Array.from(new Set(values.map((value) => trim(value)).filter(Boolean)));

const recordGuardFailure = (
  context: GuardContext,
  code: IntegrityGuardCode,
  details: Record<string, unknown>,
) => {
  recordPlatformObservability({
    screen: context.screen,
    surface: context.surface,
    category: "fetch",
    event: "fk_guard_rejected",
    result: "error",
    sourceKind: context.sourceKind,
    errorStage: code,
    errorClass: "IntegrityGuardError",
    errorMessage: code,
    extra: details,
  });
};

const recordGuardDrop = (
  context: GuardContext,
  details: Record<string, unknown>,
  rowCount: number,
) => {
  recordPlatformObservability({
    screen: context.screen,
    surface: context.surface,
    category: "fetch",
    event: "fk_guard_orphan_rows_dropped",
    result: "error",
    sourceKind: context.sourceKind,
    rowCount,
    errorStage: "orphan_rows",
    errorClass: "IntegrityGuardError",
    errorMessage: "orphan_rows",
    extra: details,
  });
};

async function loadRequestIds(
  supabaseClient: SupabaseClient<Database>,
  requestIds: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  for (const pack of chunkIds(requestIds, 150)) {
    const result = await supabaseClient
      .from("requests")
      .select("id")
      .in("id", pack)
      .returns<RequestIdRow[]>();
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
      const id = trim(row.id);
      if (id) found.add(id);
    }
  }
  return found;
}

async function loadProposalContexts(
  supabaseClient: SupabaseClient<Database>,
  proposalIds: string[],
): Promise<Map<string, ProposalContextRow>> {
  const contexts = new Map<string, ProposalContextRow>();
  for (const pack of chunkIds(proposalIds, 150)) {
    const result = await supabaseClient
      .from("proposals")
      .select("id, request_id")
      .in("id", pack)
      .returns<ProposalContextRow[]>();
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
      const id = trim(row.id);
      if (id) contexts.set(id, row);
    }
  }
  return contexts;
}

async function loadRequestItemLinks(
  supabaseClient: SupabaseClient<Database>,
  requestItemIds: string[],
): Promise<Map<string, RequestItemLinkRow>> {
  const links = new Map<string, RequestItemLinkRow>();
  for (const pack of chunkIds(requestItemIds, 150)) {
    const result = await supabaseClient
      .from("request_items")
      .select("id, request_id")
      .in("id", pack)
      .returns<RequestItemLinkRow[]>();
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
      const id = trim(row.id);
      if (id) links.set(id, row);
    }
  }
  return links;
}

export async function ensureRequestExists(
  supabaseClient: SupabaseClient<Database>,
  requestId: string,
  context: GuardContext,
): Promise<string> {
  const normalizedRequestId = trim(requestId);
  if (!normalizedRequestId) {
    const error = new IntegrityGuardError("missing_request", "Request id is required", {
      requestId: normalizedRequestId,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  const existing = await loadRequestIds(supabaseClient, [normalizedRequestId]);
  if (existing.has(normalizedRequestId)) return normalizedRequestId;

  const error = new IntegrityGuardError("missing_request", "Request does not exist", {
    requestId: normalizedRequestId,
  });
  recordGuardFailure(context, error.code, error.details);
  throw error;
}

export async function ensureProposalExists(
  supabaseClient: SupabaseClient<Database>,
  proposalId: string,
  context: GuardContext,
): Promise<{ proposalId: string; requestId: string | null }> {
  const normalizedProposalId = trim(proposalId);
  if (!normalizedProposalId) {
    const error = new IntegrityGuardError("missing_proposal", "Proposal id is required", {
      proposalId: normalizedProposalId,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  const contexts = await loadProposalContexts(supabaseClient, [normalizedProposalId]);
  const proposal = contexts.get(normalizedProposalId);
  if (proposal) {
    return {
      proposalId: normalizedProposalId,
      requestId: trim(proposal.request_id) || null,
    };
  }

  const error = new IntegrityGuardError("missing_proposal", "Proposal does not exist", {
    proposalId: normalizedProposalId,
  });
  recordGuardFailure(context, error.code, error.details);
  throw error;
}

export async function ensureRequestItemsBelongToRequest(
  supabaseClient: SupabaseClient<Database>,
  requestId: string,
  requestItemIds: readonly string[],
  context: GuardContext,
): Promise<void> {
  const normalizedRequestId = await ensureRequestExists(supabaseClient, requestId, context);
  const normalizedRequestItemIds = normalizeIds(requestItemIds);
  if (!normalizedRequestItemIds.length) return;

  const links = await loadRequestItemLinks(supabaseClient, normalizedRequestItemIds);
  const missingRequestItemIds = normalizedRequestItemIds.filter((requestItemId) => !links.has(requestItemId));
  if (missingRequestItemIds.length > 0) {
    const error = new IntegrityGuardError("missing_request_items", "Request items do not exist", {
      requestId: normalizedRequestId,
      requestItemIds: missingRequestItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  const mismatchedRequestItemIds = normalizedRequestItemIds.filter((requestItemId) => {
    const link = links.get(requestItemId);
    return trim(link?.request_id) !== normalizedRequestId;
  });
  if (mismatchedRequestItemIds.length > 0) {
    const error = new IntegrityGuardError("mismatched_request_items", "Request items belong to another request", {
      requestId: normalizedRequestId,
      requestItemIds: mismatchedRequestItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }
}

export async function ensureProposalRequestItemsIntegrity(
  supabaseClient: SupabaseClient<Database>,
  proposalId: string,
  requestItemIds: readonly string[],
  context: GuardContext,
): Promise<void> {
  const proposal = await ensureProposalExists(supabaseClient, proposalId, context);
  const normalizedRequestItemIds = normalizeIds(requestItemIds);
  if (!normalizedRequestItemIds.length) return;

  const links = await loadRequestItemLinks(supabaseClient, normalizedRequestItemIds);
  const missingRequestItemIds = normalizedRequestItemIds.filter((requestItemId) => !links.has(requestItemId));
  if (missingRequestItemIds.length > 0) {
    const error = new IntegrityGuardError("missing_request_items", "Proposal links missing request items", {
      proposalId: proposal.proposalId,
      requestItemIds: missingRequestItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  if (!proposal.requestId) return;

  const mismatchedRequestItemIds = normalizedRequestItemIds.filter((requestItemId) => {
    const link = links.get(requestItemId);
    return trim(link?.request_id) !== proposal.requestId;
  });
  if (mismatchedRequestItemIds.length > 0) {
    const error = new IntegrityGuardError("mismatched_request_items", "Proposal links request items from another request", {
      proposalId: proposal.proposalId,
      proposalRequestId: proposal.requestId,
      requestItemIds: mismatchedRequestItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }
}

export async function filterProposalItemsByExistingRequestLinks(
  supabaseClient: SupabaseClient<Database>,
  rows: ProposalItemRow[],
  context: GuardContext & { proposalId: string },
): Promise<{
  rows: ProposalItemRow[];
  droppedRequestItemIds: string[];
}> {
  const linkedRequestItemIds = normalizeIds(rows.map((row) => trim(row.request_item_id)));
  if (!linkedRequestItemIds.length) {
    return {
      rows,
      droppedRequestItemIds: [],
    };
  }

  const links = await loadRequestItemLinks(supabaseClient, linkedRequestItemIds);
  const droppedRequestItemIds = linkedRequestItemIds.filter((requestItemId) => !links.has(requestItemId));
  if (!droppedRequestItemIds.length) {
    return {
      rows,
      droppedRequestItemIds: [],
    };
  }

  recordGuardDrop(
    context,
    {
      proposalId: context.proposalId,
      droppedRequestItemIds,
    },
    droppedRequestItemIds.length,
  );

  const droppedSet = new Set(droppedRequestItemIds);
  return {
    rows: rows.filter((row) => {
      const requestItemId = trim(row.request_item_id);
      return !requestItemId || !droppedSet.has(requestItemId);
    }),
    droppedRequestItemIds,
  };
}
