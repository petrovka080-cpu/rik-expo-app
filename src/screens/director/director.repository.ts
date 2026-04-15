import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import { REQUEST_PENDING_EN, REQUEST_PENDING_STATUS } from "../../lib/api/requests.status";
import type { PendingRow } from "./director.types";

type DirectorRepositoryDeps = {
  supabase: SupabaseClient<Database>;
};

export type DirectorPendingRowsLoadResult = {
  rows: PendingRow[];
  sourcePath: "list_director_items_stable" | "list_director_items_stable_fallback";
  fallbackUsed: boolean;
  primaryRowCount: number;
};

const DIRECTOR_PENDING_ITEM_STATUSES = new Set([
  REQUEST_PENDING_STATUS,
  "У директора",
  REQUEST_PENDING_EN,
]);

const DIRECTOR_EXPECTED_REQUEST_STATUSES = [REQUEST_PENDING_STATUS, REQUEST_PENDING_EN] as const;

const errText = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error ?? "");
};

const warnDirectorRepository = (
  scope: "list_director_items_stable" | "list_director_items_stable_fallback",
  error: unknown,
  level: "warn" | "error" = "warn",
) => {
  if (!__DEV__) return;
  const message = errText(error);
  if (level === "error") {
    console.error(`[director.repository] ${scope}:`, message);
    return;
  }
  if (__DEV__) console.warn(`[director.repository] ${scope}:`, message);
};

const logDirectorRepository = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[director.repository]", payload);
};

const normalizeDirectorPendingRows = (rows: Record<string, unknown>[]): PendingRow[] =>
  rows.map((r, idx: number) => ({
    id: idx,
    request_id: String(r.request_id ?? ""),
    request_item_id:
      r.request_item_id != null
        ? String(r.request_item_id)
        : r.id != null
          ? String(r.id)
          : null,
    name_human: String(r.name_human ?? ""),
    qty: Number(r.qty ?? 0),
    uom: r.uom != null ? String(r.uom) : null,
    rik_code: r.rik_code != null ? String(r.rik_code) : null,
    app_code: r.app_code != null ? String(r.app_code) : null,
    item_kind: r.item_kind != null ? String(r.item_kind) : null,
    note: r.note != null ? String(r.note) : null,
  }));

async function loadDirectorRowsFallback({ supabase }: DirectorRepositoryDeps): Promise<PendingRow[]> {
  logDirectorRepository({
    phase: "request",
    sourcePath: "director.repository.loadPendingRowsFallback",
    requestSelector: "submitted_at:not_null",
    expectedRequestStatuses: Array.from(DIRECTOR_EXPECTED_REQUEST_STATUSES),
    visibleItemStatuses: Array.from(DIRECTOR_PENDING_ITEM_STATUSES),
  });

  const reqs = await supabase
    .from("requests")
    .select("id, submitted_at, status")
    .not("submitted_at", "is", null);
  if (reqs.error) throw reqs.error;

  const reqRows = ((reqs.data ?? []) as { id?: string | number | null; submitted_at?: string | null; status?: string | null }[])
    .map((r) => ({
      id: String(r.id ?? "").trim(),
      submitted_at: r.submitted_at ? String(r.submitted_at) : null,
      status: r.status ? String(r.status) : null,
    }))
    .filter((r) => r.id);
  reqRows.sort((a, b) => {
    const aTs = a.submitted_at ? Date.parse(a.submitted_at) : 0;
    const bTs = b.submitted_at ? Date.parse(b.submitted_at) : 0;
    return bTs - aTs;
  });

  const reqIds = reqRows.map((r) => r.id);
  if (!reqIds.length) return [];

  const reqRank = new Map<string, number>(reqRows.map((r, idx) => [r.id, idx]));
  const items = await supabase
    .from("request_items")
    .select("id,request_id,name_human,qty,uom,rik_code,app_code,item_kind,note,status")
    .in("request_id", reqIds)
    .in("status", Array.from(DIRECTOR_PENDING_ITEM_STATUSES));
  if (items.error) throw items.error;

  const normalized = normalizeDirectorPendingRows((items.data ?? []) as Record<string, unknown>[]);
  normalized.sort((a, b) => {
    const aRank = reqRank.get(String(a.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
    const bRank = reqRank.get(String(b.request_id ?? "").trim()) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.id - b.id;
  });

  logDirectorRepository({
    phase: "result",
    sourcePath: "director.repository.loadPendingRowsFallback",
    requestCount: reqRows.length,
    requestStatusesSample: Array.from(
      new Set(reqRows.map((row) => String(row.status ?? "").trim()).filter(Boolean)),
    ).slice(0, 8),
    syncResultLineCount: normalized.length,
    fallbackUsed: true,
  });

  return normalized;
}

export async function fetchDirectorPendingRows(
  deps: DirectorRepositoryDeps,
): Promise<DirectorPendingRowsLoadResult> {
  let primaryRows: PendingRow[] = [];

  try {
    const { data, error } = await deps.supabase.rpc("list_director_items_stable");
    if (error) throw error;
    primaryRows = normalizeDirectorPendingRows((data ?? []) as Record<string, unknown>[]);
    logDirectorRepository({
      phase: "request",
      sourcePath: "director.repository.fetchPendingRows",
      primaryPath: "list_director_items_stable",
      primaryRowCount: primaryRows.length,
      expectedRequestStatuses: Array.from(DIRECTOR_EXPECTED_REQUEST_STATUSES),
      fallbackUsed: false,
    });
  } catch (error) {
    warnDirectorRepository("list_director_items_stable", error, "error");
    const fallbackRows = await loadDirectorRowsFallback(deps);
    return {
      rows: fallbackRows,
      sourcePath: "list_director_items_stable_fallback",
      fallbackUsed: true,
      primaryRowCount: 0,
    };
  }

  if (primaryRows.length > 0) {
    return {
      rows: primaryRows,
      sourcePath: "list_director_items_stable",
      fallbackUsed: false,
      primaryRowCount: primaryRows.length,
    };
  }

  const fallbackRows = await loadDirectorRowsFallback(deps);
  logDirectorRepository({
    phase: "contract_mismatch",
    sourcePath: "director.repository.fetchPendingRows",
    primaryPath: "list_director_items_stable",
    primaryRowCount: 0,
    fallbackRowCount: fallbackRows.length,
    expectedRequestStatuses: Array.from(DIRECTOR_EXPECTED_REQUEST_STATUSES),
    visibleItemStatuses: Array.from(DIRECTOR_PENDING_ITEM_STATUSES),
    fallbackUsed: true,
  });
  return {
    rows: fallbackRows,
    sourcePath: "list_director_items_stable_fallback",
    fallbackUsed: true,
    primaryRowCount: 0,
  };
}
