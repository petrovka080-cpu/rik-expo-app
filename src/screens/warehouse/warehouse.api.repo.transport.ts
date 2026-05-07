import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPagedRowsWithCeiling, type PagedQuery } from "../../lib/api/_core";
import {
  applySupabaseAbortSignal,
  throwIfAborted,
} from "../../lib/requestCancellation";
import { WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS } from "./warehouse.api.bff.contract";

export type WarehouseApiUnknownRow = Record<string, unknown>;

export type WarehouseApiRepoResult = {
  data: WarehouseApiUnknownRow[] | null;
  error: unknown | null;
};

export type WarehouseApiEnvelopeResult = {
  data: unknown | null;
  error: unknown | null;
};

export type WarehouseApiReportsBundleResult = {
  stock: WarehouseApiRepoResult;
  movement: WarehouseApiRepoResult;
  issues: WarehouseApiRepoResult;
};

export async function callWarehouseApiSupabaseReportsBundle(
  supabase: SupabaseClient,
  periodFrom?: string | null,
  periodTo?: string | null,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiReportsBundleResult> {
  throwIfAborted(options?.signal);
  const [stock, movement, issues] = await Promise.all([
    applySupabaseAbortSignal(
      supabase.rpc("acc_report_stock", {}),
      options?.signal,
    ),
    applySupabaseAbortSignal(
      supabase.rpc("acc_report_movement", {
        p_from: periodFrom || null,
        p_to: periodTo || null,
      }),
      options?.signal,
    ),
    applySupabaseAbortSignal(
      supabase.rpc("acc_report_issues_v2", {
        p_from: periodFrom || null,
        p_to: periodTo || null,
      }),
      options?.signal,
    ),
  ]);
  throwIfAborted(options?.signal);

  return { stock, movement, issues } as WarehouseApiReportsBundleResult;
}

export async function callWarehouseApiSupabaseIssueLineRows(
  supabase: SupabaseClient,
  issueId: number,
): Promise<WarehouseApiRepoResult> {
  return await supabase.rpc("acc_report_issue_lines", { p_issue_id: issueId });
}

export async function callWarehouseApiSupabaseIssuedMaterialsFastRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiRepoResult> {
  throwIfAborted(options?.signal);
  return await applySupabaseAbortSignal(
    supabase.rpc("wh_report_issued_materials_fast", {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
      p_object_id: p.objectId ?? null,
    }),
    options?.signal,
  );
}

export async function callWarehouseApiSupabaseIssuedByObjectFastRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiRepoResult> {
  throwIfAborted(options?.signal);
  return await applySupabaseAbortSignal(
    supabase.rpc("wh_report_issued_by_object_fast", {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
      p_object_id: p.objectId ?? null,
    }),
    options?.signal,
  );
}

export async function callWarehouseApiSupabaseIncomingReportRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiRepoResult> {
  throwIfAborted(options?.signal);
  return await applySupabaseAbortSignal(
    supabase.rpc("acc_report_incoming_v2", {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
    }),
    options?.signal,
  );
}

export async function callWarehouseApiSupabaseIncomingLedgerRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
): Promise<WarehouseApiRepoResult> {
  return await loadPagedRowsWithCeiling<WarehouseApiUnknownRow>(
    () =>
      supabase
        .from("wh_ledger")
        .select("code, uom_id, qty, moved_at, warehouseman_fio")
        .eq("direction", "in")
        .gte("moved_at", p.from ?? null)
        .lte("moved_at", p.to ?? null)
        .order("moved_at", { ascending: true })
        .order("code", { ascending: true }) as unknown as PagedQuery<WarehouseApiUnknownRow>,
    WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS,
  );
}

export async function callWarehouseApiSupabaseIncomingLineRows(
  supabase: SupabaseClient,
  incomingId: string,
): Promise<WarehouseApiRepoResult> {
  return await loadPagedRowsWithCeiling<WarehouseApiUnknownRow>(
    () =>
      supabase
        .from("wh_ledger")
        .select("code, uom_id, qty")
        .eq("incoming_id", incomingId)
        .eq("direction", "in")
        .order("code", { ascending: true }) as unknown as PagedQuery<WarehouseApiUnknownRow>,
    WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS,
  );
}

export async function callWarehouseApiSupabaseIncomingHeadsScope(
  supabase: SupabaseClient,
  pageOffset: number,
  pageSize: number,
): Promise<WarehouseApiEnvelopeResult> {
  return await supabase.rpc("warehouse_incoming_queue_scope_v1" as never, {
    p_offset: pageOffset,
    p_limit: pageSize,
  } as never);
}

export async function callWarehouseApiSupabaseIncomingItemsScope(
  supabase: SupabaseClient,
  incomingId: string,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiEnvelopeResult> {
  throwIfAborted(options?.signal);
  const result = await applySupabaseAbortSignal(
    supabase.rpc("warehouse_incoming_items_scope_v1" as never, {
      p_incoming_id: incomingId,
    } as never),
    options?.signal,
  );
  throwIfAborted(options?.signal);
  return result;
}

export async function callWarehouseApiSupabaseIssueQueueScope(
  supabase: SupabaseClient,
  offset: number,
  pageSize: number,
  options?: { signal?: AbortSignal | null },
): Promise<WarehouseApiEnvelopeResult> {
  throwIfAborted(options?.signal);
  const result = await applySupabaseAbortSignal(
    supabase.rpc("warehouse_issue_queue_scope_v4", {
      p_offset: offset,
      p_limit: pageSize,
    }),
    options?.signal,
  );
  throwIfAborted(options?.signal);
  return result;
}

export async function callWarehouseApiSupabaseIssueItemsScope(
  supabase: SupabaseClient,
  requestId: string,
): Promise<WarehouseApiEnvelopeResult> {
  return await supabase.rpc("warehouse_issue_items_scope_v1", {
    p_request_id: requestId,
  });
}

export async function callWarehouseApiSupabaseStockScope(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<WarehouseApiEnvelopeResult> {
  return await supabase.rpc("warehouse_stock_scope_v2", {
    p_limit: limit,
    p_offset: offset,
  });
}
