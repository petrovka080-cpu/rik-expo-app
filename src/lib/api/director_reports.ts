import { supabase } from "../supabaseClient";

type DirectorReportOptions = {
  objects: string[];
  objectIdByName: Record<string, string | null>;
};

type DirectorReportRow = {
  rik_code: string;
  name_human_ru: string;
  uom: string;
  qty_total: number;
  docs_cnt: number;
  qty_without_request: number;
  docs_without_request: number;
};

type DirectorReportWho = {
  who: string;
  items_cnt: number;
};

type DirectorReportPayload = {
  meta?: { from?: string; to?: string; object_name?: string | null };
  kpi?: {
    issues_total: number;
    issues_without_object: number;
    items_total: number;
    items_without_request: number;
  };
  rows?: DirectorReportRow[];
  discipline_who?: DirectorReportWho[];
};

type DirectorFactRow = {
  issue_id: number | string;
  iss_date: string;
  object_name: string | null;
  work_name: string | null;
  rik_code: string;
  material_name_ru: string | null;
  uom: string | null;
  qty: number | string | null;
  is_without_request: boolean | null;
};

type AccIssueHead = {
  issue_id: number | string;
  event_dt: string | null;
  kind: string | null;
  who: string | null;
  note: string | null;
  request_id: string | null;
  display_no: string | null;
};

type AccIssueLine = {
  issue_id: number | string;
  rik_code: string | null;
  uom: string | null;
  name_human: string | null;
  qty_total: number | string | null;
  qty_in_req: number | string | null;
  qty_over: number | string | null;
};

const WITHOUT_OBJECT = "Без объекта";
const WITHOUT_WORK = "Без вида работ";
const DASH = "—";

const toNum = (v: any): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const normObjectName = (v: any): string => {
  const s = String(v ?? "").trim();
  return s || WITHOUT_OBJECT;
};

const normWorkName = (v: any): string => {
  const s = String(v ?? "").trim();
  return s || WITHOUT_WORK;
};

const toRangeStart = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T00:00:00.000Z` : x;
};

const toRangeEnd = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T23:59:59.999Z` : x;
};

const chunk = <T,>(arr: T[], size = 500): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const firstNonEmpty = (...vals: any[]): string => {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
};

function parseFreeIssueContext(note: string | null | undefined): {
  objectName: string;
  workName: string;
} {
  const s = String(note ?? "");
  const obj =
    (s.match(/Объект:\s*([^·\n\r]+)/i)?.[1] || "").trim() ||
    WITHOUT_OBJECT;
  const sys =
    (s.match(/Система:\s*([^·\n\r]+)/i)?.[1] || "").trim() ||
    (s.match(/Контекст:\s*([^·\n\r]+)/i)?.[1] || "").trim() ||
    WITHOUT_WORK;
  return { objectName: obj, workName: sys };
}

async function fetchIssueHeadsViaAccRpc(p: {
  from: string;
  to: string;
}): Promise<AccIssueHead[]> {
  const { data, error } = await supabase.rpc("acc_report_issues_v2" as any, {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
  } as any);
  if (error) throw error;
  return Array.isArray(data) ? (data as AccIssueHead[]) : [];
}

async function fetchIssueLinesViaAccRpc(issueIds: string[]): Promise<AccIssueLine[]> {
  const out: AccIssueLine[] = [];
  const ids = issueIds.filter(id => String(id || "").trim() !== "");
  if (!ids.length) return [];

  // Уменьшаем размер пачки для параллельного исполнения, чтобы не вешать сеть на телефоне
  const groups = chunk(ids, 20);

  for (const g of groups) {
    const settled = await Promise.all(
      g.map(async (id) => {
        try {
          const numId = Number(id);
          if (isNaN(numId)) return [] as AccIssueLine[];

          const { data, error } = await supabase.rpc("acc_report_issue_lines" as any, {
            p_issue_id: numId,
          } as any);
          if (error) {
            console.warn(`[fetchIssueLines] RPC Error for ${id}:`, error.message);
            return [] as AccIssueLine[];
          }
          return Array.isArray(data) ? (data as AccIssueLine[]) : [];
        } catch (e) {
          console.warn(`[fetchIssueLines] catch for ${id}:`, e);
          return [] as AccIssueLine[];
        }
      })
    );
    for (const arr of settled) if (arr) out.push(...arr);
  }
  return out;
}

async function fetchDirectorFactViaAccRpc(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const heads = await fetchIssueHeadsViaAccRpc({ from: p.from, to: p.to });
  if (!heads.length) return [];

  const requestIds = Array.from(
    new Set(
      heads
        .map((h) => String(h.request_id ?? "").trim())
        .filter(id => id !== ""),
    ),
  );

  const reqById = new Map<string, any>();
  for (const ids of chunk(requestIds, 100)) {
    const { data, error } = await supabase
      .from("requests" as any)
      .select("id,object_id,object_name,object_type_code,system_code")
      .in("id", ids as any);
    if (error) continue;
    for (const r of Array.isArray(data) ? data : []) {
      const id = String(r?.id ?? "").trim();
      if (id) reqById.set(id, r);
    }
  }

  const objectIds = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.object_id ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const objectNameById = new Map<string, string>();
  for (const ids of chunk(objectIds, 100)) {
    const { data, error } = await supabase
      .from("objects" as any)
      .select("id,name")
      .in("id", ids as any);
    if (error) continue;
    for (const r of Array.isArray(data) ? data : []) {
      const id = String(r?.id ?? "").trim();
      const nm = String(r?.name ?? "").trim();
      if (id && nm) objectNameById.set(id, nm);
    }
  }

  const objectTypeCodes = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.object_type_code ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const objectTypeNameByCode = new Map<string, string>();
  for (const codes of chunk(objectTypeCodes, 100)) {
    const { data, error } = await supabase
      .from("ref_object_types" as any)
      .select("code,name_human_ru,display_name,name")
      .in("code", codes as any);
    if (error) continue;
    for (const r of Array.isArray(data) ? data : []) {
      const c = String(r?.code ?? "").trim();
      const nm = firstNonEmpty(r?.name_human_ru, r?.display_name, r?.name);
      if (c && nm) objectTypeNameByCode.set(c, nm);
    }
  }

  const systemCodes = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.system_code ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const systemNameByCode = new Map<string, string>();
  for (const codes of chunk(systemCodes, 100)) {
    const { data, error } = await supabase
      .from("ref_systems" as any)
      .select("code,name_human_ru,display_name,alias_ru,name")
      .in("code", codes as any);
    if (error) continue;
    for (const r of Array.isArray(data) ? data : []) {
      const c = String(r?.code ?? "").trim();
      const nm = firstNonEmpty(r?.name_human_ru, r?.display_name, r?.alias_ru, r?.name);
      if (c && nm) systemNameByCode.set(c, nm);
    }
  }

  const headCtxByIssueId = new Map<
    string,
    { issueId: string; issDate: string; objectName: string; workName: string; isWithoutRequest: boolean }
  >();
  for (const h of heads) {
    const issueId = String(h?.issue_id ?? "").trim();
    if (!issueId) continue;
    const reqId = String(h?.request_id ?? "").trim();

    let objectName = WITHOUT_OBJECT;
    let workName = WITHOUT_WORK;
    let isWithoutRequest = true;

    if (reqId) {
      const r = reqById.get(reqId);
      objectName = firstNonEmpty(
        objectNameById.get(String(r?.object_id ?? "").trim()),
        r?.object_name,
        objectTypeNameByCode.get(String(r?.object_type_code ?? "").trim()),
      ) || WITHOUT_OBJECT;
      workName = firstNonEmpty(
        systemNameByCode.get(String(r?.system_code ?? "").trim()),
        r?.system_code,
      ) || WITHOUT_WORK;
      isWithoutRequest = false;
    } else {
      const parsed = parseFreeIssueContext(h?.note ?? null);
      objectName = parsed.objectName || WITHOUT_OBJECT;
      workName = parsed.workName || WITHOUT_WORK;
      isWithoutRequest = true;
    }

    if (p.objectName != null && objectName !== p.objectName) continue;

    headCtxByIssueId.set(issueId, {
      issueId,
      issDate: String(h?.event_dt ?? ""),
      objectName,
      workName,
      isWithoutRequest,
    });
  }

  if (!headCtxByIssueId.size) return [];

  const issueIds = Array.from(headCtxByIssueId.keys());
  const lines = await fetchIssueLinesViaAccRpc(issueIds);
  if (!lines.length) return [];

  const out: DirectorFactRow[] = [];
  for (const ln of lines) {
    const issueId = String(ln?.issue_id ?? "").trim();
    const ctx = headCtxByIssueId.get(issueId);
    if (!ctx) continue;
    const code = String(ln?.rik_code ?? "").trim().toUpperCase();
    if (!code) continue;
    out.push({
      issue_id: issueId,
      iss_date: ctx.issDate,
      object_name: ctx.objectName,
      work_name: ctx.workName,
      rik_code: code,
      material_name_ru: firstNonEmpty(ln?.name_human, code),
      uom: String(ln?.uom ?? "").trim(),
      qty: toNum(ln?.qty_total),
      is_without_request: ctx.isWithoutRequest,
    });
  }

  return out;
}

async function fetchAllFactRowsFromView(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const pageSize = 1000;
  const out: DirectorFactRow[] = [];
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("v_director_issued_fact_rows" as any)
      .select("issue_id,iss_date,object_name,work_name,rik_code,material_name_ru,uom,qty,is_without_request")
    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) q = q.eq("object_name", p.objectName);

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data) ? (data as DirectorFactRow[]) : [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }

  return out;
}

async function fetchViaLegacyRpc(p: {
  from: string;
  to: string;
  objectId: string | null;
  objectName: string | null;
}): Promise<DirectorReportPayload> {
  const [summaryRes, materialsRes, byObjRes] = await Promise.all([
    supabase.rpc("wh_report_issued_summary_fast" as any, {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    } as any),
    supabase.rpc("wh_report_issued_materials_fast" as any, {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    } as any),
    supabase.rpc("wh_report_issued_by_object_fast" as any, {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    } as any),
  ]);

  if (summaryRes.error) throw summaryRes.error;
  if (materialsRes.error) throw materialsRes.error;
  if (byObjRes.error) throw byObjRes.error;

  const summary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
  const matRows = Array.isArray(materialsRes.data) ? (materialsRes.data as any[]) : [];
  const objRows = Array.isArray(byObjRes.data) ? (byObjRes.data as any[]) : [];

  const rows: DirectorReportRow[] = matRows
    .map((r: any) => ({
      rik_code: String(r?.material_code ?? "").trim().toUpperCase(),
      name_human_ru: String(r?.material_name ?? "").trim() || String(r?.material_code ?? "").trim(),
      uom: String(r?.uom ?? ""),
      qty_total: toNum(r?.sum_total),
      docs_cnt: Math.round(toNum(r?.docs_cnt)),
      qty_without_request: toNum(r?.sum_free),
      docs_without_request: Math.round(toNum(r?.docs_free)),
    }))
    .sort((a, b) => b.qty_total - a.qty_total);

  const disciplineAgg = new Map<string, number>();
  for (const r of objRows) {
    const who = normWorkName(r?.work_name);
    disciplineAgg.set(who, (disciplineAgg.get(who) || 0) + Math.round(toNum(r?.lines_cnt)));
  }
  const discipline_who: DirectorReportWho[] = Array.from(disciplineAgg.entries())
    .map(([who, items_cnt]) => ({ who, items_cnt }))
    .sort((a, b) => b.items_cnt - a.items_cnt);

  return {
    meta: { from: p.from, to: p.to, object_name: p.objectName },
    kpi: {
      issues_total: Math.round(toNum(summary?.docs_total)),
      issues_without_object: objRows
        .filter((r: any) => normObjectName(r?.object_name) === WITHOUT_OBJECT)
        .reduce((acc: number, r: any) => acc + Math.round(toNum(r?.docs_cnt)), 0),
      items_total: matRows.reduce((acc: number, r: any) => acc + Math.round(toNum(r?.lines_cnt)), 0),
      items_without_request: matRows.reduce((acc: number, r: any) => acc + Math.round(toNum(r?.lines_free)), 0),
    },
    rows,
    discipline_who,
  };
}

async function fetchAllFactRowsFromTables(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const issuesById = new Map<string, any>();
  const pageSize = 1000;
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("warehouse_issues" as any)
      .select("id,iss_date,object_name,work_name,request_id,status")
      .eq("status", "Подтверждено");

    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      const id = String(r?.id ?? "").trim();
      if (!id) continue;
      issuesById.set(id, r);
    }

    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }

  if (!issuesById.size) return [];

  const issueIds = Array.from(issuesById.keys()).filter(id => id !== "");
  if (!issueIds.length) return [];

  const issueItems: any[] = [];
  for (const ids of chunk(issueIds, 100)) {
    const { data, error } = await supabase
      .from("warehouse_issue_items" as any)
      .select("issue_id,rik_code,uom_id,qty,request_item_id")
      .in("issue_id", ids as any);
    if (error) throw error;
    if (Array.isArray(data)) issueItems.push(...data);
  }

  if (!issueItems.length) return [];

  const requestItemIds = Array.from(
    new Set(
      issueItems
        .map((x) => String(x?.request_item_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const requestIdByRequestItem = new Map<string, string>();
  for (const ids of chunk(requestItemIds, 500)) {
    const { data, error } = await supabase
      .from("request_items" as any)
      .select("id,request_id")
      .in("id", ids as any);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      const id = String(r?.id ?? "").trim();
      const reqId = String(r?.request_id ?? "").trim();
      if (id && reqId) requestIdByRequestItem.set(id, reqId);
    }
  }

  const requestIds = Array.from(
    new Set(
      [
        ...issueItems.map((it) => {
          const rid = String(it?.request_item_id ?? "").trim();
          return rid ? requestIdByRequestItem.get(rid) ?? "" : "";
        }),
        ...Array.from(issuesById.values()).map((iss) => String(iss?.request_id ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const requestById = new Map<string, any>();
  for (const ids of chunk(requestIds, 500)) {
    const { data, error } = await supabase
      .from("requests" as any)
      .select("id,object_id,object_name,object_type_code,system_code")
      .in("id", ids as any);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      const id = String(r?.id ?? "").trim();
      if (id) requestById.set(id, r);
    }
  }

  const objectIds = Array.from(
    new Set(
      [
        ...Array.from(issuesById.values()).map((iss) => String(iss?.target_object_id ?? "").trim()),
        ...Array.from(requestById.values()).map((req) => String(req?.object_id ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const objectNameById = new Map<string, string>();
  for (const ids of chunk(objectIds, 500)) {
    const { data, error } = await supabase
      .from("objects" as any)
      .select("id,name")
      .in("id", ids as any);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      const id = String(r?.id ?? "").trim();
      const name = String(r?.name ?? "").trim();
      if (id && name) objectNameById.set(id, name);
    }
  }

  const objectTypeCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.object_type_code ?? "").trim())
        .filter(Boolean),
    ),
  );

  const objectTypeNameByCode = new Map<string, string>();
  for (const codes of chunk(objectTypeCodes, 500)) {
    const { data, error } = await supabase
      .from("ref_object_types" as any)
      .select("code,name_human_ru,display_name,name")
      .in("code", codes as any);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      const code = String(r?.code ?? "").trim();
      const name =
        String(r?.name_human_ru ?? "").trim() ||
        String(r?.display_name ?? "").trim() ||
        String(r?.name ?? "").trim();
      if (code && name) objectTypeNameByCode.set(code, name);
    }
  }

  const systemCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.system_code ?? "").trim())
        .filter(Boolean),
    ),
  );

  const systemNameByCode = new Map<string, string>();
  for (const codes of chunk(systemCodes, 500)) {
    const { data, error } = await supabase
      .from("ref_systems" as any)
      .select("code,name_human_ru,display_name,alias_ru,name")
      .in("code", codes as any);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      const code = String(r?.code ?? "").trim();
      const name =
        String(r?.name_human_ru ?? "").trim() ||
        String(r?.display_name ?? "").trim() ||
        String(r?.alias_ru ?? "").trim() ||
        String(r?.name ?? "").trim();
      if (code && name) systemNameByCode.set(code, name);
    }
  }

  const codes = Array.from(
    new Set(
      issueItems
        .map((it) => String(it?.rik_code ?? "").trim().toUpperCase())
        .filter(code => code !== ""),
    ),
  );

  const nameRuByCode = new Map<string, string>();
  if (codes.length) {
    for (const part of chunk(codes, 100)) {
      const [canonRes, ciRes, vrrRes] = await Promise.all([
        supabase.from("catalog_items_canon" as any).select("code,name_human_ru").in("code", part as any),
        supabase
          .from("catalog_items" as any)
          .select("rik_code,name_human_ru,name_human,name")
          .in("rik_code", part as any),
        supabase.from("v_rik_names_ru" as any).select("code,name_ru").in("code", part as any),
      ]);

      if (canonRes.error) throw canonRes.error;
      if (ciRes.error) throw ciRes.error;
      if (vrrRes.error) throw vrrRes.error;

      for (const r of Array.isArray(vrrRes.data) ? vrrRes.data : []) {
        const c = String(r?.code ?? "").trim().toUpperCase();
        const n = String(r?.name_ru ?? "").trim();
        if (c && n && !nameRuByCode.has(c)) nameRuByCode.set(c, n);
      }

      for (const r of Array.isArray(ciRes.data) ? ciRes.data : []) {
        const c = String(r?.rik_code ?? "").trim().toUpperCase();
        const n =
          String(r?.name_human_ru ?? "").trim() ||
          String(r?.name_human ?? "").trim() ||
          String(r?.name ?? "").trim();
        if (c && n && !nameRuByCode.has(c)) nameRuByCode.set(c, n);
      }

      for (const r of Array.isArray(canonRes.data) ? canonRes.data : []) {
        const c = String(r?.code ?? "").trim().toUpperCase();
        const n = String(r?.name_human_ru ?? "").trim();
        if (c && n) nameRuByCode.set(c, n);
      }
    }
  }

  const out: DirectorFactRow[] = [];
  for (const it of issueItems) {
    const issueId = String(it?.issue_id ?? "").trim();
    const issue = issuesById.get(issueId);
    if (!issue) continue;

    const reqItemId = String(it?.request_item_id ?? "").trim();
    const issueReqId = String(issue?.request_id ?? "").trim();
    const reqId =
      (reqItemId ? requestIdByRequestItem.get(reqItemId) : null) ??
      (issueReqId || null);
    const req = reqId ? requestById.get(reqId) : null;

    const issueObjectById = objectNameById.get(String(issue?.target_object_id ?? "").trim()) || "";
    const reqObjectById = objectNameById.get(String(req?.object_id ?? "").trim()) || "";
    const reqObjectByName = String(req?.object_name ?? "").trim();
    const issueObjectByName = String(issue?.object_name ?? "").trim();
    const reqObjectTypeCode = String(req?.object_type_code ?? "").trim();
    const reqObjectTypeName =
      (reqObjectTypeCode && objectTypeNameByCode.get(reqObjectTypeCode)) || reqObjectTypeCode;

    const objectName = req
      ? reqObjectById || reqObjectByName || reqObjectTypeName || issueObjectById || issueObjectByName || WITHOUT_OBJECT
      : issueObjectById || issueObjectByName || reqObjectById || reqObjectByName || reqObjectTypeName || WITHOUT_OBJECT;

    if (p.objectName != null && objectName !== p.objectName) continue;

    const reqSystemCode = String(req?.system_code ?? "").trim();
    const reqSystemName = (reqSystemCode && systemNameByCode.get(reqSystemCode)) || reqSystemCode;
    const workName =
      String(issue?.work_name ?? "").trim() ||
      reqSystemName ||
      WITHOUT_WORK;

    const code = String(it?.rik_code ?? "").trim().toUpperCase();
    if (!code) continue;

    out.push({
      issue_id: issueId,
      iss_date: String(issue?.iss_date ?? ""),
      object_name: objectName,
      work_name: workName,
      rik_code: code,
      material_name_ru: nameRuByCode.get(code) || code,
      uom: String(it?.uom_id ?? "").trim(),
      qty: toNum(it?.qty),
      is_without_request: !reqItemId,
    });
  }

  return out;
}

export async function fetchDirectorWarehouseReportOptions(p: {
  from: string;
  to: string;
}): Promise<DirectorReportOptions> {
  let rows: DirectorFactRow[] = [];
  try {
    rows = await fetchAllFactRowsFromTables({ from: p.from, to: p.to, objectName: null });
  } catch { }
  if (!rows.length) {
    try {
      rows = await fetchDirectorFactViaAccRpc({ from: p.from, to: p.to, objectName: null });
    } catch { }
  }

  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: p.from, to: p.to, objectName: null });
    } catch { }
  }

  if (!rows.length) {
    const { data, error } = await supabase.rpc("wh_report_issued_by_object_fast" as any, {
      p_from: p.from,
      p_to: p.to,
      p_object_id: null,
    } as any);
    if (error) throw error;
    const rpcRows = Array.isArray(data) ? data : [];
    const objectIdByName: Record<string, string | null> = {};
    for (const r of rpcRows) {
      const name = normObjectName(r?.object_name);
      const id = r?.object_id == null ? null : String(r.object_id);
      if (!(name in objectIdByName)) objectIdByName[name] = id;
      if (objectIdByName[name] == null && id) objectIdByName[name] = id;
    }
    const objects = Object.keys(objectIdByName).sort((a, b) => a.localeCompare(b, "ru"));
    return { objects, objectIdByName };
  }

  const objectIdByName: Record<string, string | null> = {};
  for (const r of rows) {
    const name = normObjectName(r?.object_name);
    if (!(name in objectIdByName)) objectIdByName[name] = null;
  }
  const objects = Object.keys(objectIdByName).sort((a, b) => a.localeCompare(b, "ru"));
  return { objects, objectIdByName };
}

function buildPayloadFromFactRows(p: {
  from: string;
  to: string;
  objectName: string | null;
  rows: DirectorFactRow[];
}): DirectorReportPayload {
  const issueIds = new Set<string>();
  const issueIdsWithoutObject = new Set<string>();
  let itemsTotal = 0;
  let itemsWithoutRequest = 0;

  const byMaterial = new Map<
    string,
    {
      rik_code: string;
      name_human_ru: string;
      uom: string;
      qty_total: number;
      qty_without_request: number;
      docs_ids: Set<string>;
      docs_without_request_ids: Set<string>;
    }
  >();

  const byWork = new Map<string, number>();

  for (const r of p.rows) {
    const issueId = String(r?.issue_id ?? "").trim();
    if (!issueId) continue;

    const objectName = normObjectName(r?.object_name);
    const workName = normWorkName(r?.work_name);
    const code = String(r?.rik_code ?? "").trim().toUpperCase();
    const qty = toNum(r?.qty);
    const uom = String(r?.uom ?? "").trim();
    const nameRu = String(r?.material_name_ru ?? "").trim();
    const isWithoutRequest = !!r?.is_without_request;

    issueIds.add(issueId);
    if (objectName === WITHOUT_OBJECT) issueIdsWithoutObject.add(issueId);

    itemsTotal += 1;
    if (isWithoutRequest) itemsWithoutRequest += 1;
    byWork.set(workName, (byWork.get(workName) || 0) + 1);

    const key = `${code}::${uom}`;
    const prev =
      byMaterial.get(key) ??
      {
        rik_code: code,
        name_human_ru: nameRu || code || DASH,
        uom,
        qty_total: 0,
        qty_without_request: 0,
        docs_ids: new Set<string>(),
        docs_without_request_ids: new Set<string>(),
      };

    prev.qty_total += qty;
    prev.docs_ids.add(issueId);
    if (isWithoutRequest) {
      prev.qty_without_request += qty;
      prev.docs_without_request_ids.add(issueId);
    }
    byMaterial.set(key, prev);
  }

  const materialRows: DirectorReportRow[] = Array.from(byMaterial.values())
    .map((x) => ({
      rik_code: x.rik_code,
      name_human_ru: x.name_human_ru,
      uom: x.uom,
      qty_total: x.qty_total,
      docs_cnt: x.docs_ids.size,
      qty_without_request: x.qty_without_request,
      docs_without_request: x.docs_without_request_ids.size,
    }))
    .sort((a, b) => b.qty_total - a.qty_total);

  const discipline_who: DirectorReportWho[] = Array.from(byWork.entries())
    .map(([who, items_cnt]) => ({ who, items_cnt }))
    .sort((a, b) => b.items_cnt - a.items_cnt);

  return {
    meta: { from: p.from, to: p.to, object_name: p.objectName },
    kpi: {
      issues_total: issueIds.size,
      issues_without_object: issueIdsWithoutObject.size,
      items_total: itemsTotal,
      items_without_request: itemsWithoutRequest,
    },
    rows: materialRows,
    discipline_who,
  };
}

export async function fetchDirectorWarehouseReport(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<DirectorReportPayload> {
  const objectName = p.objectName ?? null;
  let rows: DirectorFactRow[] = [];

  try {
    rows = await fetchAllFactRowsFromTables({ from: p.from, to: p.to, objectName });
  } catch { }

  if (!rows.length) {
    try {
      rows = await fetchDirectorFactViaAccRpc({ from: p.from, to: p.to, objectName });
    } catch { }
  }

  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: p.from, to: p.to, objectName });
    } catch { }
  }

  if (rows.length) {
    return buildPayloadFromFactRows({
      from: p.from,
      to: p.to,
      objectName,
      rows,
    });
  }

  const selectedObjectId = objectName == null ? null : (p.objectIdByName[objectName] ?? null);
  return fetchViaLegacyRpc({
    from: p.from,
    to: p.to,
    objectId: selectedObjectId,
    objectName,
  });
}
