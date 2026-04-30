import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import { normalizePage, type PageInput } from "../../lib/api/_core";
import type { WorkLogRow } from "./types";

export type RequestScopeRow = { id: string; status: string | null };

type RowWithProgress = {
  progress_id: string;
  contractor_job_id?: string | null;
};

type RequestRow = {
  id?: string | null;
  status?: string | null;
};

type LogIdRow = {
  id?: string | null;
};

type MaterialFactRow = {
  mat_code?: string | null;
  qty_fact?: number | null;
};

type IssuedItemUiRow = {
  request_id?: string | null;
  request_item_id?: string | null;
  rik_code?: string | null;
  qty_issued?: number | null;
};

type LogSummaryRow = {
  id?: string | null;
  qty?: number | null;
};

type LogMaterialSummaryRow = {
  log_id?: string | null;
  mat_code?: string | null;
  uom_mat?: string | null;
  qty_fact?: number | null;
};

type CatalogItemRow = {
  rik_code?: string | null;
  name_human_ru?: string | null;
  name_human?: string | null;
  uom_code?: string | null;
};

type WorkLogDbRow = {
  id?: string | null;
  created_at?: string | null;
  qty?: number | null;
  work_uom?: string | null;
  stage_note?: string | null;
  note?: string | null;
};

const CONTRACTOR_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };

type PagedContractorQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: unknown }>;
};

async function loadPagedContractorRows<T>(
  queryFactory: () => PagedContractorQuery<T>,
  pageInput?: PageInput,
): Promise<{ data: T[] | null; error: unknown | null }> {
  if (pageInput) {
    const page = normalizePage(pageInput, CONTRACTOR_LIST_PAGE_DEFAULTS);
    const result = await queryFactory().range(page.from, page.to);
    if (result.error) return { data: null, error: result.error };
    return { data: Array.isArray(result.data) ? result.data : [], error: null };
  }

  const rows: T[] = [];
  for (let pageIndex = 0; ; pageIndex += 1) {
    const page = normalizePage({ page: pageIndex }, CONTRACTOR_LIST_PAGE_DEFAULTS);
    const result = await queryFactory().range(page.from, page.to);
    if (result.error) return { data: null, error: result.error };

    const pageRows = Array.isArray(result.data) ? result.data : [];
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) return { data: rows, error: null };
  }
}

export async function fetchRequestScopeRows(
  supabaseClient: any,
  jobId: string,
  reqIdForRow: string
): Promise<RequestScopeRow[]> {
  let reqRows: RequestRow[] = [];
  const safeJobId = String(jobId || "").trim();
  const safeReqId = String(reqIdForRow || "").trim();
  if (safeJobId && looksLikeUuid(safeJobId)) {
    let reqQ = await loadPagedContractorRows<RequestRow>(() =>
      supabaseClient
        .from("requests")
        .select("id, status")
        .eq("subcontract_id", safeJobId)
        .order("id", { ascending: true })
    );
    if (reqQ.error) {
      reqQ = await loadPagedContractorRows<RequestRow>(() =>
        supabaseClient
          .from("requests")
          .select("id, status")
          .eq("contractor_job_id", safeJobId)
          .order("id", { ascending: true })
      );
    }
    reqRows = (reqQ.data as RequestRow[] | null) || [];
  } else if (safeReqId && looksLikeUuid(safeReqId)) {
    reqRows = [{ id: safeReqId, status: null }];
  }
  return reqRows
    .map((r) => ({
      id: String(r?.id || "").trim(),
      status: String(r?.status || "").trim() || null,
    }))
    .filter((r) => !!r.id);
}

export function getProgressIdsForSubcontract(
  rows: RowWithProgress[],
  jobId: string,
  row: RowWithProgress
): string[] {
  let progressIds = Array.from(
    new Set(
      rows
        .filter((r) => String(r.contractor_job_id || "").trim() === String(jobId || "").trim())
        .map((r) => String(r.progress_id || "").trim())
        .filter((pid) => !!pid && !pid.startsWith("subcontract:"))
    )
  );
  if (!progressIds.length && row.progress_id) {
    progressIds = [String(row.progress_id)];
  }
  return progressIds;
}

export async function loadLogIdsByProgressIds(
  supabaseClient: any,
  progressIds: string[]
): Promise<string[]> {
  const safeProgressIds = progressIds
    .map((v) => String(v || "").trim())
    .filter((v) => !!v && looksLikeUuid(v));
  if (!safeProgressIds.length) return [];
  let logsQ;
  if (safeProgressIds.length === 1) {
    logsQ = await loadPagedContractorRows<LogIdRow>(() =>
      supabaseClient
        .from("work_progress_log")
        .select("id")
        .eq("progress_id", safeProgressIds[0])
        .order("id", { ascending: true })
    );
  } else {
    logsQ = await loadPagedContractorRows<LogIdRow>(() =>
      supabaseClient
        .from("work_progress_log")
        .select("id")
        .in("progress_id", safeProgressIds)
        .order("id", { ascending: true })
    );
  }
  return Array.isArray(logsQ.data)
    ? (logsQ.data as LogIdRow[]).map((x) => String(x.id || "")).filter(Boolean)
    : [];
}

export async function loadConsumedByCode(
  supabaseClient: any,
  progressIds: string[],
  opts?: { positiveOnly?: boolean }
): Promise<Map<string, number>> {
  const positiveOnly = opts?.positiveOnly ?? true;
  const consumedByCode = new Map<string, number>();
  const logIds = await loadLogIdsByProgressIds(supabaseClient, progressIds);
  if (!logIds.length) return consumedByCode;

  const matsQ = await loadPagedContractorRows<MaterialFactRow>(() =>
    supabaseClient
      .from("work_progress_log_materials")
      .select("mat_code, qty_fact")
      .in("log_id", logIds)
      .order("log_id", { ascending: true })
      .order("mat_code", { ascending: true })
  );
  if (matsQ.error || !Array.isArray(matsQ.data)) return consumedByCode;

  for (const m of matsQ.data as MaterialFactRow[]) {
    const code = String(m.mat_code || "").trim();
    if (!code) continue;
    const q = Number(m.qty_fact || 0);
    if (!Number.isFinite(q)) continue;
    if (positiveOnly && q <= 0) continue;
    consumedByCode.set(code, Number(consumedByCode.get(code) || 0) + q);
  }
  return consumedByCode;
}

export async function loadIssuedByCode(
  supabaseClient: any,
  requestIds: string[]
): Promise<Map<string, number>> {
  const issuedByCode = new Map<string, number>();
  const safeRequestIds = requestIds
    .map((v) => String(v || "").trim())
    .filter((v) => !!v && looksLikeUuid(v));
  if (!safeRequestIds.length) return issuedByCode;

  const itemsQ = await loadPagedContractorRows<IssuedItemUiRow>(() =>
    supabaseClient
      .from("v_wh_issue_req_items_ui")
      .select("request_id, request_item_id, rik_code, qty_issued")
      .in("request_id", safeRequestIds)
      .order("request_id", { ascending: true })
      .order("request_item_id", { ascending: true })
  );
  if (itemsQ.error || !Array.isArray(itemsQ.data)) return issuedByCode;

  for (const it of itemsQ.data as IssuedItemUiRow[]) {
    const code = String(it.rik_code || it.request_item_id || "").trim();
    if (!code) continue;
    issuedByCode.set(code, Number(issuedByCode.get(code) || 0) + Number(it.qty_issued || 0));
  }
  return issuedByCode;
}

export async function loadAggregatedWorkSummary<T extends { qty_planned: number; qty_done: number; qty_left: number }>(
  supabaseClient: any,
  progressId: string,
  baseWork: T
): Promise<{ work: T; materials: WorkMaterialRow[] }> {
  const logsQ = await supabaseClient
    .from("work_progress_log")
    .select("id, qty")
    .eq("progress_id", progressId);

  if (logsQ.error || !Array.isArray(logsQ.data) || logsQ.data.length === 0) {
    return { work: baseWork, materials: [] };
  }

  const logRows = logsQ.data as LogSummaryRow[];
  const logIds = logRows.map((l) => String(l.id || ""));
  const totalQty = logRows.reduce((sum, l) => sum + Number(l.qty ?? 0), 0);

  const matsQ = await supabaseClient
    .from("work_progress_log_materials")
    .select("log_id, mat_code, uom_mat, qty_fact")
    .in("log_id", logIds);

  let aggregated: WorkMaterialRow[] = [];

  if (!matsQ.error && Array.isArray(matsQ.data) && matsQ.data.length > 0) {
    const aggMap = new Map<string, { mat_code: string; uom: string; qty: number }>();

    for (const m of matsQ.data as LogMaterialSummaryRow[]) {
      const code = String(m.mat_code || "");
      const uom = m.uom_mat ? String(m.uom_mat) : "";
      const qty = Number(m.qty_fact ?? 0) || 0;
      if (!qty) continue;

      const key = `${code}||${uom}`;
      const prev = aggMap.get(key) || { mat_code: code, uom, qty: 0 };
      prev.qty += qty;
      aggMap.set(key, prev);
    }

    const aggArr = Array.from(aggMap.values());
    const codes = aggArr.map((a) => a.mat_code);
    const namesMap: Record<string, { name: string; uom: string | null }> = {};

    if (codes.length) {
      const ci = await supabaseClient
        .from("catalog_items")
        .select("rik_code, name_human_ru, name_human, uom_code")
        .in("rik_code", codes);

      if (!ci.error && Array.isArray(ci.data)) {
        for (const n of ci.data as CatalogItemRow[]) {
          const code = String(n.rik_code || "");
          const name = n.name_human_ru || n.name_human || code;
          const uom = n.uom_code ?? null;
          namesMap[code] = { name, uom };
        }
      }
    }

    aggregated = aggArr.map((a) => {
      const meta = namesMap[a.mat_code];
      return {
        material_id: null,
        qty: Number(a.qty || 0),
        mat_code: a.mat_code,
        name: meta?.name || a.mat_code,
        uom: meta?.uom || a.uom || "",
        available: 0,
        qty_fact: Number(a.qty || 0),
      } satisfies WorkMaterialRow;
    });
  }

  const work = {
    ...baseWork,
    qty_done: totalQty,
    qty_left: Math.max(0, Number(baseWork.qty_planned || 0) - totalQty),
  } as T;

  return { work, materials: aggregated };
}

const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export async function loadWorkLogRows(
  supabaseClient: any,
  progressId: string,
  normText: (value: unknown) => string
): Promise<WorkLogRow[]> {
  if (!looksLikeUuid(progressId)) return [];

  let q = await supabaseClient
    .from("work_progress_log")
    .select("id, created_at, qty, work_uom, stage_note, note")
    .eq("progress_id", progressId)
    .order("created_at", { ascending: true });
  if (q.error) {
    q = await supabaseClient
      .from("work_progress_log")
      .select("id, created_at, qty, work_uom, stage_note, note")
      .eq("id", progressId)
      .order("created_at", { ascending: true });
  }
  const { data, error } = q;
  if (error || !Array.isArray(data)) return [];

  return (data as WorkLogDbRow[]).map((r) => ({
    id: String(r.id || ""),
    created_at: String(r.created_at || ""),
    qty: Number(r.qty ?? 0),
    work_uom: normText(r.work_uom) || null,
    stage_note: normText(r.stage_note) || null,
    note: normText(r.note) || null,
  }));
}
