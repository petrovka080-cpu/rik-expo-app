import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { recordCatchDiscipline } from "../observability/catchDiscipline";
import { supabase } from "../supabaseClient";
import {
  loadDirectorFinancePreviewPdfModel,
  prepareDirectorManagementReportPdfModel,
  prepareDirectorProductionReportPdfModel,
  prepareDirectorSubcontractReportPdfModelFromRows,
  prepareDirectorSupplierSummaryPdfModel,
} from "../api/pdf_director.data";
import type {
  DirectorFinancePreviewPdfModel,
  DirectorManagementReportPdfInput,
  DirectorManagementReportPdfModel,
  DirectorProductionPdfInput,
  DirectorProductionReportPdfModel,
  DirectorSubcontractPdfInput,
  DirectorSubcontractReportPdfModel,
  DirectorSupplierSummaryPdfInput,
  DirectorSupplierSummaryPdfModel,
  ReportsExportPdfModel,
  RequestPdfMetaField,
  RequestPdfModel,
  RequestPdfRowModel,
} from "./pdf.model";

type RequestLabelRow = Pick<Database["public"]["Tables"]["requests"]["Row"], "id" | "display_no">;
type RequestHeadRow = Pick<
  Database["public"]["Tables"]["requests"]["Row"],
  | "id"
  | "foreman_name"
  | "need_by"
  | "comment"
  | "status"
  | "created_at"
  | "object_type_code"
  | "level_code"
  | "system_code"
  | "zone_code"
>;
type RequestItemNoteRow = Pick<Database["public"]["Tables"]["request_items"]["Row"], "note">;
type RequestItemPdfRow = Pick<
  Database["public"]["Tables"]["request_items"]["Row"],
  "id" | "name_human" | "uom" | "qty" | "note" | "status"
>;

type RefNameRow = {
  name?: string | null;
  name_ru?: string | null;
  name_human_ru?: string | null;
  display_name?: string | null;
  alias_ru?: string | null;
};

const logPdfRequestDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

function getObjectField<T>(value: unknown, key: string): T | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  return (value as Record<string, unknown>)[key] as T;
}

function stripContextFromNote(raw: unknown) {
  const source = String(raw ?? "").trim();
  if (!source) return "";
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("объект:")) return false;
    if (lower.startsWith("этаж") || lower.startsWith("этаж/") || lower.startsWith("этаж /")) return false;
    if (lower.startsWith("система:")) return false;
    if (lower.startsWith("зона:") || lower.startsWith("зона /") || lower.startsWith("зона/")) return false;
    if (lower.startsWith("участок:")) return false;
    if (lower.startsWith("подрядчик:")) return false;
    if (lower.startsWith("телефон:")) return false;
    if (lower.startsWith("объём:") || lower.startsWith("объем:")) return false;
    return true;
  });

  return filtered
    .join("\n")
    .replace(/объект\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/этаж\s*\/?\s*уровень\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/система\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/зона\s*\/?\s*участок\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/подрядчик\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/телефон\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/объ[её]м\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseContextFromNotes(notes: unknown[]) {
  const context = {
    object: "",
    level: "",
    system: "",
    zone: "",
    contractor: "",
    phone: "",
    volume: "",
  };

  const put = (key: keyof typeof context, value: string) => {
    const next = String(value || "").trim();
    if (!next || context[key]) return;
    context[key] = next;
  };

  for (const rawNote of notes) {
    const raw = String(rawNote ?? "").trim();
    if (!raw) continue;
    const parts = raw
      .split(/[\n;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!match) continue;
      const key = String(match[1] || "").trim().toLowerCase();
      const value = String(match[2] || "").trim();
      if (!value) continue;

      if (key.includes("объект")) put("object", value);
      else if (key.includes("этаж") || key.includes("уров")) put("level", value);
      else if (key.includes("система")) put("system", value);
      else if (key.includes("зона") || key.includes("участ")) put("zone", value);
      else if (key.includes("подряд")) put("contractor", value);
      else if (key.includes("телефон")) put("phone", value);
      else if (key.includes("объём") || key.includes("объем")) put("volume", value);
    }
  }

  return context;
}

function pickRefName(row: { data?: RefNameRow | null } | RefNameRow | null | undefined) {
  const nested = getObjectField<RefNameRow | null>(row, "data");
  const source: RefNameRow = nested ?? (row && typeof row === "object" ? (row as RefNameRow) : {});
  const candidates = [
    source.name_ru,
    source.name_human_ru,
    source.display_name,
    source.alias_ru,
    source.name,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function formatDate(value: unknown, locale: string) {
  if (!value) return "";
  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(locale);
  return String(value ?? "").trim();
}

function formatDateTime(value: unknown, locale: string) {
  if (!value) return "";
  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date.toLocaleString(locale);
  return String(value ?? "").trim();
}

function normalizeStatusRu(raw?: string | null) {
  const original = String(raw ?? "").trim();
  const normalized = original.toLowerCase();
  if (!normalized) return "—";
  if (normalized === "draft" || normalized === "черновик") return "Черновик";
  if (normalized === "pending" || normalized === "на утверждении") return "На утверждении";
  if (normalized === "approved" || normalized === "утверждено" || normalized === "утверждена") {
    return "Утверждена";
  }
  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "отклонено" ||
    normalized === "отклонена"
  ) {
    return "Отклонена";
  }
  return original || "—";
}

export async function resolveRequestLabel(rid: string | number): Promise<string> {
  const id = String(rid).trim();
  if (!id) return "#—";
  try {
    const { data, error } = await supabase
      .from("requests")
      .select("display_no")
      .eq("id", id)
      .maybeSingle();
    const row = data as Pick<RequestLabelRow, "display_no"> | null;
    if (!error && row?.display_no) {
      const displayNo = String(row.display_no).trim();
      if (displayNo) return displayNo;
    }
  } catch (error: unknown) {
    recordCatchDiscipline({
      screen: "reports",
      surface: "pdf_builder",
      event: "request_label_lookup_failed",
      kind: "degraded_fallback",
      error,
      sourceKind: "table:requests",
      errorStage: "single_request_label",
      extra: {
        requestId: id,
      },
    });
    logPdfRequestDebug("[resolveRequestLabel]", getObjectField<string>(error, "message") ?? error);
  }
  return /^\d+$/.test(id) ? `#${id}` : `#${id.slice(0, 8)}`;
}

export async function batchResolveRequestLabels(ids: (string | number)[]): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.map((value) => String(value ?? "").trim()).filter(Boolean)));
  if (!uniqueIds.length) return {};
  try {
    const { data, error } = await supabase
      .from("requests")
      .select("id, display_no")
      .in("id", uniqueIds);
    if (error) throw new Error(`requests lookup failed: ${error.message}`);
    const rows = Array.isArray(data) ? (data as RequestLabelRow[]) : [];
    const mapped: Record<string, string> = {};
    for (const row of rows) {
      const id = String(row.id ?? "");
      const displayNo = String(row.display_no ?? "").trim();
      if (id && displayNo) mapped[id] = displayNo;
    }
    return mapped;
  } catch (error) {
    recordCatchDiscipline({
      screen: "reports",
      surface: "pdf_builder",
      event: "batch_request_label_lookup_failed",
      kind: "degraded_fallback",
      error,
      sourceKind: "table:requests",
      errorStage: "batch_request_labels",
      extra: {
        requestIdCount: uniqueIds.length,
      },
    });
    return {};
  }
}

export async function buildRequestPdfModel(requestId: number | string): Promise<RequestPdfModel> {
  const client: SupabaseClient<Database> = supabase;
  const requestKey = String(requestId).trim();
  const locale = "ru-RU";

  const formatQty = (value: unknown) => {
    const parsed = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed)
      ? parsed.toLocaleString(locale, { maximumFractionDigits: 3 })
      : "";
  };

  const requestLabel = await resolveRequestLabel(requestKey);

  const head = await client
    .from("requests")
    .select("id, foreman_name, need_by, comment, status, created_at, object_type_code, level_code, system_code, zone_code")
    .eq("id", requestKey)
    .maybeSingle();

  if (head.error || !head.data) {
    throw new Error("Заявка не найдена");
  }
  const request = head.data as RequestHeadRow;

  const [objectRef, levelRef, systemRef, zoneRef] = await Promise.all([
    request.object_type_code
      ? client
          .from("ref_object_types")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.object_type_code)
          .maybeSingle()
      : Promise.resolve({ data: null as RefNameRow | null }),
    request.level_code
      ? client
          .from("ref_levels")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.level_code)
          .maybeSingle()
      : Promise.resolve({ data: null as RefNameRow | null }),
    request.system_code
      ? client
          .from("ref_systems")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.system_code)
          .maybeSingle()
      : Promise.resolve({ data: null as RefNameRow | null }),
    request.zone_code
      ? client
          .from("ref_zones")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", request.zone_code)
          .maybeSingle()
      : Promise.resolve({ data: null as RefNameRow | null }),
  ]);

  const objectName = pickRefName(objectRef);
  const levelName = pickRefName(levelRef);
  const systemName = pickRefName(systemRef);
  const zoneName = pickRefName(zoneRef);
  const createdAt = formatDateTime(request.created_at, locale);
  const needBy = formatDate(request.need_by, locale);
  const generatedAt = new Date().toLocaleString(locale);

  const itemsForContext = await client
    .from("request_items")
    .select("note")
    .eq("request_id", requestKey);

  const noteContext = parseContextFromNotes(
    Array.isArray(itemsForContext.data)
      ? (itemsForContext.data as RequestItemNoteRow[]).map((row) => row.note)
      : [],
  );

  const metaFields: RequestPdfMetaField[] = [
    { label: "Объект", value: objectName || "—" },
    { label: "Система", value: systemName || "—" },
    { label: "ФИО прораба", value: String(request.foreman_name || "").trim() || "(не указано)" },
    { label: "Нужно к", value: needBy || "—" },
    { label: "ID заявки", value: String(request.id ?? "").trim() || "—" },
    { label: "Этаж / уровень", value: levelName || "—" },
    { label: "Зона / участок", value: zoneName || "—" },
    { label: "Дата создания", value: createdAt || "—" },
    { label: "Статус", value: normalizeStatusRu(request.status) || "—" },
  ];

  if (noteContext.contractor) {
    metaFields.push({ label: "Подрядчик", value: noteContext.contractor });
  }
  if (noteContext.phone) {
    metaFields.push({ label: "Телефон", value: noteContext.phone });
  }
  if (noteContext.volume) {
    metaFields.push({ label: "Объём", value: noteContext.volume });
  }

  const items = await client
    .from("request_items")
    .select("id, name_human, uom, qty, note, status")
    .eq("request_id", requestKey)
    .order("id", { ascending: true });

  const rows: RequestPdfRowModel[] = (Array.isArray(items.data) ? (items.data as RequestItemPdfRow[]) : []).map(
    (row) => ({
      name: String(row.name_human || "").trim(),
      uom: String(row.uom || "").trim(),
      qtyText: formatQty(row.qty),
      status: normalizeStatusRu(row.status),
      note: stripContextFromNote(row.note),
    }),
  );

  return {
    requestLabel,
    generatedAt,
    comment: String(request.comment || "").trim(),
    foremanName: String(request.foreman_name || "").trim(),
    metaFields,
    rows,
  };
}

export async function buildDirectorFinancePreviewPdfModel(): Promise<DirectorFinancePreviewPdfModel> {
  return loadDirectorFinancePreviewPdfModel();
}

export function buildDirectorSupplierSummaryPdfModel(
  input: DirectorSupplierSummaryPdfInput,
): DirectorSupplierSummaryPdfModel {
  return prepareDirectorSupplierSummaryPdfModel(input);
}

export function buildDirectorManagementReportPdfModel(
  input: DirectorManagementReportPdfInput,
): DirectorManagementReportPdfModel {
  return prepareDirectorManagementReportPdfModel(input);
}

export function buildDirectorProductionReportPdfModel(
  input: DirectorProductionPdfInput,
): DirectorProductionReportPdfModel {
  return prepareDirectorProductionReportPdfModel(input);
}

export function buildDirectorSubcontractReportPdfModel(
  input: DirectorSubcontractPdfInput,
  rows: unknown[],
): DirectorSubcontractReportPdfModel {
  return prepareDirectorSubcontractReportPdfModelFromRows(input, rows);
}

export function buildReportsExportPdfModel(args: {
  title: string;
  sections: {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  }[];
}): ReportsExportPdfModel {
  return {
    title: String(args.title || "").trim() || "Отчёт",
    sections: (args.sections || []).map((section) => ({
      title: String(section.title || "").trim(),
      columns: Array.isArray(section.columns) ? section.columns.map((value) => String(value)) : [],
      rows: Array.isArray(section.rows) ? section.rows.map((row) => row.map((cell) => String(cell))) : [],
    })),
  };
}
