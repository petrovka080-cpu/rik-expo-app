import { supabase } from "../../lib/supabaseClient";
import type { Database } from "../../lib/database.types";

type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
type RequestUpdate = Database["public"]["Tables"]["requests"]["Update"];

type RequestDisplayRow = Pick<RequestRow, "display_no" | "request_no">;
type RequestLinkRow = Pick<RequestRow, "id" | "subcontract_id" | "contractor_job_id">;
type LinkedDraftRequestRow = Pick<
  RequestRow,
  "id" | "display_no" | "request_no" | "status" | "subcontract_id" | "contractor_job_id" | "created_at"
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

let requestsHasRequestNoCache: boolean | null = null;

export async function resolveRequestsHasRequestNo(): Promise<boolean> {
  if (requestsHasRequestNoCache != null) return requestsHasRequestNoCache;
  try {
    const q = await supabase.from("requests").select("request_no").limit(1);
    if (q.error) throw q.error;
    requestsHasRequestNoCache = true;
    return true;
  } catch {
    requestsHasRequestNoCache = false;
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

    requestsHasRequestNoCache = false;
    query = await supabase
      .from("requests")
      .select("display_no")
      .eq("id", requestId)
      .maybeSingle<RequestDisplayRow>();
  } else if (primarySelect.includes("request_no")) {
    requestsHasRequestNoCache = true;
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
