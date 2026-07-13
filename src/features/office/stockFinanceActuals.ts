import { officeUomLabel } from "../../shared/i18n/officeRussianDisplay";

export type StockLedgerEntryKind = "receipt" | "issue" | "write_off" | "adjustment";

export type PaymentActualStatus =
  | "awaiting_invoice"
  | "invoice_received"
  | "payment_planned"
  | "partially_paid"
  | "paid";

export type StockFinanceActualsItemSource = {
  requestId?: unknown;
  requestItemId?: unknown;
  companyId?: unknown;
  expectedCompanyId?: unknown;
  objectId?: unknown;
  objectName?: unknown;
  projectId?: unknown;
  projectName?: unknown;
  materialId?: unknown;
  code?: unknown;
  name?: unknown;
  uom?: unknown;
  stockUom?: unknown;
  plannedQty?: unknown;
  plannedAmount?: unknown;
  qty?: unknown;
  price?: unknown;
  procurementAmount?: unknown;
  proposalId?: unknown;
  proposalItemId?: unknown;
  purchaseId?: unknown;
  purchaseItemId?: unknown;
  incomingId?: unknown;
  incomingItemId?: unknown;
  qtyOrdered?: unknown;
  qtyExpected?: unknown;
  qtyReceived?: unknown;
  qtyIssued?: unknown;
  qtyWrittenOff?: unknown;
  qtyAdjustment?: unknown;
  qtyOnHand?: unknown;
  allowNegativeStock?: boolean;
  warehouseUserId?: unknown;
  warehouseUserName?: unknown;
  issuedToUserId?: unknown;
  issuedToName?: unknown;
  invoiceAmount?: unknown;
  outstandingAmount?: unknown;
  totalPaid?: unknown;
  paymentStatus?: unknown;
  hasInvoice?: unknown;
  invoiceNumber?: unknown;
};

export type StockLedgerEntryView = {
  kind: StockLedgerEntryKind;
  requestId: string | null;
  requestItemId: string;
  procurementItemId: string | null;
  materialId: string | null;
  companyId: string | null;
  warehouseUserId: string | null;
  warehouseUserName: string | null;
  qty: number;
  signedQty: number;
  unit: string;
  targetObjectId: string | null;
  targetObjectName: string | null;
  createdFrom: "warehouse_receive" | "warehouse_issue" | "warehouse_write_off" | "warehouse_adjustment";
  hasRequiredScope: boolean;
};

export type StockLedgerItemView = {
  requestId: string | null;
  requestItemId: string;
  companyId: string | null;
  expectedCompanyId: string | null;
  materialId: string | null;
  code: string | null;
  name: string;
  unit: string;
  plannedQty: number | null;
  orderedQty: number | null;
  receivedQty: number;
  issuedQty: number;
  writtenOffQty: number;
  adjustmentQty: number;
  formulaStockQty: number;
  currentStockQty: number;
  remainingAfterIssueQty: number;
  entries: StockLedgerEntryView[];
  receiptUpdatesStock: boolean;
  issueToProjectSupported: boolean;
  noNegativeStockWithoutPolicy: boolean;
  unitMatchesRequestItem: boolean;
  itemScopeEnforced: boolean;
  companyScopeEnforced: boolean;
  noCrossCompanyLeak: boolean;
};

export type FinancialActualsItemView = {
  requestId: string | null;
  requestItemId: string;
  companyId: string | null;
  procurementRecordId: string | null;
  buyerProcurementAmount: number | null;
  invoiceAmount: number | null;
  paidAmount: number;
  outstandingAmount: number | null;
  actualAmount: number | null;
  paymentStatus: PaymentActualStatus;
  paymentStatusLabel: string;
  invoicePaymentTiedToProcurement: boolean;
  actualAmountWritten: boolean;
  amountMatchesBuyerProcurement: boolean;
  noFakeZeroAmount: boolean;
  noQuestionMarkPlaceholder: boolean;
};

export type PlanFactItemView = {
  requestId: string | null;
  requestItemId: string;
  companyId: string | null;
  name: string;
  unit: string;
  plannedQty: number | null;
  actualProcuredQty: number | null;
  actualReceivedQty: number;
  actualIssuedQty: number;
  qtyDelta: number | null;
  plannedAmount: number | null;
  actualProcurementAmount: number | null;
  actualPaidAmount: number;
  amountDelta: number | null;
  deviationKind: "overrun" | "saving" | "even" | "unknown";
  directorVisible: boolean;
  foremanVisible: boolean;
  qtyReconciled: boolean;
  amountReconciled: boolean;
};

export type StockFinanceActualsItemView = {
  source: StockFinanceActualsItemSource;
  stock: StockLedgerItemView;
  finance: FinancialActualsItemView;
  planFact: PlanFactItemView;
};

export type StockFinanceActualsView = {
  requestId: string;
  items: StockFinanceActualsItemView[];
  ledgerEntries: StockLedgerEntryView[];
  totals: {
    plannedQty: number;
    procuredQty: number;
    receivedQty: number;
    issuedQty: number;
    plannedAmount: number;
    procurementAmount: number;
    paidAmount: number;
    amountDelta: number;
  };
  warehouseStockLedgerCreated: boolean;
  warehouseReceiptUpdatesStock: boolean;
  warehouseIssueToProjectSupported: boolean;
  foremanReceivesMaterialsOrSeesStock: boolean;
  accountantInvoicePaymentTiedToProcurement: boolean;
  accountantAmountsMatchBuyerProcurement: boolean;
  financialActualsWritten: boolean;
  directorPlanFactVisible: boolean;
  directorBudgetDeviationVisible: boolean;
  foremanPlanFactVisible: boolean;
  estimatePlannedQtyVsActualQtyReconciled: boolean;
  estimatePlannedAmountVsActualAmountReconciled: boolean;
  noNegativeStockWithoutPolicy: boolean;
  noFakeZeroAmount: boolean;
  noQuestionMarkPlaceholders: boolean;
  noCrossCompanyLeak: boolean;
  noFakeGreen: boolean;
};

const MONEY_FORMAT = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const EPSILON = 0.0001;

export const STOCK_FINANCE_PAYMENT_STATUS_LABELS: Record<PaymentActualStatus, string> = {
  awaiting_invoice: "Ожидается счет",
  invoice_received: "Счет получен",
  payment_planned: "К оплате",
  partially_paid: "Частично оплачено",
  paid: "Оплачено",
};

const cleanText = (value: unknown): string =>
  String(value ?? "").replace(/\s+/g, " ").trim();

const textOrNull = (value: unknown): string | null => {
  const text = cleanText(value);
  return text || null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = cleanText(value);
  if (!raw) return null;
  const parsed = Number(
    raw.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : null;
};

const nonNegative = (value: unknown): number =>
  Math.max(0, parseNumber(value) ?? 0);

const sameNumber = (left: number, right: number): boolean =>
  Math.abs(left - right) <= EPSILON;

const hasQuestionMark = (...values: unknown[]): boolean =>
  values.some((value) => cleanText(value).includes("?"));

const normalizeStatusText = (value: unknown): string =>
  cleanText(value).toLowerCase().replace(/ё/g, "е");

const formatNumber = (value: number): string =>
  MONEY_FORMAT.format(value).replace(/\u00a0/g, " ");

export const formatStockFinanceQty = (value: number | null): string =>
  value == null ? "не заполнено" : formatNumber(value);

export const formatStockFinanceMoney = (value: number | null): string =>
  value == null ? "не заполнено" : `${formatNumber(value)} KGS`;

const resolveProcurementRecordId = (source: StockFinanceActualsItemSource): string | null =>
  textOrNull(source.proposalItemId) ??
  textOrNull(source.proposalId) ??
  textOrNull(source.purchaseItemId) ??
  textOrNull(source.purchaseId);

const resolvePaymentStatus = (
  source: StockFinanceActualsItemSource,
  actualAmount: number | null,
  paidAmount: number,
  outstandingAmount: number | null,
): PaymentActualStatus => {
  const status = normalizeStatusText(source.paymentStatus);
  if (status.includes("част") || status.includes("partial") || (paidAmount > 0 && (outstandingAmount == null || outstandingAmount > EPSILON))) {
    return "partially_paid";
  }
  if (
    status.includes("paid") ||
    status.includes("оплач") ||
    (actualAmount != null && paidAmount > 0 && (outstandingAmount == null || outstandingAmount <= EPSILON))
  ) {
    return "paid";
  }
  if (status.includes("к оплат") || status.includes("to_pay") || status.includes("planned")) {
    return "payment_planned";
  }
  if (
    source.hasInvoice === true ||
    textOrNull(source.invoiceNumber) ||
    parseNumber(source.invoiceAmount) != null
  ) {
    return "invoice_received";
  }
  return "awaiting_invoice";
};

const buildLedgerEntry = (input: {
  kind: StockLedgerEntryKind;
  requestId: string | null;
  requestItemId: string;
  procurementItemId: string | null;
  materialId: string | null;
  companyId: string | null;
  warehouseUserId: string | null;
  warehouseUserName: string | null;
  qty: number;
  unit: string;
  targetObjectId: string | null;
  targetObjectName: string | null;
}): StockLedgerEntryView => {
  const sign = input.kind === "receipt" || input.kind === "adjustment" ? 1 : -1;
  const createdFrom =
    input.kind === "receipt"
      ? "warehouse_receive"
      : input.kind === "issue"
        ? "warehouse_issue"
        : input.kind === "write_off"
          ? "warehouse_write_off"
          : "warehouse_adjustment";
  const hasRequiredScope =
    Boolean(input.requestId) &&
    Boolean(input.requestItemId) &&
    Boolean(input.companyId) &&
    input.qty > 0 &&
    Boolean(input.unit) &&
    (input.kind !== "receipt" || Boolean(input.procurementItemId)) &&
    (input.kind !== "issue" || Boolean(input.targetObjectId || input.targetObjectName));

  return {
    ...input,
    signedQty: input.qty * sign,
    createdFrom,
    hasRequiredScope,
  };
};

function buildStockLedgerItemView(
  source: StockFinanceActualsItemSource,
): StockLedgerItemView {
  const requestId = textOrNull(source.requestId);
  const requestItemId = textOrNull(source.requestItemId);
  if (!requestItemId) {
    throw new Error("requestItemId is required for stock finance actuals item view");
  }

  const companyId = textOrNull(source.companyId);
  const expectedCompanyId = textOrNull(source.expectedCompanyId);
  const materialId = textOrNull(source.materialId) ?? textOrNull(source.code);
  const unit = officeUomLabel(source.uom ?? source.stockUom, "");
  const stockUnit = officeUomLabel(source.stockUom ?? source.uom, "");
  const plannedQty = parseNumber(source.plannedQty ?? source.qty);
  const orderedQty = parseNumber(source.qtyOrdered ?? source.qtyExpected ?? source.qty);
  const receivedQty = nonNegative(source.qtyReceived);
  const issuedQty = nonNegative(source.qtyIssued);
  const writtenOffQty = nonNegative(source.qtyWrittenOff);
  const adjustmentQty = parseNumber(source.qtyAdjustment) ?? 0;
  const formulaStockQty = receivedQty - issuedQty - writtenOffQty + adjustmentQty;
  const currentStockQty = parseNumber(source.qtyOnHand) ?? formulaStockQty;
  const remainingAfterIssueQty = Math.max(0, receivedQty - issuedQty - writtenOffQty);
  const procurementItemId =
    textOrNull(source.purchaseItemId) ??
    textOrNull(source.proposalItemId) ??
    textOrNull(source.incomingItemId) ??
    textOrNull(source.incomingId);
  const warehouseUserId = textOrNull(source.warehouseUserId);
  const warehouseUserName = textOrNull(source.warehouseUserName);
  const targetObjectId = textOrNull(source.objectId) ?? textOrNull(source.projectId);
  const targetObjectName = textOrNull(source.objectName) ?? textOrNull(source.projectName);
  const baseEntry = {
    requestId,
    requestItemId,
    procurementItemId,
    materialId,
    companyId,
    warehouseUserId,
    warehouseUserName,
    unit,
    targetObjectId,
    targetObjectName,
  };
  const entries = [
    receivedQty > 0 ? buildLedgerEntry({ ...baseEntry, kind: "receipt", qty: receivedQty }) : null,
    issuedQty > 0 ? buildLedgerEntry({ ...baseEntry, kind: "issue", qty: issuedQty }) : null,
    writtenOffQty > 0 ? buildLedgerEntry({ ...baseEntry, kind: "write_off", qty: writtenOffQty }) : null,
    adjustmentQty !== 0 ? buildLedgerEntry({ ...baseEntry, kind: "adjustment", qty: Math.abs(adjustmentQty) }) : null,
  ].filter((entry): entry is StockLedgerEntryView => Boolean(entry));
  const companyScopeEnforced = Boolean(companyId) && (!expectedCompanyId || expectedCompanyId === companyId);

  return {
    requestId,
    requestItemId,
    companyId,
    expectedCompanyId,
    materialId,
    code: textOrNull(source.code),
    name: cleanText(source.name) || materialId || "Материал",
    unit,
    plannedQty,
    orderedQty,
    receivedQty,
    issuedQty,
    writtenOffQty,
    adjustmentQty,
    formulaStockQty,
    currentStockQty,
    remainingAfterIssueQty,
    entries,
    receiptUpdatesStock: receivedQty > 0 && sameNumber(currentStockQty, formulaStockQty),
    issueToProjectSupported: issuedQty > 0 && Boolean(requestId) && Boolean(targetObjectId || targetObjectName),
    noNegativeStockWithoutPolicy:
      source.allowNegativeStock === true || (currentStockQty >= -EPSILON && formulaStockQty >= -EPSILON),
    unitMatchesRequestItem: Boolean(unit) && (!stockUnit || stockUnit === unit),
    itemScopeEnforced: Boolean(requestItemId && materialId),
    companyScopeEnforced,
    noCrossCompanyLeak: companyScopeEnforced,
  };
}

function buildFinancialActualsItemView(
  source: StockFinanceActualsItemSource,
): FinancialActualsItemView {
  const requestId = textOrNull(source.requestId);
  const requestItemId = textOrNull(source.requestItemId);
  if (!requestItemId) {
    throw new Error("requestItemId is required for financial actuals item view");
  }

  const companyId = textOrNull(source.companyId);
  const plannedQty = parseNumber(source.plannedQty ?? source.qty) ?? 1;
  const price = parseNumber(source.price);
  const buyerProcurementAmount =
    parseNumber(source.procurementAmount) ?? (price == null ? null : plannedQty * price);
  const invoiceAmount = parseNumber(source.invoiceAmount);
  const paidAmount = nonNegative(source.totalPaid);
  const outstandingAmount = parseNumber(source.outstandingAmount);
  const actualAmount = invoiceAmount ?? (paidAmount > 0 ? paidAmount : null);
  const procurementRecordId = resolveProcurementRecordId(source);
  const paymentStatus = resolvePaymentStatus(source, actualAmount, paidAmount, outstandingAmount);
  const amountMatchesBuyerProcurement =
    invoiceAmount == null || buyerProcurementAmount == null
      ? true
      : sameNumber(invoiceAmount, buyerProcurementAmount);
  const noFakeZeroAmount =
    buyerProcurementAmount != null ||
    invoiceAmount == null ||
    invoiceAmount > EPSILON ||
    price === 0;

  return {
    requestId,
    requestItemId,
    companyId,
    procurementRecordId,
    buyerProcurementAmount,
    invoiceAmount,
    paidAmount,
    outstandingAmount,
    actualAmount,
    paymentStatus,
    paymentStatusLabel: STOCK_FINANCE_PAYMENT_STATUS_LABELS[paymentStatus],
    invoicePaymentTiedToProcurement:
      Boolean(requestId && requestItemId && companyId && procurementRecordId) &&
      (invoiceAmount != null || paidAmount > 0 || cleanText(source.paymentStatus).length > 0),
    actualAmountWritten:
      Boolean(requestId && requestItemId && companyId && procurementRecordId) && actualAmount != null,
    amountMatchesBuyerProcurement,
    noFakeZeroAmount,
    noQuestionMarkPlaceholder: !hasQuestionMark(
      source.invoiceAmount,
      source.totalPaid,
      source.paymentStatus,
      source.invoiceNumber,
    ),
  };
}

function buildPlanFactItemView(
  source: StockFinanceActualsItemSource,
  stock: StockLedgerItemView,
  finance: FinancialActualsItemView,
): PlanFactItemView {
  const plannedAmount =
    parseNumber(source.plannedAmount) ??
    (stock.plannedQty != null && parseNumber(source.price) != null
      ? stock.plannedQty * (parseNumber(source.price) ?? 0)
      : null);
  const actualProcurementAmount =
    parseNumber(source.procurementAmount) ?? finance.buyerProcurementAmount;
  const qtyDelta =
    stock.plannedQty == null ? null : stock.issuedQty - stock.plannedQty;
  const amountDelta =
    plannedAmount == null || actualProcurementAmount == null
      ? null
      : actualProcurementAmount - plannedAmount;
  const deviationKind =
    amountDelta == null
      ? "unknown"
      : amountDelta > EPSILON
        ? "overrun"
        : amountDelta < -EPSILON
          ? "saving"
          : "even";
  const hasRequestScope = Boolean(stock.requestId && stock.requestItemId && stock.companyId);

  return {
    requestId: stock.requestId,
    requestItemId: stock.requestItemId,
    companyId: stock.companyId,
    name: stock.name,
    unit: stock.unit,
    plannedQty: stock.plannedQty,
    actualProcuredQty: stock.orderedQty,
    actualReceivedQty: stock.receivedQty,
    actualIssuedQty: stock.issuedQty,
    qtyDelta,
    plannedAmount,
    actualProcurementAmount,
    actualPaidAmount: finance.paidAmount,
    amountDelta,
    deviationKind,
    directorVisible:
      hasRequestScope &&
      stock.plannedQty != null &&
      (stock.orderedQty != null || stock.receivedQty > 0 || stock.issuedQty > 0) &&
      plannedAmount != null &&
      actualProcurementAmount != null,
    foremanVisible:
      hasRequestScope &&
      stock.plannedQty != null &&
      (stock.receivedQty > 0 || stock.issuedQty > 0 || stock.orderedQty != null),
    qtyReconciled:
      stock.plannedQty != null &&
      stock.orderedQty != null &&
      Number.isFinite(stock.receivedQty) &&
      Number.isFinite(stock.issuedQty) &&
      qtyDelta != null,
    amountReconciled: plannedAmount != null && actualProcurementAmount != null && amountDelta != null,
  };
}

export function buildStockFinanceActualsItemView(
  source: StockFinanceActualsItemSource,
): StockFinanceActualsItemView {
  const stock = buildStockLedgerItemView(source);
  const finance = buildFinancialActualsItemView(source);
  const planFact = buildPlanFactItemView(source, stock, finance);
  return { source, stock, finance, planFact };
}

export function buildStockFinanceActualsView(params: {
  requestId: string;
  expectedCompanyId?: unknown;
  items: StockFinanceActualsItemSource[];
}): StockFinanceActualsView {
  const expectedCompanyId = textOrNull(params.expectedCompanyId);
  const items = (params.items || []).map((item) =>
    buildStockFinanceActualsItemView({
      ...item,
      expectedCompanyId: item.expectedCompanyId ?? expectedCompanyId,
    }),
  );
  const ledgerEntries = items.flatMap((item) => item.stock.entries);
  const totals = items.reduce(
    (acc, item) => {
      acc.plannedQty += item.stock.plannedQty ?? 0;
      acc.procuredQty += item.stock.orderedQty ?? 0;
      acc.receivedQty += item.stock.receivedQty;
      acc.issuedQty += item.stock.issuedQty;
      acc.plannedAmount += item.planFact.plannedAmount ?? 0;
      acc.procurementAmount += item.planFact.actualProcurementAmount ?? 0;
      acc.paidAmount += item.finance.paidAmount;
      acc.amountDelta += item.planFact.amountDelta ?? 0;
      return acc;
    },
    {
      plannedQty: 0,
      procuredQty: 0,
      receivedQty: 0,
      issuedQty: 0,
      plannedAmount: 0,
      procurementAmount: 0,
      paidAmount: 0,
      amountDelta: 0,
    },
  );
  const itemTexts = items.map((item) =>
    [
      item.stock.name,
      item.stock.unit,
      item.finance.paymentStatusLabel,
      item.planFact.deviationKind,
    ].join(" "),
  );

  return {
    requestId: cleanText(params.requestId),
    items,
    ledgerEntries,
    totals,
    warehouseStockLedgerCreated: ledgerEntries.length > 0 && ledgerEntries.every((entry) => entry.hasRequiredScope),
    warehouseReceiptUpdatesStock: items.some((item) => item.stock.receiptUpdatesStock),
    warehouseIssueToProjectSupported: items.some((item) => item.stock.issueToProjectSupported),
    foremanReceivesMaterialsOrSeesStock: items.some(
      (item) => item.planFact.foremanVisible && (item.stock.receivedQty > 0 || item.stock.issuedQty > 0),
    ),
    accountantInvoicePaymentTiedToProcurement: items.some((item) => item.finance.invoicePaymentTiedToProcurement),
    accountantAmountsMatchBuyerProcurement: items.every((item) => item.finance.amountMatchesBuyerProcurement),
    financialActualsWritten: items.some((item) => item.finance.actualAmountWritten),
    directorPlanFactVisible: items.some((item) => item.planFact.directorVisible),
    directorBudgetDeviationVisible: items.some((item) => item.planFact.amountDelta != null),
    foremanPlanFactVisible: items.some((item) => item.planFact.foremanVisible),
    estimatePlannedQtyVsActualQtyReconciled: items.every((item) => item.planFact.qtyReconciled),
    estimatePlannedAmountVsActualAmountReconciled: items.every((item) => item.planFact.amountReconciled),
    noNegativeStockWithoutPolicy: items.every((item) => item.stock.noNegativeStockWithoutPolicy),
    noFakeZeroAmount: items.every((item) => item.finance.noFakeZeroAmount),
    noQuestionMarkPlaceholders:
      items.every((item) => item.finance.noQuestionMarkPlaceholder) && !hasQuestionMark(...itemTexts),
    noCrossCompanyLeak: items.every((item) => item.stock.noCrossCompanyLeak),
    noFakeGreen:
      items.length > 0 &&
      ledgerEntries.length > 0 &&
      items.some((item) => item.finance.actualAmount != null) &&
      items.some((item) => item.planFact.qtyDelta != null && item.planFact.amountDelta != null),
  };
}
