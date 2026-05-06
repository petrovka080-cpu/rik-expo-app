import { supabase } from "./supabaseClient";
import { loadPagedRowsWithCeiling, type PageInput, type PagedQuery } from "./api/_core";
import {
  ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS,
  type AssistantStoreReadBffReadErrorDto,
  type AssistantStoreReadBffReadResultDto,
  type AssistantStoreReadBffRequestDto,
} from "./assistant_store_read.bff.contract";
import { callAssistantStoreReadBff } from "./assistant_store_read.bff.client";
import type { Database } from "./database.types";

export type RequestItemRowDb = Pick<
  Database["public"]["Tables"]["request_items"]["Row"],
  "id" | "request_id" | "name_human" | "qty" | "uom" | "status" | "created_at"
>;
export type PendingRequestItemDb = Database["public"]["Views"]["request_items_pending_view"]["Row"];
export type ApprovedRequestItemDb = Database["public"]["Views"]["v_request_items_display"]["Row"];

type StoreSupabaseReadResult<T> = {
  data: T[] | null;
  error: unknown | null;
};

async function loadPagedStoreSupabaseRows<T>(
  queryFactory: () => PagedQuery<T>,
  pageInput?: PageInput,
): Promise<StoreSupabaseReadResult<T>> {
  return loadPagedRowsWithCeiling(queryFactory, ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS, pageInput);
}

const bffErrorToStoreError = (
  error: AssistantStoreReadBffReadErrorDto | { message?: string },
): { message?: string } => ({
  message: error.message,
});

const bffResultToStoreReadResult = <T,>(
  result: AssistantStoreReadBffReadResultDto,
): StoreSupabaseReadResult<T> => ({
  data: result.data === null ? null : (result.data as T[]),
  error: result.error ? bffErrorToStoreError(result.error) : null,
});

const loadStoreRowsViaBff = async <T,>(
  request: AssistantStoreReadBffRequestDto,
  fallback: () => Promise<StoreSupabaseReadResult<T>>,
): Promise<StoreSupabaseReadResult<T>> => {
  const bffResult = await callAssistantStoreReadBff(request);
  if (bffResult.status === "ok") {
    return bffResultToStoreReadResult<T>(bffResult.response.result);
  }
  if (bffResult.status === "error") {
    return { data: null, error: bffErrorToStoreError(bffResult.error) };
  }
  return await fallback();
};

export async function loadRequestItemRows(
  requestId: number,
  status?: string,
): Promise<StoreSupabaseReadResult<RequestItemRowDb>> {
  return await loadStoreRowsViaBff<RequestItemRowDb>(
    {
      operation: "store.request_items.list",
      args: { requestId: String(requestId), status: status ?? null },
    },
    async () =>
      await loadPagedStoreSupabaseRows<RequestItemRowDb>(() => {
        let q = supabase
          .from("request_items")
          .select("id, request_id, name_human, qty, uom, status, created_at")
          .eq("request_id", String(requestId));

        if (status) q = q.eq("status", status);
        return q
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });
      }),
  );
}

export async function loadDirectorInboxRows(): Promise<StoreSupabaseReadResult<PendingRequestItemDb>> {
  return await loadStoreRowsViaBff<PendingRequestItemDb>(
    {
      operation: "store.director_inbox.list",
      args: {},
    },
    async () =>
      await loadPagedStoreSupabaseRows<PendingRequestItemDb>(() =>
        supabase
          .from("request_items_pending_view")
          .select("*")
          .order("created_at", { ascending: false })
          .order("request_item_id", { ascending: true }),
      ),
  );
}

export async function loadApprovedRequestItemRows(
  requestId: number,
): Promise<StoreSupabaseReadResult<ApprovedRequestItemDb>> {
  return await loadStoreRowsViaBff<ApprovedRequestItemDb>(
    {
      operation: "store.approved_request_items.list",
      args: { requestId: String(requestId) },
    },
    async () =>
      await loadPagedStoreSupabaseRows<ApprovedRequestItemDb>(() =>
        supabase
          .from("v_request_items_display")
          .select("*")
          .eq("request_id", String(requestId))
          .order("id", { ascending: true }),
      ),
  );
}
