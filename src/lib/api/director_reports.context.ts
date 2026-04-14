import { normalizeRuText } from "../text/encoding.ts";

import type {
  DirectorFactContextInput,
  DirectorFactContextResolved,
  DirectorFactRowNormalizeInput,
  DirectorFactRowNormalized,
  DirectorItemKind,
  DirectorObjectIdentityResolved,
  DirectorReportOptions,
  DirectorDisciplineSourceRpcRow,
  RequestLookupRow,
} from "./director_reports.types.ts";
import { asRecord, firstNonEmpty, toNum } from "./director_reports.normalizers.ts";

const WITHOUT_OBJECT = "Без объекта";
const WITHOUT_WORK = "Без вида работ";
const WITHOUT_LEVEL = "Без этажа";
const DASH = "—";

const optionObjectName = (v: unknown): string => {
  const s = String(normalizeRuText(String(v ?? ""))).trim();
  return s || WITHOUT_OBJECT;
};

const canonicalObjectName = (v: unknown): string => {
  let s = String(normalizeRuText(String(v ?? ""))).trim();
  if (!s) return WITHOUT_OBJECT;

  s = s
    .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$/i, "")
    .trim();

  return s || WITHOUT_OBJECT;
};

const resolveDirectorObjectIdentity = (input: {
  object_name_display?: unknown;
  object_id_resolved?: unknown;
}): DirectorObjectIdentityResolved => {
  const display = firstNonEmpty(input.object_name_display) || WITHOUT_OBJECT;
  const canonical = canonicalObjectName(display);
  const objectId = String(input.object_id_resolved ?? "").trim() || null;
  return {
    object_name_display: display,
    object_name_canonical: canonical,
    object_id_resolved: objectId,
    is_without_object: canonical === WITHOUT_OBJECT,
  };
};

const getDirectorFactObjectIdentity = (
  row: Pick<DirectorFactRowNormalized, "object_name_resolved" | "object_id_resolved">,
): DirectorObjectIdentityResolved =>
  resolveDirectorObjectIdentity({
    object_name_display: row.object_name_resolved,
    object_id_resolved: row.object_id_resolved,
  });

const matchesDirectorObjectIdentity = (
  selectedObjectName: string | null,
  row: Pick<DirectorFactRowNormalized, "object_name_resolved" | "object_id_resolved">,
  objectIdByName?: Record<string, string | null>,
): boolean => {
  if (selectedObjectName == null) return true;
  const targetIdentity = resolveDirectorObjectIdentity({ object_name_display: selectedObjectName });
  const target = resolveDirectorObjectIdentity({
    object_name_display: selectedObjectName,
    object_id_resolved:
      objectIdByName?.[targetIdentity.object_name_canonical] ??
      objectIdByName?.[selectedObjectName] ??
      null,
  });
  const identity = getDirectorFactObjectIdentity(row);
  if (target.object_id_resolved && identity.object_id_resolved) {
    return identity.object_id_resolved === target.object_id_resolved;
  }
  return identity.object_name_canonical === target.object_name_canonical;
};

const buildDirectorReportOptionsFromIdentities = (
  identities: DirectorObjectIdentityResolved[],
): DirectorReportOptions => {
  const objectIdByName: Record<string, string | null> = {};
  for (const identity of identities) {
    const key = identity.object_name_canonical;
    if (!(key in objectIdByName)) objectIdByName[key] = identity.object_id_resolved;
    if (objectIdByName[key] == null && identity.object_id_resolved) {
      objectIdByName[key] = identity.object_id_resolved;
    }
  }
  const objects = Object.keys(objectIdByName).sort((a, b) => a.localeCompare(b, "ru"));
  return { objects, objectIdByName };
};

const buildWithoutWorkContextLabelLegacy = (partsRaw: (string | null | undefined)[]): string => {
  const parts = partsRaw
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);
  if (!parts.length) return WITHOUT_WORK;
  return `${WITHOUT_WORK} · ${parts.slice(0, 2).join(" · ")}`;
};

const buildDirectorLocationLabelLegacy = (input: {
  objectName: string;
  levelName: string;
  systemName?: string | null;
  zoneName?: string | null;
}): string => {
  const parts = [
    String(input.objectName ?? "").trim(),
    String(input.levelName ?? "").trim(),
    String(input.systemName ?? "").trim(),
    String(input.zoneName ?? "").trim(),
  ].filter((part) => !!part && part !== WITHOUT_LEVEL);
  return parts.join(" · ") || input.objectName || WITHOUT_OBJECT;
};

const normWorkName = (v: unknown): string => {
  const s = String(normalizeRuText(String(v ?? "")))
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
  return s || WITHOUT_WORK;
};

const normLevelName = (v: unknown): string => {
  const s = String(normalizeRuText(String(v ?? "")))
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
  return s || WITHOUT_LEVEL;
};

function parseFreeIssueContextLegacy(note: string | null | undefined): {
  objectName: string;
  workName: string;
  levelName: string;
} {
  const clean = (v: string): string => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return s
      .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*/i, "")
      .trim();
  };

  const s = String(note ?? "");
  const objRaw = (s.match(/Объект:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const sysRaw =
    (s.match(/Система:\s*([^\n\r]+)/i)?.[1] || "").trim() ||
    (s.match(/Контекст:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const levelRaw =
    (s.match(/Этаж:\s*([^\n\r]+)/i)?.[1] || "").trim() ||
    (s.match(/Уровень:\s*([^\n\r]+)/i)?.[1] || "").trim();

  const obj = canonicalObjectName(clean(objRaw));
  const sys = clean(sysRaw) || WITHOUT_WORK;
  const level = clean(levelRaw) || WITHOUT_LEVEL;
  return { objectName: obj, workName: sys, levelName: level };
}

function parseFreeIssueContext(note: string | null | undefined): {
  objectName: string;
  workName: string;
  systemName: string;
  zoneName: string;
  levelName: string;
} {
  const clean = (v: string): string =>
    String(v ?? "")
      .trim()
      .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*/i, "")
      .trim();

  const s = String(note ?? "");
  const objectName = canonicalObjectName(clean((s.match(/Объект:\s*([^\n\r]+)/i)?.[1] || "").trim()));
  const workName = clean((s.match(/(?:Вид|Работа):\s*([^\n\r]+)/i)?.[1] || "").trim());
  const systemName = clean(
    ((s.match(/Система:\s*([^\n\r]+)/i)?.[1] || "").trim()) ||
    ((s.match(/Контекст:\s*([^\n\r]+)/i)?.[1] || "").trim()),
  );
  const zoneName = clean((s.match(/Зона:\s*([^\n\r]+)/i)?.[1] || "").trim());
  const levelName = clean(
    ((s.match(/Этаж:\s*([^\n\r]+)/i)?.[1] || "").trim()) ||
    ((s.match(/Уровень:\s*([^\n\r]+)/i)?.[1] || "").trim()),
  ) || WITHOUT_LEVEL;

  return {
    objectName,
    workName,
    systemName,
    zoneName,
    levelName,
  };
}

const resolveDirectorFactContextLegacy = (
  input: DirectorFactContextInput,
): DirectorFactContextResolved => {
  const requestId = String(input.request_id ?? input.request?.id ?? "").trim() || null;
  const requestItemId = String(input.request_item_id ?? "").trim() || null;
  const issueObjectId = String(input.issue_object_id ?? "").trim() || null;
  const issueWorkName = String(input.issue_work_name ?? "").trim();
  const issueObjectName = String(input.issue_object_name ?? "").trim();
  const issueObjectNameById = String(input.issue_object_name_by_id ?? "").trim();
  const requestObjectNameById = String(input.request_object_name_by_id ?? "").trim();
  const requestObjectTypeName = String(input.request_object_type_name ?? "").trim();
  const requestSystemName = String(input.request_system_name ?? "").trim();
  const freeCtx = parseFreeIssueContext(input.issue_note ?? null);
  const request = input.request ?? null;

  const itemKindRaw = String(input.item_kind ?? "").trim().toLowerCase();
  const itemKindWorkFallback =
    itemKindRaw === "work" || itemKindRaw === "работа" || itemKindRaw === "работы" ? "Работы" :
    itemKindRaw === "service" || itemKindRaw === "услуга" || itemKindRaw === "услуги" ? "Услуги" :
    itemKindRaw === "material" || itemKindRaw === "материал" || itemKindRaw === "материалы" ? "Материалы" :
    "";

  if (request) {
    return {
      request_id: requestId,
      request_item_id: requestItemId,
      object_id_resolved: String(request?.object_id ?? "").trim() || issueObjectId,
      object_name_resolved:
        firstNonEmpty(
          requestObjectNameById,
          request?.object_name,
          requestObjectTypeName,
          issueObjectNameById,
          issueObjectName,
        ) || WITHOUT_OBJECT,
      work_name_resolved:
        firstNonEmpty(issueWorkName, requestSystemName, request?.system_code, itemKindWorkFallback) || WITHOUT_WORK,
      level_name_resolved: normLevelName(request?.level_code),
      system_name_resolved: requestSystemName || request?.system_code || null,
      zone_name_resolved: String(input.request_zone_name ?? request?.zone_code ?? "").trim() || null,
      is_without_request: false,
    };
  }

  return {
    request_id: requestId,
    request_item_id: requestItemId,
    object_id_resolved: issueObjectId,
    object_name_resolved:
      firstNonEmpty(
        issueObjectNameById,
        issueObjectName,
        input.use_free_issue_object_fallback === false ? "" : freeCtx.objectName,
      ) || WITHOUT_OBJECT,
    work_name_resolved: firstNonEmpty(issueWorkName, freeCtx.workName, itemKindWorkFallback) || WITHOUT_WORK,
    level_name_resolved:
      input.force_without_level_when_issue_work_name && issueWorkName
        ? WITHOUT_LEVEL
        : normLevelName(freeCtx.levelName),
    system_name_resolved: String(freeCtx.systemName ?? "").trim() || null,
    zone_name_resolved: String(freeCtx.zoneName ?? "").trim() || null,
    is_without_request: !requestItemId,
  };
};

const resolveItemKindLegacy = (rikCode: string, inputKind?: string | null): DirectorItemKind => {
  const k = String(inputKind ?? "").trim().toLowerCase();
  if (k === "work" || k === "работа" || k === "работы") return "work";
  if (k === "service" || k === "услуга" || k === "услуги") return "service";
  if (k === "material" || k === "материал" || k === "материалы") return "material";
  return rikCode ? "material" : "unknown";
};

const normalizeDirectorFactRowLegacy = (
  input: DirectorFactRowNormalizeInput,
): DirectorFactRowNormalized | null => {
  const issueId = String(input.issue_id ?? "").trim();
  const rikCode = String(input.rik_code ?? "").trim().toUpperCase();
  const itemKind = resolveItemKind(rikCode, input.item_kind);

  if (!issueId) return null;
  if (!rikCode && itemKind === "unknown") return null;

  const effectiveCode =
    rikCode || `${itemKind.toUpperCase()}::${String(input.material_name ?? "").trim().toUpperCase().slice(0, 40) || "ITEM"}`;
  const materialName = String(input.material_name ?? "").trim() || effectiveCode;

  return {
    issue_id: issueId,
    issue_item_id: String(input.issue_item_id ?? "").trim() || null,
    iss_date: String(input.iss_date ?? ""),
    request_id: input.context.request_id,
    request_item_id: input.context.request_item_id,
    object_id_resolved: input.context.object_id_resolved,
    object_name_resolved: input.context.object_name_resolved,
    work_name_resolved: input.context.work_name_resolved,
    level_name_resolved: input.context.level_name_resolved,
    system_name_resolved: input.context.system_name_resolved,
    zone_name_resolved: input.context.zone_name_resolved,
    material_name_resolved: materialName,
    rik_code_resolved: effectiveCode,
    uom_resolved: String(input.uom ?? "").trim(),
    qty: toNum(input.qty),
    is_without_request: !!input.context.is_without_request,
    item_kind: itemKind,
  };
};

const buildDirectorLocationLabel = (input: {
  objectName: string;
  levelName: string;
  systemName?: string | null;
  zoneName?: string | null;
}): string => {
  const parts = [
    String(input.objectName ?? "").trim(),
    String(input.levelName ?? "").trim(),
    String(input.systemName ?? "").trim(),
    String(input.zoneName ?? "").trim(),
  ].filter((part) => !!part && part !== WITHOUT_LEVEL);
  return parts.join(" / ") || input.objectName || WITHOUT_OBJECT;
};

const resolveDirectorFactContext = (
  input: DirectorFactContextInput,
): DirectorFactContextResolved => {
  const requestId = String(input.request_id ?? input.request?.id ?? "").trim() || null;
  const requestItemId = String(input.request_item_id ?? "").trim() || null;
  const issueObjectId = String(input.issue_object_id ?? "").trim() || null;
  const issueWorkName = String(input.issue_work_name ?? "").trim();
  const issueObjectName = String(input.issue_object_name ?? "").trim();
  const issueObjectNameById = String(input.issue_object_name_by_id ?? "").trim();
  const requestObjectNameById = String(input.request_object_name_by_id ?? "").trim();
  const requestObjectTypeName = String(input.request_object_type_name ?? "").trim();
  const requestSystemName = String(input.request_system_name ?? "").trim();
  const requestZoneName = String(input.request_zone_name ?? "").trim();
  const freeCtx = parseFreeIssueContext(input.issue_note ?? null);
  const request = input.request ?? null;
  const requestIdentityKey = String(request?.object_identity_key ?? "").trim() || null;
  const requestIdentityName = String(request?.object_identity_name ?? "").trim() || null;

  const itemKindRaw = String(input.item_kind ?? "").trim().toLowerCase();
  const itemKindWorkFallback =
    itemKindRaw === "work" || itemKindRaw === "работа" || itemKindRaw === "работы" ? "Работы" :
    itemKindRaw === "service" || itemKindRaw === "услуга" || itemKindRaw === "услуги" ? "Услуги" :
    itemKindRaw === "material" || itemKindRaw === "материал" || itemKindRaw === "материалы" ? "Материалы" :
    "";

  const objectNameResolved =
    firstNonEmpty(
      requestIdentityName,
      requestObjectNameById,
      request?.object_name,
      requestObjectTypeName,
      issueObjectNameById,
      issueObjectName,
      input.use_free_issue_object_fallback === false ? "" : freeCtx.objectName,
    ) || WITHOUT_OBJECT;
  const systemNameResolved =
    firstNonEmpty(requestSystemName, request?.system_code, freeCtx.systemName) || null;
  const zoneNameResolved =
    firstNonEmpty(requestZoneName, request?.zone_code, freeCtx.zoneName) || null;
  const levelNameResolved = normLevelName(firstNonEmpty(request?.level_code, freeCtx.levelName));
  const actualWorkName = firstNonEmpty(issueWorkName, freeCtx.workName);
  const contextualWorkFallback =
    !actualWorkName
      ? firstNonEmpty(systemNameResolved, zoneNameResolved)
      : "";
  const workNameResolved =
    actualWorkName ||
    contextualWorkFallback ||
    itemKindWorkFallback ||
    WITHOUT_WORK;

  return {
    request_id: requestId,
    request_item_id: requestItemId,
    object_id_resolved: requestIdentityKey || String(request?.object_id ?? "").trim() || issueObjectId,
    object_name_resolved: objectNameResolved,
    work_name_resolved: workNameResolved,
    level_name_resolved: levelNameResolved,
    system_name_resolved: systemNameResolved,
    zone_name_resolved: zoneNameResolved,
    is_without_request: request ? false : !requestItemId,
  };
};

const resolveItemKind = (rikCode: string, inputKind?: string | null): DirectorItemKind => {
  const k = String(inputKind ?? "").trim().toLowerCase();
  if (k === "work" || k === "работа" || k === "работы") return "work";
  if (k === "service" || k === "услуга" || k === "услуги") return "service";
  if (k === "material" || k === "материал" || k === "материалы") return "material";
  return rikCode ? "material" : "unknown";
};

const normalizeDirectorFactRow = (
  input: DirectorFactRowNormalizeInput,
): DirectorFactRowNormalized | null => {
  const issueId = String(input.issue_id ?? "").trim();
  const rikCode = String(input.rik_code ?? "").trim().toUpperCase();
  const itemKind = resolveItemKind(rikCode, input.item_kind);
  if (!issueId) return null;
  if (!rikCode && itemKind === "unknown") return null;

  const effectiveCode =
    rikCode ||
    `${itemKind.toUpperCase()}::${String(input.material_name ?? "").trim().toUpperCase().slice(0, 40) || "ITEM"}`;
  const materialName = String(input.material_name ?? "").trim() || effectiveCode;

  return {
    issue_id: issueId,
    issue_item_id: String(input.issue_item_id ?? "").trim() || null,
    iss_date: String(input.iss_date ?? ""),
    request_id: input.context.request_id,
    request_item_id: input.context.request_item_id,
    object_id_resolved: input.context.object_id_resolved,
    object_name_resolved: input.context.object_name_resolved,
    work_name_resolved: input.context.work_name_resolved,
    level_name_resolved: input.context.level_name_resolved,
    system_name_resolved: input.context.system_name_resolved,
    zone_name_resolved: input.context.zone_name_resolved,
    material_name_resolved: materialName,
    rik_code_resolved: effectiveCode,
    uom_resolved: String(input.uom ?? "").trim(),
    qty: toNum(input.qty),
    is_without_request: !!input.context.is_without_request,
    item_kind: itemKind,
  };
};

void buildWithoutWorkContextLabelLegacy;
void buildDirectorLocationLabelLegacy;
void resolveDirectorFactContextLegacy;
void resolveItemKindLegacy;
void normalizeDirectorFactRowLegacy;

const normalizeDirectorFactViewRow = (value: unknown): DirectorFactRowNormalized | null => {
  const row = asRecord(value);
  const context = resolveDirectorFactContext({
    issue_object_name: row.object_name == null ? null : String(row.object_name),
    issue_work_name: row.work_name == null ? null : String(row.work_name),
    use_free_issue_object_fallback: false,
  });
  return normalizeDirectorFactRow({
    issue_id: row.issue_id == null ? "" : String(row.issue_id).trim(),
    iss_date: row.iss_date == null ? "" : String(row.iss_date),
    context: {
      ...context,
      is_without_request: row.is_without_request == null ? context.is_without_request : Boolean(row.is_without_request),
    },
    material_name: row.material_name_ru == null ? null : String(row.material_name_ru),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    uom: row.uom == null ? null : String(row.uom),
    qty: row.qty == null ? null : (row.qty as number | string),
    item_kind: row.item_kind == null ? null : String(row.item_kind),
  });
};

const normalizeDirectorDisciplineSourceRpcRow = (value: unknown): DirectorFactRowNormalized | null => {
  const row = asRecord(value);
  const issueWorkName = row.issue_work_name == null ? "" : String(row.issue_work_name).trim();
  const requestIdFromIssue =
    row.request_id_from_issue == null ? null : String(row.request_id_from_issue).trim() || null;
  const requestIdFromItem =
    row.request_id_from_item == null ? null : String(row.request_id_from_item).trim() || null;
  const effectiveRequestId = issueWorkName ? requestIdFromIssue : (requestIdFromItem ?? requestIdFromIssue);
  const request: RequestLookupRow | null =
    !issueWorkName && effectiveRequestId
      ? {
          id: effectiveRequestId,
          request_no: null,
          display_no: null,
          status: null,
          object_id: null,
          object_name: null,
          object_type_code: null,
          system_code:
            row.request_system_code == null ? null : String(row.request_system_code).trim() || null,
          level_code:
            row.request_level_code == null ? null : String(row.request_level_code).trim() || null,
          zone_code:
            row.request_zone_name == null ? null : String(row.request_zone_name).trim() || null,
          object: null,
          submitted_at: null,
          created_at: null,
          note: null,
          comment: null,
          item_count_total: null,
          item_count_active: null,
          item_qty_total: null,
          item_qty_active: null,
        }
      : null;
  const context = resolveDirectorFactContext({
    request_id: effectiveRequestId,
    request_item_id:
      row.request_item_id == null ? null : String(row.request_item_id).trim() || null,
    request,
    issue_note: row.issue_note == null ? null : String(row.issue_note),
    issue_object_name: row.issue_object_name == null ? null : String(row.issue_object_name),
    issue_work_name: row.issue_work_name == null ? null : String(row.issue_work_name),
    request_system_name:
      row.request_system_name == null ? null : String(row.request_system_name),
    request_zone_name:
      row.request_zone_name == null ? null : String(row.request_zone_name),
    use_free_issue_object_fallback: false,
    force_without_level_when_issue_work_name: true,
  });
  return normalizeDirectorFactRow({
    issue_id: row.issue_id == null ? "" : String(row.issue_id).trim(),
    issue_item_id: row.issue_item_id == null ? null : String(row.issue_item_id).trim(),
    iss_date: row.iss_date == null ? "" : String(row.iss_date),
    context,
    material_name: row.material_name == null ? null : String(row.material_name),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
    uom: row.uom == null ? null : String(row.uom),
    qty: row.qty == null ? null : (row.qty as number | string),
  });
};

const buildReportOptionsFromByObjRows = (
  rows: { object_name?: string | null; object_id?: string | number | null }[],
): DirectorReportOptions =>
  buildDirectorReportOptionsFromIdentities(
    (rows || []).map((r) =>
      resolveDirectorObjectIdentity({
        object_name_display: optionObjectName(r?.object_name),
        object_id_resolved: r?.object_id,
      }),
    ),
  );

const normObjectName = (v: unknown): string =>
  resolveDirectorObjectIdentity({ object_name_display: v }).object_name_canonical;

const toRangeStart = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T00:00:00.000Z` : x;
};

const toRangeEnd = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T23:59:59.999Z` : x;
};

const rpcDate = (d: string | null | undefined, fallback: string): string => {
  const x = String(d ?? "").trim();
  return x || fallback;
};

const chunk = <T,>(arr: T[], size = 500): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const forEachChunkParallel = async <T,>(
  arr: T[],
  size: number,
  concurrency: number,
  worker: (part: T[]) => Promise<void>,
) => {
  const parts = chunk(arr, size);
  if (!parts.length) return;
  const c = Math.max(1, Math.min(concurrency, parts.length));
  let idx = 0;
  const runners = Array.from({ length: c }, async () => {
    while (true) {
      const i = idx++;
      if (i >= parts.length) return;
      await worker(parts[i]);
    }
  });
  await Promise.all(runners);
};

export {
  WITHOUT_OBJECT,
  WITHOUT_WORK,
  WITHOUT_LEVEL,
  DASH,
  optionObjectName,
  resolveDirectorObjectIdentity,
  getDirectorFactObjectIdentity,
  matchesDirectorObjectIdentity,
  buildDirectorReportOptionsFromIdentities,
  buildReportOptionsFromByObjRows,
  buildWithoutWorkContextLabelLegacy,
  buildDirectorLocationLabelLegacy,
  buildDirectorLocationLabel,
  canonicalObjectName,
  normObjectName,
  normWorkName,
  normLevelName,
  toRangeStart,
  toRangeEnd,
  rpcDate,
  chunk,
  forEachChunkParallel,
  parseFreeIssueContextLegacy,
  parseFreeIssueContext,
  resolveDirectorFactContextLegacy,
  resolveItemKindLegacy,
  normalizeDirectorFactRowLegacy,
  resolveDirectorFactContext,
  resolveItemKind,
  normalizeDirectorFactRow,
  normalizeDirectorFactViewRow,
  normalizeDirectorDisciplineSourceRpcRow,
};
