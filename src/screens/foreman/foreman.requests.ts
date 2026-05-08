import { supabase } from "../../lib/supabaseClient";
import { loadPagedRowsWithCeiling, type PagedQuery } from "../../lib/api/_core";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { probeForemanRequestsHasRequestNo } from "./foreman.requests.transport";
import type {
  ForemanRequestRow,
  ForemanRequestUpdate,
} from "../../types/contracts/foreman";

type RequestRow = ForemanRequestRow;
type RequestUpdate = ForemanRequestUpdate;

type RequestDisplayRow = Pick<RequestRow, "display_no" | "request_no">;
type RequestLinkRow = Pick<RequestRow, "id" | "subcontract_id" | "contractor_job_id">;
type LinkedDraftRequestRow = Pick<
  RequestRow,
  "id" | "display_no" | "request_no" | "status" | "subcontract_id" | "contractor_job_id" | "created_at"
>;
type LinkedRequestSummaryRow = Pick<
  RequestRow,
  "id" | "display_no" | "request_no" | "created_at" | "subcontract_id" | "contractor_job_id"
>;
type RequestPatchError = {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
};

export type ForemanRequestDirectPatch = Pick<
  RequestUpdate,
  "subcontract_id" | "contractor_job_id" | "object_name"
>;

const errText = (value: unknown): string => {
  if (value instanceof Error && value.message.trim()) return value.message.trim();
  if (value && typeof value === "object" && "message" in value) {
    const message = String((value as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return String(value ?? "");
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let requestsHasRequestNoCache: boolean | null = null;
type RequestsHasRequestNoCacheEntry = {
  value: boolean;
  ts: number;
  mode: "positive" | "negative";
};

const REQUEST_NO_CAPABILITY_POSITIVE_TTL_MS = 5 * 60 * 1000;
const REQUEST_NO_CAPABILITY_NEGATIVE_TTL_MS = 60 * 1000;
const FOREMAN_REQUEST_LINK_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 };

let requestsHasRequestNoCacheEntry: RequestsHasRequestNoCacheEntry | null = null;

const isCapabilityCacheFresh = (entry: RequestsHasRequestNoCacheEntry | null) =>
  !!entry &&
  Date.now() - entry.ts <
    (entry.mode === "positive"
      ? REQUEST_NO_CAPABILITY_POSITIVE_TTL_MS
      : REQUEST_NO_CAPABILITY_NEGATIVE_TTL_MS);

const setRequestNoCapabilityCache = (value: boolean, mode: "positive" | "negative") => {
  requestsHasRequestNoCache = value;
  requestsHasRequestNoCacheEntry = {
    value,
    ts: Date.now(),
    mode,
  };
};

export function invalidateForemanRequestNoCapabilityCache() {
  requestsHasRequestNoCache = null;
  requestsHasRequestNoCacheEntry = null;
  recordPlatformObservability({
    screen: "foreman",
    surface: "request_label",
    category: "reload",
    event: "invalidate_request_no_capability_cache",
    result: "success",
    sourceKind: "manual_invalidation",
  });
}

export async function resolveRequestsHasRequestNo(): Promise<boolean> {
  if (isCapabilityCacheFresh(requestsHasRequestNoCacheEntry)) {
    recordPlatformObservability({
      screen: "foreman",
      surface: "request_label",
      category: "fetch",
      event: "resolve_request_no_capability",
      result: "cache_hit",
      sourceKind: "schema_probe",
      fallbackUsed: requestsHasRequestNoCacheEntry?.mode === "negative",
      extra: {
        cacheMode: requestsHasRequestNoCacheEntry?.mode ?? "unknown",
      },
    });
    return requestsHasRequestNoCacheEntry!.value;
  }
  try {
    await probeForemanRequestsHasRequestNo();
    setRequestNoCapabilityCache(true, "positive");
    recordPlatformObservability({
      screen: "foreman",
      surface: "request_label",
      category: "fetch",
      event: "resolve_request_no_capability",
      result: "success",
      sourceKind: "schema_probe",
      fallbackUsed: false,
      extra: {
        cacheMode: "positive",
      },
    });
    return true;
  } catch (error) {
    setRequestNoCapabilityCache(false, "negative");
    recordPlatformObservability({
      screen: "foreman",
      surface: "request_label",
      category: "fetch",
      event: "resolve_request_no_capability",
      result: "error",
      sourceKind: "schema_probe",
      fallbackUsed: true,
      errorStage: "request_no_probe",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: errText(error),
      extra: {
        cacheMode: "negative",
      },
    });
    return false;
  }
}

export async function fetchForemanRequestDisplayLabel(requestId: string): Promise<string | null> {
  const hasRequestNo = await resolveRequestsHasRequestNo();
  const primarySelect = hasRequestNo ? "request_no, display_no" : "display_no";

  let query = await supabase
    .from("requests")
    .select(primarySelect)
    .eq("id", requestId)
    .maybeSingle<RequestDisplayRow>();

  if (query.error) {
    const message = errText(query.error).toLowerCase();
    const requestNoMissing =
      primarySelect.includes("request_no") &&
      (message.includes("request_no") || message.includes("column") || message.includes("does not exist"));

    if (!requestNoMissing) throw query.error;

    setRequestNoCapabilityCache(false, "negative");
    query = await supabase
      .from("requests")
      .select("display_no")
      .eq("id", requestId)
      .maybeSingle<RequestDisplayRow>();
  } else if (primarySelect.includes("request_no")) {
    setRequestNoCapabilityCache(true, "positive");
  }

  if (query.error || !query.data) return null;

  const label = String(query.data.request_no ?? query.data.display_no ?? "").trim();
  return label || null;
}

export async function patchForemanRequestLink(
  requestId: string,
  patch: ForemanRequestDirectPatch,
): Promise<RequestPatchError | null> {
  const result = await supabase.from("requests").update(patch).eq("id", requestId);
  if (!result.error) return null;

  return {
    message: errText(result.error),
    code: String((result.error as { code?: unknown }).code ?? ""),
    details: String((result.error as { details?: unknown }).details ?? "") || null,
    hint: String((result.error as { hint?: unknown }).hint ?? "") || null,
  };
}

export async function fetchForemanRequestLink(requestId: string): Promise<RequestLinkRow | null> {
  const query = await supabase
    .from("requests")
    .select("id, subcontract_id, contractor_job_id")
    .eq("id", requestId)
    .maybeSingle<RequestLinkRow>();

  if (query.error) throw query.error;
  return query.data ?? null;
}

export function pickForemanRequestLinkId(row: RequestLinkRow | null | undefined): string {
  return String(row?.subcontract_id ?? row?.contractor_job_id ?? "").trim();
}

export async function listLinkedRequestsByLink(linkId: string): Promise<LinkedRequestSummaryRow[]> {
  const normalized = String(linkId || "").trim();
  if (!normalized) return [];

  const select = "id, display_no, request_no, created_at, subcontract_id, contractor_job_id";
  const [primary, fallback] = await Promise.all([
    loadPagedRowsWithCeiling<LinkedRequestSummaryRow>(
      () =>
        supabase
          .from("requests")
          .select(select)
          .eq("subcontract_id", normalized)
          .not("display_no", "is", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true }) as unknown as PagedQuery<LinkedRequestSummaryRow>,
      FOREMAN_REQUEST_LINK_PAGE_DEFAULTS,
    ),
    loadPagedRowsWithCeiling<LinkedRequestSummaryRow>(
      () =>
        supabase
          .from("requests")
          .select(select)
          .eq("contractor_job_id", normalized)
          .not("display_no", "is", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true }) as unknown as PagedQuery<LinkedRequestSummaryRow>,
      FOREMAN_REQUEST_LINK_PAGE_DEFAULTS,
    ),
  ]);

  const merged = new Map<string, LinkedRequestSummaryRow>();
  for (const result of [primary, fallback]) {
    if (result.error || !Array.isArray(result.data)) continue;
    for (const row of result.data as LinkedRequestSummaryRow[]) {
      const id = String(row.id ?? "").trim();
      if (!id || merged.has(id)) continue;
      merged.set(id, row);
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const aTs = Date.parse(String(a.created_at ?? "")) || 0;
    const bTs = Date.parse(String(b.created_at ?? "")) || 0;
    return bTs - aTs;
  });
}

export async function findLatestDraftRequestByLink(linkId: string): Promise<LinkedDraftRequestRow | null> {
  const normalized = String(linkId || "").trim();
  if (!normalized) return null;

  const query = await supabase
    .from("requests")
    .select("id, display_no, request_no, status, subcontract_id, contractor_job_id, created_at")
    .eq("subcontract_id", normalized)
    .eq("status", "Черновик")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LinkedDraftRequestRow>();

  if (!query.error) return query.data ?? null;

  const queryFallback = await supabase
    .from("requests")
    .select("id, display_no, request_no, status, subcontract_id, contractor_job_id, created_at")
    .eq("contractor_job_id", normalized)
    .eq("status", "Черновик")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LinkedDraftRequestRow>();

  if (queryFallback.error) throw queryFallback.error;
  return queryFallback.data ?? null;
}
