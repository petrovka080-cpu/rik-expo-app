export type DirectorReportScopeCode = "materials" | "discipline";
export type ForemanMaterialModalCode =
  | "catalog"
  | "estimate"
  | "draft"
  | "requestHistory"
  | "subcontractHistory"
  | "aiQuick";
export type BuyerBucketCode = "inbox" | "pending" | "approved" | "rejected" | "subcontracts";
export type AccountantInvoiceStatusCode = "K_PAY" | "PART" | "PAID" | "REWORK";

const UNKNOWN_CODE_PREFIX_RU = "Неизвестный код";
export const DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_LABEL =
  "Объекты по подтверждённым выдачам";
export const DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_EXPLANATION =
  "Счётчик построен по подтверждённым выдачам со склада за выбранный период.";
export const DIRECTOR_REPORTS_NO_WORK_NAME_EXPLANATION =
  "Вид работ не был указан при подтверждённой выдаче.";

export function unknownOfficeCodeLabel(code: unknown): string {
  const normalized = String(code ?? "").trim();
  return normalized ? `${UNKNOWN_CODE_PREFIX_RU}: ${normalized}` : UNKNOWN_CODE_PREFIX_RU;
}

export function officeUomLabel(uom: unknown, emptyLabel = "—"): string {
  const raw = String(uom ?? "").trim();
  if (!raw) return emptyLabel;

  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/[._-]/g, "")
    .replace("²", "2")
    .replace("³", "3")
    .toLowerCase();

  if (normalized === "m" || normalized === "meter" || normalized === "meters") return "м";
  if (normalized === "m2" || normalized === "sqm" || normalized === "squaremeter" || normalized === "squaremeters" || normalized === "квм") return "м²";
  if (normalized === "m3" || normalized === "cum" || normalized === "cubicmeter" || normalized === "cubicmeters" || normalized === "кубм") return "м³";
  if (normalized === "pcs" || normalized === "pc" || normalized === "piece" || normalized === "pieces" || normalized === "шт") return "шт";
  if (normalized === "set" || normalized === "sets" || normalized === "комплект" || normalized === "компл") return "компл.";
  if (normalized === "shift" || normalized === "shifts" || normalized === "смена") return "смена";
  if (normalized === "trip" || normalized === "trips" || normalized === "рейс") return "рейс";
  if (normalized === "kg" || normalized === "kgs" || normalized === "кг") return "кг";
  if (normalized === "t" || normalized === "ton" || normalized === "tons" || normalized === "т") return "т";
  if (normalized === "l" || normalized === "liter" || normalized === "liters" || normalized === "л") return "л";
  if (normalized === "linearm" || normalized === "linm" || normalized === "lm" || normalized === "погм") return "пог. м";
  if (normalized === "zone" || normalized === "zones" || normalized === "зона") return "зона";
  if (normalized === "circuit" || normalized === "circuits" || normalized === "контур") return "контур";
  if (normalized === "hour" || normalized === "hours" || normalized === "h" || normalized === "ч") return "ч";
  if (normalized === "day" || normalized === "days" || normalized === "дн") return "дн.";
  if (normalized === "roll" || normalized === "rolls" || normalized === "рулон") return "рулон";
  if (normalized === "pack" || normalized === "packs" || normalized === "упак") return "упак.";

  return raw;
}

export function isOfficeTechnicalCode(value: unknown): boolean {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return /^(MAT|TOOL|KIT|WRK|WORK|SRV|SERV|CAT|RIK)-[A-Z0-9._/-]+$/i.test(text);
}

export function officeHumanLabel(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  if (!text || isOfficeTechnicalCode(text)) return fallback;
  return text;
}

const DIRECTOR_REPORT_SCOPE_LABELS: Record<DirectorReportScopeCode, string> = {
  materials: "Материалы",
  discipline: "Работы",
};

const FOREMAN_MATERIAL_MODAL_LABELS: Record<ForemanMaterialModalCode, string> = {
  catalog: "Каталог",
  estimate: "Смета",
  draft: "Черновик",
  requestHistory: "История заявок",
  subcontractHistory: "История подрядов",
  aiQuick: "AI заявка",
};

const BUYER_BUCKET_LABELS: Record<BuyerBucketCode, string> = {
  inbox: "Вход",
  pending: "Контроль",
  approved: "Готово",
  rejected: "Правки",
  subcontracts: "Подряды",
};

const ACCOUNTANT_INVOICE_STATUS_LABELS: Record<AccountantInvoiceStatusCode, string> = {
  K_PAY: "К оплате",
  PART: "Частично оплачено",
  PAID: "Оплачено",
  REWORK: "На доработке",
};

export function directorReportScopeLabel(code: DirectorReportScopeCode | string | null | undefined): string {
  return DIRECTOR_REPORT_SCOPE_LABELS[code as DirectorReportScopeCode] ?? unknownOfficeCodeLabel(code);
}

export function foremanMaterialModalLabel(code: ForemanMaterialModalCode | string | null | undefined): string {
  return FOREMAN_MATERIAL_MODAL_LABELS[code as ForemanMaterialModalCode] ?? unknownOfficeCodeLabel(code);
}

export function buyerBucketLabel(code: BuyerBucketCode | string | null | undefined): string {
  return BUYER_BUCKET_LABELS[code as BuyerBucketCode] ?? unknownOfficeCodeLabel(code);
}

export function accountantInvoiceStatusLabel(
  code: AccountantInvoiceStatusCode | string | null | undefined,
): string {
  return ACCOUNTANT_INVOICE_STATUS_LABELS[code as AccountantInvoiceStatusCode] ?? unknownOfficeCodeLabel(code);
}
