// src/screens/warehouse/warehouse.api.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockRow, ReqHeadRow, ReqItemUiRow } from "./warehouse.types";
import { nz, parseNum } from "./warehouse.utils";
import { normalizeRuText } from "../../lib/text/encoding";

const pickUom = (v: any): string | null => {
  const s = v == null ? "" : String(v).trim();
  return s !== "" ? s : null;
};

const looksLikeCode = (s: any) => {
  const x = String(s ?? "").trim().toUpperCase();
  return (
    x.startsWith("MAT-") ||
    x.startsWith("TOOL-") ||
    x.startsWith("WT-") ||
    x.startsWith("WORK-") ||
    x.startsWith("SRV-") ||
    x.startsWith("SERV-") ||
    x.startsWith("KIT-")
  );
};

const normDateArg = (s?: string | null): string | null => {
  const t = String(s ?? "").trim();
  return t ? t : null;
};

async function loadNameMapOverrides(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!codesUpper.length) return out;

  // catalog_name_overrides: pk(code)
  const q = await supabase
    .from("catalog_name_overrides" as any)
    .select("code, name_ru")
    .in("code", codesUpper.slice(0, 5000));

  if (q.error || !Array.isArray(q.data)) return out;

  for (const r of q.data as any[]) {
    const c = String(r.code ?? "").trim().toUpperCase();
    const nm = String(normalizeRuText(String(r.name_ru ?? ""))).trim();
    if (c && nm && !out[c]) out[c] = nm;
  }
  return out;
}

async function loadNameMapRikRu(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!codesUpper.length) return out;

  const q = await supabase
    .from("v_rik_names_ru" as any)
    .select("code, name_ru")
    .in("code", codesUpper.slice(0, 5000));

  if (q.error || !Array.isArray(q.data)) return out;

  for (const r of q.data as any[]) {
    const c = String(r.code ?? "").trim().toUpperCase();
    const nm = String(normalizeRuText(String(r.name_ru ?? ""))).trim();
    if (c && nm && !out[c]) out[c] = nm;
  }
  return out;
}

async function loadNameMapLedgerUi(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!codesUpper.length) return out;

  const q = await supabase
    .from("v_wh_balance_ledger_ui" as any)
    .select("code, name")
    .in("code", codesUpper.slice(0, 5000));

  if (q.error || !Array.isArray(q.data)) return out;

  for (const r of q.data as any[]) {
    const c = String(r.code ?? "").trim().toUpperCase();
    const nm = String(normalizeRuText(String(r.name ?? ""))).trim();
    if (c && nm && !out[c]) out[c] = nm;
  }
  return out;
}

/**
 * вњ… PROD stock
 * - qty: v_wh_balance_ledger_truth_ui (РёСЃС‚РёРЅР°)
 * - name: overrides -> v_rik_names_ru -> v_wh_balance_ledger_ui
 */
export async function apiFetchStock(
  supabase: SupabaseClient,
  offset: number = 0,
  limit: number = 400
): Promise<{ supported: boolean; rows: StockRow[] }> {
  try {
    const truth = await supabase
      .from("v_wh_balance_ledger_truth_ui" as any)
      .select("code, uom_id, qty_available, updated_at")
      .order("code", { ascending: true })
      .range(offset, offset + limit - 1);

    if (!truth.error && Array.isArray(truth.data)) {
      const truthRows = truth.data as any[];

      const codesUpper = truthRows
        .map((x) => String(x.code ?? "").trim().toUpperCase())
        .filter(Boolean);

      // вњ… РїСЂРёРѕСЂРёС‚РµС‚: overrides -> v_rik_names_ru -> ledger_ui
      const [overMap, rikMap, uiMap] = await Promise.all([
        loadNameMapOverrides(supabase, codesUpper),
        loadNameMapRikRu(supabase, codesUpper),
        loadNameMapLedgerUi(supabase, codesUpper),
      ]);

      const rows: StockRow[] = truthRows.map((x) => {
        const code = String(x.code ?? "").trim();
        const codeKey = code.toUpperCase();
        const uom = String(x.uom_id ?? "").trim();
        const avail = nz(x.qty_available, 0);

        const nOver = String(normalizeRuText(String(overMap[codeKey] ?? ""))).trim();
        const nRik = String(normalizeRuText(String(rikMap[codeKey] ?? ""))).trim();
        const nUi = String(normalizeRuText(String(uiMap[codeKey] ?? ""))).trim();

        const picked =
          (nOver && !looksLikeCode(nOver) ? nOver : nOver) ||
          (nRik && !looksLikeCode(nRik) ? nRik : nRik) ||
          (nUi && !looksLikeCode(nUi) ? nUi : "") ||
          "—";

        return {
          material_id: `${code}::${uom}`,
          code: code || null,
          name: normalizeRuText(picked || "—"),
          uom_id: pickUom(x.uom_id) ?? null,

          qty_on_hand: avail,
          qty_reserved: 0,
          qty_available: avail,

          updated_at: x.updated_at ?? null,
        } as StockRow;
      });

      return { supported: true, rows };
    }


    const v = await supabase.from("v_warehouse_stock" as any).select("*").range(offset, offset + limit - 1);
    if (!v.error && Array.isArray(v.data)) {
      const rows = (v.data || []).map(
        (x: any) =>
        ({
          material_id: String(x.code ?? ""),
          code: x.code ?? null,
          name: x.name ?? null,
          uom_id:
            pickUom(x.uom_id) ??
            pickUom(x.uom) ??
            pickUom(x.uom_code) ??
            pickUom(x.unit) ??
            pickUom(x.unit_id) ??
            null,
          qty_on_hand: nz(x.qty_on_hand, 0),
          qty_reserved: nz(x.qty_reserved, 0),
          qty_available: nz(x.qty_available ?? nz(x.qty_on_hand) - nz(x.qty_reserved), 0),
          object_name: null,
          warehouse_name: null,
          updated_at: x.updated_at ?? null,
        } as StockRow),
      );
      return { supported: true, rows };
    }

    return { supported: false, rows: [] };
  } catch {
    return { supported: false, rows: [] };
  }
}

export async function apiFetchReqHeads(
  supabase: SupabaseClient,
  page: number = 0,
  pageSize: number = 50
): Promise<ReqHeadRow[]> {
  const q = await supabase
    .from("v_wh_issue_req_heads_ui" as any)
    .select("*")
    // 1) РіР»Р°РІРЅРѕРµ вЂ” РїРѕ РІСЂРµРјРµРЅРё (СЃРІРµР¶РёРµ СЃРІРµСЂС…Сѓ)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    // 2) СЃС‚Р°Р±РёР»РёР·Р°С‚РѕСЂ вЂ” РїРѕ display_no (REQ-xxxx/2026), С‡С‚РѕР±С‹ РѕРґРёРЅР°РєРѕРІС‹Рµ submitted_at РЅРµ РїСЂС‹РіР°Р»Рё
    .order("display_no", { ascending: false })
    // 3) РµС‰С‘ РѕРґРёРЅ СЃС‚Р°Р±РёР»РёР·Р°С‚РѕСЂ вЂ” РїРѕ request_id (uuid) РЅР° СЃР»СѓС‡Р°Р№ РѕРґРёРЅР°РєРѕРІС‹С… display_no
    .order("request_id", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (q.error || !Array.isArray(q.data)) return [];

  const rows: ReqHeadRow[] = (q.data as any[]).map((x) => ({
    request_id: String(x.request_id),
    display_no: x.display_no ?? null,
    object_name: x.object_name ?? null,

    level_code: x.level_code ?? null,
    system_code: x.system_code ?? null,
    zone_code: x.zone_code ?? null,

    level_name: x.level_name ?? null,
    system_name: x.system_name ?? null,
    zone_name: x.zone_name ?? null,

    submitted_at: x.submitted_at ?? null,

    items_cnt: Number(x.items_cnt ?? 0),
    ready_cnt: Number(x.ready_cnt ?? 0),
    done_cnt: Number(x.done_cnt ?? 0),

    qty_limit_sum: parseNum(x.qty_limit_sum, 0),
    qty_issued_sum: parseNum(x.qty_issued_sum, 0),
    qty_left_sum: parseNum(x.qty_left_sum, 0),

    issue_status: String(x.issue_status ?? "READY"),
  }));

  rows.sort((a: any, b: any) => {
    const ta = a?.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const tb = b?.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    if (tb !== ta) return tb - ta;

    const da = String(a?.display_no ?? "");
    const db = String(b?.display_no ?? "");
    if (db !== da) return db.localeCompare(da);

    return String(b?.request_id ?? "").localeCompare(String(a?.request_id ?? ""));
  });

  return rows.filter((r) => String(r.issue_status ?? "").trim().toUpperCase() !== "DONE");
}
export async function apiFetchReqItems(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ReqItemUiRow[]> {
  const rid = String(requestId || "").trim();
  if (!rid) return [];

  const q = await supabase
    .from("v_wh_issue_req_items_ui" as any)
    .select("*")
    .eq("request_id", rid)
    .order("name_human", { ascending: true });

  if (q.error || !Array.isArray(q.data)) return [];

  const raw = (q.data as any[]).map((x) => ({
    request_id: String(x.request_id),
    request_item_id: String(x.request_item_id),

    display_no: x.display_no ?? null,
    object_name: x.object_name ?? null,
    level_code: x.level_code ?? null,
    system_code: x.system_code ?? null,
    zone_code: x.zone_code ?? null,

    rik_code: String(x.rik_code ?? ""),
    name_human: String(x.name_human ?? x.rik_code ?? ""),
    uom: x.uom ?? null,

    qty_limit: parseNum(x.qty_limit, 0),
    qty_issued: parseNum(x.qty_issued, 0),
    qty_left: parseNum(x.qty_left, 0),

    qty_available: parseNum(x.qty_available, 0),
    qty_can_issue_now: parseNum(x.qty_can_issue_now, 0),
  })) as ReqItemUiRow[];

  // вњ… РґРµРґСѓРї РїРѕ request_item_id (Р±РµСЂС‘Рј РјР°РєСЃРёРјР°Р»СЊРЅС‹Рµ С‡РёСЃР»Р°)
  const byId: Record<string, ReqItemUiRow> = {};
  for (const it of raw) {
    const id = String((it as any).request_item_id ?? "").trim();
    if (!id) continue;

    const prev = byId[id];
    if (!prev) {
      byId[id] = it;
      continue;
    }

    const merged: any = { ...prev };
    const pickText = (a: any, b: any) => {
      const sa = String(a ?? "").trim();
      if (sa) return sa;
      const sb = String(b ?? "").trim();
      return sb || null;
    };

    merged.name_human = pickText((prev as any).name_human, (it as any).name_human);
    merged.rik_code = pickText((prev as any).rik_code, (it as any).rik_code);
    merged.uom = pickText((prev as any).uom, (it as any).uom);

    merged.qty_limit = Math.max(parseNum((prev as any).qty_limit, 0), parseNum((it as any).qty_limit, 0));
    merged.qty_issued = Math.max(parseNum((prev as any).qty_issued, 0), parseNum((it as any).qty_issued, 0));
    merged.qty_left = Math.max(parseNum((prev as any).qty_left, 0), parseNum((it as any).qty_left, 0));
    merged.qty_available = Math.max(parseNum((prev as any).qty_available, 0), parseNum((it as any).qty_available, 0));
    merged.qty_can_issue_now = Math.max(
      parseNum((prev as any).qty_can_issue_now, 0),
      parseNum((it as any).qty_can_issue_now, 0),
    );

    byId[id] = merged as ReqItemUiRow;
  }

  return Object.values(byId).sort((a, b) =>
    String((a as any).name_human ?? "").localeCompare(String((b as any).name_human ?? "")),
  );
}
export async function apiFetchReports(
  supabase: SupabaseClient,
  periodFrom?: string,
  periodTo?: string,
): Promise<{ supported: boolean; repStock: any[]; repMov: any[]; repIssues: any[] }> {
  try {
    const s = await supabase.rpc("acc_report_stock" as any, {} as any);
    const m = await supabase.rpc("acc_report_movement" as any, {
      p_from: periodFrom || null,
      p_to: periodTo || null,
    } as any);
    const iss = await supabase.rpc("acc_report_issues_v2" as any, {
      p_from: periodFrom || null,
      p_to: periodTo || null,
    } as any);

    return {
      supported: true,
      repStock: !s.error && Array.isArray(s.data) ? (s.data as any[]) : [],
      repMov: !m.error && Array.isArray(m.data) ? (m.data as any[]) : [],
      repIssues: !iss.error && Array.isArray(iss.data) ? (iss.data as any[]) : [],
    };
  } catch {
    return { supported: false, repStock: [], repMov: [], repIssues: [] };
  }
}

export async function apiEnsureIssueLines(
  supabase: SupabaseClient,
  issueId: number,
): Promise<any[]> {
  const r = await supabase.rpc("acc_report_issue_lines" as any, { p_issue_id: issueId } as any);
  if (!r.error && Array.isArray(r.data)) return r.data as any[];
  return [];
}

export type IssuedMaterialsFastRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_in_req: any;
  sum_free: any;
  sum_over: any;
  sum_total: any;
  docs_cnt: any;
  lines_cnt: any;
};

export type IssuedByObjectFastRow = {
  object_id: string | null;
  object_name: string;
  work_name: string;

  docs_cnt: any;
  req_cnt: any;
  active_days: any;
  uniq_materials: any;

  recipients_text: string | null;
  top3_materials: string | null;
};

export async function apiFetchIssuedMaterialsReportFast(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedMaterialsFastRow[]> {
  const r = await supabase.rpc("wh_report_issued_materials_fast" as any, {
    p_from: normDateArg(p.from),
    p_to: normDateArg(p.to),
    p_object_id: p.objectId ?? null,
  } as any);

  if (!r.error && Array.isArray(r.data)) return r.data as any[];
  return [];
}

export async function apiFetchIssuedByObjectReportFast(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedByObjectFastRow[]> {
  const r = await supabase.rpc("wh_report_issued_by_object_fast" as any, {
    p_from: normDateArg(p.from),
    p_to: normDateArg(p.to),
    p_object_id: p.objectId ?? null,
  } as any);

  if (!r.error && Array.isArray(r.data)) return r.data as any[];
  return [];
}

export async function apiFetchIncomingReports(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
): Promise<any[]> {
  const r = await supabase.rpc("acc_report_incoming_v2" as any, {
    p_from: normDateArg(p.from),
    p_to: normDateArg(p.to),
  } as any);

  if (!r.error && Array.isArray(r.data)) return r.data as any[];
  return [];
}

export type IncomingMaterialsFastRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_total: number;
  docs_cnt: number;
  lines_cnt: number;
};

export async function apiFetchIncomingMaterialsReportFast(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
): Promise<IncomingMaterialsFastRow[]> {
  // No RPC for this on server yet, use ledger directly for stability
  // and to avoid 404 errors in console
  console.log("[apiFetchIncomingMaterialsReportFast] Fetching from ledger for", p);

  const q: any = await supabase
    .from("wh_ledger" as any)
    .select("code, uom_id, qty, moved_at, warehouseman_fio")
    .eq("direction", "in")
    .gte("moved_at", normDateArg(p.from))
    .lte("moved_at", normDateArg(p.to));


  if (q.error || !q.data) {
    if (q.error) console.warn("[apiFetchIncomingMaterialsReportFast] fallback err:", q.error.message);
    return [];
  }

  const groups: Record<string, IncomingMaterialsFastRow> = {};
  for (const row of q.data as any[]) {
    const code = String(row.code || "").trim();
    if (!code) continue;

    const key = `${code}|${row.uom_id}`;
    if (!groups[key]) {
      groups[key] = {
        material_code: code,
        material_name: normalizeRuText(code),
        uom: row.uom_id,
        sum_total: 0,
        docs_cnt: 0,
        lines_cnt: 0,
      };
    }
    const val = Number(row.qty || 0);
    groups[key].sum_total += val;
    groups[key].lines_cnt += 1;
  }
  return Object.values(groups);
}

export async function apiFetchIncomingLines(
  supabase: SupabaseClient,
  incomingId: string,
): Promise<any[]> {
  console.log("[apiFetchIncomingLines] Direct fetch for:", incomingId);

  const q: any = await supabase
    .from("wh_ledger" as any)
    .select("code, uom_id, qty")
    .eq("incoming_id", incomingId)
    .eq("direction", "in");

  if (!q.error && Array.isArray(q.data)) {
    console.log("[apiFetchIncomingLines] Success:", q.data.length, "lines");
    const rows = q.data as any[];
    const codesUpper = Array.from(
      new Set(rows.map((ln: any) => String(ln?.code ?? "").trim().toUpperCase()).filter(Boolean))
    );

    const [overMap, rikMap, uiMap] = await Promise.all([
      loadNameMapOverrides(supabase, codesUpper),
      loadNameMapRikRu(supabase, codesUpper),
      loadNameMapLedgerUi(supabase, codesUpper),
    ]);

    return rows.map((ln: any) => {
      const code = String(ln?.code ?? "").trim();
      const key = code.toUpperCase();
      const nOver = String(normalizeRuText(String(overMap[key] ?? ""))).trim();
      const nRik = String(normalizeRuText(String(rikMap[key] ?? ""))).trim();
      const nUi = String(normalizeRuText(String(uiMap[key] ?? ""))).trim();
      const nameRu = normalizeRuText(nOver || nRik || nUi || code || "Позиция");

      return {
        ...ln,
        name_ru: nameRu,
        material_name: nameRu,
        name: nameRu,
        uom: ln.uom_id || "—",
        qty_received: ln.qty,
      };
    });
  }

  if (q.error) console.error("[apiFetchIncomingLines] Error:", q.error.message);
  return [];
}
