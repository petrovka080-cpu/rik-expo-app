// src/screens/warehouse/warehouse.reports.ts
import { useCallback, useMemo } from "react";
import type { WarehouseIssueHead, WarehouseIssueLine } from "../../lib/api/pdf_warehouse";
import {
  buildWarehouseIssueFormHtml,
  buildWarehouseIssuesRegisterHtml,
  exportWarehouseHtmlPdf,
  buildWarehouseMaterialsReportHtml,
  buildWarehouseObjectWorkReportHtml,
} from "../../lib/api/pdf_warehouse";
import {
  apiFetchIssuedMaterialsReportFast,
  apiFetchIssuedByObjectReportFast,
} from "./warehouse.api";

type BusyLike = any; // useGlobalBusy
type SupabaseLike = any;

const toNum = (v: any): number => {
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

const isMissingName = (v: any): boolean => {
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
async function fetchIssuedSummaryFast(
  supabase: SupabaseLike,
  args: { fromIso: string; toIso: string; objectId?: string | null },
): Promise<{ docsTotal: number; docsByReq: number; docsWithoutReq: number }> {
  const r = await supabase.rpc("wh_report_issued_summary_fast" as any, {
    p_from: args.fromIso,
    p_to: args.toIso,
    p_object_id: args.objectId ?? null,
  } as any);

  if (r.error) throw r.error;

  const row = Array.isArray(r.data) ? r.data[0] : r.data;

  return {
    docsTotal: Math.max(0, Math.round(toNum(row?.docs_total))),
    docsByReq: Math.max(0, Math.round(toNum(row?.docs_in_req))),
    docsWithoutReq: Math.max(0, Math.round(toNum(row?.docs_free))),
  };
}
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
  repIssues: any[];
  repIncoming?: any[];

  periodFrom: string;
  periodTo: string;

  orgName: string;
  warehouseName: string;

  issueLinesById: Record<string, any[]>;
  setIssueLinesById: (updater: any) => void;
  issueLinesLoadingId: number | null;
  setIssueLinesLoadingId: (v: number | null) => void;

  issueDetailsId: number | null;
  setIssueDetailsId: (v: number | null) => void;

  incomingLinesById: Record<string, any[]>;
  setIncomingLinesById: (updater: any) => void;
  incomingLinesLoadingId: string | null;
  setIncomingLinesLoadingId: (v: string | null) => void;
  incomingDetailsId: string | null;
  setIncomingDetailsId: (v: string | null) => void;

  nameByCode?: Record<string, string>;
}) {
  const {
    busy,
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
    issueDetailsId,
    setIssueDetailsId,
    incomingLinesById,
    setIncomingLinesById,
    incomingLinesLoadingId,
    setIncomingLinesLoadingId,
    incomingDetailsId,
    setIncomingDetailsId,
    nameByCode,
  } = args;



  const fmtDayRu = (d: Date) =>
    d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

  const vydachaByDay = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const it of repIssues || []) {
      const dt = it?.event_dt ? new Date(it.event_dt) : null;
      const key = dt ? fmtDayRu(dt) : "Без даты";
      (groups[key] ||= []).push(it);
    }
    return Object.entries(groups).map(([day, items]) => ({
      day,
      items: items.sort((a, b) => new Date(b.event_dt).getTime() - new Date(a.event_dt).getTime()),
    }));
  }, [repIssues]);

  const incomingByDay = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const it of repIncoming || []) {
      const dt = it?.event_dt ? new Date(it.event_dt) : null;
      const key = dt ? fmtDayRu(dt) : "Без даты";
      (groups[key] ||= []).push(it);
    }
    return Object.entries(groups).map(([day, items]) => ({
      day,
      items: items.sort((a, b) => new Date(b.event_dt).getTime() - new Date(a.event_dt).getTime()),
    }));
  }, [repIncoming]);

  const ensureIssueLines = useCallback(
    async (issueId: number): Promise<any[]> => {
      const key = String(issueId);
      const cached = issueLinesById?.[key];
      if (Array.isArray(cached) && cached.length > 0) return cached;
      setIssueLinesLoadingId(issueId);
      try {
        const r = await supabase.rpc("acc_report_issue_lines" as any, { p_issue_id: issueId } as any);
        if (r.error) throw r.error;
        const lines = Array.isArray(r.data) ? (r.data as any[]) : [];
        setIssueLinesById((prev: any) => ({ ...(prev || {}), [key]: lines }));
        return lines;
      } finally {
        setIssueLinesLoadingId(null);
      }
    },
    [issueLinesById, setIssueLinesById, setIssueLinesLoadingId, supabase],
  );

  const ensureIncomingLines = useCallback(
    async (incomingId: string): Promise<any[]> => {
      const cached = incomingLinesById?.[incomingId];
      if (Array.isArray(cached) && cached.length > 0) return cached;
      setIncomingLinesLoadingId(incomingId);
      try {
        const { apiFetchIncomingLines } = require("./warehouse.api");
        const lines = await apiFetchIncomingLines(supabase, incomingId);
        setIncomingLinesById((prev: any) => ({ ...(prev || {}), [incomingId]: lines }));
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
    const head = (repIssues || []).find((x: any) => Number(x.issue_id) === Number(issueId));
    if (!head) throw new Error("Выдача не найдена");
    const linesAny = await ensureIssueLines(issueId);
    const html = buildWarehouseIssueFormHtml({
      head: head as WarehouseIssueHead,
      lines: (linesAny || []) as WarehouseIssueLine[],
      orgName,
      warehouseName,
      nameByCode,
    });
    return await exportWarehouseHtmlPdf({ fileName: `ISSUE-${issueId}`, html });
  }, [repIssues, ensureIssueLines, orgName, warehouseName, nameByCode]);

  const buildRegisterHtml = useCallback(async () => {
    const html = buildWarehouseIssuesRegisterHtml({
      periodFrom,
      periodTo,
      issues: (repIssues || []) as WarehouseIssueHead[],
      orgName,
      warehouseName,
    });
    return await exportWarehouseHtmlPdf({
      fileName: `Warehouse_Issues_${periodFrom || "all"}_${periodTo || "all"}`,
      html,
    });
  }, [periodFrom, periodTo, repIssues, orgName, warehouseName]);

  const buildDayRegisterPdf = useCallback(async (dayLabel: string) => {
    const wanted = String(dayLabel ?? "").trim();
    const dayIssues = (repIssues || []).filter((it: any) => {
      const dt = it?.event_dt ? new Date(it.event_dt) : null;
      const key = dt ? fmtDayRu(dt) : "Без даты";
      return key === wanted;
    });
    const html = buildWarehouseIssuesRegisterHtml({
      periodFrom: wanted,
      periodTo: wanted,
      issues: dayIssues as WarehouseIssueHead[],
      orgName,
      warehouseName,
    });
    const safeDay = wanted.replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Register_${safeDay}`, html });
  }, [repIssues, orgName, warehouseName]);

  const buildDayMaterialsReportPdf = useCallback(async (dayLabel: string) => {
    const rr = dayRangeIso(dayLabel);
    const rawRows = await apiFetchIssuedMaterialsReportFast(supabase as any, {
      from: rr.rpcFrom, to: rr.rpcTo, objectId: null,
    });
    const rows = (rawRows || []).map((r: any) => ({
      material_code: String(r.material_code ?? ""),
      material_name: String(r.material_name ?? r.material_code ?? ""),
      uom: String(r.uom ?? ""),
      sum_in_req: toNum(r.sum_in_req),
      sum_free: toNum(r.sum_free),
      sum_over: toNum(r.sum_over),
      sum_total: toNum(r.sum_total),
      docs_cnt: toNum(r.docs_cnt),
      lines_cnt: toNum(r.lines_cnt),
    }));
    let docsTotal = (repIssues || []).filter(it => {
      const dt = it?.event_dt ? new Date(it.event_dt) : null;
      return dt && fmtDayRu(dt) === dayLabel;
    }).length;

    const html = buildWarehouseMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      objectName: null, workName: null, rows: rows as any,
      docsTotal, docsByReq: docsTotal, docsWithoutReq: 0
    });
    const safeDay = String(dayLabel).trim().replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_DayMaterials_${safeDay}`, html });
  }, [supabase, repIssues, orgName, warehouseName]);

  const buildMaterialsReportPdf = useCallback(async (opts?: { objectId?: string | null; objectName?: string | null; workName?: string | null }) => {
    const rr = normalizeReportRange(periodFrom, periodTo);
    const rawRows = await apiFetchIssuedMaterialsReportFast(supabase as any, {
      from: rr.rpcFrom, to: rr.rpcTo, objectId: opts?.objectId ?? null,
    });
    const rows = (rawRows || []).map((r: any) => ({
      material_code: String(r.material_code ?? ""),
      material_name: String(r.material_name ?? r.material_code ?? ""),
      uom: String(r.uom ?? ""),
      sum_in_req: toNum(r.sum_in_req),
      sum_free: toNum(r.sum_free),
      sum_over: toNum(r.sum_over),
      sum_total: toNum(r.sum_total),
      docs_cnt: toNum(r.docs_cnt),
      lines_cnt: toNum(r.lines_cnt),
    }));
    const docsTotal = (repIssues || []).length;
    const html = buildWarehouseMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      objectName: opts?.objectName ?? null, workName: opts?.workName ?? null,
      rows: rows as any, docsTotal, docsByReq: docsTotal, docsWithoutReq: 0
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_Materials_${rr.pdfFrom || "all"}_${rr.pdfTo || "all"}`, html });
  }, [supabase, repIssues, periodFrom, periodTo, orgName, warehouseName]);

  const buildObjectWorkReportPdf = useCallback(async (opts?: { objectId?: string | null; objectName?: string | null }) => {
    const rr = normalizeReportRange(periodFrom, periodTo);
    const rawRows = await apiFetchIssuedByObjectReportFast(supabase as any, {
      from: rr.rpcFrom, to: rr.rpcTo, objectId: opts?.objectId ?? null,
    });
    const rows = (rawRows || []).map((r: any) => ({
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
      objectName: opts?.objectName ?? null, rows: rows as any, docsTotal: (repIssues || []).length,
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_ObjectWork_${rr.pdfFrom || "all"}_${rr.pdfTo || "all"}`, html });
  }, [supabase, repIssues, periodFrom, periodTo, orgName, warehouseName]);

  const buildIncomingRegisterHtml = useCallback(async () => {
    const { buildWarehouseIncomingRegisterHtml } = require("../../lib/api/pdf_warehouse");
    const html = buildWarehouseIncomingRegisterHtml({
      periodFrom, periodTo, items: (repIncoming || []), orgName, warehouseName,
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_Reg_${periodFrom || "all"}_${periodTo || "all"}`, html });
  }, [periodFrom, periodTo, repIncoming, orgName, warehouseName]);

  const buildDayIncomingRegisterPdf = useCallback(async (dayLabel: string) => {
    const { buildWarehouseIncomingRegisterHtml } = require("../../lib/api/pdf_warehouse");
    const wanted = String(dayLabel).trim();
    const dayItems = (repIncoming || []).filter((it: any) => {
      const dt = it?.event_dt ? new Date(it.event_dt) : null;
      return dt && fmtDayRu(dt) === wanted;
    });
    const html = buildWarehouseIncomingRegisterHtml({
      periodFrom: wanted, periodTo: wanted, items: dayItems, orgName, warehouseName,
    });
    const safeDay = wanted.replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_Day_${safeDay}`, html });
  }, [repIncoming, orgName, warehouseName]);

  const buildDayIncomingMaterialsReportPdf = useCallback(async (dayLabel: string) => {
    const { buildWarehouseIncomingMaterialsReportHtml } = require("../../lib/api/pdf_warehouse");
    const { apiFetchIncomingMaterialsReportFast } = require("./warehouse.api");
    const rr = dayRangeIso(dayLabel);
    const rawRows = await apiFetchIncomingMaterialsReportFast(supabase as any, {
      from: rr.rpcFrom, to: rr.rpcTo,
    });
    const rows = (rawRows || []).map((r: any) => {
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
    const docsTotal = (repIncoming || []).filter(it => {
      const dt = it?.event_dt ? new Date(it.event_dt) : null;
      return dt && fmtDayRu(dt) === dayLabel;
    }).length;

    const html = buildWarehouseIncomingMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      rows, docsTotal,
    });
    const safeDay = String(dayLabel).trim().replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_DayMaterials_${safeDay}`, html });
  }, [supabase, repIncoming, orgName, warehouseName, nameByCode]);

  const buildIncomingMaterialsReportPdf = useCallback(async () => {
    const { buildWarehouseIncomingMaterialsReportHtml } = require("../../lib/api/pdf_warehouse");
    const { apiFetchIncomingMaterialsReportFast } = require("./warehouse.api");
    const rr = normalizeReportRange(periodFrom, periodTo);
    const rawRows = await apiFetchIncomingMaterialsReportFast(supabase as any, {
      from: rr.rpcFrom, to: rr.rpcTo,
    });
    const rows = (rawRows || []).map((r: any) => {
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
    const docsTotal = (repIncoming || []).length;

    const html = buildWarehouseIncomingMaterialsReportHtml({
      periodFrom: rr.pdfFrom, periodTo: rr.pdfTo, orgName, warehouseName,
      rows, docsTotal,
    });
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_Materials_${rr.pdfFrom || "all"}_${rr.pdfTo || "all"}`, html });
  }, [supabase, repIncoming, periodFrom, periodTo, orgName, warehouseName, nameByCode]);

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
    apiFetchIncomingLines: (s: any, id: string) => {
      const { apiFetchIncomingLines } = require("./warehouse.api");
      return apiFetchIncomingLines(s, id);
    },
  };
}
