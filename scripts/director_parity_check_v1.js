/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE env vars");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATE_WIDE_FROM = "2020-01-01";
const DATE_WIDE_TO = "2030-01-01";
const LEGACY_PAGE_SIZE = 1000;
const LEGACY_MAX_START_OFFSET = 1000000;

const normObj = (v) => String(v ?? "").trim() || "Без объекта";
const normWork = (v) => String(v ?? "").trim() || "Без вида работ";
const toNum = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const pct = (a, b) => (b > 0 ? Math.round((a * 10000) / b) / 100 : 0);

const COMPARABLE_METRICS = {
  works: ["total_positions", "req_positions", "free_positions", "works_count"],
  materials: ["items_total", "items_without_request", "rows_count"],
};

const NON_COMPARABLE_METRICS = {
  works: ["total_qty", "issue_cost_total", "purchase_cost_total", "unpriced_issue_pct"],
  materials: ["qty_total"],
  summary: ["issue_cost_total", "purchase_cost_total", "unevaluated_ratio"],
};
let confirmedStatusValueCache = null;

async function pickCompanyId() {
  {
    const { data, error } = await supabase.from("warehouse_issues").select("company_id").not("company_id", "is", null).limit(1);
    if (!error) return data?.[0]?.company_id ?? null;
  }
  {
    const { data, error } = await supabase.from("requests").select("company_id").limit(1);
    if (!error) return data?.[0]?.company_id ?? null;
  }
  return null;
}

async function resolveConfirmedStatusValue() {
  if (confirmedStatusValueCache) return confirmedStatusValueCache;
  const { data, error } = await supabase.from("warehouse_issues").select("status").limit(500);
  if (error || !Array.isArray(data) || !data.length) {
    confirmedStatusValueCache = "Подтверждено";
    return confirmedStatusValueCache;
  }
  const statuses = Array.from(new Set(data.map((r) => String(r?.status ?? "").trim()).filter(Boolean)));
  const match = statuses.find((s) => s.toLowerCase().includes("подт"));
  confirmedStatusValueCache = match || statuses[0] || "Подтверждено";
  return confirmedStatusValueCache;
}

async function callCanonicalMaterials(scope, companyId) {
  const argsNew = {
    p_company_id: companyId,
    p_from: scope.from,
    p_to: scope.to,
    p_object_id: null,
    p_object_name: scope.objectName,
    p_include_costs: true,
    p_group_by: "material_group",
    p_mode: null,
  };
  const argsOld = {
    p_from: scope.from,
    p_to: scope.to,
    p_object_name: scope.objectName,
  };
  const isTransientGateway = (e) => {
    const msg = String(e?.message ?? e ?? "");
    return msg.includes("502") || msg.includes("Bad gateway") || msg.includes("<!DOCTYPE html>");
  };
  let data = null;
  let error = null;
  if (companyId) {
    const r = await supabase.rpc("director_report_fetch_materials_v1", argsNew);
    data = r.data;
    error = r.error;
    if (!error) return { ok: true, data, sig: "new" };
  }
  let r2 = await supabase.rpc("director_report_fetch_materials_v1", argsOld);
  data = r2.data;
  error = r2.error;
  if (error && isTransientGateway(error)) {
    r2 = await supabase.rpc("director_report_fetch_materials_v1", argsOld);
    data = r2.data;
    error = r2.error;
  }
  if (error) return { ok: false, error: error.message || String(error), sig: companyId ? "new+old_failed" : "old" };
  return { ok: true, data, sig: "old" };
}

async function callCanonicalWorks(scope, companyId, includeCosts) {
  const argsNew = {
    p_company_id: companyId,
    p_from: scope.from,
    p_to: scope.to,
    p_object_id: null,
    p_object_name: scope.objectName,
    p_include_costs: !!includeCosts,
    p_group_by: "discipline",
    p_mode: null,
  };
  const argsOld = {
    p_from: scope.from,
    p_to: scope.to,
    p_object_name: scope.objectName,
    p_include_costs: !!includeCosts,
  };
  const isTransientGateway = (e) => {
    const msg = String(e?.message ?? e ?? "");
    return msg.includes("502") || msg.includes("Bad gateway") || msg.includes("<!DOCTYPE html>");
  };
  let data = null;
  let error = null;
  if (companyId) {
    const r = await supabase.rpc("director_report_fetch_works_v1", argsNew);
    data = r.data;
    error = r.error;
    if (!error) return { ok: true, data, sig: "new" };
  }
  let r2 = await supabase.rpc("director_report_fetch_works_v1", argsOld);
  data = r2.data;
  error = r2.error;
  if (error && isTransientGateway(error)) {
    r2 = await supabase.rpc("director_report_fetch_works_v1", argsOld);
    data = r2.data;
    error = r2.error;
  }
  if (error) return { ok: false, error: error.message || String(error), sig: companyId ? "new+old_failed" : "old" };
  return { ok: true, data, sig: "old" };
}

async function callCanonicalSummary(scope, companyId) {
  const argsNew = {
    p_company_id: companyId,
    p_from: scope.from,
    p_to: scope.to,
    p_object_id: null,
    p_object_name: scope.objectName,
    p_mode: null,
  };
  const argsOld = {
    p_from: scope.from,
    p_to: scope.to,
    p_object_name: scope.objectName,
    p_mode: null,
  };
  const isTransientGateway = (e) => {
    const msg = String(e?.message ?? e ?? "");
    return msg.includes("502") || msg.includes("Bad gateway") || msg.includes("<!DOCTYPE html>");
  };
  if (companyId) {
    const r = await supabase.rpc("director_report_fetch_summary_v1", argsNew);
    if (!r.error) return { ok: true, data: r.data, sig: "new" };
  }
  let r2 = await supabase.rpc("director_report_fetch_summary_v1", argsOld);
  if (r2.error && isTransientGateway(r2.error)) {
    r2 = await supabase.rpc("director_report_fetch_summary_v1", argsOld);
  }
  if (r2.error) return { ok: false, error: r2.error.message || String(r2.error), sig: companyId ? "new+old_failed" : "old" };
  return { ok: true, data: r2.data, sig: "old" };
}

function unwrapPayload(data) {
  if (Array.isArray(data)) {
    if (!data.length) return null;
    const first = data[0];
    if (first && typeof first === "object" && Object.prototype.hasOwnProperty.call(first, "payload")) return first.payload ?? null;
    return first ?? null;
  }
  return data ?? null;
}

async function fetchLegacyIssueRows(scope) {
  const confirmedStatus = await resolveConfirmedStatusValue();
  const fromIso = `${scope.from}T00:00:00.000Z`;
  const toIso = `${scope.to}T23:59:59.999Z`;
  const out = [];

  for (
    let fromIdx = 0;
    fromIdx <= LEGACY_MAX_START_OFFSET;
    fromIdx += LEGACY_PAGE_SIZE
  ) {
    let q = supabase
      .from("warehouse_issue_items")
      .select("issue_id,rik_code,uom_id,qty,request_item_id,warehouse_issues!inner(id,iss_date,object_name,work_name,status,note)")
      .eq("warehouse_issues.status", confirmedStatus)
      .gte("warehouse_issues.iss_date", fromIso)
      .lte("warehouse_issues.iss_date", toIso)
      .order("issue_id", { ascending: false })
      .range(fromIdx, fromIdx + LEGACY_PAGE_SIZE - 1);
    if (scope.objectName) q = q.eq("warehouse_issues.object_name", scope.objectName);

    const { data, error } = await q;
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) break;
    out.push(...rows);
    if (rows.length < LEGACY_PAGE_SIZE) break;
  }

  return out;
}

async function fetchLegacyMaterials(scope) {
  const items = await fetchLegacyIssueRows(scope);
  const rows = [];
  for (const it of items) {
    const issue = Array.isArray(it.warehouse_issues) ? (it.warehouse_issues[0] ?? null) : (it.warehouse_issues ?? null);
    if (!issue) continue;
    const code = String(it.rik_code ?? "").trim().toUpperCase();
    if (!code) continue;
    rows.push({
      issue_id: String(it.issue_id ?? issue.id ?? ""),
      request_item_id: String(it.request_item_id ?? "").trim() || null,
      qty: toNum(it.qty),
      code,
    });
  }
  const uniqCodes = new Set(rows.map((r) => r.code));
  const issues = new Set(rows.map((r) => r.issue_id));
  const itemsWithoutRequest = rows.reduce((a, r) => a + (r.request_item_id ? 0 : 1), 0);
  return {
    kpi: {
      issues_total: issues.size,
      items_total: rows.length,
      items_without_request: itemsWithoutRequest,
    },
    rows_count: uniqCodes.size,
    qty_total: rows.reduce((a, r) => a + toNum(r.qty), 0),
    _meta: { page_size: LEGACY_PAGE_SIZE, fetched_rows: items.length },
  };
}

async function fetchLegacyWorks(scope) {
  const items = await fetchLegacyIssueRows(scope);
  const out = [];
  for (const it of items) {
    const issue = Array.isArray(it.warehouse_issues) ? (it.warehouse_issues[0] ?? null) : (it.warehouse_issues ?? null);
    if (!issue) continue;
    const code = String(it.rik_code ?? "").trim().toUpperCase();
    if (!code) continue;
    out.push({
      work_name: normWork(issue.work_name),
      issue_item_id: String(it.issue_id ?? issue.id ?? ""),
      request_item_id: String(it.request_item_id ?? "").trim() || null,
      qty: toNum(it.qty),
      code,
    });
  }
  const byWork = new Map();
  let totalQty = 0;
  let req = 0;
  let free = 0;
  for (const r of out) {
    totalQty += r.qty;
    if (r.request_item_id) req += 1; else free += 1;
    const e = byWork.get(r.work_name) || { cnt: 0 };
    e.cnt += 1;
    byWork.set(r.work_name, e);
  }
  return {
    summary: {
      total_positions: out.length,
      req_positions: req,
      free_positions: free,
      total_qty: totalQty,
      issue_cost_total: null,
      purchase_cost_total: null,
      unpriced_issue_pct: null,
    },
    works_count: byWork.size,
    _meta: { page_size: LEGACY_PAGE_SIZE, fetched_rows: items.length },
  };
}


function canonicalMaterialsMetrics(payload) {
  const p = unwrapPayload(payload) || {};
  const kpi = p.kpi || {};
  const rows = Array.isArray(p.rows) ? p.rows : [];
  return {
    kpi: {
      issues_total: toNum(kpi.issues_total),
      items_total: toNum(kpi.items_total),
      items_without_request: toNum(kpi.items_without_request),
    },
    rows_count: rows.length,
    qty_total: rows.reduce((a, r) => a + toNum(r.qty_total), 0),
  };
}

function canonicalWorksMetrics(payload) {
  const p = unwrapPayload(payload) || {};
  const s = p.summary || {};
  const works = Array.isArray(p.works) ? p.works : [];
  let req = 0;
  let free = 0;
  for (const w of works) {
    req += toNum(w.req_positions);
    free += toNum(w.free_positions);
  }
  return {
    summary: {
      total_positions: toNum(s.total_positions),
      req_positions: req,
      free_positions: free,
      total_qty: toNum(s.total_qty),
      issue_cost_total: toNum(s.issue_cost_total),
      purchase_cost_total: toNum(s.purchase_cost_total),
      unpriced_issue_pct: toNum(s.unpriced_issue_pct),
    },
    works_count: works.length,
  };
}

function canonicalSummaryMetrics(payload) {
  const p = unwrapPayload(payload) || {};
  return {
    issue_cost_total: toNum(p.issue_cost_total),
    purchase_cost_total: toNum(p.purchase_cost_total),
    unevaluated_ratio: toNum(p.unevaluated_ratio),
    base_ready: !!p.base_ready,
  };
}

function diffNum(a, b) {
  const av = toNum(a);
  const bv = toNum(b);
  return { legacy: av, canonical: bv, delta: bv - av };
}

async function selectScopes() {
  const byObj = await supabase.rpc("wh_report_issued_by_object_fast", {
    p_from: `${DATE_WIDE_FROM}T00:00:00Z`,
    p_to: `${DATE_WIDE_TO}T00:00:00Z`,
    p_object_id: null,
  });
  if (byObj.error) throw byObj.error;
  const rows = (Array.isArray(byObj.data) ? byObj.data : [])
    .map((r) => ({ name: normObj(r.object_name), lines: toNum(r.lines_cnt), free: toNum(r.lines_free ?? 0) }))
    .filter((r) => r.name && r.name !== "Без объекта");
  rows.sort((a, b) => a.lines - b.lines);
  const small = rows.find((r) => r.lines > 0) || null;
  const medium = rows[Math.floor(rows.length / 2)] || null;
  const complex = [...rows].sort((a, b) => b.lines - a.lines)[0] || null;
  const freeObj = rows.find((r) => r.free > 0) || null;
  return [
    { key: "all_wide", from: DATE_WIDE_FROM, to: DATE_WIDE_TO, objectName: null, tag: "all" },
    ...(small ? [{ key: "small_object", from: DATE_WIDE_FROM, to: DATE_WIDE_TO, objectName: small.name, tag: "small" }] : []),
    ...(medium ? [{ key: "medium_object", from: DATE_WIDE_FROM, to: DATE_WIDE_TO, objectName: medium.name, tag: "medium" }] : []),
    ...(complex ? [{ key: "complex_object", from: DATE_WIDE_FROM, to: DATE_WIDE_TO, objectName: complex.name, tag: "complex" }] : []),
    ...(freeObj ? [{ key: "free_unlinked_candidate", from: DATE_WIDE_FROM, to: DATE_WIDE_TO, objectName: freeObj.name, tag: "free" }] : []),
    { key: "period_30d_all", from: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })(), to: new Date().toISOString().slice(0, 10), objectName: null, tag: "period" },
  ];
}

function classifyMismatch(entry) {
  const mm = [];
  if (entry.works.compare) {
    const posDelta = Math.abs(entry.works.compare.total_positions.delta);
    if (posDelta > 0) mm.push({ sev: posDelta > 5 ? "P1" : "P2", metric: "works.total_positions" });
    const reqDelta = Math.abs(entry.works.compare.req_positions.delta);
    if (reqDelta > 0) mm.push({ sev: reqDelta > 5 ? "P1" : "P2", metric: "works.req_positions" });
    const freeDelta = Math.abs(entry.works.compare.free_positions.delta);
    if (freeDelta > 0) mm.push({ sev: freeDelta > 5 ? "P1" : "P2", metric: "works.free_positions" });
  }
  if (entry.materials.compare) {
    const matItemsDelta = Math.abs(entry.materials.compare.items_total.delta);
    if (matItemsDelta > 0) mm.push({ sev: matItemsDelta > 5 ? "P1" : "P2", metric: "materials.items_total" });
  }
  if (!entry.canonical.materials.ok || !entry.canonical.works.ok) mm.push({ sev: "P0", metric: "canonical_rpc_unavailable" });
  return mm;
}

async function run() {
  const companyId = await pickCompanyId();
  const scopes = await selectScopes();
  const results = [];
  for (const scope of scopes) {
    const legacyMaterials = await fetchLegacyMaterials(scope);
    const legacyWorks = await fetchLegacyWorks(scope);
    const cMatRaw = await callCanonicalMaterials(scope, companyId);
    const cWorksRaw = await callCanonicalWorks(scope, companyId, true);
    const cSummaryRaw = await callCanonicalSummary(scope, companyId);

    const cMat = cMatRaw.ok ? canonicalMaterialsMetrics(cMatRaw.data) : null;
    const cWorks = cWorksRaw.ok ? canonicalWorksMetrics(cWorksRaw.data) : null;
    const cSummary = cSummaryRaw.ok ? canonicalSummaryMetrics(cSummaryRaw.data) : null;

    const entry = {
      scope,
      canonical: {
        materials: { ok: cMatRaw.ok, sig: cMatRaw.sig, error: cMatRaw.error || null },
        works: { ok: cWorksRaw.ok, sig: cWorksRaw.sig, error: cWorksRaw.error || null },
        summary: { ok: cSummaryRaw.ok, sig: cSummaryRaw.sig, error: cSummaryRaw.error || null },
      },
      materials: {
        legacy: legacyMaterials,
        canonical: cMat,
        compare: cMat ? {
          items_total: diffNum(legacyMaterials.kpi.items_total, cMat.kpi.items_total),
          items_without_request: diffNum(legacyMaterials.kpi.items_without_request, cMat.kpi.items_without_request),
          rows_count: diffNum(legacyMaterials.rows_count, cMat.rows_count),
          qty_total: diffNum(legacyMaterials.qty_total, cMat.qty_total),
        } : null,
      },
      works: {
        legacy: legacyWorks,
        canonical: cWorks,
        compare: cWorks ? {
          total_positions: diffNum(legacyWorks.summary.total_positions, cWorks.summary.total_positions),
          req_positions: diffNum(legacyWorks.summary.req_positions, cWorks.summary.req_positions),
          free_positions: diffNum(legacyWorks.summary.free_positions, cWorks.summary.free_positions),
          total_qty: diffNum(legacyWorks.summary.total_qty, cWorks.summary.total_qty),
          works_count: diffNum(legacyWorks.works_count, cWorks.works_count),
          issue_cost_total: diffNum(legacyWorks.summary.issue_cost_total ?? 0, cWorks.summary.issue_cost_total),
          purchase_cost_total: diffNum(legacyWorks.summary.purchase_cost_total ?? 0, cWorks.summary.purchase_cost_total),
        } : null,
      },
      summary: {
        canonical: cSummary,
      },
    };
    entry.mismatches = classifyMismatch(entry);
    results.push(entry);
    console.log(`scope=${scope.key} canonical(materials=${cMatRaw.ok}, works=${cWorksRaw.ok}, summary=${cSummaryRaw.ok}) mismatches=${entry.mismatches.length}`);
  }

  const out = {
    generated_at: new Date().toISOString(),
    company_id: companyId,
    scopes_checked: scopes.length,
    metric_contract: {
      comparable: COMPARABLE_METRICS,
      non_comparable: NON_COMPARABLE_METRICS,
    },
    results,
  };
  const outDir = path.join(process.cwd(), "diagnostics");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "director_parity_v1.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`saved ${outPath}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
