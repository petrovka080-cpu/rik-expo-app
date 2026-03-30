import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { recordPlatformObservability } from "../observability/platformObservability";
import {
  ACTIVE_PROPOSAL_REQUEST_ITEM_INTEGRITY_STATE,
  type ProposalRequestItemIntegrityFields,
  type ProposalRequestItemIntegrityReason,
  type ProposalRequestItemIntegrityRow,
  type ProposalRequestItemIntegrityState,
} from "./proposalIntegrity";
import type { ProposalItemRow } from "./types";

type IntegrityGuardScreen = Parameters<typeof recordPlatformObservability>[0]["screen"];
type GuardContext = {
  screen: IntegrityGuardScreen;
  surface: string;
  sourceKind: string;
};

type ProposalContextRow = Pick<Database["public"]["Tables"]["proposals"]["Row"], "id" | "request_id">;
type RequestIdRow = Pick<Database["public"]["Tables"]["requests"]["Row"], "id">;
type RequestItemLinkRow = Pick<
  Database["public"]["Tables"]["request_items"]["Row"],
  "id" | "request_id" | "status" | "cancelled_at"
>;
type ProposalItemLinkRow = Pick<Database["public"]["Tables"]["proposal_items"]["Row"], "id" | "proposal_id">;
type ProposalPaymentLinkRow = Pick<Database["public"]["Tables"]["proposal_payments"]["Row"], "id" | "proposal_id">;
type RequestLinkedRow = {
  id?: unknown;
  request_id?: unknown;
};
type ProposalLinkedRow = {
  id?: unknown;
  proposal_id?: unknown;
};
type PaymentProposalLinkedRow = {
  id?: unknown;
  payment_id?: unknown;
  proposal_id?: unknown;
};

export type IntegrityGuardCode =
  | "missing_request"
  | "missing_proposal"
  | "missing_request_items"
  | "cancelled_request_items"
  | "mismatched_request_items"
  | "missing_proposal_items"
  | "mismatched_proposal_items"
  | "missing_payments"
  | "mismatched_payments";

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

const normalizeIntegerIds = (values: readonly (string | null | undefined)[]) => {
  const normalizedTextIds = normalizeIds(values);
  const validTextIds: string[] = [];
  const validIds: number[] = [];
  const invalidIds: string[] = [];

  for (const id of normalizedTextIds) {
    if (/^\d+$/.test(id)) {
      validTextIds.push(id);
      validIds.push(Number(id));
      continue;
    }
    invalidIds.push(id);
  }

  return { validTextIds, validIds, invalidIds };
};

const getRowId = (row: { id?: unknown } | null | undefined) => trim(row?.id);

const recordGuardAllowed = (
  context: GuardContext,
  details: Record<string, unknown>,
  rowCount?: number,
) => {
  recordPlatformObservability({
    screen: context.screen,
    surface: context.surface,
    category: "fetch",
    event: "fk_guard_allowed",
    result: "success",
    sourceKind: context.sourceKind,
    rowCount,
    extra: details,
  });
};

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
      .select("id, request_id, status, cancelled_at")
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

const normalizeProposalRequestItemIntegrityState = (
  value: unknown,
): ProposalRequestItemIntegrityState => {
  const normalized = trim(value).toLowerCase();
  if (normalized === "source_cancelled") return "source_cancelled";
  if (normalized === "source_missing") return "source_missing";
  return ACTIVE_PROPOSAL_REQUEST_ITEM_INTEGRITY_STATE;
};

const normalizeProposalRequestItemIntegrityReason = (
  value: unknown,
): ProposalRequestItemIntegrityReason => {
  const normalized = trim(value).toLowerCase();
  if (normalized === "request_item_cancelled") return "request_item_cancelled";
  if (normalized === "request_item_missing") return "request_item_missing";
  return null;
};

const isCancelledRequestItemLink = (link: RequestItemLinkRow | undefined) => {
  if (!link) return false;
  if (trim(link.cancelled_at)) return true;
  const normalizedStatus = trim(link.status).toLowerCase();
  return (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled" ||
    normalizedStatus === "отменена" ||
    normalizedStatus === "отменено"
  );
};

async function loadProposalRequestItemIntegrity(
  supabaseClient: SupabaseClient<Database>,
  proposalId: string,
): Promise<Map<string, ProposalRequestItemIntegrityRow>> {
  const normalizedProposalId = trim(proposalId);
  const integrity = new Map<string, ProposalRequestItemIntegrityRow>();
  if (!normalizedProposalId) return integrity;

  const result = await supabaseClient.rpc("proposal_request_item_integrity_v1", {
    p_proposal_id: normalizedProposalId,
  });
  if (result.error) throw result.error;

  for (const rawRow of result.data ?? []) {
    const row = rawRow as Database["public"]["Functions"]["proposal_request_item_integrity_v1"]["Returns"][number];
    const requestItemId = trim(row.request_item_id);
    if (!requestItemId) continue;
    integrity.set(requestItemId, {
      proposal_id: trim(row.proposal_id),
      proposal_item_id: Number(row.proposal_item_id ?? 0),
      request_item_id: requestItemId,
      integrity_state: normalizeProposalRequestItemIntegrityState(row.integrity_state),
      integrity_reason: normalizeProposalRequestItemIntegrityReason(row.integrity_reason),
      request_item_exists: row.request_item_exists === true,
      request_item_status: trim(row.request_item_status) || null,
      request_item_cancelled_at: trim(row.request_item_cancelled_at) || null,
    });
  }

  return integrity;
}

async function loadProposalItemLinks(
  supabaseClient: SupabaseClient<Database>,
  proposalItemIds: string[],
): Promise<Map<string, ProposalItemLinkRow>> {
  const normalized = normalizeIntegerIds(proposalItemIds);
  const links = new Map<string, ProposalItemLinkRow>();
  if (!normalized.validIds.length) return links;

  for (const pack of chunkIds(normalized.validIds, 150)) {
    const result = await supabaseClient
      .from("proposal_items")
      .select("id, proposal_id")
      .in("id", pack)
      .returns<ProposalItemLinkRow[]>();
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
      const id = trim(row.id);
      if (id) links.set(id, row);
    }
  }
  return links;
}

async function loadProposalPaymentLinks(
  supabaseClient: SupabaseClient<Database>,
  paymentIds: string[],
): Promise<Map<string, ProposalPaymentLinkRow>> {
  const normalized = normalizeIntegerIds(paymentIds);
  const links = new Map<string, ProposalPaymentLinkRow>();
  if (!normalized.validIds.length) return links;

  for (const pack of chunkIds(normalized.validIds, 150)) {
    const result = await supabaseClient
      .from("proposal_payments")
      .select("id, proposal_id")
      .in("id", pack)
      .returns<ProposalPaymentLinkRow[]>();
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
      linkType: "request",
      requestId: normalizedRequestId,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  const existing = await loadRequestIds(supabaseClient, [normalizedRequestId]);
  if (existing.has(normalizedRequestId)) {
    recordGuardAllowed(context, {
      linkType: "request",
      requestId: normalizedRequestId,
    }, 1);
    return normalizedRequestId;
  }

  const error = new IntegrityGuardError("missing_request", "Request does not exist", {
    linkType: "request",
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
      linkType: "proposal",
      proposalId: normalizedProposalId,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  const contexts = await loadProposalContexts(supabaseClient, [normalizedProposalId]);
  const proposal = contexts.get(normalizedProposalId);
  if (proposal) {
    const result = {
      proposalId: normalizedProposalId,
      requestId: trim(proposal.request_id) || null,
    };
    recordGuardAllowed(context, {
      linkType: "proposal",
      proposalId: normalizedProposalId,
      requestId: result.requestId,
    }, 1);
    return result;
  }

  const error = new IntegrityGuardError("missing_proposal", "Proposal does not exist", {
    linkType: "proposal",
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
  if (!normalizedRequestItemIds.length) {
    recordGuardAllowed(context, {
      linkType: "request_item->request",
      requestId: normalizedRequestId,
      checkedRequestItemIds: [],
    }, 0);
    return;
  }

  const links = await loadRequestItemLinks(supabaseClient, normalizedRequestItemIds);
  const missingRequestItemIds = normalizedRequestItemIds.filter((requestItemId) => !links.has(requestItemId));
  if (missingRequestItemIds.length > 0) {
    const error = new IntegrityGuardError("missing_request_items", "Request items do not exist", {
      linkType: "request_item->request",
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
      linkType: "request_item->request",
      requestId: normalizedRequestId,
      requestItemIds: mismatchedRequestItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  recordGuardAllowed(context, {
    linkType: "request_item->request",
    requestId: normalizedRequestId,
    checkedRequestItemIds: normalizedRequestItemIds,
  }, normalizedRequestItemIds.length);
}

export async function ensureProposalRequestItemsIntegrity(
  supabaseClient: SupabaseClient<Database>,
  proposalId: string,
  requestItemIds: readonly string[],
  context: GuardContext,
): Promise<void> {
  const proposal = await ensureProposalExists(supabaseClient, proposalId, context);
  const normalizedRequestItemIds = normalizeIds(requestItemIds);
  if (!normalizedRequestItemIds.length) {
    recordGuardAllowed(context, {
      linkType: "proposal_item.request_item_id->request_items.id",
      proposalId: proposal.proposalId,
      proposalRequestId: proposal.requestId,
      checkedRequestItemIds: [],
    }, 0);
    return;
  }

  const links = await loadRequestItemLinks(supabaseClient, normalizedRequestItemIds);
  const missingRequestItemIds = normalizedRequestItemIds.filter((requestItemId) => !links.has(requestItemId));
  if (missingRequestItemIds.length > 0) {
    const error = new IntegrityGuardError("missing_request_items", "Proposal links missing request items", {
      linkType: "proposal_item.request_item_id->request_items.id",
      proposalId: proposal.proposalId,
      requestItemIds: missingRequestItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  if (!proposal.requestId) {
    recordGuardAllowed(context, {
      linkType: "proposal_item.request_item_id->request_items.id",
      proposalId: proposal.proposalId,
      proposalRequestId: null,
      checkedRequestItemIds: normalizedRequestItemIds,
    }, normalizedRequestItemIds.length);
    return;
  }

  const mismatchedRequestItemIds = normalizedRequestItemIds.filter((requestItemId) => {
    const link = links.get(requestItemId);
    return trim(link?.request_id) !== proposal.requestId;
  });
  if (mismatchedRequestItemIds.length > 0) {
    const error = new IntegrityGuardError("mismatched_request_items", "Proposal links request items from another request", {
      linkType: "proposal_item.request_item_id->request_items.id",
      proposalId: proposal.proposalId,
      proposalRequestId: proposal.requestId,
      requestItemIds: mismatchedRequestItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  recordGuardAllowed(context, {
    linkType: "proposal_item.request_item_id->request_items.id",
    proposalId: proposal.proposalId,
    proposalRequestId: proposal.requestId,
    checkedRequestItemIds: normalizedRequestItemIds,
  }, normalizedRequestItemIds.length);
}

export async function ensureActiveProposalRequestItemsIntegrity(
  supabaseClient: SupabaseClient<Database>,
  proposalId: string,
  requestItemIds: readonly string[],
  context: GuardContext,
): Promise<void> {
  await ensureProposalRequestItemsIntegrity(supabaseClient, proposalId, requestItemIds, context);

  const normalizedRequestItemIds = normalizeIds(requestItemIds);
  if (!normalizedRequestItemIds.length) return;

  const links = await loadRequestItemLinks(supabaseClient, normalizedRequestItemIds);
  const cancelledRequestItemIds = normalizedRequestItemIds.filter((requestItemId) =>
    isCancelledRequestItemLink(links.get(requestItemId)),
  );
  if (!cancelledRequestItemIds.length) return;

  const error = new IntegrityGuardError(
    "cancelled_request_items",
    "Proposal links request items that are cancelled",
    {
      linkType: "proposal_item.request_item_id->request_items.id",
      proposalId: trim(proposalId),
      requestItemIds: cancelledRequestItemIds,
      integrityState: "source_cancelled",
    },
  );
  recordGuardFailure(context, error.code, error.details);
  throw error;
}

export async function ensureProposalItemIdsBelongToProposal(
  supabaseClient: SupabaseClient<Database>,
  proposalId: string,
  proposalItemIds: readonly string[],
  context: GuardContext,
): Promise<void> {
  const proposal = await ensureProposalExists(supabaseClient, proposalId, context);
  const normalized = normalizeIntegerIds(proposalItemIds);
  if (normalized.invalidIds.length > 0) {
    const error = new IntegrityGuardError("missing_proposal_items", "Proposal item ids must be numeric", {
      linkType: "proposal_payment_allocations.proposal_item_id->proposal_items.id",
      proposalId: proposal.proposalId,
      proposalItemIds: normalized.invalidIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  if (!normalized.validTextIds.length) {
    recordGuardAllowed(context, {
      linkType: "proposal_payment_allocations.proposal_item_id->proposal_items.id",
      proposalId: proposal.proposalId,
      checkedProposalItemIds: [],
    }, 0);
    return;
  }

  const links = await loadProposalItemLinks(supabaseClient, normalized.validTextIds);
  const missingProposalItemIds = normalized.validTextIds.filter((proposalItemId) => !links.has(proposalItemId));
  if (missingProposalItemIds.length > 0) {
    const error = new IntegrityGuardError("missing_proposal_items", "Proposal items do not exist", {
      linkType: "proposal_payment_allocations.proposal_item_id->proposal_items.id",
      proposalId: proposal.proposalId,
      proposalItemIds: missingProposalItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  const mismatchedProposalItemIds = normalized.validTextIds.filter((proposalItemId) => {
    const link = links.get(proposalItemId);
    return trim(link?.proposal_id) !== proposal.proposalId;
  });
  if (mismatchedProposalItemIds.length > 0) {
    const error = new IntegrityGuardError("mismatched_proposal_items", "Proposal items belong to another proposal", {
      linkType: "proposal_payment_allocations.proposal_item_id->proposal_items.id",
      proposalId: proposal.proposalId,
      proposalItemIds: mismatchedProposalItemIds,
    });
    recordGuardFailure(context, error.code, error.details);
    throw error;
  }

  recordGuardAllowed(context, {
    linkType: "proposal_payment_allocations.proposal_item_id->proposal_items.id",
    proposalId: proposal.proposalId,
    checkedProposalItemIds: normalized.validTextIds,
  }, normalized.validTextIds.length);
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
      linkType: "proposal_item.request_item_id->request_items.id",
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

export async function classifyProposalItemsByRequestItemIntegrity(
  supabaseClient: SupabaseClient<Database>,
  rows: ProposalItemRow[],
  context: GuardContext & { proposalId: string },
): Promise<{
  rows: ProposalItemRow[];
  degradedRequestItemIds: string[];
  cancelledRequestItemIds: string[];
  missingRequestItemIds: string[];
}> {
  if (!rows.length) {
    return {
      rows,
      degradedRequestItemIds: [],
      cancelledRequestItemIds: [],
      missingRequestItemIds: [],
    };
  }

  const integrityByRequestItemId = await loadProposalRequestItemIntegrity(
    supabaseClient,
    context.proposalId,
  );

  const degradedRequestItemIds: string[] = [];
  const cancelledRequestItemIds: string[] = [];
  const missingRequestItemIds: string[] = [];

  const classifiedRows = rows.map((row) => {
    const requestItemId = trim(row.request_item_id);
    const integrity = requestItemId ? integrityByRequestItemId.get(requestItemId) : null;
    const integrityState =
      integrity?.integrity_state ??
      (!requestItemId ? "source_missing" : ACTIVE_PROPOSAL_REQUEST_ITEM_INTEGRITY_STATE);
    const integrityReason =
      integrity?.integrity_reason ??
      (!requestItemId ? "request_item_missing" : null);
    const requestItemSourceStatus = integrity?.request_item_status ?? null;
    const requestItemCancelledAt = integrity?.request_item_cancelled_at ?? null;

    if (requestItemId && integrityState !== ACTIVE_PROPOSAL_REQUEST_ITEM_INTEGRITY_STATE) {
      degradedRequestItemIds.push(requestItemId);
      if (integrityState === "source_cancelled") cancelledRequestItemIds.push(requestItemId);
      if (integrityState === "source_missing") missingRequestItemIds.push(requestItemId);
    }

    const fields: ProposalRequestItemIntegrityFields = {
      request_item_integrity_state: integrityState,
      request_item_integrity_reason: integrityReason,
      request_item_source_status: requestItemSourceStatus,
      request_item_cancelled_at: requestItemCancelledAt,
    };
    return { ...row, ...fields };
  });

  if (degradedRequestItemIds.length) {
    recordPlatformObservability({
      screen: context.screen,
      surface: context.surface,
      category: "fetch",
      event: "proposal_request_item_integrity_degraded",
      result: "error",
      sourceKind: context.sourceKind,
      rowCount: degradedRequestItemIds.length,
      errorStage: "request_item_integrity",
      errorClass: "ProposalRequestItemIntegrityDegraded",
      errorMessage: "proposal_request_item_integrity_degraded",
      extra: {
        proposalId: context.proposalId,
        degradedRequestItemIds,
        cancelledRequestItemIds,
        missingRequestItemIds,
        publishState: "degraded",
      },
    });
  }

  return {
    rows: classifiedRows,
    degradedRequestItemIds,
    cancelledRequestItemIds,
    missingRequestItemIds,
  };
}

export async function filterRequestLinkedRowsByExistingRequestLinks<T extends RequestLinkedRow>(
  supabaseClient: SupabaseClient<Database>,
  rows: readonly T[],
  context: GuardContext & { relation: string },
): Promise<{
  rows: T[];
  droppedRowIds: string[];
  droppedRequestIds: string[];
}> {
  const linkedRequestIds = normalizeIds(rows.map((row) => trim(row.request_id)));
  if (!linkedRequestIds.length) {
    return {
      rows: [...rows],
      droppedRowIds: [],
      droppedRequestIds: [],
    };
  }

  const existingRequestIds = await loadRequestIds(supabaseClient, linkedRequestIds);
  const droppedRows = rows.filter((row) => {
    const requestId = trim(row.request_id);
    return !!requestId && !existingRequestIds.has(requestId);
  });
  if (!droppedRows.length) {
    return {
      rows: [...rows],
      droppedRowIds: [],
      droppedRequestIds: [],
    };
  }

  const droppedRowIds = normalizeIds(droppedRows.map((row) => getRowId(row)));
  const droppedRequestIds = normalizeIds(droppedRows.map((row) => trim(row.request_id)));
  recordGuardDrop(context, {
    linkType: "child.request_id->requests.id",
    relation: context.relation,
    droppedRowIds,
    droppedRequestIds,
  }, droppedRows.length);

  const droppedRequestIdSet = new Set(droppedRequestIds);
  return {
    rows: rows.filter((row) => {
      const requestId = trim(row.request_id);
      return !requestId || !droppedRequestIdSet.has(requestId);
    }),
    droppedRowIds,
    droppedRequestIds,
  };
}

export async function filterProposalLinkedRowsByExistingProposalLinks<T extends ProposalLinkedRow>(
  supabaseClient: SupabaseClient<Database>,
  rows: readonly T[],
  context: GuardContext & { relation: string },
): Promise<{
  rows: T[];
  droppedRowIds: string[];
  droppedProposalIds: string[];
}> {
  const linkedProposalIds = normalizeIds(rows.map((row) => trim(row.proposal_id)));
  if (!linkedProposalIds.length) {
    return {
      rows: [...rows],
      droppedRowIds: [],
      droppedProposalIds: [],
    };
  }

  const proposals = await loadProposalContexts(supabaseClient, linkedProposalIds);
  const droppedRows = rows.filter((row) => {
    const proposalId = trim(row.proposal_id);
    return !!proposalId && !proposals.has(proposalId);
  });
  if (!droppedRows.length) {
    return {
      rows: [...rows],
      droppedRowIds: [],
      droppedProposalIds: [],
    };
  }

  const droppedRowIds = normalizeIds(droppedRows.map((row) => getRowId(row)));
  const droppedProposalIds = normalizeIds(droppedRows.map((row) => trim(row.proposal_id)));
  recordGuardDrop(context, {
    linkType: "child.proposal_id->proposals.id",
    relation: context.relation,
    droppedRowIds,
    droppedProposalIds,
  }, droppedRows.length);

  const droppedProposalIdSet = new Set(droppedProposalIds);
  return {
    rows: rows.filter((row) => {
      const proposalId = trim(row.proposal_id);
      return !proposalId || !droppedProposalIdSet.has(proposalId);
    }),
    droppedRowIds,
    droppedProposalIds,
  };
}

export async function filterPaymentRowsByExistingPaymentProposalLinks<T extends PaymentProposalLinkedRow>(
  supabaseClient: SupabaseClient<Database>,
  rows: readonly T[],
  context: GuardContext & { relation: string },
): Promise<{
  rows: T[];
  droppedRowIds: string[];
  droppedPaymentIds: string[];
  droppedProposalIds: string[];
}> {
  const normalizedPaymentIds = normalizeIntegerIds(rows.map((row) => trim(row.payment_id)));
  const invalidPaymentIdSet = new Set(normalizedPaymentIds.invalidIds);
  const paymentLinks = await loadProposalPaymentLinks(supabaseClient, normalizedPaymentIds.validTextIds);

  const droppedRows = rows.filter((row) => {
    const paymentId = trim(row.payment_id);
    const proposalId = trim(row.proposal_id);
    if (!paymentId || !proposalId) return false;
    if (invalidPaymentIdSet.has(paymentId)) return true;
    const payment = paymentLinks.get(paymentId);
    return !payment || trim(payment.proposal_id) !== proposalId;
  });
  if (!droppedRows.length) {
    return {
      rows: [...rows],
      droppedRowIds: [],
      droppedPaymentIds: [],
      droppedProposalIds: [],
    };
  }

  const droppedRowIds = normalizeIds(droppedRows.map((row) => getRowId(row)));
  const droppedPaymentIds = normalizeIds(droppedRows.map((row) => trim(row.payment_id)));
  const droppedProposalIds = normalizeIds(droppedRows.map((row) => trim(row.proposal_id)));
  recordGuardDrop(context, {
    linkType: "proposal_payments.id->proposals.id",
    relation: context.relation,
    droppedRowIds,
    droppedPaymentIds,
    droppedProposalIds,
  }, droppedRows.length);

  const droppedPairs = new Set(droppedRows.map((row) => `${trim(row.payment_id)}::${trim(row.proposal_id)}`));
  return {
    rows: rows.filter((row) => !droppedPairs.has(`${trim(row.payment_id)}::${trim(row.proposal_id)}`)),
    droppedRowIds,
    droppedPaymentIds,
    droppedProposalIds,
  };
}
