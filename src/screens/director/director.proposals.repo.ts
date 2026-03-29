import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../lib/database.types";
import { beginPlatformObservability } from "../../lib/observability/platformObservability";
import type { ProposalHead } from "./director.types";

type DirectorProposalScopeEnvelope = {
  document_type: "director_pending_proposals_scope";
  version: "v1";
  heads: {
    id?: unknown;
    submitted_at?: unknown;
    pretty?: unknown;
    items_count?: unknown;
  }[];
  meta: Record<string, unknown>;
};

export type DirectorProposalWindowMeta = {
  offsetHeads: number;
  limitHeads: number;
  returnedHeadCount: number;
  totalHeadCount: number;
  totalPositionsCount: number;
  hasMore: boolean;
};

export type DirectorProposalWindowSourceMeta = {
  primaryOwner: "rpc_scope_v1";
  fallbackUsed: false;
  sourceKind: "rpc:director_pending_proposals_scope_v1";
  rowParityStatus: "rpc_nonempty" | "rpc_empty";
};

export type DirectorProposalWindowResult = {
  heads: ProposalHead[];
  itemCounts: Record<string, number>;
  meta: DirectorProposalWindowMeta;
  sourceMeta: DirectorProposalWindowSourceMeta;
};

type FetchDirectorProposalWindowArgs = {
  supabase: SupabaseClient<Database>;
  offsetHeads: number;
  limitHeads: number;
};

const RPC_SOURCE_KIND: DirectorProposalWindowSourceMeta["sourceKind"] =
  "rpc:director_pending_proposals_scope_v1";

class DirectorProposalScopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorProposalScopeValidationError";
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const toInt = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

const toBoolean = (value: unknown): boolean => value === true || String(value ?? "").trim().toLowerCase() === "true";

const toNullableString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const requireRecord = (value: unknown, scope: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DirectorProposalScopeValidationError(`${scope} must be an object`);
  }
  return value as Record<string, unknown>;
};

const requireString = (value: unknown, field: string, scope: string): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new DirectorProposalScopeValidationError(`${scope}.${field} must be a non-empty string`);
  }
  return normalized;
};

const requireArray = (value: unknown, field: string, scope: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new DirectorProposalScopeValidationError(`${scope}.${field} must be an array`);
  }
  return value;
};

const adaptDirectorProposalScopeEnvelope = (value: unknown): DirectorProposalScopeEnvelope => {
  const root = requireRecord(value, "director_pending_proposals_scope_v1");
  const documentType = requireString(root.document_type, "document_type", "director_pending_proposals_scope_v1");
  if (documentType !== "director_pending_proposals_scope") {
    throw new DirectorProposalScopeValidationError(
      `director_pending_proposals_scope_v1 invalid document_type: ${documentType}`,
    );
  }
  const version = requireString(root.version, "version", "director_pending_proposals_scope_v1");
  if (version !== "v1") {
    throw new DirectorProposalScopeValidationError(`director_pending_proposals_scope_v1 invalid version: ${version}`);
  }
  return {
    document_type: "director_pending_proposals_scope",
    version: "v1",
    heads: requireArray(root.heads, "heads", "director_pending_proposals_scope_v1").map((headValue) => {
      const head = requireRecord(headValue, "director_pending_proposals_scope_v1.heads[]");
      return {
        id: head.id,
        submitted_at: head.submitted_at,
        pretty: head.pretty,
        items_count: head.items_count,
      };
    }),
    meta: asRecord(root.meta),
  };
};

const adaptHeads = (
  heads: DirectorProposalScopeEnvelope["heads"],
): { heads: ProposalHead[]; itemCounts: Record<string, number> } => {
  const nextHeads: ProposalHead[] = [];
  const itemCounts: Record<string, number> = {};
  for (const rawHead of heads) {
    const id = String(rawHead.id ?? "").trim();
    if (!id) continue;
    nextHeads.push({
      id,
      submitted_at: toNullableString(rawHead.submitted_at),
      pretty: toNullableString(rawHead.pretty),
    });
    itemCounts[id] = toInt(rawHead.items_count, 0);
  }
  return { heads: nextHeads, itemCounts };
};

const adaptMeta = (meta: Record<string, unknown>, offsetHeads: number, limitHeads: number): DirectorProposalWindowMeta => {
  const returnedHeadCount = toInt(meta.returned_head_count, 0);
  const totalHeadCount = toInt(meta.total_head_count, offsetHeads + returnedHeadCount);
  return {
    offsetHeads,
    limitHeads,
    returnedHeadCount,
    totalHeadCount,
    totalPositionsCount: toInt(meta.total_positions_count, 0),
    hasMore:
      meta.has_more != null
        ? toBoolean(meta.has_more)
        : offsetHeads + returnedHeadCount < totalHeadCount,
  };
};

export async function fetchDirectorPendingProposalWindow(
  args: FetchDirectorProposalWindowArgs,
): Promise<DirectorProposalWindowResult> {
  const offsetHeads = Math.max(0, args.offsetHeads);
  const limitHeads = Math.max(1, args.limitHeads);
  const observation = beginPlatformObservability({
    screen: "director",
    surface: "buyer_proposals",
    category: "fetch",
    event: "load_proposals_window",
    sourceKind: RPC_SOURCE_KIND,
  });

  try {
    const rpcArgs: Database["public"]["Functions"]["director_pending_proposals_scope_v1"]["Args"] = {
      p_offset_heads: offsetHeads,
      p_limit_heads: limitHeads,
    };
    const { data, error } = await args.supabase.rpc("director_pending_proposals_scope_v1", rpcArgs);
    if (error) throw error;

    const envelope = adaptDirectorProposalScopeEnvelope(data);
    const adaptedHeads = adaptHeads(envelope.heads);
    const meta = adaptMeta(envelope.meta, offsetHeads, limitHeads);
    const hasWindowTruth = meta.totalHeadCount > 0 || adaptedHeads.heads.length > 0;
    const rpcResult: DirectorProposalWindowResult = {
      heads: adaptedHeads.heads,
      itemCounts: adaptedHeads.itemCounts,
      meta,
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: RPC_SOURCE_KIND,
        rowParityStatus: hasWindowTruth ? "rpc_nonempty" : "rpc_empty",
      },
    };
    observation.success({
      rowCount: rpcResult.heads.length,
      extra: {
        offsetHeads: meta.offsetHeads,
        limitHeads: meta.limitHeads,
        totalHeadCount: meta.totalHeadCount,
        totalPositionsCount: meta.totalPositionsCount,
        rowParityStatus: rpcResult.sourceMeta.rowParityStatus,
      },
    });
    return rpcResult;
  } catch (error) {
    observation.error(error, { errorStage: "load_proposals_window_rpc" });
    throw error;
  }
}
