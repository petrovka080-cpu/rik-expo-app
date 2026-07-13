import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { recordCatchDiscipline } from "../observability/catchDiscipline";
import { supabase } from "../supabaseClient";
import { loadPagedRowsWithCeiling, type PagedQuery } from "../api/_core";
import { MAX_LIST_LIMIT } from "../api/queryLimits";
import {
  loadDirectorFinancePreviewPdfModel,
  prepareDirectorManagementReportPdfModel,
  prepareDirectorProductionReportPdfModel,
  prepareDirectorSubcontractReportPdfModelFromRows,
  prepareDirectorSupplierSummaryPdfModel,
} from "../api/pdf_director.data";
import {
  buildRequestContextMetaFields,
  buildRequestContextView,
  buildRequestLineItemView,
  parseRequestContextFromNotes,
} from "../../features/office/requestContextView";
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
import { FOREMAN_REQUEST_PDF_CHILD_LIST_PAGE_DEFAULTS } from "./foremanRequestPdf.shared";

type RequestLabelRow = Pick<
  Database["public"]["Tables"]["requests"]["Row"],
  "id" | "display_no" | "request_no"
>;
type RequestHeadRow = Pick<
  Database["public"]["Tables"]["requests"]["Row"],
  | "id"
  | "display_no"
  | "request_no"
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
const REQUEST_HEAD_SELECT =
  "id, display_no, request_no, foreman_name, need_by, comment, status, created_at, object_type_code, level_code, system_code, zone_code";
type RequestItemPdfRow = Pick<
  Database["public"]["Tables"]["request_items"]["Row"],
  "id" | "name_human" | "uom" | "qty" | "note" | "status" | "app_code" | "rik_code" | "item_kind"
>;

type RefNameRow = {
  name?: string | null;
  name_ru?: string | null;
  name_human_ru?: string | null;
  display_name?: string | null;
  alias_ru?: string | null;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "unknown_error");
  }
  return String(error ?? "unknown_error");
}

async function loadRequestPdfItemRows(
  client: SupabaseClient<Database>,
  requestKey: string,
): Promise<RequestItemPdfRow[]> {
  const result = await loadPagedRowsWithCeiling<RequestItemPdfRow>(
    () =>
      client
        .from("request_items")
        .select("id, name_human, uom, qty, note, status, app_code, rik_code, item_kind")
        .eq("request_id", requestKey)
        .order("id", {
          ascending: true,
        }) as unknown as PagedQuery<RequestItemPdfRow>,
    FOREMAN_REQUEST_PDF_CHILD_LIST_PAGE_DEFAULTS,
  );

  if (result.error) {
    throw result.error instanceof Error
      ? result.error
      : new Error(errorMessage(result.error));
  }

  return Array.isArray(result.data) ? result.data : [];
}

const logPdfRequestDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

function getObjectField<T>(value: unknown, key: string): T | undefined {
  if (typeof value !== "object" || value === null || !(key in value))
    return undefined;
  return (value as Record<string, unknown>)[key] as T;
}

function pickRefName(
  row: { data?: RefNameRow | null } | RefNameRow | null | undefined,
) {
  const nested = getObjectField<RefNameRow | null>(row, "data");
  const source: RefNameRow =
    nested ?? (row && typeof row === "object" ? (row as RefNameRow) : {});
  const candidates = [
    source.name_ru,
    source.name_human_ru,
    source.display_name,
    source.alias_ru,
    source.name,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
  }
  return "";
}

export async function resolveRequestLabel(
  rid: string | number,
): Promise<string> {
  const id = String(rid).trim();
  if (!id) return "#—";
  try {
    const { data, error } = await supabase
      .from("requests")
      .select("display_no, request_no")
      .eq("id", id)
      .maybeSingle();
    const row = data as Pick<RequestLabelRow, "display_no" | "request_no"> | null;
    if (!error) {
      const displayNo = String(row?.request_no ?? row?.display_no ?? "").trim();
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
    logPdfRequestDebug(
      "[resolveRequestLabel]",
      getObjectField<string>(error, "message") ?? error,
    );
  }
  return /^\d+$/.test(id) ? `#${id}` : `#${id.slice(0, 8)}`;
}

export async function batchResolveRequestLabels(
  ids: (string | number)[],
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(
    new Set(ids.map((value) => String(value ?? "").trim()).filter(Boolean)),
  );
  if (!uniqueIds.length) return {};
  try {
    const { data, error } = await supabase
      .from("requests")
      .select("id, display_no, request_no")
      .in("id", uniqueIds)
      .limit(Math.min(uniqueIds.length, MAX_LIST_LIMIT));
    if (error) throw new Error(`requests lookup failed: ${error.message}`);
    const rows = Array.isArray(data) ? (data as RequestLabelRow[]) : [];
    const mapped: Record<string, string> = {};
    for (const row of rows) {
      const id = String(row.id ?? "");
      const displayNo = String(row.request_no ?? row.display_no ?? "").trim();
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

async function loadRequestHeadByKey(
  client: SupabaseClient<Database>,
  requestKey: string,
): Promise<RequestHeadRow | null> {
  const key = String(requestKey ?? "").trim();
  const bareKey = key.replace(/^#/, "").trim();
  const lookupValues = Array.from(new Set([key, bareKey].filter(Boolean)));

  const byColumn = async (column: "id" | "display_no" | "request_no", value: string) => {
    try {
      const result = await client
        .from("requests")
        .select(REQUEST_HEAD_SELECT)
        .eq(column, value)
        .maybeSingle();
      if (!result.error && result.data) return result.data as RequestHeadRow;
    } catch (error) {
      logPdfRequestDebug("[buildRequestPdfModel.lookup]", column, getObjectField<string>(error, "message") ?? error);
    }
    return null;
  };

  for (const value of lookupValues) {
    const byId = await byColumn("id", value);
    if (byId) return byId;
  }
  for (const value of lookupValues) {
    const byDisplay = await byColumn("display_no", value);
    if (byDisplay) return byDisplay;
    const byRequestNo = await byColumn("request_no", value);
    if (byRequestNo) return byRequestNo;
  }

  if (/^[a-f0-9]{6,12}$/i.test(bareKey)) {
    try {
      const result = await client
        .from("requests")
        .select(REQUEST_HEAD_SELECT)
        .ilike("id", `${bareKey}%`)
        .limit(2);
      const rows = Array.isArray(result.data) ? (result.data as RequestHeadRow[]) : [];
      if (!result.error && rows.length === 1) return rows[0];
    } catch (error) {
      logPdfRequestDebug("[buildRequestPdfModel.prefix_lookup]", getObjectField<string>(error, "message") ?? error);
    }
  }

  const byRequestItem = async (value: string) => {
    try {
      const result = await client
        .from("request_items")
        .select("request_id")
        .eq("id", value)
        .maybeSingle();
      if (result.error || !result.data) return null;
      const requestId = String((result.data as { request_id?: unknown }).request_id ?? "").trim();
      return requestId ? await byColumn("id", requestId) : null;
    } catch (error) {
      logPdfRequestDebug("[buildRequestPdfModel.request_item_lookup]", getObjectField<string>(error, "message") ?? error);
    }
    return null;
  };

  for (const value of lookupValues) {
    const byItem = await byRequestItem(value);
    if (byItem) return byItem;
  }

  if (/^[a-f0-9]{6,12}$/i.test(bareKey)) {
    try {
      const result = await client
        .from("request_items")
        .select("id, request_id")
        .ilike("id", `${bareKey}%`)
        .limit(2);
      const rows = Array.isArray(result.data)
        ? (result.data as { request_id?: unknown }[])
        : [];
      const requestIds = Array.from(
        new Set(rows.map((row) => String(row.request_id ?? "").trim()).filter(Boolean)),
      );
      if (!result.error && requestIds.length === 1) {
        const byItemPrefix = await byColumn("id", requestIds[0]);
        if (byItemPrefix) return byItemPrefix;
      }
    } catch (error) {
      logPdfRequestDebug("[buildRequestPdfModel.request_item_prefix_lookup]", getObjectField<string>(error, "message") ?? error);
    }
  }

  return null;
}

export async function buildRequestPdfModel(
  requestId: number | string,
): Promise<RequestPdfModel> {
  const client: SupabaseClient<Database> = supabase;
  const requestKey = String(requestId).trim();
  const locale = "ru-RU";

  const request = await loadRequestHeadByKey(client, requestKey);
  if (!request) {
    throw new Error("Заявка не найдена");
  }
  const resolvedRequestKey = String(request.id ?? "").trim();
  const requestLabel =
    String(request.request_no ?? request.display_no ?? "").trim() ||
    (resolvedRequestKey ? await resolveRequestLabel(resolvedRequestKey) : await resolveRequestLabel(requestKey));

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
  const generatedAt = new Date().toLocaleString(locale);

  const itemRows = await loadRequestPdfItemRows(client, resolvedRequestKey || requestKey);
  const noteContext = parseRequestContextFromNotes(itemRows.map((row) => row.note));
  const contextView = buildRequestContextView(
    {
      requestId: request.id,
      requestNo: request.request_no,
      displayNo: request.display_no,
      objectName,
      floorLabel: levelName,
      systemLabel: systemName,
      zoneLabel: zoneName,
      levelCode: request.level_code,
      systemCode: request.system_code,
      zoneCode: request.zone_code,
      status: request.status,
      createdAt: request.created_at,
      neededBy: request.need_by,
    },
    noteContext,
  );

  const metaFields: RequestPdfMetaField[] = [
    ...buildRequestContextMetaFields(contextView),
    {
      label: "ФИО прораба",
      value: String(request.foreman_name || "").trim() || "(не указано)",
    },
    { label: "ID заявки", value: String(request.id ?? "").trim() || "—" },
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

  const rows: RequestPdfRowModel[] = itemRows.map((row) => {
    const line = buildRequestLineItemView({
      id: row.id,
      nameHuman: row.name_human,
      uom: row.uom,
      qty: row.qty,
      note: row.note,
      status: row.status,
      appCode: row.app_code,
      rikCode: row.rik_code,
      itemKind: row.item_kind,
    });
    return {
      name: line.name,
      uom: line.uom,
      qtyText: line.qtyText,
      status: line.statusLabel,
      note: line.note,
    };
  });

  return {
    requestLabel: contextView.requestNo || requestLabel,
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
      columns: Array.isArray(section.columns)
        ? section.columns.map((value) => String(value))
        : [],
      rows: Array.isArray(section.rows)
        ? section.rows.map((row) => row.map((cell) => String(cell)))
        : [],
    })),
  };
}
