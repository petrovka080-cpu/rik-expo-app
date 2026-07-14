import type { BuyerInboxRow } from "../../lib/api/types";

export type BuyerRequestContextRow = {
  id?: string | null;
  request_no?: string | null;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  need_by?: string | null;
  object_name?: string | null;
  object?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  site_address_snapshot?: string | null;
  note?: string | null;
  comment?: string | null;
};

type BuyerRequestContextQueryResult = {
  data?: unknown;
  error?: unknown;
};

type BuyerRequestContextQueryBuilder = {
  select: (columns: string) => {
    in: (column: string, values: readonly string[]) => {
      order: (column: string, options: { ascending: boolean }) => {
        range: (
          from: number,
          to: number,
        ) => PromiseLike<BuyerRequestContextQueryResult>;
      };
    };
  };
};

export type BuyerRequestContextQueryClient = {
  from?: (table: string) => BuyerRequestContextQueryBuilder;
};

type BuyerRequestContextEnrichmentOptions = {
  client?: BuyerRequestContextQueryClient | null;
  log?: (message: string, error: unknown) => void;
};

const BUYER_REQUEST_CONTEXT_INPUT_ID_MAX = 5000;
const BUYER_REQUEST_CONTEXT_QUERY_BATCH_SIZE = 100;

export const BUYER_REQUEST_CONTEXT_SELECTS = [
  "id,request_no,display_no,status,created_at,submitted_at,need_by,object_name,object,level_code,system_code,zone_code,site_address_snapshot,note,comment",
  "id,request_no,display_no,status,created_at,submitted_at,need_by,object_name,object,level_code,system_code,zone_code,note,comment",
  "id,display_no,status,created_at,submitted_at,object_name,level_code,system_code,zone_code,note,comment",
] as const;

const isPartialRecordRow = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOptionalStringField = (
  row: Record<string, unknown>,
  field: string,
): boolean => row[field] == null || typeof row[field] === "string";

const isBuyerRequestContextRow = (
  value: unknown,
): value is BuyerRequestContextRow =>
  isPartialRecordRow(value) &&
  hasOptionalStringField(value, "id") &&
  hasOptionalStringField(value, "request_no") &&
  hasOptionalStringField(value, "display_no") &&
  hasOptionalStringField(value, "status") &&
  hasOptionalStringField(value, "created_at") &&
  hasOptionalStringField(value, "submitted_at") &&
  hasOptionalStringField(value, "approved_at") &&
  hasOptionalStringField(value, "need_by") &&
  hasOptionalStringField(value, "object_name") &&
  hasOptionalStringField(value, "object") &&
  hasOptionalStringField(value, "level_code") &&
  hasOptionalStringField(value, "system_code") &&
  hasOptionalStringField(value, "zone_code") &&
  hasOptionalStringField(value, "site_address_snapshot") &&
  hasOptionalStringField(value, "note") &&
  hasOptionalStringField(value, "comment");

const firstBuyerText = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
};

const normalizeBuyerRequestContextIds = (
  values: readonly (string | null | undefined)[],
): string[] => {
  const ids = Array.from(
    new Set(
      values.map((id) => String(id || "").trim()).filter(Boolean),
    ),
  );
  if (ids.length > BUYER_REQUEST_CONTEXT_INPUT_ID_MAX) {
    throw new Error(
      `buyer request context exceeded max input id ceiling (${ids.length}>${BUYER_REQUEST_CONTEXT_INPUT_ID_MAX})`,
    );
  }
  return ids;
};

const chunkIds = (ids: readonly string[]): string[][] => {
  const chunks: string[][] = [];
  for (
    let index = 0;
    index < ids.length;
    index += BUYER_REQUEST_CONTEXT_QUERY_BATCH_SIZE
  ) {
    chunks.push(ids.slice(index, index + BUYER_REQUEST_CONTEXT_QUERY_BATCH_SIZE));
  }
  return chunks;
};

const loadBuyerRequestContextRows = async (
  client: BuyerRequestContextQueryClient | null | undefined,
  requestIds: readonly string[],
): Promise<BuyerRequestContextRow[]> => {
  if (!client?.from || !requestIds.length) return [];

  let lastError: unknown = null;
  for (const select of BUYER_REQUEST_CONTEXT_SELECTS) {
    const rows: BuyerRequestContextRow[] = [];
    let selectFailed = false;

    for (const ids of chunkIds(requestIds)) {
      try {
        const { data, error } = await client
          .from("requests")
          .select(select)
          .in("id", ids)
          .order("id", { ascending: true })
          .range(0, ids.length - 1);

        if (error) {
          lastError = error;
          selectFailed = true;
          break;
        }

        if (Array.isArray(data)) {
          rows.push(...data.filter(isBuyerRequestContextRow));
        }
      } catch (error) {
        lastError = error;
        selectFailed = true;
        break;
      }
    }

    if (!selectFailed) return rows;
  }

  throw lastError ?? new Error("Buyer request context query failed");
};

export async function enrichBuyerRowsWithRequestContext(
  rows: BuyerInboxRow[],
  options: BuyerRequestContextEnrichmentOptions = {},
): Promise<BuyerInboxRow[]> {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  try {
    const requestIds = normalizeBuyerRequestContextIds(
      list.map((row) => row?.request_id),
    );
    if (!requestIds.length) return list;

    const contextRows = await loadBuyerRequestContextRows(
      options.client,
      requestIds,
    );
    const contextById = new Map<string, BuyerRequestContextRow>();
    for (const row of contextRows) {
      const id = String(row?.id || "").trim();
      if (id) contextById.set(id, row);
    }

    return list.map((row) => {
      const context = contextById.get(String(row?.request_id || "").trim());
      if (!context) return row;

      return {
        ...row,
        request_no: firstBuyerText(row.request_no, context.request_no) ?? null,
        display_no: firstBuyerText(row.display_no, context.display_no) ?? null,
        object_name:
          firstBuyerText(
            row.object_name,
            context.object_name,
            context.object,
            context.site_address_snapshot,
          ) ?? null,
        object:
          firstBuyerText(row.object, context.object, context.object_name) ?? null,
        site_address_snapshot:
          firstBuyerText(
            row.site_address_snapshot,
            context.site_address_snapshot,
          ) ?? null,
        level_code: firstBuyerText(row.level_code, context.level_code) ?? null,
        system_code: firstBuyerText(row.system_code, context.system_code) ?? null,
        zone_code: firstBuyerText(row.zone_code, context.zone_code) ?? null,
        request_note:
          firstBuyerText(row.request_note, context.note, context.comment) ?? null,
        request_comment:
          firstBuyerText(row.request_comment, context.comment) ?? null,
        need_by: firstBuyerText(row.need_by, context.need_by) ?? null,
        submitted_at:
          firstBuyerText(row.submitted_at, context.submitted_at) ?? null,
        approved_at: firstBuyerText(row.approved_at, context.approved_at) ?? null,
        created_at:
          firstBuyerText(row.created_at, context.created_at) ??
          row.created_at,
      };
    });
  } catch (error) {
    options.log?.("[buyer.requestContext] enrichment failed:", error);
    return list;
  }
}
