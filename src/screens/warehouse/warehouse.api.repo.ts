import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applySupabaseAbortSignal,
  throwIfAborted,
} from "../../lib/requestCancellation";

type UnknownRow = Record<string, unknown>;

export async function fetchWarehouseReportsBundle(
  supabase: SupabaseClient,
  periodFrom?: string | null,
  periodTo?: string | null,
  options?: { signal?: AbortSignal | null },
) {
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

  return { stock, movement, issues };
}

export async function fetchWarehouseIssueLineRows(
  supabase: SupabaseClient,
  issueId: number,
) {
  return await supabase.rpc("acc_report_issue_lines", { p_issue_id: issueId });
}

export async function fetchWarehouseIssuedMaterialsFastRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
  options?: { signal?: AbortSignal | null },
) {
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

export async function fetchWarehouseIssuedByObjectFastRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
  options?: { signal?: AbortSignal | null },
) {
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

export async function fetchWarehouseIncomingReportRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
  options?: { signal?: AbortSignal | null },
) {
  throwIfAborted(options?.signal);
  return await applySupabaseAbortSignal(
    supabase.rpc("acc_report_incoming_v2", {
      p_from: p.from ?? null,
      p_to: p.to ?? null,
    }),
    options?.signal,
  );
}

export async function fetchWarehouseIncomingLedgerRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
) {
  return await supabase
    .from("wh_ledger")
    .select("code, uom_id, qty, moved_at, warehouseman_fio")
    .eq("direction", "in")
    .gte("moved_at", p.from ?? null)
    .lte("moved_at", p.to ?? null);
}

export async function fetchWarehouseIncomingLineRows(
  supabase: SupabaseClient,
  incomingId: string,
) {
  return await supabase
    .from("wh_ledger")
    .select("code, uom_id, qty")
    .eq("incoming_id", incomingId)
    .eq("direction", "in");
}

export function asUnknownRows(data: unknown): UnknownRow[] {
  return Array.isArray(data) ? (data as UnknownRow[]) : [];
}
