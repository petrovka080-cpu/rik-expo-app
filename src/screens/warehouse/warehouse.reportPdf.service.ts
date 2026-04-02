import type { SupabaseClient } from "@supabase/supabase-js";
import type { WarehouseIssueHead, WarehouseIssueLine } from "../../lib/pdf/pdf.warehouse";
import {
  buildWarehouseIncomingMaterialsReportHtml,
  buildWarehouseIncomingRegisterHtml,
  buildWarehouseIssueFormHtml,
  buildWarehouseIssuesRegisterHtml,
  buildWarehouseMaterialsReportHtml,
  buildWarehouseObjectWorkReportHtml,
  exportWarehouseHtmlPdf,
} from "../../lib/pdf/pdf.warehouse";
import {
  apiFetchIssuedMaterialsReportFast,
} from "./warehouse.stock.read";
import { getWarehouseDayMaterialsReportPdfSource } from "./warehouse.dayMaterialsReport.pdf.service";
import { getWarehouseIncomingMaterialsReportPdfSource } from "./warehouse.incomingMaterialsReport.pdf.service";
import { getWarehouseObjectWorkReportPdfSource } from "./warehouse.objectWorkReport.pdf.service";

export type WarehouseReportPdfRow = Record<string, unknown>;

export type WarehouseIncomingHead = {
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

const ALL_FROM_ISO = "1970-01-01T00:00:00.000Z";
const ALL_TO_ISO = "2100-01-01T00:00:00.000Z";

const RU_MONTHS: Record<string, number> = {
  января: 0,
  февраля: 1,
  марта: 2,
  апреля: 3,
  мая: 4,
  июня: 5,
  июля: 6,
  августа: 7,
  сентября: 8,
  октября: 9,
  ноября: 10,
  декабря: 11,
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const pickText = (value: unknown): string => String(value ?? "");

const ensureWarehouseReportRows = (value: unknown, label: string): WarehouseReportPdfRow[] => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  throw new Error(`${label} returned invalid rows payload`);
};

export const toWarehouseReportNumber = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value).trim();
  if (!text) return 0;
  const normalized = text
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");
  const parts = normalized.split(".");
  const safeNumber = parts.length <= 2 ? normalized : `${parts[0]}.${parts.slice(1).join("")}`;
  const parsed = Number(safeNumber);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isWarehousePdfMissingName = (value: unknown): boolean => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (/^[-\u2014\u2013\u2212]+$/.test(text)) return true;
  const lowered = text.toLowerCase();
  if (lowered === "null" || lowered === "undefined" || lowered === "n/a") return true;
  if (lowered.includes("отсутств")) return true;
  return false;
};

export const formatWarehouseReportDayRu = (date: Date) =>
  date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

export function normalizeWarehouseIssueHead(value: unknown): WarehouseIssueHead | null {
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
}

export function normalizeWarehouseIssueLine(value: unknown): WarehouseIssueLine | null {
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
}

export function normalizeIncomingHead(value: unknown): WarehouseIncomingHead | null {
  const row = asRecord(value);
  const incomingId = row.incoming_id;
  if (incomingId == null || String(incomingId).trim() === "") return null;
  return {
    incoming_id: String(incomingId).trim(),
    event_dt: row.event_dt == null ? null : pickText(row.event_dt),
  };
}

const normalizeMaterialsReportRow = (value: unknown): WarehouseMaterialsReportRow => {
  const row = asRecord(value);
  return {
    material_code: pickText(row.material_code),
    material_name: pickText(row.material_name ?? row.material_code),
    uom: pickText(row.uom),
    sum_in_req: toWarehouseReportNumber(row.sum_in_req),
    sum_free: toWarehouseReportNumber(row.sum_free),
    sum_over: toWarehouseReportNumber(row.sum_over),
    sum_total: toWarehouseReportNumber(row.sum_total),
    docs_cnt: toWarehouseReportNumber(row.docs_cnt),
    lines_cnt: toWarehouseReportNumber(row.lines_cnt),
  };
};

const normalizeObjectWorkReportRow = (value: unknown): WarehouseObjectWorkReportRow => {
  const row = asRecord(value);
  return {
    object_id: row.object_id == null ? null : pickText(row.object_id),
    object_name: pickText(row.object_name ?? "Без объекта"),
    work_name: pickText(row.work_name ?? "Без вида работ"),
    docs_cnt: toWarehouseReportNumber(row.docs_cnt),
    req_cnt: toWarehouseReportNumber(row.req_cnt),
    active_days: toWarehouseReportNumber(row.active_days),
    uniq_materials: toWarehouseReportNumber(row.uniq_materials),
    recipients_text: row.recipients_text == null ? null : pickText(row.recipients_text),
    top3_materials: row.top3_materials == null ? null : pickText(row.top3_materials),
  };
};

export const normalizeIncomingMaterialsReportRows = (
  rows: unknown,
  nameByCode?: Record<string, string>,
) =>
  ensureWarehouseReportRows(rows, "warehouse incoming materials report").map((row) => {
    const record = asRecord(row);
    const code = String(record.material_code ?? "").trim();
    const mapped = nameByCode?.[code]?.trim();
    const original = String(record.material_name ?? "").trim();
    const materialName = !isWarehousePdfMissingName(mapped)
      ? mapped
      : !isWarehousePdfMissingName(original)
        ? original
        : (code || "Позиция");

    return {
      ...record,
      material_name: materialName,
    };
  });

export function normalizeWarehouseReportRange(periodFrom: string, periodTo: string) {
  const from = String(periodFrom ?? "").trim();
  const to = String(periodTo ?? "").trim();
  const isAll = !from && !to;

  return {
    isAll,
    pdfFrom: isAll ? "" : from,
    pdfTo: isAll ? "" : to,
    rpcFrom: isAll ? ALL_FROM_ISO : from,
    rpcTo: isAll ? ALL_TO_ISO : to,
  };
}

const parseRuDayLabel = (dayLabel: string): Date | null => {
  const source = String(dayLabel ?? "").trim().toLowerCase();
  if (!source) return null;

  const normalized = source.replace(/\s+/g, " ").replace(" г.", "").replace(" г", "").trim();
  const parts = normalized.split(" ");
  if (parts.length < 3) return null;

  const dd = Number(parts[0]);
  const mm = RU_MONTHS[parts[1]];
  const yy = Number(parts[2]);
  if (!Number.isFinite(dd) || dd <= 0 || dd > 31) return null;
  if (mm == null) return null;
  if (!Number.isFinite(yy) || yy < 1970 || yy > 2100) return null;

  const date = new Date(yy, mm, dd);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function warehouseReportDayRangeIso(dayLabel: string) {
  const date = parseRuDayLabel(dayLabel);
  if (!date) {
    throw new Error(`Не могу распарсить дату дня: "${dayLabel}"`);
  }

  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return {
    pdfFrom: dayLabel,
    pdfTo: "",
    rpcFrom: from.toISOString(),
    rpcTo: to.toISOString(),
  };
}

type CreateWarehouseReportPdfServiceParams = {
  supabase: SupabaseClient;
  normalizedIssueHeads: WarehouseIssueHead[];
  normalizedIncomingHeads: WarehouseIncomingHead[];
  periodFrom: string;
  periodTo: string;
  orgName: string;
  warehouseName: string;
  nameByCode?: Record<string, string>;
  ensureIssueLines: (issueId: number) => Promise<WarehouseReportPdfRow[]>;
};

export function createWarehouseReportPdfService(params: CreateWarehouseReportPdfServiceParams) {
  const {
    supabase,
    normalizedIssueHeads,
    normalizedIncomingHeads,
    periodFrom,
    periodTo,
    orgName,
    warehouseName,
    nameByCode,
    ensureIssueLines,
  } = params;

  const buildIssueHtml = async (issueId: number) => {
    const head = normalizedIssueHeads.find((row) => Number(row.issue_id) === Number(issueId));
    if (!head) throw new Error("Выдача не найдена");

    const linesAny = await ensureIssueLines(issueId);
    const lines = ensureWarehouseReportRows(linesAny, "warehouse issue PDF lines")
      .map(normalizeWarehouseIssueLine)
      .filter((row): row is WarehouseIssueLine => !!row);
    const html = buildWarehouseIssueFormHtml({
      head,
      lines,
      orgName,
      warehouseName,
      nameByCode,
    });
    return await exportWarehouseHtmlPdf({ fileName: `ISSUE-${issueId}`, html });
  };

  const buildRegisterHtml = async () => {
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
  };

  const buildDayRegisterPdf = async (dayLabel: string) => {
    const wanted = String(dayLabel ?? "").trim();
    const dayIssues = normalizedIssueHeads.filter((row) => {
      const date = row.event_dt ? new Date(String(row.event_dt ?? "")) : null;
      const key = date ? formatWarehouseReportDayRu(date) : "Без даты";
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
  };

  const buildDayMaterialsReportPdf = async (dayLabel: string) => {
    const range = warehouseReportDayRangeIso(dayLabel);
    const legacyDocsTotal = normalizedIssueHeads.filter((row) => {
      const date = row.event_dt ? new Date(String(row.event_dt ?? "")) : null;
      return date && formatWarehouseReportDayRu(date) === dayLabel;
    }).length;
    const source = await getWarehouseDayMaterialsReportPdfSource({
      supabase,
      range,
      legacyDocsTotal,
    });
    const html = buildWarehouseMaterialsReportHtml({
      periodFrom: range.pdfFrom,
      periodTo: range.pdfTo,
      orgName,
      warehouseName,
      objectName: null,
      workName: null,
      rows: source.rows,
      docsTotal: source.docsTotal,
      docsByReq: source.docsTotal,
      docsWithoutReq: 0,
    });
    const safeDay = String(dayLabel).trim().replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_DayMaterials_${safeDay}`, html });
  };

  const buildMaterialsReportPdf = async (opts?: {
    objectId?: string | null;
    objectName?: string | null;
    workName?: string | null;
  }) => {
    const range = normalizeWarehouseReportRange(periodFrom, periodTo);
    const rawRows = await apiFetchIssuedMaterialsReportFast(supabase, {
      from: range.rpcFrom,
      to: range.rpcTo,
      objectId: opts?.objectId ?? null,
    });
    const rows = ensureWarehouseReportRows(rawRows, "warehouse materials report").map(
      normalizeMaterialsReportRow,
    );
    const docsTotal = normalizedIssueHeads.length;
    const html = buildWarehouseMaterialsReportHtml({
      periodFrom: range.pdfFrom,
      periodTo: range.pdfTo,
      orgName,
      warehouseName,
      objectName: opts?.objectName ?? null,
      workName: opts?.workName ?? null,
      rows,
      docsTotal,
      docsByReq: docsTotal,
      docsWithoutReq: 0,
    });
    return await exportWarehouseHtmlPdf({
      fileName: `WH_Materials_${range.pdfFrom || "all"}_${range.pdfTo || "all"}`,
      html,
    });
  };

  const buildObjectWorkReportPdf = async (opts?: { objectId?: string | null; objectName?: string | null }) => {
    const range = normalizeWarehouseReportRange(periodFrom, periodTo);
    const source = await getWarehouseObjectWorkReportPdfSource({
      supabase,
      range,
      legacyDocsTotal: normalizedIssueHeads.length,
      objectId: opts?.objectId ?? null,
    });
    const rows = ensureWarehouseReportRows(source.rows, "warehouse object-work report").map(
      normalizeObjectWorkReportRow,
    );
    const html = buildWarehouseObjectWorkReportHtml({
      periodFrom: range.pdfFrom,
      periodTo: range.pdfTo,
      orgName,
      warehouseName,
      objectName: opts?.objectName ?? null,
      rows,
      docsTotal: source.docsTotal,
    });
    return await exportWarehouseHtmlPdf({
      fileName: `WH_ObjectWork_${range.pdfFrom || "all"}_${range.pdfTo || "all"}`,
      html,
    });
  };

  const buildIncomingRegisterHtml = async () => {
    const html = buildWarehouseIncomingRegisterHtml({
      periodFrom,
      periodTo,
      items: normalizedIncomingHeads,
      orgName,
      warehouseName,
    });
    return await exportWarehouseHtmlPdf({
      fileName: `WH_Incoming_Reg_${periodFrom || "all"}_${periodTo || "all"}`,
      html,
    });
  };

  const buildDayIncomingRegisterPdf = async (dayLabel: string) => {
    const wanted = String(dayLabel).trim();
    const dayItems = normalizedIncomingHeads.filter((row) => {
      const date = row.event_dt ? new Date(String(row.event_dt ?? "")) : null;
      return date && formatWarehouseReportDayRu(date) === wanted;
    });
    const html = buildWarehouseIncomingRegisterHtml({
      periodFrom: wanted,
      periodTo: wanted,
      items: dayItems,
      orgName,
      warehouseName,
    });
    const safeDay = wanted.replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_Day_${safeDay}`, html });
  };

  const buildDayIncomingMaterialsReportPdf = async (dayLabel: string) => {
    const range = warehouseReportDayRangeIso(dayLabel);
    const legacyDocsTotal = normalizedIncomingHeads.filter((row) => {
      const date = row.event_dt ? new Date(String(row.event_dt ?? "")) : null;
      return date && formatWarehouseReportDayRu(date) === dayLabel;
    }).length;
    const source = await getWarehouseIncomingMaterialsReportPdfSource({
      supabase,
      range,
      legacyDocsTotal,
      nameByCode,
    });
    const html = buildWarehouseIncomingMaterialsReportHtml({
      periodFrom: range.pdfFrom,
      periodTo: range.pdfTo,
      orgName,
      warehouseName,
      rows: source.rows,
      docsTotal: source.docsTotal,
    });
    const safeDay = String(dayLabel).trim().replace(/\s+/g, "_").replace(/[^\w\u0400-\u04FF\-]/g, "");
    return await exportWarehouseHtmlPdf({ fileName: `WH_Incoming_DayMaterials_${safeDay}`, html });
  };

  const buildIncomingMaterialsReportPdf = async () => {
    const range = normalizeWarehouseReportRange(periodFrom, periodTo);
    const source = await getWarehouseIncomingMaterialsReportPdfSource({
      supabase,
      range,
      legacyDocsTotal: normalizedIncomingHeads.length,
      nameByCode,
    });
    const html = buildWarehouseIncomingMaterialsReportHtml({
      periodFrom: range.pdfFrom,
      periodTo: range.pdfTo,
      orgName,
      warehouseName,
      rows: source.rows,
      docsTotal: source.docsTotal,
    });
    return await exportWarehouseHtmlPdf({
      fileName: `WH_Incoming_Materials_${range.pdfFrom || "all"}_${range.pdfTo || "all"}`,
      html,
    });
  };

  return {
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
  };
}
