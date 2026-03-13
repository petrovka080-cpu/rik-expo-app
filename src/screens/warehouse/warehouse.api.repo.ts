import type { SupabaseClient } from "@supabase/supabase-js";

type UnknownRow = Record<string, unknown>;

export async function fetchWarehouseRequestMetaRows(
  supabase: SupabaseClient,
  requestIds: string[],
) {
  return await supabase.from("requests").select("*").in("id", requestIds);
}

export async function fetchWarehouseRequestItemNoteRows(
  supabase: SupabaseClient,
  requestIds: string[],
) {
  return await supabase
    .from("request_items")
    .select("request_id, note")
    .in("request_id", requestIds);
}

export async function fetchWarehouseStockViewRows(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
) {
  return await supabase.from("v_warehouse_stock").select("*").range(offset, offset + limit - 1);
}

export async function fetchWarehouseReportsBundle(
  supabase: SupabaseClient,
  periodFrom?: string | null,
  periodTo?: string | null,
) {
  const [stock, movement, issues] = await Promise.all([
    supabase.rpc("acc_report_stock", {}),
    supabase.rpc("acc_report_movement", {
      p_from: periodFrom || null,
      p_to: periodTo || null,
    }),
    supabase.rpc("acc_report_issues_v2", {
      p_from: periodFrom || null,
      p_to: periodTo || null,
    }),
  ]);

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
) {
  return await supabase.rpc("wh_report_issued_materials_fast", {
    p_from: p.from ?? null,
    p_to: p.to ?? null,
    p_object_id: p.objectId ?? null,
  });
}

export async function fetchWarehouseIssuedByObjectFastRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
) {
  return await supabase.rpc("wh_report_issued_by_object_fast", {
    p_from: p.from ?? null,
    p_to: p.to ?? null,
    p_object_id: p.objectId ?? null,
  });
}

export async function fetchWarehouseIncomingReportRows(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
) {
  return await supabase.rpc("acc_report_incoming_v2", {
    p_from: p.from ?? null,
    p_to: p.to ?? null,
  });
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
