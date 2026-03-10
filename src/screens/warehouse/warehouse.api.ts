// src/screens/warehouse/warehouse.api.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockRow, ReqHeadRow, ReqItemUiRow } from "./warehouse.types";
import { nz, parseNum } from "./warehouse.utils";
import { normalizeRuText } from "../../lib/text/encoding";
import { isRequestDirectorApproved } from "../../lib/requestStatus";

type UnknownRow = Record<string, unknown>;

const pickUom = (v: unknown): string | null => {
  const s = v == null ? "" : String(v).trim();
  return s !== "" ? s : null;
};

const looksLikeCode = (s: unknown) => {
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

const toTextOrNull = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s || null;
};

let requestsFallbackLastHardFailAt = 0;
let requestsFallbackLastSkipLogAt = 0;
const REQUESTS_FALLBACK_FAIL_COOLDOWN_MS = 30000;

async function tryLoadRequestsFallbackRows(
  supabase: SupabaseClient,
  pageSize: number,
): Promise<UnknownRow[]> {
  const now = Date.now();
  if (
    requestsFallbackLastHardFailAt > 0 &&
    now - requestsFallbackLastHardFailAt < REQUESTS_FALLBACK_FAIL_COOLDOWN_MS
  ) {
    if (now - requestsFallbackLastSkipLogAt > 5000) {
      requestsFallbackLastSkipLogAt = now;
      console.warn("[warehouse.api] requests fallback select skipped by cooldown after repeated 400 failures");
    }
    return [];
  }

  const fetchBySelect = async (selectCols: string) =>
    supabase
      .from("requests")
      .select(selectCols)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("display_no", { ascending: false })
      .limit(Math.max(pageSize * 6, 600));

  // Canonical anti-drift path: avoid explicit legacy columns and read the current row surface.
  const star = await fetchBySelect("*");
  if (!star.error && Array.isArray(star.data)) {
    return star.data as unknown as UnknownRow[];
  }
  requestsFallbackLastHardFailAt = Date.now();
  const msg = String((star.error as { message?: string } | null)?.message ?? star.error ?? "unknown");
  console.warn("[warehouse.api] requests fallback select(*) failed:", msg);

  return [];
}

const parseDisplayNo = (raw: unknown): { year: number; seq: number } => {
  const s = String(raw ?? "").trim();
  const m = s.match(/(\d+)\s*\/\s*(\d{4})/);
  if (!m) return { year: 0, seq: 0 };
  return { seq: Number(m[1] ?? 0) || 0, year: Number(m[2] ?? 0) || 0 };
};

const reqHeadSort = (a: ReqHeadRow, b: ReqHeadRow): number => {
  const ta = a?.submitted_at ? new Date(a.submitted_at).getTime() : 0;
  const tb = b?.submitted_at ? new Date(b.submitted_at).getTime() : 0;
  if (tb !== ta) return tb - ta;

  const pa = parseDisplayNo(a.display_no);
  const pb = parseDisplayNo(b.display_no);
  if (pb.year !== pa.year) return pb.year - pa.year;
  if (pb.seq !== pa.seq) return pb.seq - pa.seq;

  const ra = String(a?.request_id ?? "");
  const rb = String(b?.request_id ?? "");
  return rb.localeCompare(ra);
};

function parseReqHeaderContext(rawParts: (string | null | undefined)[]) {
  const out: { contractor: string; phone: string; volume: string } = {
    contractor: "",
    phone: "",
    volume: "",
  };
  const cleanPhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };
  const put = (key: keyof typeof out, value: string) => {
    const v = String(value || "").trim();
    if (!v || out[key]) return;
    out[key] = v;
  };
  const contractorKeyRe =
    /(?:\u043f\u043e\u0434\u0440\u044f\u0434|\u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446|contractor|organization|supplier)/i;
  const phoneKeyRe = /(?:\u0442\u0435\u043b|phone|tel)/i;
  const volumeKeyRe = /(?:\u043e\u0431(?:\u044a|\u044c)?(?:\u0435|\u0451)?\u043c|volume)/i;
  for (const raw of rawParts) {
    const lines = String(raw || "")
      .split(/[\r\n;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const ln of lines) {
      const m = ln.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!m) continue;
      const k = String(m[1] || "").trim().toLowerCase();
      const v = String(m[2] || "").trim();
      if (!v) continue;
      if (!out.contractor && contractorKeyRe.test(k)) {
        put("contractor", v);
      } else if (!out.phone && phoneKeyRe.test(k)) {
        const ph = cleanPhone(v);
        if (ph) put("phone", ph);
      } else if (!out.volume && volumeKeyRe.test(k)) {
        put("volume", v);
      }
    }
  }
  return out;
}

async function enrichReqHeadsMeta(
  supabase: SupabaseClient,
  rows: ReqHeadRow[],
): Promise<ReqHeadRow[]> {
  const idsNeedMeta = rows
    .filter(
      (r) =>
        !String(r.contractor_name ?? "").trim() ||
        !String(r.contractor_phone ?? "").trim() ||
        !String(r.planned_volume ?? "").trim(),
    )
    .map((r) => String(r.request_id ?? "").trim())
    .filter(Boolean);

  if (!idsNeedMeta.length) return rows;

  const reqQ = await supabase.from("requests").select("*").in("id", idsNeedMeta);
  const reqById: Record<string, UnknownRow> = {};
  if (!reqQ.error && Array.isArray(reqQ.data)) {
    for (const r of reqQ.data as UnknownRow[]) {
      const id = String(r?.id ?? "").trim();
      if (id) reqById[id] = r;
    }
  }

  const itemQ = await supabase
    .from("request_items")
    .select("request_id, note")
    .in("request_id", idsNeedMeta);
  const itemNotesByReq: Record<string, string[]> = {};
  if (!itemQ.error && Array.isArray(itemQ.data)) {
    for (const it of itemQ.data as UnknownRow[]) {
      const rid = String(it?.request_id ?? "").trim();
      if (!rid) continue;
      const note = String(it?.note ?? "").trim();
      if (!note) continue;
      if (!itemNotesByReq[rid]) itemNotesByReq[rid] = [];
      itemNotesByReq[rid].push(note);
    }
  }

  const pickVal = (obj: UnknownRow | undefined, keys: string[]) => {
    for (const k of keys) {
      const v = String(obj?.[k] ?? "").trim();
      if (v) return v;
    }
    return "";
  };
  const normalizePhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };

  return rows.map((row) => {
    const rid = String(row.request_id ?? "").trim();
    const req = reqById[rid];
    if (!req) return row;

    const fromReqText = parseReqHeaderContext([
      String(req?.note ?? ""),
      String(req?.comment ?? ""),
    ]);
    const fromItemText = parseReqHeaderContext(itemNotesByReq[rid] ?? []);

    const contractor =
      pickVal(req, [
        "contractor_name",
        "contractor_org",
        "subcontractor_name",
        "subcontractor_org",
        "contractor",
        "supplier_name",
      ]) ||
      fromReqText.contractor ||
      fromItemText.contractor;
    const phone =
      pickVal(req, [
        "contractor_phone",
        "subcontractor_phone",
        "phone",
        "phone_number",
        "phone_no",
        "tel",
      ]) ||
      fromReqText.phone ||
      fromItemText.phone;
    const volume =
      pickVal(req, ["planned_volume", "qty_planned", "planned_qty", "volume", "qty_plan"]) ||
      fromReqText.volume ||
      fromItemText.volume;

    const rowPhone = normalizePhone(String(row.contractor_phone ?? ""));
    const derivedPhone = normalizePhone(phone);

    return {
      ...row,
      contractor_name: row.contractor_name ?? contractor ?? null,
      contractor_phone: rowPhone || derivedPhone || null,
      planned_volume: row.planned_volume ?? volume ?? null,
      note: row.note ?? toTextOrNull(req?.note),
      comment: row.comment ?? toTextOrNull(req?.comment),
    };
  });
}

async function loadNameMapOverrides(
  supabase: SupabaseClient,
  codesUpper: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!codesUpper.length) return out;

  // catalog_name_overrides: pk(code)
  const q = await supabase
    .from("catalog_name_overrides")
    .select("code, name_ru")
    .in("code", codesUpper.slice(0, 5000));

  if (q.error || !Array.isArray(q.data)) return out;

  for (const r of q.data as UnknownRow[]) {
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
    .from("v_rik_names_ru")
    .select("code, name_ru")
    .in("code", codesUpper.slice(0, 5000));

  if (q.error || !Array.isArray(q.data)) return out;

  for (const r of q.data as UnknownRow[]) {
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
    .from("v_wh_balance_ledger_ui")
    .select("code, name")
    .in("code", codesUpper.slice(0, 5000));

  if (q.error || !Array.isArray(q.data)) return out;

  for (const r of q.data as UnknownRow[]) {
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
      .from("v_wh_balance_ledger_truth_ui")
      .select("code, uom_id, qty_available, updated_at")
      .order("code", { ascending: true })
      .range(offset, offset + limit - 1);

    if (!truth.error && Array.isArray(truth.data)) {
      const truthRows = truth.data as UnknownRow[];

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


    const v = await supabase.from("v_warehouse_stock").select("*").range(offset, offset + limit - 1);
    if (!v.error && Array.isArray(v.data)) {
      const rows = (v.data || []).map(
        (x: UnknownRow) =>
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
  const normalizePhone = (v: string) => {
    const src = String(v || "").trim();
    if (!src) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
    if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
    const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
    if (!m) return "";
    const candidate = String(m[1] || "").trim();
    const digits = candidate.replace(/[^\d]/g, "");
    if (digits.length < 9) return "";
    return candidate.replace(/\s+/g, "");
  };
  const q = await supabase
    .from("v_wh_issue_req_heads_ui")
    .select("*")
    // 1) recency by submitted timestamp (cheap and stable for view)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    // 2) stable tiebreakers
    .order("display_no", { ascending: false })
    .order("request_id", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (q.error || !Array.isArray(q.data)) return [];

  const rows: ReqHeadRow[] = (q.data as UnknownRow[]).map((x) => ({
    request_id: String(x.request_id),
    display_no: toTextOrNull(x.display_no),
    object_name: toTextOrNull(x.object_name),

    level_code: toTextOrNull(x.level_code),
    system_code: toTextOrNull(x.system_code),
    zone_code: toTextOrNull(x.zone_code),

    level_name: toTextOrNull(x.level_name),
    system_name: toTextOrNull(x.system_name),
    zone_name: toTextOrNull(x.zone_name),
    contractor_name: toTextOrNull(x.contractor_name ?? x.contractor_org ?? x.subcontractor_name),
    contractor_phone: toTextOrNull(x.contractor_phone ?? x.phone ?? x.phone_number),
    planned_volume: toTextOrNull(x.planned_volume ?? x.volume ?? x.qty_plan),
    note: toTextOrNull(x.note),
    comment: toTextOrNull(x.comment),

    submitted_at: toTextOrNull(x.submitted_at),

    items_cnt: Number(x.items_cnt ?? 0),
    ready_cnt: Number(x.ready_cnt ?? 0),
    done_cnt: Number(x.done_cnt ?? 0),

    qty_limit_sum: parseNum(x.qty_limit_sum, 0),
    qty_issued_sum: parseNum(x.qty_issued_sum, 0),
    qty_left_sum: parseNum(x.qty_left_sum, 0),

    issue_status: String(x.issue_status ?? "READY"),
  }));

  rows.sort(reqHeadSort);

  let viewRows = rows.filter((r) => {
    const notDone = String(r.issue_status ?? "").trim().toUpperCase() !== "DONE";
    const hasLeft = parseNum(r.qty_left_sum, 0) > 0;
    return notDone && hasLeft;
  });
  const viewReqIds = Array.from(
    new Set(viewRows.map((r) => String(r.request_id || "").trim()).filter(Boolean)),
  );

  // Hard gate: warehouse issue queue must contain only director-approved requests.
  // This prevents accidental exposure of "На утверждении" requests if a view returns them.
  if (viewReqIds.length) {
    try {
      const rsQ = await supabase
        .from("requests")
        .select("id, status")
        .in("id", viewReqIds);
      if (!rsQ.error && Array.isArray(rsQ.data)) {
        const byId = new Map<string, string>();
        for (const row of rsQ.data as UnknownRow[]) {
          const id = String(row?.id ?? "").trim();
          if (!id) continue;
          byId.set(id, String(row?.status ?? ""));
        }
        viewRows = viewRows.filter((r) => {
          const st = byId.get(String(r.request_id || "").trim()) || "";
          return isRequestDirectorApproved(st);
        });
      } else {
        viewRows = [];
      }
    } catch {
      viewRows = [];
    }
  }

  // Fallback only on first page:
  // include approved requests not yet materialized in warehouse view.
  // On next pages we rely on pure view pagination to avoid duplicate slices.
  if (page === 0 && viewRows.length < pageSize) {
    try {
      const reqRows = await tryLoadRequestsFallbackRows(supabase, pageSize);

    if (reqRows.length) {
      const approvedReqs = reqRows
        .filter((r) => isRequestDirectorApproved(r?.status))
        .map((r) => ({
          request_id: String(r.id ?? "").trim(),
          display_no: toTextOrNull(r.display_no),
          object_name: toTextOrNull(r.object_name ?? r.object_type_code),
          level_name: toTextOrNull(r.level_name ?? r.level_code),
          system_name: toTextOrNull(r.system_name ?? r.system_code),
          zone_name: toTextOrNull(r.zone_name ?? r.zone_code),
          level_code: toTextOrNull(r.level_code),
          system_code: toTextOrNull(r.system_code),
          zone_code: toTextOrNull(r.zone_code),
          submitted_at: toTextOrNull(r.submitted_at ?? r.created_at),
        }))
        .filter((r) => !!r.request_id);

      if (approvedReqs.length) {
        const viewIds = new Set(viewRows.map((r) => String(r.request_id)));
        const missingReqIds = approvedReqs
          .map((r) => r.request_id)
          .filter((id) => !viewIds.has(id));

        if (missingReqIds.length) {
          const itQ = await supabase
            .from("request_items")
            .select("id, request_id, status, qty")
            .in("request_id", missingReqIds);

          const stat: Record<
            string,
            { items: number; qty: number; done: number; rejected: number }
          > = {};
          for (const id of missingReqIds) stat[id] = { items: 0, qty: 0, done: 0, rejected: 0 };

          if (!itQ.error && Array.isArray(itQ.data)) {
            for (const it of itQ.data as UnknownRow[]) {
              const rid = String(it?.request_id ?? "").trim();
              if (!rid || !stat[rid]) continue;
              const status = String(it?.status ?? "").trim().toLowerCase();
              stat[rid].items += 1;
              stat[rid].qty += parseNum(it?.qty, 0);
              if (status.includes("выдан") || status === "done") stat[rid].done += 1;
              if (status.includes("отклон")) stat[rid].rejected += 1;
            }
          }

          const fallbackRows: ReqHeadRow[] = approvedReqs
            .filter((r) => !viewIds.has(r.request_id))
            .map((r) => {
              const reqRaw = reqRows.find((x) => String(x?.id ?? "").trim() === r.request_id) ?? null;
              const fromReqText = parseReqHeaderContext([
                String(reqRaw?.note ?? ""),
                String(reqRaw?.comment ?? ""),
              ]);
              const contractor =
                String(
                  reqRaw?.contractor_name ??
                    reqRaw?.contractor_org ??
                    reqRaw?.subcontractor_name ??
                    reqRaw?.subcontractor_org ??
                    "",
                ).trim() || fromReqText.contractor || null;
              const phone =
                normalizePhone(
                  String(
                    reqRaw?.contractor_phone ??
                      reqRaw?.subcontractor_phone ??
                      reqRaw?.phone ??
                      reqRaw?.phone_number ??
                      "",
                  ).trim(),
                ) || normalizePhone(fromReqText.phone) || null;
              const plannedVolume =
                String(
                  reqRaw?.planned_volume ??
                    reqRaw?.volume ??
                    reqRaw?.qty_plan ??
                    "",
                ).trim() || fromReqText.volume || null;
              const s = stat[r.request_id] ?? { items: 0, qty: 0, done: 0, rejected: 0 };
              const readyCnt = Math.max(0, s.items - s.done - s.rejected);
              return {
                request_id: r.request_id,
                display_no: r.display_no,
                object_name: r.object_name,
                level_code: r.level_code,
                system_code: r.system_code,
                zone_code: r.zone_code,
                level_name: r.level_name,
                system_name: r.system_name,
                zone_name: r.zone_name,
                contractor_name: contractor,
                contractor_phone: phone,
                planned_volume: plannedVolume,
                note: reqRaw?.note == null ? null : String(reqRaw.note),
                comment: reqRaw?.comment == null ? null : String(reqRaw.comment),
                submitted_at: r.submitted_at,
                items_cnt: s.items,
                ready_cnt: readyCnt,
                done_cnt: s.done,
                qty_limit_sum: s.qty,
                qty_issued_sum: 0,
                qty_left_sum: s.qty,
                issue_status: readyCnt > 0 ? "READY" : "WAITING_STOCK",
              };
            })
            .filter((r) => parseNum(r.qty_left_sum, 0) > 0);

          const merged = [...viewRows, ...fallbackRows]
            .sort(reqHeadSort)
            .slice(0, pageSize);
          try {
            return await enrichReqHeadsMeta(supabase, merged);
          } catch {
            return merged;
          }
        }
      }
    }
    } catch {
      // keep view rows when fallback fails
    }
  }

  try {
    return await enrichReqHeadsMeta(supabase, viewRows);
  } catch {
    return viewRows;
  }
}
export async function apiFetchReqItems(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ReqItemUiRow[]> {
  type ReqItemUiRowWithMeta = ReqItemUiRow & { note?: string | null; comment?: string | null };
  const rid = String(requestId || "").trim();
  if (!rid) return [];

  const q = await supabase
    .from("v_wh_issue_req_items_ui")
    .select("*")
    .eq("request_id", rid)
    .order("name_human", { ascending: true });

  if (q.error || !Array.isArray(q.data)) {
    return [];
  }

  let raw: ReqItemUiRowWithMeta[] = (q.data as UnknownRow[]).map((x) => ({
    request_id: String(x.request_id),
    request_item_id: String(x.request_item_id),

    display_no: toTextOrNull(x.display_no),
    object_name: toTextOrNull(x.object_name),
    level_code: toTextOrNull(x.level_code),
    system_code: toTextOrNull(x.system_code),
    zone_code: toTextOrNull(x.zone_code),

    rik_code: String(x.rik_code ?? ""),
    name_human: String(x.name_human ?? x.rik_code ?? ""),
    uom: toTextOrNull(x.uom),

    qty_limit: parseNum(x.qty_limit, 0),
    qty_issued: parseNum(x.qty_issued, 0),
    qty_left: parseNum(x.qty_left, 0),

    qty_available: parseNum(x.qty_available, 0),
    qty_can_issue_now: parseNum(x.qty_can_issue_now, 0),
    note: toTextOrNull(x.note),
    comment: toTextOrNull(x.comment),
  }));

  // Enrich notes from base request_items table (view may not expose note/comment).
  try {
    const ids = raw
      .map((x) => String(x.request_item_id ?? "").trim())
      .filter(Boolean);
    if (ids.length) {
      const nQ = await supabase
        .from("request_items")
        .select("id, note")
        .in("id", ids);
      if (!nQ.error && Array.isArray(nQ.data) && nQ.data.length) {
        const byId: Record<string, { note: string | null }> = {};
        for (const r of nQ.data as UnknownRow[]) {
          const id = String(r?.id ?? "").trim();
          if (!id) continue;
          byId[id] = {
            note: r?.note == null ? null : String(r.note),
          };
        }
        raw = raw.map((it) => {
          const id = String(it.request_item_id ?? "").trim();
          const p = byId[id];
          if (!p) return it;
          return {
            ...it,
            note: it.note ?? p.note ?? null,
            comment: it.comment ?? null,
          };
        });
      }
    }
  } catch {
    // keep base rows if enrichment fails
  }

  // вњ… РґРµРґСѓРї РїРѕ request_item_id (Р±РµСЂС‘Рј РјР°РєСЃРёРјР°Р»СЊРЅС‹Рµ С‡РёСЃР»Р°)
  const byId: Record<string, ReqItemUiRowWithMeta> = {};
  for (const it of raw) {
    const id = String(it.request_item_id ?? "").trim();
    if (!id) continue;

    const prev = byId[id];
    if (!prev) {
      byId[id] = it;
      continue;
    }

    const merged: ReqItemUiRowWithMeta = { ...prev };
    const pickText = (a: unknown, b: unknown): string | null => {
      const sa = String(a ?? "").trim();
      if (sa) return sa;
      const sb = String(b ?? "").trim();
      return sb || null;
    };

    merged.name_human = pickText(prev.name_human, it.name_human) ?? "";
    merged.rik_code = pickText(prev.rik_code, it.rik_code) ?? "";
    merged.uom = pickText(prev.uom, it.uom);
    merged.note = pickText(prev.note, it.note);
    merged.comment = pickText(prev.comment, it.comment);

    merged.qty_limit = Math.max(parseNum(prev.qty_limit, 0), parseNum(it.qty_limit, 0));
    merged.qty_issued = Math.max(parseNum(prev.qty_issued, 0), parseNum(it.qty_issued, 0));
    merged.qty_left = Math.max(parseNum(prev.qty_left, 0), parseNum(it.qty_left, 0));
    merged.qty_available = Math.max(parseNum(prev.qty_available, 0), parseNum(it.qty_available, 0));
    merged.qty_can_issue_now = Math.max(
      parseNum(prev.qty_can_issue_now, 0),
      parseNum(it.qty_can_issue_now, 0),
    );

    byId[id] = merged;
  }

  const viewItems = Object.values(byId).sort((a, b) =>
    String(a.name_human ?? "").localeCompare(String(b.name_human ?? "")),
  );

  if (viewItems.length > 0) return viewItems;

  // Fallback for requests not yet materialized in warehouse view.
  try {
    const f = await supabase
      .from("request_items")
      .select("id, request_id, rik_code, name_human, uom, qty, status, note")
      .eq("request_id", rid)
      .order("name_human", { ascending: true });
    if (!f.error && Array.isArray(f.data) && f.data.length) {
      const direct = (f.data as UnknownRow[])
        .filter((x) => !String(x?.status ?? "").toLowerCase().includes("отклон"))
        .map((x) => {
          const qty = parseNum(x?.qty, 0);
          const available = qty; // unknown here; keep non-blocking until stock check in UI
          return {
            request_id: String(x.request_id ?? rid),
            request_item_id: String(x.id ?? ""),
            display_no: null,
            object_name: null,
            level_code: null,
            system_code: null,
            zone_code: null,
            rik_code: String(x.rik_code ?? ""),
            name_human: String(x.name_human ?? x.rik_code ?? ""),
            uom: x.uom ?? null,
            qty_limit: qty,
            qty_issued: 0,
            qty_left: qty,
            qty_available: available,
            qty_can_issue_now: Math.max(0, Math.min(qty, available)),
            note: x.note ?? null,
            comment: null,
          } as ReqItemUiRow;
        });
      return direct;
    }
  } catch {
    // ignore
  }

  return viewItems;
}
export async function apiFetchReports(
  supabase: SupabaseClient,
  periodFrom?: string,
  periodTo?: string,
): Promise<{ supported: boolean; repStock: StockRow[]; repMov: UnknownRow[]; repIssues: UnknownRow[] }> {
  try {
    const s = await supabase.rpc("acc_report_stock", {});
    const m = await supabase.rpc("acc_report_movement", {
      p_from: periodFrom || null,
      p_to: periodTo || null,
    });
    const iss = await supabase.rpc("acc_report_issues_v2", {
      p_from: periodFrom || null,
      p_to: periodTo || null,
    });

    return {
      supported: true,
      repStock: !s.error && Array.isArray(s.data) ? (s.data as StockRow[]) : [],
      repMov: !m.error && Array.isArray(m.data) ? (m.data as UnknownRow[]) : [],
      repIssues: !iss.error && Array.isArray(iss.data) ? (iss.data as UnknownRow[]) : [],
    };
  } catch {
    return { supported: false, repStock: [], repMov: [], repIssues: [] };
  }
}

export async function apiEnsureIssueLines(
  supabase: SupabaseClient,
  issueId: number,
): Promise<UnknownRow[]> {
  const r = await supabase.rpc("acc_report_issue_lines", { p_issue_id: issueId });
  if (!r.error && Array.isArray(r.data)) return r.data as UnknownRow[];
  return [];
}

export type IssuedMaterialsFastRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_in_req: unknown;
  sum_free: unknown;
  sum_over: unknown;
  sum_total: unknown;
  docs_cnt: unknown;
  lines_cnt: unknown;
};

export type IssuedByObjectFastRow = {
  object_id: string | null;
  object_name: string;
  work_name: string;

  docs_cnt: unknown;
  req_cnt: unknown;
  active_days: unknown;
  uniq_materials: unknown;

  recipients_text: string | null;
  top3_materials: string | null;
};

export async function apiFetchIssuedMaterialsReportFast(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedMaterialsFastRow[]> {
  const r = await supabase.rpc("wh_report_issued_materials_fast", {
    p_from: normDateArg(p.from),
    p_to: normDateArg(p.to),
    p_object_id: p.objectId ?? null,
  });

  if (!r.error && Array.isArray(r.data)) return r.data as IssuedMaterialsFastRow[];
  return [];
}

export async function apiFetchIssuedByObjectReportFast(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null; objectId?: string | null },
): Promise<IssuedByObjectFastRow[]> {
  const r = await supabase.rpc("wh_report_issued_by_object_fast", {
    p_from: normDateArg(p.from),
    p_to: normDateArg(p.to),
    p_object_id: p.objectId ?? null,
  });

  if (!r.error && Array.isArray(r.data)) return r.data as IssuedByObjectFastRow[];
  return [];
}

export async function apiFetchIncomingReports(
  supabase: SupabaseClient,
  p: { from?: string | null; to?: string | null },
): Promise<UnknownRow[]> {
  const r = await supabase.rpc("acc_report_incoming_v2", {
    p_from: normDateArg(p.from),
    p_to: normDateArg(p.to),
  });

  if (!r.error && Array.isArray(r.data)) return r.data as UnknownRow[];
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

  const q = await supabase
    .from("wh_ledger")
    .select("code, uom_id, qty, moved_at, warehouseman_fio")
    .eq("direction", "in")
    .gte("moved_at", normDateArg(p.from))
    .lte("moved_at", normDateArg(p.to));


  if (q.error || !q.data) {
    if (q.error) console.warn("[apiFetchIncomingMaterialsReportFast] fallback err:", q.error.message);
    return [];
  }

  const groups: Record<string, IncomingMaterialsFastRow> = {};
  for (const row of q.data as UnknownRow[]) {
    const code = String(row.code || "").trim();
    if (!code) continue;

    const key = `${code}|${row.uom_id}`;
    if (!groups[key]) {
      groups[key] = {
        material_code: code,
        material_name: normalizeRuText(code),
        uom: String(row.uom_id ?? ""),
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
): Promise<UnknownRow[]> {
  console.log("[apiFetchIncomingLines] Direct fetch for:", incomingId);

  const q = await supabase
    .from("wh_ledger")
    .select("code, uom_id, qty")
    .eq("incoming_id", incomingId)
    .eq("direction", "in");

  if (!q.error && Array.isArray(q.data)) {
    console.log("[apiFetchIncomingLines] Success:", q.data.length, "lines");
    const rows = q.data as UnknownRow[];
    const codesUpper = Array.from(
      new Set(rows.map((ln) => String(ln?.code ?? "").trim().toUpperCase()).filter(Boolean))
    );

    const [overMap, rikMap, uiMap] = await Promise.all([
      loadNameMapOverrides(supabase, codesUpper),
      loadNameMapRikRu(supabase, codesUpper),
      loadNameMapLedgerUi(supabase, codesUpper),
    ]);

    return rows.map((ln) => {
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

