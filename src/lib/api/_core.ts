import { supabase } from "../supabaseClient";
import {
  runRpcCompatTransportVariant,
  type RpcCompatTransportVariant,
} from "./_core.transport";
import type {
  AppSupabaseClient,
} from "../../types/contracts/shared";

export const client: AppSupabaseClient = supabase;

type ErrorLike = {
  message?: unknown;
  error_description?: unknown;
  code?: unknown;
};

type RpcVariant = RpcCompatTransportVariant;

export type RpcCompatErrorKind =
  | "missing_function"
  | "permission"
  | "auth"
  | "validation"
  | "transient"
  | "unknown";

export type RpcCompatErrorDecision = {
  kind: RpcCompatErrorKind;
  allowNextVariant: boolean;
  reason: string;
};

const asErrorLike = (value: unknown): ErrorLike | null =>
  value && typeof value === "object" ? (value as ErrorLike) : null;

export const parseErr = (e: unknown) =>
  String(
    asErrorLike(e)?.message ||
      asErrorLike(e)?.error_description ||
      (typeof e === "string"
        ? e
        : (() => {
            try {
              return JSON.stringify(e);
            } catch {
              return String(e);
            }
          })()),
  );

export const normStr = (s?: string | null) => String(s ?? "").trim().toLowerCase();

export const normalizeUuid = (raw: string | null | undefined) => {
  const s = String(raw ?? "").trim().replace(/^#/, "");
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(s) ? s : null;
};

// UUID-only, запрещаем timestamp/числа как id
export const toFilterId = (v: number | string) => {
  const raw = String(v ?? "").trim().replace(/^#/, "");
  if (!raw) return null;

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRe.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return null;
  return null;
};

export const toRpcId = (id: number | string) => String(id);

export type PageInput = {
  page?: number | null;
  pageSize?: number | null;
};

export type NormalizedPage = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
};

export type PageThroughDefaults = {
  pageSize?: number;
  maxPageSize?: number;
  maxRows?: number;
  maxPages?: number;
};

export type PagedQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: unknown }>;
};

export type PagedQueryProvider = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data?: unknown; error?: unknown }>;
};

export type PagedQueryRowGuard<T> = (value: unknown) => value is T;

const buildMalformedPagedPayloadError = (context: string, reason: string) =>
  new Error(`${context} returned malformed paged payload: ${reason}`);

export const isRecordRow = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function createGuardedPagedQuery<T>(
  query: PagedQueryProvider,
  isRow: PagedQueryRowGuard<T>,
  context: string,
): PagedQuery<T> {
  return {
    range: async (from: number, to: number) => {
      const result = await query.range(from, to);
      if (result.error) return { data: null, error: result.error };
      if (result.data == null) return { data: null, error: null };
      if (!Array.isArray(result.data)) {
        return {
          data: null,
          error: buildMalformedPagedPayloadError(context, "expected array data"),
        };
      }

      const rows: T[] = [];
      for (let index = 0; index < result.data.length; index += 1) {
        const row = result.data[index];
        if (!isRow(row)) {
          return {
            data: null,
            error: buildMalformedPagedPayloadError(
              context,
              `row ${index} failed DTO guard`,
            ),
          };
        }
        rows.push(row);
      }
      return { data: rows, error: null };
    },
  };
}

const toInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

export function normalizePage(
  input?: PageInput,
  defaults?: { pageSize?: number; maxPageSize?: number },
): NormalizedPage {
  const maxPageSize = Math.max(1, toInt(defaults?.maxPageSize, 100));
  const defaultPageSize = Math.min(
    maxPageSize,
    Math.max(1, toInt(defaults?.pageSize, 50)),
  );
  const rawPageSize = toInt(input?.pageSize, defaultPageSize);
  const pageSize = Math.min(Math.max(rawPageSize, 1), maxPageSize);
  const page = Math.max(toInt(input?.page, 0), 0);
  const from = page * pageSize;

  return {
    page,
    pageSize,
    from,
    to: from + pageSize - 1,
  };
}

const buildPageCeilingError = (maxRows: number) =>
  new Error(`Paged reference read exceeded max row ceiling (${maxRows})`);

const buildPageCountCeilingError = (maxPages: number) =>
  new Error(`Paged reference read exceeded max page ceiling (${maxPages})`);

const deriveMaxPages = (defaults: PageThroughDefaults, maxRows: number): number => {
  const firstPage = normalizePage(undefined, defaults);
  const defaultMaxPages = Math.ceil(maxRows / firstPage.pageSize) + 1;
  return Math.max(1, toInt(defaults.maxPages, defaultMaxPages));
};

export async function loadPagedRowsWithCeiling<T>(
  queryFactory: () => PagedQuery<T>,
  defaults: PageThroughDefaults,
  pageInput?: PageInput,
): Promise<{ data: T[] | null; error: unknown | null }> {
  const maxRows = Math.max(1, toInt(defaults.maxRows, 5000));
  const maxPages = deriveMaxPages(defaults, maxRows);

  if (pageInput) {
    const page = normalizePage(pageInput, defaults);
    if (page.page >= maxPages) return { data: null, error: buildPageCountCeilingError(maxPages) };
    if (page.from >= maxRows) return { data: null, error: buildPageCeilingError(maxRows) };

    const result = await queryFactory().range(page.from, Math.min(page.to, maxRows - 1));
    if (result.error) return { data: null, error: result.error };
    return { data: Array.isArray(result.data) ? result.data : [], error: null };
  }

  const rows: T[] = [];
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const page = normalizePage({ page: pageIndex }, defaults);
    if (page.from >= maxRows) {
      const probe = await queryFactory().range(maxRows, maxRows);
      if (probe.error) return { data: null, error: probe.error };
      const probeRows = Array.isArray(probe.data) ? probe.data : [];
      return probeRows.length
        ? { data: null, error: buildPageCeilingError(maxRows) }
        : { data: rows, error: null };
    }

    const result = await queryFactory().range(page.from, Math.min(page.to, maxRows - 1));
    if (result.error) return { data: null, error: result.error };

    const pageRows = Array.isArray(result.data) ? result.data : [];
    if (rows.length + pageRows.length > maxRows) {
      return { data: null, error: buildPageCeilingError(maxRows) };
    }
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) return { data: rows, error: null };
  }
  return { data: null, error: buildPageCountCeilingError(maxPages) };
}

const errorMessageLower = (error: unknown) => parseErr(error).toLowerCase();

const errorCodeLower = (error: unknown) =>
  String(asErrorLike(error)?.code ?? "")
    .trim()
    .toLowerCase();

export function classifyRpcCompatError(error: unknown): RpcCompatErrorDecision {
  const msg = errorMessageLower(error);
  const code = errorCodeLower(error);

  if (
    code === "pgrst302" ||
    msg.includes("could not find") ||
    (msg.includes("/rpc/") && msg.includes("404")) ||
    (msg.includes("function") && msg.includes("does not exist")) ||
    msg.includes("schema cache")
  ) {
    return {
      kind: "missing_function",
      allowNextVariant: true,
      reason: "rpc_missing_or_incompatible",
    };
  }

  if (
    code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security")
  ) {
    return {
      kind: "permission",
      allowNextVariant: false,
      reason: "permission_denied",
    };
  }

  if (
    code === "pgrst301" ||
    msg.includes("jwt") ||
    msg.includes("not authorized") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid token") ||
    msg.includes("auth")
  ) {
    return {
      kind: "auth",
      allowNextVariant: false,
      reason: "auth_error",
    };
  }

  if (
    code.startsWith("22") ||
    code.startsWith("23") ||
    msg.includes("violates") ||
    msg.includes("invalid input") ||
    msg.includes("null value") ||
    msg.includes("must not") ||
    msg.includes("validation")
  ) {
    return {
      kind: "validation",
      allowNextVariant: false,
      reason: "validation_or_invariant_error",
    };
  }

  if (
    code.startsWith("08") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("connection")
  ) {
    return {
      kind: "transient",
      allowNextVariant: false,
      reason: "transient_transport_error",
    };
  }

  return {
    kind: "unknown",
    allowNextVariant: false,
    reason: "semantic_or_unknown_error",
  };
}

// rpcCompat как у тебя, но “в ядре”
export async function rpcCompat<T = unknown>(
  variants: readonly RpcVariant[],
): Promise<T> {
  let lastErr: unknown = null;
  for (const v of variants) {
    try {
      const { data, error } = await runRpcCompatTransportVariant(v);
      if (!error) return data as T;
      lastErr = error;
      const decision = classifyRpcCompatError(error);
      if (decision.allowNextVariant) continue;
      throw error;
    } catch (e: unknown) {
      lastErr = e;
      const decision = classifyRpcCompatError(e);
      if (decision.allowNextVariant) continue;
      throw e;
    }
  }
  if (lastErr) throw lastErr;
  return [] as T;
}
