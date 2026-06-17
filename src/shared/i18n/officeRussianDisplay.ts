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
