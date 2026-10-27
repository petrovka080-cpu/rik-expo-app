import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPagedRowsWithCeiling, type PagedQuery } from "./_core";
import {
  applySupabaseAbortSignal,
  throwIfAborted,
} from "../requestCancellation";

type ConstructionObjectLookupRow = {
  construction_object_code: string | null;
  construction_object_name: string | null;
};

type RequestObjectIdentityScopeRow = {
  request_id: string;
  construction_object_code: string | null;
  construction_object_name: string | null;
  identity_status: string | null;
  identity_source: string | null;
};

const CONSTRUCTION_OBJECT_IDENTITY_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
};

const normalizeText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const normalizeConstructionObjectLookupRow = (
  value: unknown,
): ConstructionObjectLookupRow | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const code = normalizeText(row.construction_object_code);
  if (!code) return null;
  return {
    construction_object_code: code,
    construction_object_name: normalizeText(row.construction_object_name),
  };
};

const normalizeRequestObjectIdentityScopeRow = (
  value: unknown,
): RequestObjectIdentityScopeRow | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const requestId = normalizeText(row.request_id);
  if (!requestId) return null;
  return {
    request_id: requestId,
    construction_object_code: normalizeText(row.construction_object_code),
    construction_object_name: normalizeText(row.construction_object_name),
    identity_status: normalizeText(row.identity_status),
    identity_source: normalizeText(row.identity_source),
  };
};

const loadConstructionObjectIdentityRows = async <TRow,>(
  queryFactory: () => PagedQuery<TRow>,
  options?: { signal?: AbortSignal | null },
): Promise<TRow[]> => {
  const { data, error } = await loadPagedRowsWithCeiling<TRow>(
    () => ({
      range: async (from: number, to: number) => {
        throwIfAborted(options?.signal);
        const result = await applySupabaseAbortSignal(
          queryFactory().range(from, to),
          options?.signal,
        );
        throwIfAborted(options?.signal);
        return result;
      },
    }),
    CONSTRUCTION_OBJECT_IDENTITY_PAGE_DEFAULTS,
  );
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export async function loadConstructionObjectCodesByNames(
  supabase: SupabaseClient,
  namesRaw: string[],
  options?: { signal?: AbortSignal | null },
): Promise<Map<string, string>> {
  const names = Array.from(new Set(namesRaw.map((value) => String(value ?? "").trim()).filter(Boolean)));
  const out = new Map<string, string>();
  if (!names.length) return out;

  throwIfAborted(options?.signal);
  const rows = await loadConstructionObjectIdentityRows(
    () =>
      (
        supabase
          .from("construction_object_identity_lookup_v1")
          .select("construction_object_code, construction_object_name")
          .in("construction_object_name", names)
          .order("construction_object_name", { ascending: true })
          .order("construction_object_code", { ascending: true })
      ) as unknown as PagedQuery<unknown>,
    options,
  );
  for (const rawRow of rows) {
    const row = normalizeConstructionObjectLookupRow(rawRow);
    if (!row?.construction_object_code || !row.construction_object_name) continue;
    if (!out.has(row.construction_object_name)) {
      out.set(row.construction_object_name, row.construction_object_code);
    }
  }

  return out;
}

export async function loadRequestObjectIdentityByRequestIds(
  supabase: SupabaseClient,
  requestIdsRaw: string[],
): Promise<Map<string, RequestObjectIdentityScopeRow>> {
  const requestIds = Array.from(new Set(requestIdsRaw.map((value) => String(value ?? "").trim()).filter(Boolean)));
  const out = new Map<string, RequestObjectIdentityScopeRow>();
  if (!requestIds.length) return out;

  const rows = await loadConstructionObjectIdentityRows(
    () =>
      (
        supabase
          .from("request_object_identity_scope_v1")
          .select("request_id, construction_object_code, construction_object_name, identity_status, identity_source")
          .in("request_id", requestIds)
          .order("request_id", { ascending: true })
      ) as unknown as PagedQuery<unknown>,
  );
  for (const rawRow of rows) {
    const row = normalizeRequestObjectIdentityScopeRow(rawRow);
    if (!row) continue;
    out.set(row.request_id, row);
  }

  return out;
}

export type { RequestObjectIdentityScopeRow };
