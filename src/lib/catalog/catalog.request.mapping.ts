import {
  asLooseRecord,
  norm,
  parseNumberValue,
  pickFirstString,
  readRefName,
} from "./catalog.compat.shared";

export type RequestHeader = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type RequestItem = {
  id?: string;
  request_id: string;
  line_no?: number | null;
  code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  note?: string | null;
};

export type ReqItemRow = {
  id: string;
  request_id: string;
  name_human: string;
  qty: number;
  uom?: string | null;
  status?: string | null;
  supplier_hint?: string | null;
  app_code?: string | null;
  note?: string | null;
  rik_code?: string | null;
  line_no?: number | null;
  updated_at?: string | null;
};

export type ForemanRequestSummary = {
  id: string;
  display_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  need_by?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
  has_rejected?: boolean | null;
};

export type RequestDetails = {
  id: string;
  status?: string | null;
  display_no?: string | null;
  year?: number | null;
  seq?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  need_by?: string | null;
  comment?: string | null;
  foreman_name?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  object_name_ru?: string | null;
  level_name_ru?: string | null;
  system_name_ru?: string | null;
  zone_name_ru?: string | null;
};

export type RequestMetaPatch = {
  need_by?: string | null;
  comment?: string | null;
  object_type_code?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  foreman_name?: string | null;
  contractor_job_id?: string | null;
  subcontract_id?: string | null;
  contractor_org?: string | null;
  subcontractor_org?: string | null;
  contractor_phone?: string | null;
  subcontractor_phone?: string | null;
  planned_volume?: number | null;
  qty_plan?: number | null;
  volume?: number | null;
  object_name?: string | null;
  level_name?: string | null;
  system_name?: string | null;
  zone_name?: string | null;
};

export const asRequestHeader = (value: unknown): RequestHeader | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    display_no: row.display_no == null ? null : String(row.display_no),
    status: row.status == null ? null : String(row.status),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
};

export const asRequestStatusRow = (
  value: unknown,
): {
  id: string;
  status?: string | null;
  display_no?: string | null;
} | null => {
  const header = asRequestHeader(value);
  return header ? header : null;
};

export const mapRequestItemRow = (
  raw: unknown,
  requestId: string,
): ReqItemRow | null => {
  const row = asLooseRecord(raw);
  const rawId = row.id ?? row.request_item_id ?? null;
  if (!rawId) return null;
  const qtyVal = Number(row.qty ?? row.quantity ?? row.total_qty ?? 0);
  const qty = Number.isFinite(qtyVal) ? qtyVal : 0;
  const lineNo =
    parseNumberValue(
      row.line_no,
      row.row_no,
      row.position_order,
      row.rowno,
      row.rowNo,
      row.positionOrder,
    ) ?? null;

  const nameHuman =
    pickFirstString(
      row.name_human_ru,
      row.name_human,
      row.name_ru,
      row.name,
      row.display_name,
      row.alias_ru,
      row.best_name_display,
    ) || "";

  return {
    id: String(rawId),
    request_id: String(row.request_id ?? requestId),
    name_human: nameHuman || "\u2014",
    qty,
    uom: pickFirstString(row.uom, row.uom_code),
    status: pickFirstString(row.status),
    supplier_hint: pickFirstString(row.supplier_hint, row.supplier),
    app_code: pickFirstString(row.app_code),
    note: pickFirstString(row.note, row.comment),
    rik_code: pickFirstString(row.rik_code, row.code),
    line_no: lineNo,
    updated_at: pickFirstString(row.updated_at, row.updatedAt),
  };
};

export const mapDetailsFromRow = (row: unknown): RequestDetails | null => {
  const source = asLooseRecord(row);
  const id = pickFirstString(source.id, source.request_id);
  if (!id) return null;

  const objectCode = pickFirstString(
    source.object_type_code,
    source.objectTypeCode,
    source.object_code,
    source.objectCode,
    source.objecttype_code,
    source.objecttypeCode,
    source.object,
  );
  const levelCode = pickFirstString(
    source.level_code,
    source.levelCode,
    source.level,
  );
  const systemCode = pickFirstString(
    source.system_code,
    source.systemCode,
    source.system,
  );
  const zoneCode = pickFirstString(
    source.zone_code,
    source.zoneCode,
    source.zone,
    source.zone_area,
    source.area,
  );

  const commentRaw = source.comment ?? source.request_comment ?? null;
  const comment =
    typeof commentRaw === "string"
      ? commentRaw
      : norm(commentRaw == null ? null : String(commentRaw));

  return {
    id,
    status: pickFirstString(source.status, source.request_status),
    display_no: pickFirstString(
      source.display_no,
      source.display,
      source.label,
      source.number,
      source.request_no,
    ),
    year: parseNumberValue(
      source.year,
      source.request_year,
      source.requestYear,
    ),
    seq: parseNumberValue(source.seq, source.request_seq, source.requestSeq),
    created_at: pickFirstString(
      source.created_at,
      source.created,
      source.createdAt,
    ),
    updated_at: pickFirstString(source.updated_at, source.updatedAt),
    need_by: pickFirstString(
      source.need_by,
      source.need_by_date,
      source.needBy,
    ),
    comment: comment ?? null,
    foreman_name: pickFirstString(
      source.foreman_name,
      source.foreman,
      source.foremanName,
    ),
    object_type_code: objectCode,
    level_code: levelCode,
    system_code: systemCode,
    zone_code: zoneCode,
    object_name_ru: readRefName(
      source,
      ["object", "object_type", "objecttype", "objectType", "object_ref"],
      objectCode,
    ),
    level_name_ru: readRefName(
      source,
      ["level", "level_ref", "levelRef"],
      levelCode,
    ),
    system_name_ru: readRefName(
      source,
      ["system", "system_type", "systemType", "system_ref"],
      systemCode,
    ),
    zone_name_ru: readRefName(
      source,
      ["zone", "zone_area", "area", "zoneRef", "zone_ref"],
      zoneCode,
    ),
  };
};

export const mapSummaryFromRow = (row: unknown): ForemanRequestSummary | null => {
  const source = asLooseRecord(row);
  const details = mapDetailsFromRow(source);
  if (!details) return null;

  const rawHas =
    source.has_rejected ?? source.hasRejected ?? source.has_rej ?? null;
  return {
    id: details.id,
    status: details.status ?? null,
    created_at: details.created_at ?? null,
    need_by: details.need_by ?? null,
    display_no: details.display_no ?? null,
    object_name_ru: details.object_name_ru ?? null,
    level_name_ru: details.level_name_ru ?? null,
    system_name_ru: details.system_name_ru ?? null,
    zone_name_ru: details.zone_name_ru ?? null,
    has_rejected:
      typeof rawHas === "boolean"
        ? rawHas
        : rawHas == null
          ? null
          : Boolean(rawHas),
  };
};
