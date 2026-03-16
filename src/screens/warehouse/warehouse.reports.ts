// src/screens/warehouse/warehouse.reports.ts
import { useCallback, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WarehouseIssueHead, WarehouseIssueLine } from "../../lib/api/pdf_warehouse";
import {
  buildWarehouseIssueFormHtml,
  buildWarehouseIssuesRegisterHtml,
  buildWarehouseIncomingRegisterHtml,
  buildWarehouseIncomingMaterialsReportHtml,
  exportWarehouseHtmlPdf,
  buildWarehouseMaterialsReportHtml,
  buildWarehouseObjectWorkReportHtml,
} from "../../lib/api/pdf_warehouse";
import {
  apiFetchIssuedMaterialsReportFast,
  apiFetchIssuedByObjectReportFast,
  apiFetchIncomingLines,
  apiFetchIncomingMaterialsReportFast,
} from "./warehouse.api";
import { fetchWarehouseIssueLines } from "./warehouse.reports.repo";

type ReportRow = Record<string, unknown>;
type BusyLike = unknown; // useGlobalBusy
type SupabaseLike = SupabaseClient;

type WarehouseIncomingHead = {
  incoming_id: string;
  event_dt?: string | null;
};

type WarehouseMaterialsReportRow = {
  material_code: string;
  material_name: string;
  uom: string;
  sum_in_req: number;
  sum_free: number;
  sum_over: number;
  sum_total: number;
  docs_cnt: number;
  lines_cnt: number;
};

type WarehouseObjectWorkReportRow = {
  object_id: string | null;
  object_name: string;
  work_name: string;
  docs_cnt: number;
  req_cnt: number;
  active_days: number;
  uniq_materials: number;
  recipients_text: string | null;
  top3_materials: string | null;
};

type WarehouseIncomingMaterialsReportRow = ReportRow & {
  material_code?: string;
  material_name?: string;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const pickText = (value: unknown): string => String(value ?? "");

const normalizeWarehouseIssueHead = (value: unknown): WarehouseIssueHead | null => {
  const row = asRecord(value);
  const issueId = row.issue_id;
  if (issueId == null || String(issueId).trim() === "") return null;
  return {
    issue_id: String(issueId).trim(),
    issue_no: row.issue_no == null ? null : pickText(row.issue_no),
    base_no: row.base_no == null ? null : pickText(row.base_no),
    event_dt: row.event_dt == null ? null : pickText(row.event_dt),
    kind: row.kind == null ? null : pickText(row.kind),
    who: row.who == null ? null : pickText(row.who),
    note: row.note == null ? null : pickText(row.note),
    request_id: row.request_id == null ? null : pickText(row.request_id),
    display_no: row.display_no == null ? null : pickText(row.display_no),
    qty_total: row.qty_total ?? null,
    qty_in_req: row.qty_in_req ?? null,
    qty_over: row.qty_over ?? null,
    object_name: row.object_name == null ? null : pickText(row.object_name),
    work_name: row.work_name == null ? null : pickText(row.work_name),
  };
};

const normalizeWarehouseIssueLine = (value: unknown): WarehouseIssueLine | null => {
  const row = asRecord(value);
  const issueId = row.issue_id;
  if (issueId == null || String(issueId).trim() === "") return null;
  return {
    issue_id: String(issueId).trim(),
    rik_code: row.rik_code == null ? null : pickText(row.rik_code),
    uom: row.uom == null ? null : pickText(row.uom),
    name_human: row.name_human == null ? null : pickText(row.name_human),
    qty_total: row.qty_total ?? null,
    qty_in_req: row.qty_in_req ?? null,
    qty_over: row.qty_over ?? null,
    uom_id: row.uom_id == null ? null : pickText(row.uom_id),
    item_name_ru: row.item_name_ru == null ? null : pickText(row.item_name_ru),
    item_name: row.item_name == null ? null : pickText(row.item_name),
    name: row.name == null ? null : pickText(row.name),
    title: row.title == null ? null : pickText(row.title),
  };
};

const normalizeIncomingHead = (value: unknown): WarehouseIncomingHead | null => {
  const row = asRecord(value);
  const incomingId = row.incoming_id;
  if (incomingId == null || String(incomingId).trim() === "") return null;
  return {
    incoming_id: String(incomingId).trim(),
    event_dt: row.event_dt == null ? null : pickText(row.event_dt),
  };
};

const normalizeMaterialsReportRow = (value: unknown): WarehouseMaterialsReportRow => {
  const row = asRecord(value);
  return {
    material_code: pickText(row.material_code),
    material_name: pickText(row.material_name ?? row.material_code),
    uom: pickText(row.uom),
    sum_in_req: toNum(row.sum_in_req),
    sum_free: toNum(row.sum_free),
    sum_over: toNum(row.sum_over),
    sum_total: toNum(row.sum_total),
    docs_cnt: toNum(row.docs_cnt),
    lines_cnt: toNum(row.lines_cnt),
  };
};

const normalizeObjectWorkReportRow = (value: unknown): WarehouseObjectWorkReportRow => {
  const row = asRecord(value);
  return {
    object_id: row.object_id == null ? null : pickText(row.object_id),
    object_name: pickText(row.object_name ?? "Р‘РµР· РѕР±СЉРµРєС‚Р°"),
    work_name: pickText(row.work_name ?? "Р‘РµР· РІРёРґР° СЂР°Р±РѕС‚"),
    docs_cnt: toNum(row.docs_cnt),
    req_cnt: toNum(row.req_cnt),
    active_days: toNum(row.active_days),
    uniq_materials: toNum(row.uniq_materials),
    recipients_text: row.recipients_text == null ? null : pickText(row.recipients_text),
    top3_materials: row.top3_materials == null ? null : pickText(row.top3_materials),
  };
};

const normalizeIncomingMaterialsReportRow = (
  value: unknown,
  nameByCode?: Record<string, string>,
): WarehouseIncomingMaterialsReportRow => {
  const row = asRecord(value);
  const code = String(row.material_code ?? "").trim();
  const mapped = nameByCode?.[code]?.trim();
  const orig = String(row.material_name ?? "").trim();

  const hasMap = !isMissingName(mapped);
  const hasOrig = !isMissingName(orig);
  const material_name = hasMap ? mapped : (hasOrig ? orig : (code || "РџРѕР·РёС†РёСЏ"));

  return {
    ...row,
    material_code: code,
    material_name,
  };
};

const toNum = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s0 = String(v).trim();
  if (!s0) return 0;
  const s = s0.replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const parts = s.split(".");
  const normalized = parts.length <= 2 ? s : `${parts[0]}.${parts.slice(1).join("")}`;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const isMissingName = (v: unknown): boolean => {
  const s = String(v ?? "").trim();
  if (!s) return true;
  if (/^[-\u2014\u2013\u2212]+$/.test(s)) return true;
  const l = s.toLowerCase();
  if (l === "null" || l === "undefined" || l === "n/a") return true;
  if (l.includes("вђ")) return true;
  return false;
};

// ✅ PROD: "Весь период" = реальные границы для RPC (чтобы не было null/null и плохих планов)
const ALL_FROM_ISO = "1970-01-01T00:00:00.000Z";
const ALL_TO_ISO = "2100-01-01T00:00:00.000Z";

function normalizeReportRange(periodFrom: string, periodTo: string) {
  const fromTxt = String(periodFrom ?? "").trim();
  const toTxt = String(periodTo ?? "").trim();

  // ✅ Если обе даты пустые — это "Весь период"
  const isAll = !fromTxt && !toTxt;

  // В PDF хотим печатать "Весь период" → передадим пустые строки
  const pdfFrom = isAll ? "" : fromTxt;
  const pdfTo = isAll ? "" : toTxt;

  // В RPC хотим реальные границы → чтобы всегда был понятный диапазон и индекс работал
  const rpcFrom = isAll ? ALL_FROM_ISO : fromTxt;
  const rpcTo = isAll ? ALL_TO_ISO : toTxt;

  return { isAll, pdfFrom, pdfTo, rpcFrom, rpcTo };
}

// ✅ summary из БД (один источник истины)
const RU_MONTHS: Record<string, number> = {
  "января": 0,
  "февраля": 1,
  "марта": 2,
  "апреля": 3,
  "мая": 4,
  "июня": 5,
  "июля": 6,
  "августа": 7,
  "сентября": 8,
  "октября": 9,
  "ноября": 10,
  "декабря": 11,
};

function parseRuDayLabel(dayLabel: string): Date | null {
  // ожидаем "20 февраля 2026 г." (как у тебя в UI)
  const s0 = String(dayLabel ?? "").trim().toLowerCase();
  if (!s0) return null;

  const s = s0.replace(/\s+/g, " ").replace(" г.", "").replace(" г", "").trim();
  const parts = s.split(" ");
  if (parts.length < 3) return null;

  const dd = Number(parts[0]);
  const mm = RU_MONTHS[parts[1]];
  const yy = Number(parts[2]);

  if (!Number.isFinite(dd) || dd <= 0 || dd > 31) return null;
  if (mm == null) return null;
  if (!Number.isFinite(yy) || yy < 1970 || yy > 2100) return null;

  const d = new Date(yy, mm, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayRangeIso(dayLabel: string) {
  const d = parseRuDayLabel(dayLabel);
  if (!d) throw new Error(`Не могу распарсить дату дня: "${dayLabel}"`);

  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  return {
    pdfFrom: dayLabel, // печатаем как есть
    pdfTo: "",         // можно пусто, чтобы не было "→"
    rpcFrom: from.toISOString(),
    rpcTo: to.toISOString(),
  };
}
export function useWarehouseReports(args: {
  busy: BusyLike;
  supabase: SupabaseLike;
  repIssues: ReportRow[];
  repIncoming?: ReportRow[];

  periodFrom: string;
  periodTo: string;

  orgName: string;
  warehouseName: string;

  issueLinesById: Record<string, ReportRow[]>;
  setIssueLinesById: (updater: (prev: Record<string, ReportRow[]>) => Record<string, ReportRow[]>) => void;
  issueLinesLoadingId: number | null;
  setIssueLinesLoadingId: (v: number | null) => void;

  issueDetailsId: number | null;
  setIssueDetailsId: (v: number | null) => void;

  incomingLinesById: Record<string, ReportRow[]>;
  setIncomingLinesById: (updater: (prev: Record<string, ReportRow[]>) => Record<string, ReportRow[]>) => void;
  incomingLinesLoadingId: string | null;
  setIncomingLinesLoadingId: (v: string | null) => void;
  incomingDetailsId: string | null;
  setIncomingDetailsId: (v: string | null) => void;

  nameByCode?: Record<string, string>;
}) {
  const {
    supabase,
    repIssues,
    repIncoming,
    periodFrom,
    periodTo,
    orgName,
    warehouseName,
    issueLinesById,
    setIssueLinesById,
    setIssueLinesLoadingId,
    setIssueDetailsId,
    incomingLinesById,
    setIncomingLinesById,
    setIncomingLinesLoadingId,
    setIncomingDetailsId,
    nameByCode,
  } = args;

  const normalizedIssueHeads = useMemo(
    () => (repIssues || []).map(normalizeWarehouseIssueHead).filter((row): row is WarehouseIssueHead => !!row),
    [repIssues],
  );
  const normalizedIncomingHeads = useMemo(
    () => (repIncoming || []).map(normalizeIncomingHead).filter((row): row is WarehouseIncomingHead => !!row),
    [repIncoming],
  );



  const fmtDayRu = (d: Date) =>
    d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

  const vydachaByDay = useMemo(() => {
    const groups: Record<string, ReportRow[]> = {};
    for (const it of normalizedIssueHeads) {
      const dt = it.event_dt ? new Date(String(it.event_dt ?? "")) : null;
      const key = dt ? fmtDayRu(dt) : "Без даты";
      (groups[key] ||= []).push(it);
    }
    return Object.entries(groups).map(([day, items]) => ({
      day,
      items: items.sort((a, b) => new Date(String(b.event_dt ?? "")).getTime() - new Date(String(a.event_dt ?? "")).getTime()),
    }));
  }, [normalizedIssueHeads]);

  const incomingByDay = useMemo(() => {
    const groups: Record<string, ReportRow[]> = {};
    for (const it of normalizedIncomingHeads) {
      const dt = it.event_dt ? new Date(String(it.event_dt ?? "")) : null;
      const key = dt ? fmtDayRu(dt) : "Без даты";
      (groups[key] ||= []).push(it);
    }
    return Object.entries(groups).map(([day, items]) => ({
      day,
      items: items.sort((a, b) => new Date(String(b.event_dt ?? "")).getTime() - new Date(String(a.event_dt ?? "")).getTime()),
    }));
  }, [normalizedIncomingHeads]);

  const ensureIssueLines = useCallback(
    async (issueId: number): Promise<ReportRow[]> => {
      const key = String(issueId);
      const cached = issueLinesById?.[key];
      if (Array.isArray(cached) && cached.length > 0) return cached;
      setIssueLinesLoadingId(issueId);
      try {
        const lines = await fetchWarehouseIssueLines(supabase, issueId);
        setIssueLinesById((prev) => ({ ...(prev || {}), [key]: lines }));
        return lines;
      } finally {
        setIssueLinesLoadingId(null);
      }
    },
    [issueLinesById, setIssueLinesById, setIssueLinesLoadingId, supabase],
  );

  const ensureIncomingLines = useCallback(
    async (incomingId: string): Promise<ReportRow[]> => {
      const cached = incomingLinesById?.[incomingId];
      if (Array.isArray(cached) && cached.length > 0) return cached;
      setIncomingLinesLoadingId(incomingId);
      try {
        const lines: ReportRow[] = await apiFetchIncomingLines(supabase, incomingId);
        setIncomingLinesById((prev) => ({ ...(prev || {}), [incomingId]: lines }));
        return lines;
      } finally {
        setIncomingLinesLoadingId(null);
      }
    },
    [incomingLinesById, setIncomingLinesById, setIncomingLinesLoadingId, supabase],
  );

  const openIncomingDetails = useCallback(async (incomingId: string) => {
    setIncomingDetailsId(incomingId);
    await ensureIncomingLines(incomingId);
  }, [ensureIncomingLines, setIncomingDetailsId]);

  const closeIncomingDetails = useCallback(() => setIncomingDetailsId(null), [setIncomingDetailsId]);

  const openIssueDetails = useCallback(async (issueId: number) => {
    setIssueDetailsId(issueId);
    await ensureIssueLines(issueId);
  }, [ensureIssueLines, setIssueDetailsId]);

  const closeIssueDetails = useCallback(() => setIssueDetailsId(null), [setIssueDetailsId]);

  const buildIssueHtml = useCallback(async (issueId: number) => {
    const head = normalizedIssueHeads.find((x) => Number(x.issue_id) === Number(issueId));
    if (!head) throw new Error("Выдача не найдена");
    const linesAny = await ensureIssueLines(issueId);
    const lines = (linesAny || []).map(normalizeWarehouseIssueLine).filter((row): row is WarehouseIssueLine => !!row);
    const html = buildWarehouseIssueFormHtml({
      head,
      lines,
      orgName,
      warehouseName,
      nameByCode,
    });
    return await exportWarehouseHtmlPdf({ fileName: `ISSUE-${issueId}`, html });
  }, [normalizedIssueHeads, ensureIssueLines, orgName, warehouseName, nameByCode]);

  const buildRegisterHtml = useCallback(async () => {
    const html = buildWarehouseIssuesRegisterHtml({
      periodFrom,
      periodTo,
      issues: normalizedIssueHeads,
      orgName,
      warehouseName,
    });
    return await exportWarehouseHtmlPdf({
      fileName: `Warehouse_Issues_${periodFrom || "all"}_${periodTo || "all"}`,
      html,
    });
  }, [periodFrom, periodTo, normalizedIssueHeads, orgName, warehouseName]);

  const buildDayRegisterPdf = useCallback(async (dayLabel: string) => {
    const wanted = String(dayLabel ?? "").trim();
    const dayIssues = normalizedIssueHeads.filter((it) => {
      const dt = it.event_dt ? new Date(String(it.event_dt ?? "")) : null;
      const key = dt ? fmtDayRu(dt) : "Без даты";
      return key === wanted;
    });
    const html = buildWarehouseIssuesRegisterHtml({
      periodFrom: wanted,
      periodTo: wanted,
      issues: dayIssues,
      orgName,
      warehouseName,
    });
    const safeDay = wanted.replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Register_${safeDay}`, html });
  }, [normalizedIssueHeads, orgName, warehouseName]);

  const buildDayMaterialsReportPdf = useCallback(async (dayLabel: string) => {
    const rr = dayRangeIso(dayLabel);
    const rawRows = await apiFetchIssuedMaterialsReportFast(supabase, {
      from: rr.rpcFrom, to: rr.rpcTo, objectId: null,
    });
    const rows = (rawRows || []).map(normalizeMaterialsReportRow);
    const docsTotal = normalizedIssueHeads.filter(it => {
      const dt = it.event_dt ? new Date(String(it.event_dt ?? "")) : null;
      return dt && fmtDayRu(dt) === dayLabel;
    }).length;

    const html = buildWarehouseMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      objectName: null, workName: null, rows,
      docsTotal, docsByReq: docsTotal, docsWithoutReq: 0
    });
    const safeDay = String(dayLabel).trim().replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_DayMaterials_${safeDay}`, html });
  }, [supabase, normalizedIssueHeads, orgName, warehouseName]);

  const buildMaterialsReportPdf = useCallback(async (opts?: { objectId?: string | null; objectName?: string | null; workName?: string | null }) => {
    const rr = normalizeReportRange(periodFrom, periodTo);
    const rawRows = await apiFetchIssuedMaterialsReportFast(supabase, {
      from: rr.rpcFrom, to: rr.rpcTo, objectId: opts?.objectId ?? null,
    });
    const rows = (rawRows || []).map(normalizeMaterialsReportRow);
    const docsTotal = normalizedIssueHeads.length;
    const html = buildWarehouseMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      objectName: opts?.objectName ?? null, workName: opts?.workName ?? null,
      rows, docsTotal, docsByReq: docsTotal, docsWithoutReq: 0
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_Materials_${rr.pdfFrom || "all"}_${rr.pdfTo || "all"}`, html });
  }, [supabase, normalizedIssueHeads, periodFrom, periodTo, orgName, warehouseName]);

  const buildObjectWorkReportPdf = useCallback(async (opts?: { objectId?: string | null; objectName?: string | null }) => {
    const rr = normalizeReportRange(periodFrom, periodTo);
    const rawRows = await apiFetchIssuedByObjectReportFast(supabase, {
      from: rr.rpcFrom, to: rr.rpcTo, objectId: opts?.objectId ?? null,
    });
    const rows = (rawRows || []).map((r) => ({
      object_id: r.object_id ?? null,
      object_name: String(r.object_name ?? "Без объекта"),
      work_name: String(r.work_name ?? "Без вида работ"),
      docs_cnt: toNum(r.docs_cnt),
      req_cnt: toNum(r.req_cnt),
      active_days: toNum(r.active_days),
      uniq_materials: toNum(r.uniq_materials),
      recipients_text: r.recipients_text ?? null,
      top3_materials: r.top3_materials ?? null,
    }));
    const html = buildWarehouseObjectWorkReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      objectName: opts?.objectName ?? null, rows, docsTotal: normalizedIssueHeads.length,
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_ObjectWork_${rr.pdfFrom || "all"}_${rr.pdfTo || "all"}`, html });
  }, [supabase, normalizedIssueHeads, periodFrom, periodTo, orgName, warehouseName]);

  const buildIncomingRegisterHtml = useCallback(async () => {
    const html = buildWarehouseIncomingRegisterHtml({
      periodFrom, periodTo, items: normalizedIncomingHeads, orgName, warehouseName,
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_Reg_${periodFrom || "all"}_${periodTo || "all"}`, html });
  }, [periodFrom, periodTo, normalizedIncomingHeads, orgName, warehouseName]);

  const buildDayIncomingRegisterPdf = useCallback(async (dayLabel: string) => {
    const wanted = String(dayLabel).trim();
    const dayItems = normalizedIncomingHeads.filter((it) => {
      const dt = it.event_dt ? new Date(String(it.event_dt ?? "")) : null;
      return dt && fmtDayRu(dt) === wanted;
    });
    const html = buildWarehouseIncomingRegisterHtml({
      periodFrom: wanted, periodTo: wanted, items: dayItems, orgName, warehouseName,
    });
    const safeDay = wanted.replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_Day_${safeDay}`, html });
  }, [normalizedIncomingHeads, orgName, warehouseName]);

  const buildDayIncomingMaterialsReportPdf = useCallback(async (dayLabel: string) => {
    const rr = dayRangeIso(dayLabel);
    const rawRows = await apiFetchIncomingMaterialsReportFast(supabase, {
      from: rr.rpcFrom, to: rr.rpcTo,
    });
    const rows = (rawRows || []).map((r) => {
      const code = String(r.material_code || "").trim();
      const mapped = nameByCode?.[code]?.trim();
      const orig = String(r.material_name || "").trim();

      const hasMap = !isMissingName(mapped);
      const hasOrig = !isMissingName(orig);

      const resName = hasMap ? mapped : (hasOrig ? orig : (code || "Позиция"));

      return {
        ...r,
        material_name: resName,
      };
    });
    const docsTotal = normalizedIncomingHeads.filter(it => {
      const dt = it.event_dt ? new Date(String(it.event_dt ?? "")) : null;
      return dt && fmtDayRu(dt) === dayLabel;
    }).length;

    const html = buildWarehouseIncomingMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      rows, docsTotal,
    });
    const safeDay = String(dayLabel).trim().replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_DayMaterials_${safeDay}`, html });
  }, [supabase, normalizedIncomingHeads, orgName, warehouseName, nameByCode]);

  const buildIncomingMaterialsReportPdf = useCallback(async () => {
    const rr = normalizeReportRange(periodFrom, periodTo);
    const rawRows = await apiFetchIncomingMaterialsReportFast(supabase, {
      from: rr.rpcFrom, to: rr.rpcTo,
    });
    const rows = (rawRows || []).map((r) => {
      const code = String(r.material_code || "").trim();
      const mapped = nameByCode?.[code]?.trim();
      const orig = String(r.material_name || "").trim();

      const hasMap = !isMissingName(mapped);
      const hasOrig = !isMissingName(orig);

      const resName = hasMap ? mapped : (hasOrig ? orig : (code || "Позиция"));

      return {
        ...r,
        material_name: resName,
      };
    });

    console.log(`[buildIncomingMaterialsReportPdf] Prepared ${rows.length} rows`);
    const docsTotal = normalizedIncomingHeads.length;

    const html = buildWarehouseIncomingMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      rows, docsTotal,
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_Materials_${rr.pdfFrom || "all"}_${rr.pdfTo || "all"}`, html });
  }, [supabase, normalizedIncomingHeads, periodFrom, periodTo, orgName, warehouseName, nameByCode]);

  return {

    vydachaByDay,
    incomingByDay,
    ensureIssueLines,
    openIssueDetails,
    closeIssueDetails,
    openIncomingDetails,
    closeIncomingDetails,
    buildIssueHtml,
    buildRegisterHtml,
    buildMaterialsReportPdf,
    buildObjectWorkReportPdf,
    buildDayRegisterPdf,
    buildDayMaterialsReportPdf,
    buildIncomingRegisterHtml,
    buildDayIncomingRegisterPdf,
    buildIncomingMaterialsReportPdf,
    buildDayIncomingMaterialsReportPdf,
    apiFetchIncomingLines: (s: SupabaseClient, id: string) => apiFetchIncomingLines(s, id),
  };
}
