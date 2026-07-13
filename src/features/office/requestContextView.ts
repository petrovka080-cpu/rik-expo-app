import { officeHumanLabel, officeUomLabel } from "../../shared/i18n/officeRussianDisplay";

export type ParsedRequestContextNote = {
  object: string | null;
  building: string | null;
  level: string | null;
  system: string | null;
  zone: string | null;
  location: string | null;
  contractor: string | null;
  phone: string | null;
  volume: string | null;
};

export type RequestContextSource = {
  requestId?: unknown;
  requestNo?: unknown;
  displayNo?: unknown;
  displayLabel?: unknown;
  objectName?: unknown;
  object?: unknown;
  siteAddress?: unknown;
  buildingName?: unknown;
  floorLabel?: unknown;
  levelLabel?: unknown;
  systemLabel?: unknown;
  zoneLabel?: unknown;
  locationLabel?: unknown;
  levelCode?: unknown;
  systemCode?: unknown;
  zoneCode?: unknown;
  status?: unknown;
  createdAt?: unknown;
  submittedAt?: unknown;
  approvedAt?: unknown;
  neededBy?: unknown;
};

export type RequestContextView = {
  requestId: string;
  requestNo: string | null;
  objectName: string | null;
  buildingName: string | null;
  floorLabel: string | null;
  systemLabel: string | null;
  zoneLabel: string | null;
  locationLabel: string | null;
  statusLabel: string;
  createdAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  neededBy?: string | null;
};

export type RequestLineItemSource = {
  id?: unknown;
  name?: unknown;
  nameHuman?: unknown;
  itemKind?: unknown;
  qty?: unknown;
  uom?: unknown;
  status?: unknown;
  note?: unknown;
  appCode?: unknown;
  rikCode?: unknown;
};

export type RequestLineItemView = {
  id: string | null;
  name: string;
  qtyText: string;
  qtyValue: number;
  uom: string;
  statusLabel: string;
  note: string;
  appCode: string | null;
  rikCode: string | null;
};

export type ProcurementRequestView = {
  context: RequestContextView;
  items: RequestLineItemView[];
};

const EMPTY_PARSED_CONTEXT: ParsedRequestContextNote = {
  object: null,
  building: null,
  level: null,
  system: null,
  zone: null,
  location: null,
  contractor: null,
  phone: null,
  volume: null,
};

export function cleanOfficeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

const isLikelyOfficeTechnicalCode = (value: unknown): boolean => {
  const text = cleanOfficeText(value);
  return /^[A-Z]{2,}(?:[-_][A-Z0-9]{2,})+$/.test(text);
};

const firstFriendlyOfficeText = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = cleanOfficeText(value);
    if (text && !isLikelyOfficeTechnicalCode(text)) return text;
  }
  return null;
};

const firstText = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = cleanOfficeText(value);
    if (text) return text;
  }
  return null;
};

const normalizeKey = (value: unknown): string =>
  cleanOfficeText(value)
    .toLowerCase()
    .replace(/ё/g, "е");

const hasUuidShape = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function formatRequestNo(source: RequestContextSource): string | null {
  const direct = firstText(source.requestNo, source.displayNo, source.displayLabel);
  if (direct && !hasUuidShape(direct)) return direct;

  const requestId = cleanOfficeText(source.requestId);
  if (!requestId) return null;
  return hasUuidShape(requestId) ? `#${requestId.slice(0, 8)}` : `#${requestId}`;
}

export function isInternalAiEstimateNote(value: unknown): boolean {
  const text = cleanOfficeText(value);
  if (!text || !text.startsWith("{") || !text.endsWith("}")) return false;
  return (
    /"source"\s*:\s*"foreman_ai_professional_estimate"/.test(text) ||
    (/"estimateId"\s*:/.test(text) && /"rowId"\s*:/.test(text))
  );
}

export function parseRequestContextFromNotes(notes: unknown[]): ParsedRequestContextNote {
  const context: ParsedRequestContextNote = { ...EMPTY_PARSED_CONTEXT };

  const put = (key: keyof ParsedRequestContextNote, value: unknown) => {
    const next = cleanOfficeText(value);
    if (!next || context[key]) return;
    context[key] = next;
  };

  for (const rawNote of notes) {
    const raw = String(rawNote ?? "").trim();
    if (!raw || isInternalAiEstimateNote(raw)) continue;
    const parts = raw
      .split(/[\n;]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const match = part.match(/^([^:]+)\s*:\s*(.+)$/);
      if (!match) continue;
      const key = normalizeKey(match[1]);
      const value = match[2];

      if (key.includes("объект") || key === "object") put("object", value);
      else if (key.includes("этаж") || key.includes("уров") || key === "floor" || key === "level")
        put("level", value);
      else if (key.includes("систем") || key.includes("раздел") || key === "system")
        put("system", value);
      else if (
        key.includes("зона") ||
        key.includes("деталь") ||
        key.includes("помещ") ||
        (key.includes("участок") && !key.includes("корпус")) ||
        key === "zone"
      )
        put("zone", value);
      else if (key.includes("локац") || key === "location") {
        const legacyParts = cleanOfficeText(value)
          .split("/")
          .map(cleanOfficeText)
          .filter(Boolean);
        if (legacyParts.length >= 2) {
          put("level", legacyParts[0]);
          put("system", legacyParts[1]);
          put("zone", legacyParts[2]);
        } else {
          put("location", value);
        }
      } else if (key.includes("корпус") || key === "building")
        put("building", value);
      else if (key.includes("подряд")) put("contractor", value);
      else if (key.includes("телефон") || key.includes("тел.")) put("phone", value);
      else if (key.includes("объем") || key.includes("объём")) put("volume", value);
    }
  }

  return context;
}

const contextLineLabelPattern =
  /^(объект|этаж(?:\s*\/?\s*уровень)?|уровень|система(?:\s*\/?\s*раздел)?|раздел|зона(?:\s*\/?\s*участок)?|участок|корпус|локация|подрядчик|телефон|тел\.|объ[её]м)\s*:/i;

export function stripRequestContextFromNote(raw: unknown): string {
  const source = String(raw ?? "").trim();
  if (!source || isInternalAiEstimateNote(source)) return "";

  return source
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter((line) => line && !contextLineLabelPattern.test(line))
    .join("\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatOfficeDate(value: unknown, locale = "ru-RU"): string {
  const raw = cleanOfficeText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(locale);
  return raw;
}

export function formatOfficeDateTime(value: unknown, locale = "ru-RU"): string {
  const raw = cleanOfficeText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toLocaleString(locale);
  return raw;
}

export function formatOfficeStatusLabel(raw?: unknown): string {
  const original = cleanOfficeText(raw);
  const normalized = normalizeKey(original);
  if (!normalized) return "Не указан";
  if (normalized === "draft" || normalized === "черновик") return "Черновик";
  if (normalized === "approved" || normalized === "утверждено" || normalized === "утверждена")
    return "Утверждена";
  if (normalized === "pending" || normalized === "submitted" || normalized.includes("на утверж"))
    return "На утверждении";
  if (normalized === "procurement_ready" || normalized.includes("закуп")) return "К закупке";
  if (normalized === "rejected" || normalized === "cancelled" || normalized === "canceled" || normalized.includes("отклон"))
    return "Отклонена";
  return original;
}

export function formatOfficeQuantity(value: unknown, locale = "ru-RU"): string {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(locale, { maximumFractionDigits: 3 })
    : cleanOfficeText(value);
}

export function buildRequestContextView(
  source: RequestContextSource,
  noteContext: Partial<ParsedRequestContextNote> | null = null,
): RequestContextView {
  const levelCode = cleanOfficeText(source.levelCode);
  const systemCode = cleanOfficeText(source.systemCode);
  const zoneCode = cleanOfficeText(source.zoneCode);
  const locationFromCodes = levelCode;
  const siteAddress = cleanOfficeText(source.siteAddress);
  const objectFromSource = firstText(source.objectName, source.object);
  const friendlyObjectFromSource = firstFriendlyOfficeText(
    source.objectName,
    source.object,
  );
  const objectName =
    friendlyObjectFromSource ||
    noteContext?.object ||
    siteAddress ||
    objectFromSource ||
    null;
  const locationLabel =
    firstText(source.locationLabel, noteContext?.location, locationFromCodes, objectFromSource ? siteAddress : null) ||
    null;

  return {
    requestId: cleanOfficeText(source.requestId),
    requestNo: formatRequestNo(source),
    objectName,
    buildingName: firstText(source.buildingName, noteContext?.building),
    floorLabel: firstText(source.floorLabel, source.levelLabel, noteContext?.level, levelCode),
    systemLabel: firstText(source.systemLabel, noteContext?.system, systemCode),
    zoneLabel: firstText(source.zoneLabel, noteContext?.zone, zoneCode),
    locationLabel,
    statusLabel: formatOfficeStatusLabel(source.status),
    createdAt: formatOfficeDateTime(source.createdAt),
    submittedAt: formatOfficeDateTime(source.submittedAt) || null,
    approvedAt: formatOfficeDateTime(source.approvedAt) || null,
    neededBy: formatOfficeDate(source.neededBy) || null,
  };
}

export function buildRequestContextLines(
  view: RequestContextView,
  options: { includeRequestNo?: boolean; includeDates?: boolean; maxLines?: number } = {},
): string[] {
  const includeRequestNo = options.includeRequestNo ?? true;
  const includeDates = options.includeDates ?? true;
  const hasKnownStatus = view.statusLabel && view.statusLabel !== "Не указан";
  const lines = [
    includeRequestNo && view.requestNo ? `Заявка ${view.requestNo}` : "",
    view.objectName ? `Объект: ${view.objectName}` : "",
    view.buildingName ? `Корпус / участок: ${view.buildingName}` : "",
    view.floorLabel ? `Этаж / уровень: ${view.floorLabel}` : "",
    view.systemLabel ? `Система / раздел: ${view.systemLabel}` : "",
    view.zoneLabel ? `Зона: ${view.zoneLabel}` : "",
    view.locationLabel ? `Локация: ${view.locationLabel}` : "",
    hasKnownStatus ? `Статус: ${view.statusLabel}` : "",
    includeDates && view.submittedAt ? `Дата подачи: ${view.submittedAt}` : "",
    includeDates && !view.submittedAt && view.createdAt ? `Дата создания: ${view.createdAt}` : "",
  ].filter(Boolean);

  return typeof options.maxLines === "number" && options.maxLines > 0
    ? lines.slice(0, options.maxLines)
    : lines;
}

export function buildRequestContextMetaFields(view: RequestContextView): { label: string; value: string }[] {
  const hasKnownStatus = view.statusLabel && view.statusLabel !== "Не указан";
  return [
    view.objectName ? { label: "Объект", value: view.objectName } : null,
    view.buildingName ? { label: "Корпус / участок", value: view.buildingName } : null,
    view.floorLabel ? { label: "Этаж / уровень", value: view.floorLabel } : null,
    view.systemLabel ? { label: "Система / раздел", value: view.systemLabel } : null,
    view.zoneLabel ? { label: "Зона", value: view.zoneLabel } : null,
    view.locationLabel ? { label: "Локация", value: view.locationLabel } : null,
    view.neededBy ? { label: "Нужно к", value: view.neededBy } : null,
    view.createdAt ? { label: "Дата создания", value: view.createdAt } : null,
    view.submittedAt ? { label: "Дата подачи", value: view.submittedAt } : null,
    view.approvedAt ? { label: "Дата утверждения", value: view.approvedAt } : null,
    hasKnownStatus ? { label: "Статус", value: view.statusLabel } : null,
  ].filter((field): field is { label: string; value: string } => !!field);
}

export function buildRequestLineItemView(source: RequestLineItemSource): RequestLineItemView {
  const itemKind = cleanOfficeText(source.itemKind);
  const fallback = itemKind.toLowerCase().includes("work")
    ? "Работа"
    : itemKind.toLowerCase().includes("service")
      ? "Услуга"
      : "Материал";
  const qtyValue = Number(String(source.qty ?? "").replace(",", "."));

  return {
    id: firstText(source.id),
    name: officeHumanLabel(firstText(source.nameHuman, source.name), fallback),
    qtyText: formatOfficeQuantity(source.qty),
    qtyValue: Number.isFinite(qtyValue) ? qtyValue : 0,
    uom: officeUomLabel(source.uom, ""),
    statusLabel: formatOfficeStatusLabel(source.status),
    note: stripRequestContextFromNote(source.note),
    appCode: firstText(source.appCode),
    rikCode: firstText(source.rikCode),
  };
}

export function buildProcurementRequestView(args: {
  context: RequestContextView;
  items: RequestLineItemSource[];
}): ProcurementRequestView {
  return {
    context: args.context,
    items: (args.items || []).map(buildRequestLineItemView),
  };
}
