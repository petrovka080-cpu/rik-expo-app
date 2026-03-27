import { listAccountantInbox } from "./accountant";
import { supabase } from "../supabaseClient";
import {
  addDaysIso,
  clampIso,
  fmtDateOnly,
  formatArrowPeriodText,
  formatPaidRangeText,
  iso10,
  joinBulletParts,
  money,
  nnum,
  todayIso10,
} from "./pdf_director.format";
import {
  prepareDirectorProductionReportPdfModelShared,
  type DirectorProductionDiscipline,
  type DirectorProductionReportData,
} from "../pdf/directorProductionReport.shared";
import { prepareDirectorSubcontractReportPdfModelShared } from "../pdf/directorSubcontractReport.shared";
import { prepareDirectorSupplierSummaryPdfModelShared } from "../pdf/directorSupplierSummary.shared";
import type {
  FinanceRow,
  FinSpendRow,
} from "../../screens/director/director.finance";

export type DirectorSupplierSummaryPdfInput = {
  supplier: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  financeRows?: FinanceRow[] | null;
  spendRows?: FinSpendRow[] | null;
  onlyOverpay?: boolean;
};

export type DirectorManagementReportPdfInput = {
  periodFrom?: string | null;
  periodTo?: string | null;
  financeRows?: FinanceRow[] | null;
  spendRows?: FinSpendRow[] | null;
  topN?: number;
  dueDaysDefault?: number;
  criticalDays?: number;
};

export type DirectorProductionPdfInput = {
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  repData?: DirectorProductionReportData | null;
  repDiscipline?: DirectorProductionDiscipline | null;
  preferPriceStage?: "base" | "priced";
};

export type DirectorSubcontractPdfInput = {
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
};

export type DirectorFinancePreviewPdfModel = {
  rowsJson: string;
};

export type DirectorSupplierSummaryPdfModel = {
  supplier: string;
  periodText: string;
  kindFilter: string | null;
  totalApproved: number;
  totalPaid: number;
  totalRest: number;
  countAll: number;
  countUnpaid: number;
  countPartial: number;
  countPaid: number;
  kindRows: {
    kind: string;
    approved: number;
    paid: number;
    overpay: number;
  }[];
  detailRows: {
    title: string;
    amount: number;
    paid: number;
    rest: number;
    status: string;
    statusClassName: string;
    overpay: number;
    datesText: string;
  }[];
};

export type DirectorManagementReportPdfModel = {
  topN: number;
  periodText: string;
  totalApproved: number;
  totalPaid: number;
  totalDebt: number;
  overdueSum: number;
  criticalSum: number;
  totalOverpay: number;
  top3Text: string;
  unpaidCount: number;
  partialCount: number;
  paidCount: number;
  debtSupplierRows: {
    supplier: string;
    debt: number;
    overdue: number;
    critical: number;
    invoices: number;
    riskLabel: string;
    riskClassName: string;
    showRisk: boolean;
  }[];
  kindRows: {
    kind: string;
    approved: number;
    paid: number;
    overpay: number;
  }[];
  spendSupplierRows: {
    supplier: string;
    approved: number;
    paid: number;
    rest: number;
  }[];
  problemRows: {
    supplier: string;
    title: string;
    amount: number;
    paid: number;
    rest: number;
    riskLabel: string;
    riskClassName: string;
    datesText: string;
  }[];
};

export type DirectorProductionReportPdfModel = {
  companyName: string;
  generatedBy: string;
  periodText: string;
  objectName: string;
  generatedAt: string;
  worksRows: {
    workTypeName: string;
    totalPositions: number;
    reqPositions: number;
    freePositions: number;
    totalDocs: number;
    isWithoutWork: boolean;
  }[];
  rowsLimitedNote: string;
  objectRows: {
    obj: string;
    docs: number;
    positions: number;
    noReq: number;
    noWork: number;
  }[];
  materialRows: {
    title: string;
    qtyTotal: number;
    uom: string;
    docsCount: number;
    qtyWithoutRequest: number;
  }[];
  issuesTotal: number;
  itemsTotal: number;
  itemsNoRequest: number;
  withoutWork: number;
  issuesNoObject: number;
  issueCost: number;
  purchaseCost: number;
  ratioPct: number;
  problemRows: {
    problem: string;
    count: number;
    comment: string;
  }[];
};

export type DirectorSubcontractReportPdfModel = {
  companyName: string;
  generatedBy: string;
  periodText: string;
  objectText: string;
  generatedAt: string;
  totalRows: number;
  approvedCount: number;
  contractorCount: number;
  objectCount: number;
  sumApproved: number;
  noAmount: number;
  noWork: number;
  noObject: number;
  noContractor: number;
  contractorRows: {
    contractor: string;
    count: number;
    amount: number;
    objects: number;
    works: number;
  }[];
  objectRows: {
    objectName: string;
    count: number;
    amount: number;
    contractors: number;
    works: number;
  }[];
  approvedRows: {
    displayNo: string;
    contractor: string;
    objectName: string;
    workType: string;
    status: string;
    totalPrice: number;
    approvedAt: string;
  }[];
  workRows: {
    workType: string;
    count: number;
    amount: number;
    contractors: number;
  }[];
  pendingCount: number;
  rejectedCount: number;
};

type PdfRecord = Record<string, unknown>;

const asRecord = (value: unknown): PdfRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as PdfRecord)
    : {};

const getNestedRecord = (value: unknown, key: string): PdfRecord | null => {
  const record = asRecord(value);
  const nested = record[key];
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? (nested as PdfRecord)
    : null;
};

const pickString = (...values: readonly unknown[]): string => {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized && normalized !== "вЂ”") return normalized;
  }
  return "";
};

const readPdfRowLayers = (value: unknown) => {
  const record = asRecord(value);
  return {
    record,
    raw: getNestedRecord(record, "raw"),
    row: getNestedRecord(record, "row"),
    proposals: getNestedRecord(record, "proposals"),
  };
};

const pickIso10 = (...vals: readonly unknown[]) => {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (!s || s === "—") continue;
    return s.slice(0, 10);
  }
  return null;
};

const proposalPretty = (value: unknown) => {
  const { record, raw, row, proposals } = readPdfRowLayers(value);
  const src = row ?? raw ?? record;
  const proposalNo = pickString(
    src.proposal_no,
    src.proposalNo,
    src.pretty,
    proposals?.proposal_no,
  );

  if (proposalNo) return proposalNo;

  const proposalId = pickString(src.proposalId, src.proposal_id, src.id);
  return proposalId ? `PR-${proposalId.slice(0, 8)}` : "";
};

const kindNorm = (name: unknown) => {
  const kind = String(name ?? "").trim();
  if (!kind) return "Другое";
  if (kind === "Материалы" || kind === "Работы" || kind === "Услуги" || kind === "Другое") return kind;

  const lowered = kind.toLowerCase();
  if (lowered.includes("мат")) return "Материалы";
  if (lowered.includes("работ")) return "Работы";
  if (lowered.includes("услуг")) return "Услуги";
  return "Другое";
};

const topNWithOthers = <T extends Record<string, unknown>,>(
  rows: T[],
  n: number,
  sumFields: string[],
  makeOthers: (agg: Record<string, number> & { count: number }) => T,
): T[] => {
  const top = rows.slice(0, Math.max(0, n));
  const rest = rows.slice(Math.max(0, n));
  if (!rest.length) return top;

  const agg: Record<string, number> & { count: number } = { count: rest.length };
  for (const field of sumFields) agg[field] = 0;

  for (const row of rest) {
    for (const field of sumFields) {
      const value = Number(row[field] ?? 0);
      agg[field] += Number.isFinite(value) ? value : 0;
    }
  }

  return [...top, makeOthers(agg)];
};

/* legacy untyped pdf row readers
  String(r?.supplier ?? r?.raw?.supplier ?? r?.row?.supplier ?? "").trim() || "—";

const pickInvoiceNumber = (r: any) =>
  String(r?.invoiceNumber ?? r?.invoice_number ?? r?.invoiceNo ?? "").trim();

const pickApprovedIso = (r: any) =>
  pickIso10(
    r?.approvedAtIso,
    r?.director_approved_at,
    r?.approved_at,
    r?.raw?.director_approved_at,
    r?.raw?.approved_at,
    r?.row?.director_approved_at,
  );

const pickInvoiceIso = (r: any) =>
  pickIso10(
    r?.invoiceDate,
    r?.invoice_date,
    r?.invoice_at,
    r?.raw?.invoice_at,
    r?.raw?.created_at,
    r?.created_at,
  );

const pickDueIso = (r: any) =>
  pickIso10(
    r?.dueDate,
    r?.due_date,
    r?.raw?.due_at,
  );

const invoiceTitle = (r: any) => {
  const invoiceNo = pickInvoiceNumber(r);
  if (invoiceNo) return `Счёт №${invoiceNo}`;

  const pretty = proposalPretty(r);
  if (pretty) return `Предложение ${pretty}`;

  const proposalId = String(r?.proposalId ?? r?.proposal_id ?? r?.id ?? "").trim();
  return proposalId ? `Документ #${proposalId.slice(0, 8)}` : "Документ";
};

*/
const pickSupplier = (value: unknown) => {
  const { record, raw, row } = readPdfRowLayers(value);
  return pickString(record.supplier, raw?.supplier, row?.supplier) || "вЂ”";
};

const pickInvoiceNumber = (value: unknown) => {
  const { record } = readPdfRowLayers(value);
  return pickString(record.invoiceNumber, record.invoice_number, record.invoiceNo);
};

const pickApprovedIso = (value: unknown) => {
  const { record, raw, row } = readPdfRowLayers(value);
  return pickIso10(
    record.approvedAtIso,
    record.director_approved_at,
    record.approved_at,
    raw?.director_approved_at,
    raw?.approved_at,
    row?.director_approved_at,
  );
};

const pickInvoiceIso = (value: unknown) => {
  const { record, raw } = readPdfRowLayers(value);
  return pickIso10(
    record.invoiceDate,
    record.invoice_date,
    record.invoice_at,
    raw?.invoice_at,
    raw?.created_at,
    record.created_at,
  );
};

const pickDueIso = (value: unknown) => {
  const { record, raw } = readPdfRowLayers(value);
  return pickIso10(
    record.dueDate,
    record.due_date,
    raw?.due_at,
  );
};

const invoiceTitle = (value: unknown) => {
  const invoiceNo = pickInvoiceNumber(value);
  if (invoiceNo) return `РЎС‡С‘С‚ в„–${invoiceNo}`;

  const pretty = proposalPretty(value);
  if (pretty) return `РџСЂРµРґР»РѕР¶РµРЅРёРµ ${pretty}`;

  const { record } = readPdfRowLayers(value);
  const proposalId = pickString(record.proposalId, record.proposal_id, record.id);
  return proposalId ? `Р”РѕРєСѓРјРµРЅС‚ #${proposalId.slice(0, 8)}` : "Р”РѕРєСѓРјРµРЅС‚";
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const buildSupplierDatesText = (row: {
  approvedAt: string | null;
  paidFirstAt: string | null;
  paidLastAt: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
}) =>
  joinBulletParts([
    row.approvedAt ? `утв. ${fmtDateOnly(row.approvedAt)}` : "",
    formatPaidRangeText(row.paidFirstAt, row.paidLastAt),
    row.invoiceDate ? `счёт ${fmtDateOnly(row.invoiceDate)}` : "",
    row.dueDate ? `срок ${fmtDateOnly(row.dueDate)}` : "",
  ]) || "—";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
/* legacy untyped supplier pdf mapper
  row: any,
  overpayByProposal: Map<string, number>,
) => {
  const amount = nnum(row?.amount);
  const paid = nnum(row?.paidAmount);
  const rest = Math.max(amount - paid, 0);
  const status =
    amount <= 0 ? "прочее" : paid <= 0 ? "не оплачено" : rest <= 0 ? "оплачено" : "частично";
  const proposalId = String(row?.proposalId ?? row?.proposal_id ?? row?.id ?? "").trim();
  const overpay = proposalId ? (overpayByProposal.get(proposalId) ?? 0) : 0;

  return {
    title: String(row?.invoiceNumber ?? row?.invoice_number ?? "").trim()
      ? `Счёт №${String(row?.invoiceNumber ?? row?.invoice_number).trim()}`
      : proposalPretty(row)
        ? `Предложение ${proposalPretty(row)}`
        : "Счёт",
    invoiceDate: pickIso10(
      row?.invoiceDate,
      row?.invoice_date,
      row?.raw?.invoice_at,
      row?.raw?.invoice_created_at,
      row?.raw?.created_at,
    ),
    approvedAt: pickIso10(
      row?.director_approved_at,
      row?.approvedAtIso,
      row?.approved_at,
      row?.raw?.director_approved_at,
      row?.raw?.approved_at,
      row?.raw?.approvedAtIso,
      row?.created_at,
    ),
    dueDate: pickIso10(
      row?.dueDate,
      row?.due_date,
      row?.raw?.due_at,
    ),
    paidFirstAt: pickIso10(
      row?.paid_first_at,
      row?.raw?.paid_first_at,
    ),
    paidLastAt: pickIso10(
      row?.paid_last_at,
      row?.raw?.paid_last_at,
    ),
    amount,
    paid,
    rest,
    status,
    overpay,
  };
};

*/
const mapSupplierSummaryItem = (
  row: unknown,
  overpayByProposal: Map<string, number>,
) => {
  const { record, raw } = readPdfRowLayers(row);
  const amount = nnum(record.amount);
  const paid = nnum(record.paidAmount);
  const rest = Math.max(amount - paid, 0);
  const status =
    amount <= 0 ? "РїСЂРѕС‡РµРµ" : paid <= 0 ? "РЅРµ РѕРїР»Р°С‡РµРЅРѕ" : rest <= 0 ? "РѕРїР»Р°С‡РµРЅРѕ" : "С‡Р°СЃС‚РёС‡РЅРѕ";
  const proposalId = pickString(record.proposalId, record.proposal_id, record.id);
  const overpay = proposalId ? (overpayByProposal.get(proposalId) ?? 0) : 0;
  const invoiceNo = pickInvoiceNumber(row);
  const pretty = proposalPretty(row);

  return {
    title: invoiceNo
      ? `РЎС‡С‘С‚ в„–${invoiceNo}`
      : pretty
        ? `РџСЂРµРґР»РѕР¶РµРЅРёРµ ${pretty}`
        : "РЎС‡С‘С‚",
    invoiceDate: pickIso10(
      record.invoiceDate,
      record.invoice_date,
      raw?.invoice_at,
      raw?.invoice_created_at,
      raw?.created_at,
    ),
    approvedAt: pickIso10(
      record.director_approved_at,
      record.approvedAtIso,
      record.approved_at,
      raw?.director_approved_at,
      raw?.approved_at,
      raw?.approvedAtIso,
      record.created_at,
    ),
    dueDate: pickIso10(
      record.dueDate,
      record.due_date,
      raw?.due_at,
    ),
    paidFirstAt: pickIso10(
      record.paid_first_at,
      raw?.paid_first_at,
    ),
    paidLastAt: pickIso10(
      record.paid_last_at,
      raw?.paid_last_at,
    ),
    amount,
    paid,
    rest,
    status,
    overpay,
  };
};

export function prepareDirectorFinancePreviewPdfModel(rows: unknown[]): DirectorFinancePreviewPdfModel {
  return {
    rowsJson: JSON.stringify(rows ?? [], null, 2),
  };
}

export async function loadDirectorFinancePreviewPdfModel(): Promise<DirectorFinancePreviewPdfModel> {
  const rows = await listAccountantInbox();
  return prepareDirectorFinancePreviewPdfModel(rows ?? []);
}

export function prepareDirectorSupplierSummaryPdfModel(
  p: DirectorSupplierSummaryPdfInput,
): DirectorSupplierSummaryPdfModel {
  return prepareDirectorSupplierSummaryPdfModelShared(p);

  /*
  const supplier = String(p.supplier ?? "").trim() || "—";
  const financeRows = Array.isArray(p.financeRows) ? p.financeRows : [];
  const spendRows = Array.isArray(p.spendRows) ? p.spendRows : [];
  const onlyOverpay = !!p.onlyOverpay;
  const from = p.periodFrom ? String(p.periodFrom).slice(0, 10) : null;
  const to = p.periodTo ? String(p.periodTo).slice(0, 10) : null;

  const inPeriod = (iso: unknown) => {
    if (!from && !to) return true;
    const date = String(iso ?? "").slice(0, 10);
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  const spendForDetect = spendRows
    .filter((row) => String(row?.supplier ?? "").trim() === supplier)
    .filter((row) => inPeriod(row?.director_approved_at));

  const kindSet = new Set<string>(
    spendForDetect.map((row: any) => kindNorm(row?.kind_name ?? row?.kindName)).filter(Boolean),
  );
  const kindFilter = kindSet.size === 1 ? Array.from(kindSet)[0] : null;

  const spend = spendRows
    .filter((row) => String(row?.supplier ?? "").trim() === supplier)
    .filter((row) => inPeriod(row?.director_approved_at))
    .filter((row: any) => !kindFilter || kindNorm(row?.kind_name ?? row?.kindName) === kindFilter)
    .filter((row: any) => !onlyOverpay || nnum(row?.overpay_alloc) > 0);

  const overpayByProposal = new Map<string, number>();
  for (const row of spend) {
    const proposalId = String(row?.proposal_id ?? "").trim();
    if (!proposalId) continue;

    const overpay = nnum(row?.overpay_alloc);
    if (overpay > 0) {
      overpayByProposal.set(proposalId, (overpayByProposal.get(proposalId) ?? 0) + overpay);
    }
  }

  let totalApproved = 0;
  let totalPaid = 0;
  let totalRest = 0;
  let items: ReturnType<typeof mapSupplierSummaryItem>[] = [];

  if (kindFilter) {
    const spendByKind = spendRows
      .filter((row) => String(row?.supplier ?? "").trim() === supplier)
      .filter((row) => inPeriod(row?.director_approved_at))
      .filter((row: any) => kindNorm(row?.kind_name ?? row?.kindName) === kindFilter);

    totalApproved = spendByKind.reduce((sum, row: any) => sum + nnum(row?.approved_alloc), 0);
    totalPaid = spendByKind.reduce((sum, row: any) => sum + nnum(row?.paid_alloc_cap ?? row?.paid_alloc), 0);
    totalRest = Math.max(totalApproved - totalPaid, 0);

    const proposalIds = new Set<string>(
      spendByKind.map((row: any) => String(row?.proposal_id ?? "").trim()).filter(Boolean),
    );

    const finance = financeRows
      .filter((row) => String(row?.supplier ?? "").trim() === supplier)
      .filter((row) => inPeriod(row?.approvedAtIso ?? row?.approved_at ?? row?.director_approved_at))
      .filter((row) => {
        const proposalId = String(row?.proposalId ?? row?.proposal_id ?? "").trim();
        return proposalId && proposalIds.has(proposalId);
      });

    items = finance.map((row: any) => mapSupplierSummaryItem(row, overpayByProposal));
    if (onlyOverpay) items = items.filter((row) => nnum(row.overpay) > 0);
  } else {
    const finance = financeRows
      .filter((row) => String(row?.supplier ?? "").trim() === supplier)
      .filter((row) => inPeriod(row?.approvedAtIso ?? row?.approved_at ?? row?.director_approved_at));

    items = finance.map((row: any) => mapSupplierSummaryItem(row, overpayByProposal));
    if (onlyOverpay) items = items.filter((row) => nnum(row.overpay) > 0);

    totalApproved = items.reduce((sum, row) => sum + nnum(row.amount), 0);
    totalPaid = items.reduce((sum, row) => sum + nnum(row.paid), 0);
    totalRest = Math.max(totalApproved - totalPaid, 0);
  }

  const countAll = items.length;
  const countUnpaid = items.filter((row) => row.status === "не оплачено").length;
  const countPartial = items.filter((row) => row.status === "частично").length;
  const countPaid = items.filter((row) => row.status === "оплачено").length;

  const byKind = new Map<string, { approved: number; paid: number; overpay: number }>();
  for (const row of spend) {
    const kind = kindNorm(row?.kind_name ?? row?.kindName);
    const approved = nnum(row?.approved_alloc);
    const paid = nnum(row?.paid_alloc_cap ?? row?.paid_alloc);
    const overpay = nnum(row?.overpay_alloc);
    const current = byKind.get(kind) ?? { approved: 0, paid: 0, overpay: 0 };
    current.approved += approved;
    current.paid += paid;
    current.overpay += overpay;
    byKind.set(kind, current);
  }

  const kindOrder = ["Материалы", "Работы", "Услуги", "Другое"];
  const kindRows = kindOrder
    .filter((kind) => byKind.has(kind))
    .map((kind) => ({ kind, ...byKind.get(kind)! }))
    .filter((row) => row.approved !== 0 || row.paid !== 0 || row.overpay !== 0);

  const detailRows = [...items]
    .sort((left, right) => {
      const leftWeight = left.status === "не оплачено" ? 0 : left.status === "частично" ? 1 : 2;
      const rightWeight = right.status === "не оплачено" ? 0 : right.status === "частично" ? 1 : 2;
      if (leftWeight !== rightWeight) return leftWeight - rightWeight;
      const leftDate = String(left.dueDate ?? left.invoiceDate ?? "").slice(0, 10);
      const rightDate = String(right.dueDate ?? right.invoiceDate ?? "").slice(0, 10);
      return leftDate.localeCompare(rightDate);
    })
    .slice(0, 80)
    .map((row) => ({
      title: row.title,
      amount: row.amount,
      paid: row.paid,
      rest: row.rest,
      status: row.status,
      statusClassName: row.status === "не оплачено" ? "tag bad" : row.status === "частично" ? "tag mid" : "tag ok",
      overpay: row.overpay,
      datesText: buildSupplierDatesText(row),
    }));

  return {
    supplier,
    periodText: formatArrowPeriodText(from, to),
    kindFilter,
    totalApproved,
    totalPaid,
    totalRest,
    countAll,
    countUnpaid,
    countPartial,
    countPaid,
    kindRows,
    detailRows,
  };
  */
}

export function prepareDirectorManagementReportPdfModel(
  p: DirectorManagementReportPdfInput,
): DirectorManagementReportPdfModel {
  const topN = Math.max(1, Math.floor(Number(p.topN ?? 15)));
  const dueDays = Math.max(0, Math.floor(Number(p.dueDaysDefault ?? 7)));
  const criticalDays = Math.max(1, Math.floor(Number(p.criticalDays ?? 14)));

  const financeRows = Array.isArray(p.financeRows) ? p.financeRows : [];
  const spendRows = Array.isArray(p.spendRows) ? p.spendRows : [];

  const from = p.periodFrom ? iso10(p.periodFrom) : "";
  const to = p.periodTo ? iso10(p.periodTo) : "";
  const today = todayIso10();

  const inPeriod = (iso: unknown) => {
    const date = iso10(iso);
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  const byKind = new Map<string, { approved: number; paid: number; overpay: number }>();
  const bySupplierSpend = new Map<string, { approved: number; paid: number; rest: number }>();

  for (const row of spendRows) {
    const approvedIso = clampIso(row?.director_approved_at ?? row?.approved_at ?? row?.approvedAtIso);
    if (!inPeriod(approvedIso)) continue;

    const kind = kindNorm(row?.kind_name);
    const approved = nnum(row?.approved_alloc);
    const paid = nnum(row?.paid_alloc_cap ?? row?.paid_alloc);
    const overpay = nnum(row?.overpay_alloc);

    const kindValue = byKind.get(kind) ?? { approved: 0, paid: 0, overpay: 0 };
    kindValue.approved += approved;
    kindValue.paid += paid;
    kindValue.overpay += overpay;
    byKind.set(kind, kindValue);

    const supplier = String(row?.supplier ?? "").trim() || "—";
    const supplierSpend = bySupplierSpend.get(supplier) ?? { approved: 0, paid: 0, rest: 0 };
    supplierSpend.approved += approved;
    supplierSpend.paid += paid;
    supplierSpend.rest += Math.max(approved - paid, 0);
    bySupplierSpend.set(supplier, supplierSpend);
  }

  const kindOrder = ["Материалы", "Работы", "Услуги", "Другое"];
  const kindRows = kindOrder
    .filter((kind) => byKind.has(kind))
    .map((kind) => ({ kind, ...byKind.get(kind)! }))
    .filter((row) => row.approved !== 0 || row.paid !== 0 || row.overpay !== 0);

  const totalApproved = kindRows.reduce((sum, row) => sum + nnum(row.approved), 0);
  const totalPaid = kindRows.reduce((sum, row) => sum + nnum(row.paid), 0);
  const totalOverpay = kindRows.reduce((sum, row) => sum + nnum(row.overpay), 0);

  const spendSupplierRowsRaw = Array.from(bySupplierSpend.entries())
    .map(([supplier, value]) => ({
      supplier,
      approved: value.approved,
      paid: value.paid,
      rest: value.rest,
    }))
    .sort((left, right) => nnum(right.approved) - nnum(left.approved));

  const spendSupplierRows = topNWithOthers(
    spendSupplierRowsRaw,
    topN,
    ["approved", "paid", "rest"],
    (agg) => ({
      supplier: `Прочие (${agg.count})`,
      approved: agg.approved || 0,
      paid: agg.paid || 0,
      rest: agg.rest || 0,
    }),
  );

  type InvoiceRow = {
    supplier: string;
    title: string;
    amount: number;
    paid: number;
    rest: number;
    approvedIso: string;
    invoiceIso: string;
    dueIso: string;
    overdue: boolean;
    critical: boolean;
    paidFirstAt: string;
    paidLastAt: string;
  };

  const invoiceRows: InvoiceRow[] = [];

  for (const row of financeRows) {
    const supplier = pickSupplier(row);
    const amount = nnum(row?.amount);
    const paid = nnum(row?.paidAmount);
    const rest = Math.max(amount - paid, 0);

    if (amount <= 0 && rest <= 0) continue;

    const approvedIso = clampIso(pickApprovedIso(row) ?? "");
    const invoiceIso = clampIso(pickInvoiceIso(row) ?? "");
    const anchorIso = approvedIso || invoiceIso;
    if (!inPeriod(anchorIso)) continue;

    const dueRaw = clampIso(pickDueIso(row) ?? "");
    const dueIso =
      dueRaw ||
      (invoiceIso ? addDaysIso(invoiceIso, dueDays) : "") ||
      (approvedIso ? addDaysIso(approvedIso, dueDays) : "");

    const overdue = rest > 0 && !!dueIso && dueIso < today;

    let critical = false;
    if (overdue && dueIso) {
      const dueTs = new Date(`${dueIso}T00:00:00Z`).getTime();
      const todayTs = new Date(`${today}T00:00:00Z`).getTime();
      const daysOverdue = Math.floor((todayTs - dueTs) / (24 * 3600 * 1000));
      critical = daysOverdue >= criticalDays;
    }

    invoiceRows.push({
      supplier,
      title: invoiceTitle(row),
      amount,
      paid,
      rest,
      approvedIso,
      invoiceIso,
      dueIso,
      overdue,
      critical,
      paidFirstAt: clampIso(row?.paid_first_at ?? row?.raw?.paid_first_at ?? ""),
      paidLastAt: clampIso(row?.paid_last_at ?? row?.raw?.paid_last_at ?? ""),
    });
  }

  const totalDebt = invoiceRows.reduce((sum, row) => sum + Math.max(nnum(row.rest), 0), 0);
  const overdueSum = invoiceRows.reduce((sum, row) => sum + (row.overdue ? Math.max(nnum(row.rest), 0) : 0), 0);
  const criticalSum = invoiceRows.reduce((sum, row) => sum + (row.critical ? Math.max(nnum(row.rest), 0) : 0), 0);

  const unpaidCount = invoiceRows.filter((row) => row.amount > 0 && row.paid <= 0 && row.rest > 0).length;
  const partialCount = invoiceRows.filter((row) => row.amount > 0 && row.paid > 0 && row.rest > 0).length;
  const paidCount = invoiceRows.filter((row) => row.amount > 0 && row.rest <= 0).length;

  const bySupplierDebt = new Map<string, { debt: number; overdue: number; critical: number; invoices: number }>();
  for (const row of invoiceRows) {
    if (row.rest <= 0) continue;
    const current = bySupplierDebt.get(row.supplier) ?? { debt: 0, overdue: 0, critical: 0, invoices: 0 };
    current.debt += row.rest;
    current.invoices += 1;
    if (row.overdue) current.overdue += row.rest;
    if (row.critical) current.critical += row.rest;
    bySupplierDebt.set(row.supplier, current);
  }

  const debtSupplierRowsRaw = Array.from(bySupplierDebt.entries())
    .map(([supplier, value]) => ({
      supplier,
      debt: value.debt,
      overdue: value.overdue,
      critical: value.critical,
      invoices: value.invoices,
    }))
    .sort((left, right) => nnum(right.debt) - nnum(left.debt));

  const debtSupplierRows = topNWithOthers(
    debtSupplierRowsRaw,
    topN,
    ["debt", "overdue", "critical", "invoices"],
    (agg) => ({
      supplier: `Прочие (${agg.count})`,
      debt: agg.debt || 0,
      overdue: agg.overdue || 0,
      critical: agg.critical || 0,
      invoices: agg.invoices || 0,
    }),
  ).map((row) => ({
    supplier: row.supplier,
    debt: row.debt,
    overdue: row.overdue,
    critical: row.critical,
    invoices: row.invoices,
    riskLabel: row.critical > 0 ? "критично" : row.overdue > 0 ? "просрочено" : "ок",
    riskClassName: row.critical > 0 ? "tag crit" : row.overdue > 0 ? "tag bad" : "tag ok",
    showRisk: !String(row.supplier || "").startsWith("Прочие"),
  }));

  const top3Text = debtSupplierRowsRaw
    .slice(0, 3)
    .map((row) => `${row.supplier}: ${money(row.debt)} KGS`)
    .join(" • ");

  const problemRows = invoiceRows
    .filter((row) => row.rest > 0)
    .sort((left, right) => {
      const leftRank = left.critical ? 0 : left.overdue ? 1 : 2;
      const rightRank = right.critical ? 0 : right.overdue ? 1 : 2;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return nnum(right.rest) - nnum(left.rest);
    })
    .slice(0, 80)
    .map((row) => ({
      supplier: row.supplier,
      title: row.title,
      amount: row.amount,
      paid: row.paid,
      rest: row.rest,
      riskLabel: row.critical ? "критично" : row.overdue ? "просрочено" : "долг",
      riskClassName: row.critical ? "tag crit" : row.overdue ? "tag bad" : "tag",
      datesText:
        joinBulletParts([
          row.approvedIso ? `утв. ${fmtDateOnly(row.approvedIso)}` : "",
          formatPaidRangeText(row.paidFirstAt, row.paidLastAt),
          row.invoiceIso ? `счёт ${fmtDateOnly(row.invoiceIso)}` : "",
          row.dueIso ? `срок ${fmtDateOnly(row.dueIso)}` : "",
        ]) || "—",
    }));

  return {
    topN,
    periodText: formatArrowPeriodText(p.periodFrom, p.periodTo),
    totalApproved,
    totalPaid,
    totalDebt,
    overdueSum,
    criticalSum,
    totalOverpay,
    top3Text,
    unpaidCount,
    partialCount,
    paidCount,
    debtSupplierRows,
    kindRows,
    spendSupplierRows,
    problemRows,
  };
}

export function prepareDirectorProductionReportPdfModel(
  p: DirectorProductionPdfInput,
): DirectorProductionReportPdfModel {
  return prepareDirectorProductionReportPdfModelShared(p);

  /*
  const companyName = String(p.companyName ?? "RIK Construction").trim() || "RIK Construction";
  const generatedBy = String(p.generatedBy ?? "Директор").trim() || "Директор";
  const from = String(p.periodFrom ?? "").trim();
  const to = String(p.periodTo ?? "").trim();
  const objectName = String(p.objectName ?? "").trim() || "Все объекты";
  const generatedAt = new Date().toLocaleString("ru-RU");

  const data = p.repData ?? {};
  const kpi = data?.kpi ?? {};
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const discipline = p.repDiscipline ?? data?.discipline ?? null;
  const works = Array.isArray(discipline?.works) ? discipline.works : [];
  const disciplineSummary = discipline?.summary ?? {};

  const issuesTotal = nnum(kpi?.issues_total);
  const itemsTotal = nnum(kpi?.items_total);
  const issuesNoObject = nnum(kpi?.issues_without_object ?? kpi?.issues_no_obj);
  const itemsNoRequest = nnum(kpi?.items_without_request ?? kpi?.items_free);

  const worksSorted = [...works].sort((left: any, right: any) => nnum(right?.total_positions) - nnum(left?.total_positions));
  const worksTop = worksSorted.slice(0, 50);
  const materialRows = [...rows]
    .sort((left: any, right: any) => nnum(right?.qty_total) - nnum(left?.qty_total))
    .slice(0, 60)
    .map((row: any) => ({
      title: String(row?.name_human_ru ?? row?.rik_code ?? "—"),
      qtyTotal: nnum(row?.qty_total),
      uom: String(row?.uom ?? ""),
      docsCount: nnum(row?.docs_cnt),
      qtyWithoutRequest: nnum(row?.qty_without_request ?? row?.qty_free),
    }));

  const byObject = new Map<string, { docs: number; positions: number; noReq: number; noWork: number }>();
  for (const work of worksSorted) {
    const levels = Array.isArray(work?.levels) ? work.levels : [];
    for (const level of levels) {
      const obj =
        String((level as any)?.object_name ?? objectName ?? "Без объекта").trim() || "Без объекта";
      const current = byObject.get(obj) ?? { docs: 0, positions: 0, noReq: 0, noWork: 0 };
      current.docs += nnum((level as any)?.total_docs);
      current.positions += nnum((level as any)?.total_positions);
      current.noReq += nnum((level as any)?.free_positions);
      if (String(work?.work_type_name ?? "").trim().toLowerCase() === "без вида работ") {
        current.noWork += nnum((level as any)?.total_positions);
      }
      byObject.set(obj, current);
    }
  }

  const objectRows = Array.from(byObject.entries())
    .map(([obj, value]) => ({ obj, ...value }))
    .sort((left, right) => right.positions - left.positions);

  const withoutWork = worksSorted
    .filter((work: any) => String(work?.work_type_name ?? "").trim().toLowerCase() === "без вида работ")
    .reduce((sum: number, work: any) => sum + nnum(work?.total_positions), 0);

  const issueCost = nnum(disciplineSummary?.issue_cost_total);
  const purchaseCost = nnum(disciplineSummary?.purchase_cost_total);
  const ratioPct = nnum(disciplineSummary?.issue_to_purchase_pct);

  return {
    companyName,
    generatedBy,
    periodText: formatDashPeriodText(from, to),
    objectName,
    generatedAt,
    worksRows: worksTop.map((work: any) => ({
      workTypeName: String(work?.work_type_name ?? "").trim() || "—",
      totalPositions: nnum(work?.total_positions),
      reqPositions: nnum(work?.req_positions),
      freePositions: nnum(work?.free_positions),
      totalDocs: nnum(work?.total_docs),
      isWithoutWork: String(work?.work_type_name ?? "").trim().toLowerCase() === "без вида работ",
    })),
    rowsLimitedNote: worksSorted.length > worksTop.length ? `Показаны top ${worksTop.length} строк.` : "",
    objectRows,
    materialRows,
    issuesTotal,
    itemsTotal,
    itemsNoRequest,
    withoutWork,
    issuesNoObject,
    issueCost,
    purchaseCost,
    ratioPct,
    problemRows: [
      {
        problem: "Без вида работ",
        count: withoutWork,
        comment: "Требует контроля источника",
      },
      {
        problem: "Без заявки",
        count: itemsNoRequest,
        comment: "Есть выдачи без request item",
      },
      {
        problem: "Без объекта",
        count: issuesNoObject,
        comment: "Проверить привязку объекта",
      },
    ],
  };
  */
}

export function prepareDirectorSubcontractReportPdfModelFromRows(
  p: DirectorSubcontractPdfInput,
  rowsInput: unknown[],
): DirectorSubcontractReportPdfModel {
  return prepareDirectorSubcontractReportPdfModelShared(p, rowsInput);

  /*
  const companyName = String(p.companyName ?? "RIK Construction").trim() || "RIK Construction";
  const generatedBy = String(p.generatedBy ?? "Директор").trim() || "Директор";
  const from = String(p.periodFrom ?? "").trim();
  const to = String(p.periodTo ?? "").trim();
  const objectName = String(p.objectName ?? "").trim() || null;
  const generatedAt = new Date().toLocaleString("ru-RU");

  const rows: any[] = Array.isArray(rowsInput) ? rowsInput : [];

  const approvedLike = rows.filter((row: any) => ["approved", "closed"].includes(String(row?.status ?? "").trim()));
  const approved = rows.filter((row: any) => String(row?.status ?? "").trim() === "approved");
  const pending = rows.filter((row: any) => String(row?.status ?? "").trim() === "pending");
  const rejected = rows.filter((row: any) => String(row?.status ?? "").trim() === "rejected");

  const sumApproved = approvedLike.reduce((sum: number, row: any) => sum + nnum(row?.total_price), 0);
  const noAmount = approvedLike.filter((row: any) => nnum(row?.total_price) <= 0).length;
  const noWork = approvedLike.filter((row: any) => !String(row?.work_type ?? "").trim()).length;
  const noObject = approvedLike.filter((row: any) => !String(row?.object_name ?? "").trim()).length;
  const noContractor = approvedLike.filter((row: any) => !String(row?.contractor_org ?? "").trim()).length;

  const byContractor = new Map<string, { count: number; amount: number; objects: Set<string>; works: Set<string> }>();
  const byObject = new Map<string, { count: number; amount: number; contractors: Set<string>; works: Set<string> }>();
  const byWork = new Map<string, { count: number; amount: number; contractors: Set<string> }>();

  for (const row of approvedLike) {
    const contractor = String(row?.contractor_org ?? "").trim() || "Без подрядчика";
    const obj = String(row?.object_name ?? "").trim() || "Без объекта";
    const workType = String(row?.work_type ?? "").trim() || "Без вида работ";
    const amount = nnum(row?.total_price);

    const contractorValue = byContractor.get(contractor) ?? {
      count: 0,
      amount: 0,
      objects: new Set<string>(),
      works: new Set<string>(),
    };
    contractorValue.count += 1;
    contractorValue.amount += amount;
    contractorValue.objects.add(obj);
    contractorValue.works.add(workType);
    byContractor.set(contractor, contractorValue);

    const objectValue = byObject.get(obj) ?? {
      count: 0,
      amount: 0,
      contractors: new Set<string>(),
      works: new Set<string>(),
    };
    objectValue.count += 1;
    objectValue.amount += amount;
    objectValue.contractors.add(contractor);
    objectValue.works.add(workType);
    byObject.set(obj, objectValue);

    const workValue = byWork.get(workType) ?? {
      count: 0,
      amount: 0,
      contractors: new Set<string>(),
    };
    workValue.count += 1;
    workValue.amount += amount;
    workValue.contractors.add(contractor);
    byWork.set(workType, workValue);
  }

  return {
    companyName,
    generatedBy,
    periodText: formatDashPeriodText(from, to),
    objectText: objectName || "Все объекты",
    generatedAt,
    totalRows: rows.length,
    approvedCount: approved.length,
    contractorCount: byContractor.size,
    objectCount: byObject.size,
    sumApproved,
    noAmount,
    noWork,
    noObject,
    noContractor,
    contractorRows: Array.from(byContractor.entries())
      .map(([contractor, value]) => ({
        contractor,
        count: value.count,
        amount: value.amount,
        objects: value.objects.size,
        works: value.works.size,
      }))
      .sort((left, right) => right.amount - left.amount),
    objectRows: Array.from(byObject.entries())
      .map(([objectNameValue, value]) => ({
        objectName: objectNameValue,
        count: value.count,
        amount: value.amount,
        contractors: value.contractors.size,
        works: value.works.size,
      }))
      .sort((left, right) => right.amount - left.amount),
    approvedRows: [...approvedLike]
      .sort((left: any, right: any) => String(right?.approved_at ?? "").localeCompare(String(left?.approved_at ?? "")))
      .map((row: any) => ({
        displayNo: String(row?.display_no ?? row?.id ?? "").slice(0, 20),
        contractor: String(row?.contractor_org ?? "").trim() || "—",
        objectName: String(row?.object_name ?? "").trim() || "—",
        workType: String(row?.work_type ?? "").trim() || "—",
        status: String(row?.status ?? "").trim() || "—",
        totalPrice: nnum(row?.total_price),
        approvedAt: fmtDateOnly(String(row?.approved_at || "")),
      })),
    workRows: Array.from(byWork.entries())
      .map(([workType, value]) => ({
        workType,
        count: value.count,
        amount: value.amount,
        contractors: value.contractors.size,
      }))
      .sort((left, right) => right.amount - left.amount),
    pendingCount: pending.length,
    rejectedCount: rejected.length,
  };
  */
}

export async function loadDirectorSubcontractReportPdfModel(
  p: DirectorSubcontractPdfInput,
): Promise<DirectorSubcontractReportPdfModel> {
  const from = String(p.periodFrom ?? "").trim();
  const to = String(p.periodTo ?? "").trim();
  const objectName = String(p.objectName ?? "").trim() || null;

  let query = supabase
    .from("subcontracts")
    .select("id,display_no,status,object_name,work_type,contractor_org,total_price,approved_at,submitted_at,rejected_at,director_comment")
    .order("approved_at", { ascending: false, nullsFirst: false });

  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  if (objectName) query = query.eq("object_name", objectName);

  const { data, error } = await query;
  if (error) throw new Error(`subcontracts lookup failed: ${error.message}`);
  return prepareDirectorSubcontractReportPdfModelFromRows(p, Array.isArray(data) ? data : []);
}
