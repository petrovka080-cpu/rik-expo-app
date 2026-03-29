import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type {
  DirectorFinanceMetaV3,
  DirectorFinancePanelScope,
  DirectorFinancePanelScopeV2,
  DirectorFinancePanelScopeV3,
  DirectorFinanceRowV2,
  DirectorFinanceStatus,
  DirectorFinanceSummaryV2,
  DirectorFinanceSummaryV2Supplier,
  DirectorFinanceSummaryV3,
  DirectorFinanceSupplierRowV3,
  FinKindSupplierRow,
  FinRep,
  FinSpendRow,
  FinSpendSummaryRow,
  FinSupplierDebt,
  FinanceRow,
  FinanceSourceRow,
} from "./director.finance.types";

export const DASH = "\u2014";
export const FINANCE_KIND_FALLBACK = "\u0414\u0440\u0443\u0433\u043e\u0435";

const CP1251_EXTRA_BYTES = new Map<number, number>([
  [0x0401, 0xa8], [0x0402, 0x80], [0x0403, 0x81], [0x0404, 0xaa], [0x0405, 0xbd], [0x0406, 0xb2],
  [0x0407, 0xaf], [0x0408, 0xa3], [0x0409, 0x8a], [0x040a, 0x8c], [0x040b, 0x8e], [0x040c, 0x8d],
  [0x040e, 0xa1], [0x040f, 0x8f], [0x0451, 0xb8], [0x0452, 0x90], [0x0453, 0x83], [0x0454, 0xba],
  [0x0455, 0xbe], [0x0456, 0xb3], [0x0457, 0xbf], [0x0458, 0xbc], [0x0459, 0x9a], [0x045a, 0x9c],
  [0x045b, 0x9e], [0x045c, 0x9d], [0x045e, 0xa2], [0x045f, 0x9f], [0x0490, 0xa5], [0x0491, 0xb4],
  [0x00a0, 0xa0], [0x00a4, 0xa4], [0x00a6, 0xa6], [0x00a7, 0xa7], [0x00a9, 0xa9], [0x00ab, 0xab],
  [0x00ac, 0xac], [0x00ad, 0xad], [0x00ae, 0xae], [0x00b0, 0xb0], [0x00b1, 0xb1], [0x00b5, 0xb5],
  [0x00b6, 0xb6], [0x00b7, 0xb7], [0x00bb, 0xbb], [0x2013, 0x96], [0x2014, 0x97], [0x2018, 0x91],
  [0x2019, 0x92], [0x201a, 0x82], [0x201c, 0x93], [0x201d, 0x94], [0x201e, 0x84], [0x2020, 0x86],
  [0x2021, 0x87], [0x2022, 0x95], [0x2026, 0x85], [0x2030, 0x89], [0x2039, 0x8b], [0x203a, 0x9b],
  [0x20ac, 0x88], [0x2116, 0xb9], [0x2122, 0x99],
]);

const FINANCE_MOJIBAKE_PATTERN_SET = [
  /\u0420[\u0403\u201a\u201e\u2020\u2021\u20ac\u2030\u0409\u040a\u040b\u040f\u0452\u201c\u201d\u2014\u2122\u0459\u045a\u045b\u045f\u040e\u045e\u0400\u0402\u00a6\u00a7\u0403\u00a9\u0404\u00ab\u00ac\u00ae\u0407\u00b0\u00b1\u0406\u2013\u0451\u00b5\u00b6\u00b7\u2018\u2116\u00bb]/,
  /\u0421[\u0403\u201a\u201e\u2020\u2021\u20ac\u2030\u0409\u040a\u040b\u040f\u0452\u201c\u201d\u2014\u2122\u0459\u045a\u045b\u045f\u040e\u045e\u0400\u0402\u00a6\u00a7\u0403\u00a9\u0404\u00ab\u00ac\u00ae\u0407\u00b0\u00b1\u0406\u2013\u0451\u00b5\u00b6\u00b7\u2018\u2116\u00bb]/,
  /(?:\u0420\u0406\u0420\u201a\u00a6|\u0420\u0406\u0420\u201a\u201d|\u0420\u0406\u0420\u201a\u201c|\u0420\u0406\u201e\u2013|\u0420\u2019\u00b7|\u0420\u00a0\u0420\u2020\u0420\u201a|\u0420\u00a0\u0420\u2020\u0420\u0406\u0420\u201a\u201c)/,
] as const;

const FINANCE_KIND_ORDER = [
  "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  "\u0420\u0430\u0431\u043e\u0442\u044b",
  "\u0423\u0441\u043b\u0443\u0433\u0438",
  FINANCE_KIND_FALLBACK,
];

const financeDecodeFailureSamples = new Set<string>();
const MAX_FINANCE_DECODE_FAILURE_SAMPLES = 20;

const encodeCp1251Byte = (char: string): number | null => {
  const code = char.codePointAt(0);
  if (code == null) return null;
  if (code <= 0x7f) return code;
  if (code >= 0x0410 && code <= 0x042f) return 0xc0 + (code - 0x0410);
  if (code >= 0x0430 && code <= 0x044f) return 0xe0 + (code - 0x0430);
  return CP1251_EXTRA_BYTES.get(code) ?? null;
};

const recordDirectorFinanceFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "director",
    surface: "finance",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "director_finance_fallback"),
    extra: {
      module: "director.finance",
      route: "/director",
      role: "director",
      owner: "finance_text_decoder",
      action: event,
      severity: "error",
      ...extra,
    },
  });

const isProbablyFinanceMojibake = (value: string): boolean => {
  if (!value) return false;
  return FINANCE_MOJIBAKE_PATTERN_SET.some((pattern) => pattern.test(value));
};

const recordDirectorFinanceDecodeFailureOnce = (value: string, error: unknown) => {
  const sample = value.slice(0, 120);
  if (!sample || financeDecodeFailureSamples.has(sample)) return;
  if (financeDecodeFailureSamples.size >= MAX_FINANCE_DECODE_FAILURE_SAMPLES) return;
  financeDecodeFailureSamples.add(sample);
  recordDirectorFinanceFallback("finance_text_decode_failed", error, {
    fallbackUsed: "original_value_kept",
    valueLength: value.length,
    valueSample: sample,
  });
};

const decodeFinanceMojibake = (value: string): string => {
  if (!value || !isProbablyFinanceMojibake(value) || typeof TextDecoder === "undefined") {
    return value;
  }

  const bytes: number[] = [];
  for (const char of value) {
    const byte = encodeCp1251Byte(char);
    if (byte == null) return value;
    bytes.push(byte);
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes)).trim();
    if (!decoded) return value;
    if (isProbablyFinanceMojibake(decoded) && decoded !== value) return value;
    return decoded;
  } catch (error) {
    recordDirectorFinanceDecodeFailureOnce(value, error);
    return value;
  }
};

export const financeText = (value: unknown): string =>
  decodeFinanceMojibake(String(value ?? "").trim());

export const financeTextOrFallback = (value: unknown, fallback: string): string =>
  financeText(value) || fallback;

export const optionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const numberValue = nnum(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const numericSourceValue = (value: unknown): number | string | null => {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value);
};

export const nnum = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");

  const parts = normalized.split(".");
  const collapsed = parts.length <= 2 ? normalized : `${parts[0]}.${parts.slice(1).join("")}`;
  const parsed = Number(collapsed);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const money = (value: unknown): string => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "0";
  return Math.round(numberValue).toLocaleString("ru-RU");
};

export const mid = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const date = new Date(String(value));
  const ts = date.getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

export const parseMid = (value: unknown): number => mid(value);

export const addDaysIso = (iso: string, days: number) => {
  const base = String(iso ?? "").slice(0, 10);
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return base;
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

export const pickIso10 = (...values: unknown[]) => {
  for (const value of values) {
    const text = financeText(value);
    if (!text || text === DASH) continue;
    return text.slice(0, 10);
  }
  return null;
};

export const pickApprovedIso = (row: FinanceSourceRow) =>
  pickIso10(
    row.approvedAtIso,
    row.director_approved_at,
    row.approved_at,
    row.approvedAt,
    row.approved_at_iso,
  );

export const pickInvoiceIso = (row: FinanceSourceRow) =>
  pickIso10(
    row.invoiceDate,
    row.invoice_date,
    row.invoiceIso,
    row.invoice_at,
    row.created_at,
    row.raw?.created_at,
  );

export const pickFinanceAmount = (row: FinanceSourceRow) =>
  nnum(row.amount ?? row.invoice_amount ?? row.invoiceAmount ?? row.approved_amount ?? 0);

export const pickFinancePaid = (row: FinanceSourceRow) =>
  nnum(row.paidAmount ?? row.total_paid ?? row.totalPaid ?? row.paid_amount ?? 0);

export const asFinanceRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asFinanceSourceRow = (value: unknown): FinanceSourceRow => {
  if (!value || typeof value !== "object") return {};
  return value as FinanceSourceRow;
};

const normalizeFinanceSource = (value: unknown): FinanceSourceRow => {
  const row = asFinanceSourceRow(value);
  const nested = row.row ?? row.list_accountant_inbox_fact ?? row.data;
  return nested && typeof nested === "object" ? asFinanceSourceRow(nested) : row;
};

export const mapToFinanceRow = (value: unknown): FinanceRow => {
  const source = normalizeFinanceSource(value);
  const supplier = financeTextOrFallback(source.supplier, DASH);
  const proposalId = financeText(source.proposal_id ?? source.proposalId ?? source.id) || null;
  const invoiceNumber = financeText(source.invoice_number ?? source.invoiceNumber) || null;
  const amount = nnum(source.invoice_amount ?? source.amount ?? 0);
  const paidAmount = nnum(source.total_paid ?? source.totalPaid ?? source.paid_amount ?? 0);
  const invoiceDate = pickIso10(
    source.invoice_date,
    source.invoiceDate,
    source.invoice_at,
    source.invoice_created_at,
    source.created_at,
  );
  const approvedAtIso = pickIso10(
    source.director_approved_at,
    source.approved_at,
    source.approvedAtIso,
    source.approvedAt,
    source.sent_to_accountant_at,
    source.sentToAccountantAt,
    source.raw?.sent_to_accountant_at,
    source.raw?.sentToAccountantAt,
  );
  const dueDate = pickIso10(source.due_date, source.dueDate, source.due_at);
  const paidFirstAt = pickIso10(
    source.paid_first_at,
    source.paidFirstAt,
    source.raw?.paid_first_at,
    source.raw?.paidFirstAt,
  );
  const paidLastAt = pickIso10(
    source.paid_last_at,
    source.paidLastAt,
    source.raw?.paid_last_at,
    source.raw?.paidLastAt,
  );
  const proposalNo = financeText(source.proposal_no ?? source.proposalNo ?? source.pretty) || null;

  return {
    id: proposalId || `${supplier}:${invoiceNumber || "no-inv"}`,
    supplier,
    amount,
    paidAmount,
    currency: financeText(source.invoice_currency ?? source.currency) || "KGS",
    invoiceNumber,
    invoiceDate,
    approvedAtIso,
    dueDate,
    paid_first_at: paidFirstAt,
    paid_last_at: paidLastAt,
    proposalId,
    proposal_id: proposalId,
    proposal_no: proposalNo,
    pretty: proposalNo,
    raw: source,
  };
};

export const normalizeFinSpendRow = (value: unknown): FinSpendRow => {
  const row = asFinanceRecord(value);
  return {
    supplier: financeText(row.supplier) || null,
    kind_code: financeText(row.kind_code) || null,
    kind_name: financeText(row.kind_name) || null,
    proposal_id: financeText(row.proposal_id) || null,
    proposal_no: financeText(row.proposal_no) || null,
    pretty: financeText(row.pretty) || null,
    director_approved_at: financeText(row.director_approved_at) || null,
    approved_at: financeText(row.approved_at) || null,
    approvedAtIso: financeText(row.approvedAtIso) || null,
    approved_alloc: numericSourceValue(row.approved_alloc),
    paid_alloc: numericSourceValue(row.paid_alloc),
    paid_alloc_cap: numericSourceValue(row.paid_alloc_cap),
    overpay_alloc: numericSourceValue(row.overpay_alloc),
  };
};

export const normalizeFinSpendRows = (values: unknown): FinSpendRow[] =>
  Array.isArray(values) ? values.map(normalizeFinSpendRow) : [];

const normalizeFinanceSummarySupplier = (value: unknown): FinSupplierDebt => {
  const row = asFinanceRecord(value);
  return {
    supplier: financeTextOrFallback(row.supplier, DASH),
    count: nnum(row.count),
    approved: nnum(row.approved),
    paid: nnum(row.paid),
    toPay: nnum(row.toPay),
    overdueCount: nnum(row.overdueCount),
    criticalCount: nnum(row.criticalCount),
  };
};

export const adaptDirectorFinanceSummaryPayload = (value: unknown): FinRep => {
  const payload = asFinanceRecord(value);
  const summary = asFinanceRecord(payload.summary);
  const report = asFinanceRecord(payload.report);
  const suppliers = Array.isArray(report.suppliers)
    ? report.suppliers.map(normalizeFinanceSummarySupplier)
    : [];

  return {
    summary: {
      approved: nnum(summary.approved),
      paid: nnum(summary.paid),
      partialPaid: nnum(summary.partialPaid),
      toPay: nnum(summary.toPay),
      overdueCount: nnum(summary.overdueCount),
      overdueAmount: nnum(summary.overdueAmount),
      criticalCount: nnum(summary.criticalCount),
      criticalAmount: nnum(summary.criticalAmount),
      partialCount: nnum(summary.partialCount),
      debtCount: nnum(summary.debtCount),
    },
    report: { suppliers },
  };
};

const normalizeDirectorFinanceStatus = (value: unknown): DirectorFinanceStatus => {
  const status = financeText(value).toLowerCase();
  if (status === "paid" || status === "overdue" || status === "approved") return status;
  return "pending";
};

const normalizeDirectorFinanceRowV2 = (value: unknown): DirectorFinanceRowV2 => {
  const row = asFinanceRecord(value);
  return {
    requestId: financeText(row.requestId) || null,
    objectId: financeText(row.objectId) || null,
    supplierId: financeTextOrFallback(row.supplierId, DASH),
    supplierName: financeTextOrFallback(row.supplierName, DASH),
    proposalId: financeText(row.proposalId) || null,
    invoiceNumber: financeText(row.invoiceNumber) || null,
    amountTotal: nnum(row.amountTotal),
    amountPaid: nnum(row.amountPaid),
    amountDebt: nnum(row.amountDebt),
    dueDate: pickIso10(row.dueDate),
    isOverdue: row.isOverdue === true,
    overdueDays: optionalNumber(row.overdueDays) ?? null,
    status: normalizeDirectorFinanceStatus(row.status),
  };
};

const normalizeDirectorFinanceSummaryV2Supplier = (
  value: unknown,
): DirectorFinanceSummaryV2Supplier => {
  const row = asFinanceRecord(value);
  return {
    supplierId: financeTextOrFallback(row.supplier_id ?? row.supplierId, DASH),
    supplierName: financeTextOrFallback(row.supplier_name ?? row.supplierName, DASH),
    debt: nnum(row.debt),
  };
};

export const adaptDirectorFinanceSummaryV2Payload = (value: unknown): DirectorFinanceSummaryV2 => {
  const payload = asFinanceRecord(value);
  const bySupplierPayload = payload.by_supplier ?? payload.bySupplier;
  return {
    totalAmount: nnum(payload.total_amount ?? payload.totalAmount),
    totalPaid: nnum(payload.total_paid ?? payload.totalPaid),
    totalDebt: nnum(payload.total_debt ?? payload.totalDebt),
    overdueAmount: nnum(payload.overdue_amount ?? payload.overdueAmount),
    bySupplier: Array.isArray(bySupplierPayload)
      ? bySupplierPayload.map(normalizeDirectorFinanceSummaryV2Supplier)
      : [],
  };
};

const adaptDirectorFinanceSummaryV3Payload = (value: unknown): DirectorFinanceSummaryV3 => {
  const payload = asFinanceRecord(value);
  return {
    totalPayable: nnum(payload.totalPayable ?? payload.total_payable),
    totalApproved: nnum(
      payload.totalApproved ??
        payload.total_approved ??
        payload.totalPayable ??
        payload.total_payable,
    ),
    totalPaid: nnum(payload.totalPaid ?? payload.total_paid),
    totalDebt: nnum(payload.totalDebt ?? payload.total_debt),
    totalOverpayment: nnum(payload.totalOverpayment ?? payload.total_overpayment),
    overdueAmount: nnum(payload.overdueAmount ?? payload.overdue_amount),
    criticalAmount: nnum(payload.criticalAmount ?? payload.critical_amount),
    overdueCount: nnum(payload.overdueCount ?? payload.overdue_count),
    criticalCount: nnum(payload.criticalCount ?? payload.critical_count),
    debtCount: nnum(payload.debtCount ?? payload.debt_count),
    partialCount: nnum(payload.partialCount ?? payload.partial_count),
    partialPaid: nnum(payload.partialPaid ?? payload.partial_paid),
    rowCount: nnum(payload.rowCount ?? payload.row_count),
    supplierRowCount: nnum(payload.supplierRowCount ?? payload.supplier_row_count),
  };
};

const normalizeDirectorFinanceSupplierRowV3 = (
  value: unknown,
): DirectorFinanceSupplierRowV3 => {
  const row = asFinanceRecord(value);
  return {
    id: financeTextOrFallback(row.id, DASH),
    supplierId: financeTextOrFallback(row.supplierId ?? row.supplier_id, DASH),
    supplierName: financeTextOrFallback(row.supplierName ?? row.supplier_name, DASH),
    payable: nnum(row.payable),
    paid: nnum(row.paid),
    debt: nnum(row.debt),
    overpayment: nnum(row.overpayment),
    overdueAmount: nnum(row.overdueAmount ?? row.overdue_amount),
    criticalAmount: nnum(row.criticalAmount ?? row.critical_amount),
    invoiceCount: nnum(row.invoiceCount ?? row.invoice_count),
    debtCount: nnum(row.debtCount ?? row.debt_count),
    overdueCount: nnum(row.overdueCount ?? row.overdue_count),
    criticalCount: nnum(row.criticalCount ?? row.critical_count),
  };
};

const buildDirectorFinanceCanonicalSummary = (
  summary: DirectorFinanceSummaryV3,
): FinRep["summary"] => ({
  approved: nnum(summary.totalApproved),
  paid: nnum(summary.totalPaid),
  partialPaid: nnum(summary.partialPaid),
  toPay: nnum(summary.totalDebt),
  overdueCount: nnum(summary.overdueCount),
  overdueAmount: nnum(summary.overdueAmount),
  criticalCount: nnum(summary.criticalCount),
  criticalAmount: nnum(summary.criticalAmount),
  partialCount: nnum(summary.partialCount),
  debtCount: nnum(summary.debtCount),
});

const buildDirectorFinanceCanonicalSuppliers = (
  supplierRows: DirectorFinanceSupplierRowV3[],
): FinSupplierDebt[] =>
  [...supplierRows]
    .map((row) => ({
      supplier: financeTextOrFallback(row.supplierName, DASH),
      count: nnum(row.invoiceCount),
      approved: nnum(row.payable),
      paid: nnum(row.paid),
      toPay: nnum(row.debt),
      overdueCount: nnum(row.overdueCount),
      criticalCount: nnum(row.criticalCount),
    }))
    .sort((left, right) => right.toPay - left.toPay);

const buildDirectorFinanceCanonicalRep = (
  summary: DirectorFinanceSummaryV3,
  supplierRows: DirectorFinanceSupplierRowV3[],
): FinRep => ({
  summary: buildDirectorFinanceCanonicalSummary(summary),
  report: {
    suppliers: buildDirectorFinanceCanonicalSuppliers(supplierRows),
  },
});

const adaptDirectorFinanceMetaV3Payload = (value: unknown): DirectorFinanceMetaV3 => {
  const payload = asFinanceRecord(value);
  const filters = asFinanceRecord(payload.filtersEcho ?? payload.filters_echo);
  const generatedAt = financeText(payload.generatedAt ?? payload.generated_at) || null;
  return {
    owner: financeText(payload.owner) || "backend",
    generatedAt,
    sourceVersion:
      financeText(payload.sourceVersion ?? payload.source_version) ||
      "director_finance_panel_scope_v3",
    payloadShapeVersion:
      financeText(payload.payloadShapeVersion ?? payload.payload_shape_version) || "v3",
    filtersEcho: {
      objectId: financeText(filters.objectId ?? filters.object_id) || null,
      dateFrom: pickIso10(filters.dateFrom, filters.date_from),
      dateTo: pickIso10(filters.dateTo, filters.date_to),
      dueDays: nnum(filters.dueDays ?? filters.due_days),
      criticalDays: nnum(filters.criticalDays ?? filters.critical_days),
    },
  };
};

const normalizeFinKindSupplierRow = (value: unknown): FinKindSupplierRow => {
  const row = asFinanceRecord(value);
  return {
    supplier: financeTextOrFallback(row.supplier, DASH),
    approved: nnum(row.approved),
    paid: nnum(row.paid),
    overpay: nnum(row.overpay),
    count: nnum(row.count),
  };
};

const normalizeFinSpendSummaryRow = (value: unknown): FinSpendSummaryRow => {
  const row = asFinanceRecord(value);
  return {
    kind: financeTextOrFallback(row.kind, FINANCE_KIND_FALLBACK),
    approved: nnum(row.approved),
    paid: nnum(row.paid),
    overpay: nnum(row.overpay),
    toPay: nnum(row.toPay),
    suppliers: Array.isArray(row.suppliers) ? row.suppliers.map(normalizeFinKindSupplierRow) : [],
  };
};

export const adaptDirectorFinancePanelScopePayload = (
  value: unknown,
): DirectorFinancePanelScope => {
  const payload = asFinanceRecord(value);
  const summaryPayload = adaptDirectorFinanceSummaryPayload({
    summary: payload.summary,
    report: payload.report,
  });
  const spend = asFinanceRecord(payload.spend);
  const header = asFinanceRecord(spend.header);
  return {
    ...summaryPayload,
    spend: {
      header: {
        approved: nnum(header.approved),
        paid: nnum(header.paid),
        toPay: nnum(header.toPay),
        overpay: nnum(header.overpay),
      },
      kindRows: Array.isArray(spend.kinds) ? spend.kinds.map(normalizeFinSpendSummaryRow) : [],
      overpaySuppliers: Array.isArray(spend.overpaySuppliers)
        ? spend.overpaySuppliers.map(normalizeFinKindSupplierRow)
        : [],
    },
  };
};

export const adaptDirectorFinancePanelScopeV2Payload = (
  value: unknown,
): DirectorFinancePanelScopeV2 => {
  const payload = asFinanceRecord(value);
  const pagination = asFinanceRecord(payload.pagination);
  return {
    ...adaptDirectorFinancePanelScopePayload(payload),
    rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeDirectorFinanceRowV2) : [],
    pagination: {
      limit: nnum(pagination.limit),
      offset: nnum(pagination.offset),
      total: nnum(pagination.total),
    },
    summaryV2: adaptDirectorFinanceSummaryV2Payload(payload.summary_v2 ?? payload.summaryV2),
  };
};

export const adaptDirectorFinancePanelScopeV3Payload = (
  value: unknown,
): DirectorFinancePanelScopeV3 => {
  const payload = asFinanceRecord(value);
  const pagination = asFinanceRecord(payload.pagination);
  const supplierRowsPayload = payload.supplierRows ?? payload.supplier_rows;
  const legacyPanelScope = adaptDirectorFinancePanelScopePayload(payload);
  const summaryV3 = adaptDirectorFinanceSummaryV3Payload(payload.summary_v3 ?? payload.summaryV3);
  const supplierRows = Array.isArray(supplierRowsPayload)
    ? supplierRowsPayload.map(normalizeDirectorFinanceSupplierRowV3)
    : [];
  const hasCanonicalSummary =
    summaryV3.supplierRowCount > 0 ||
    summaryV3.rowCount > 0 ||
    summaryV3.totalApproved > 0 ||
    summaryV3.totalPaid > 0 ||
    summaryV3.totalDebt > 0 ||
    summaryV3.totalOverpayment > 0 ||
    supplierRows.length > 0;
  const displayFinRep = hasCanonicalSummary
    ? buildDirectorFinanceCanonicalRep(summaryV3, supplierRows)
    : legacyPanelScope;
  return {
    ...legacyPanelScope,
    summary: displayFinRep.summary,
    report: displayFinRep.report,
    rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeDirectorFinanceRowV2) : [],
    pagination: {
      limit: nnum(pagination.limit),
      offset: nnum(pagination.offset),
      total: nnum(pagination.total),
    },
    summaryV2: adaptDirectorFinanceSummaryV2Payload(payload.summary_v2 ?? payload.summaryV2),
    summaryV3,
    supplierRows,
    meta: adaptDirectorFinanceMetaV3Payload(payload.meta),
    displayMode: hasCanonicalSummary ? "canonical_v3" : "fallback_legacy",
  };
};

export const FINANCE_KIND_ORDER_VALUES = [...FINANCE_KIND_ORDER];
