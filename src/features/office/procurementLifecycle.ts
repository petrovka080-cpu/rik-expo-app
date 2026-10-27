export type ProcurementLifecycleStage =
  | "to_purchase"
  | "supplier_selection"
  | "tender"
  | "ordered"
  | "ready_for_warehouse"
  | "partially_received"
  | "received";

export type ProcurementFinancialStatus =
  | "not_started"
  | "awaiting_invoice"
  | "invoice_received"
  | "payment_planned"
  | "partially_paid"
  | "paid";

export type ProcurementLifecycleItemSource = {
  requestId?: unknown;
  requestItemId?: unknown;
  proposalId?: unknown;
  proposalItemId?: unknown;
  purchaseId?: unknown;
  purchaseItemId?: unknown;
  incomingId?: unknown;
  supplier?: unknown;
  price?: unknown;
  note?: unknown;
  qty?: unknown;
  qtyOrdered?: unknown;
  procurementStatus?: unknown;
  proposalStatus?: unknown;
  purchaseStatus?: unknown;
  incomingStatus?: unknown;
  tender?: unknown;
  tenderState?: unknown;
  qtyExpected?: unknown;
  qtyReceived?: unknown;
  qtyLeft?: unknown;
  invoiceAmount?: unknown;
  outstandingAmount?: unknown;
  totalPaid?: unknown;
  paymentStatus?: unknown;
  hasInvoice?: unknown;
  invoiceNumber?: unknown;
};

export type ProcurementLifecycleItemView = {
  requestId: string | null;
  requestItemId: string;
  proposalId: string | null;
  proposalItemId: string | null;
  purchaseId: string | null;
  purchaseItemId: string | null;
  supplierText: string;
  noteText: string;
  price: number | null;
  amount: number | null;
  amountText: string;
  stage: ProcurementLifecycleStage;
  stageLabel: string;
  financialStatus: ProcurementFinancialStatus;
  financialStatusLabel: string;
  qtyExpected: number | null;
  qtyOrdered: number | null;
  qtyReceived: number;
  qtyLeft: number | null;
  orderedText: string;
  receivedText: string;
  remainingText: string;
  hasQuestionMarkPlaceholder: boolean;
  hasFakeZeroAmount: boolean;
};

export type ProcurementRecordIdentity = {
  requestItemId?: unknown;
  proposalId?: unknown;
  proposalItemId?: unknown;
  supplier?: unknown;
  tenderState?: unknown;
};

export type ProcurementLifecycleRequestView = {
  requestId: string;
  items: ProcurementLifecycleItemView[];
  status: ProcurementLifecycleStage;
  statusLabel: string;
  financialStatus: ProcurementFinancialStatus;
  financialStatusLabel: string;
  totalAmount: number | null;
  totalOrdered: number;
  totalReceived: number;
  totalExpected: number;
  buyerCanFillPrice: boolean;
  buyerCanFillSupplier: boolean;
  buyerCanFillNote: boolean;
  buyerCanMarkForTender: boolean | "skip_if_not_supported";
  procurementRecordCreated: boolean;
  procurementRecordIdempotent: boolean;
  warehouseProcurementItemsVisible: boolean;
  warehousePartialReceiptSupported: boolean;
  warehouseReceivedQtyPersisted: boolean;
  accountantProcurementAmountsVisible: boolean;
  accountantAmountsMatchBuyerPrices: boolean;
  foremanSeesProcurementProgress: boolean;
  directorSeesProcurementProgress: boolean;
  noDuplicateProcurementRows: boolean;
  noQuestionMarkPlaceholders: boolean;
  noFakeZeroSum: boolean;
};

const MONEY_FORMAT = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

const cleanText = (value: unknown): string =>
  String(value ?? "").replace(/\s+/g, " ").trim();

const normalizeText = (value: unknown): string =>
  cleanText(value).toLowerCase().replace(/ё/g, "е");

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = cleanText(value);
  if (!raw) return null;
  const parsed = Number(raw.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const isPresent = (value: unknown): boolean => cleanText(value).length > 0;

const hasTenderSignal = (source: ProcurementLifecycleItemSource): boolean => {
  if (source.tender === true) return true;
  const status = normalizeText([
    source.tenderState,
    source.procurementStatus,
    source.proposalStatus,
  ].filter(isPresent).join(" "));
  return (
    status.includes("tender") ||
    status.includes("rfq") ||
    status.includes("торг") ||
    status.includes("запрос цены") ||
    status.includes("котиров")
  );
};

export const PROCUREMENT_STAGE_LABELS: Record<ProcurementLifecycleStage, string> = {
  to_purchase: "К закупке",
  supplier_selection: "Подбор поставщика",
  tender: "Торги / запрос цены",
  ordered: "Заказано",
  ready_for_warehouse: "Ожидает приёмки",
  partially_received: "Принято частично",
  received: "Принято на склад",
};

export const PROCUREMENT_FINANCIAL_STATUS_LABELS: Record<ProcurementFinancialStatus, string> = {
  not_started: "Финансы не начаты",
  awaiting_invoice: "Ожидается счёт",
  invoice_received: "Счёт получен",
  payment_planned: "Оплата запланирована",
  partially_paid: "Частично оплачено",
  paid: "Оплачено",
};

export function resolveProcurementLifecycleStage(
  source: ProcurementLifecycleItemSource,
): ProcurementLifecycleStage {
  const qtyExpected = parseNumber(source.qtyExpected);
  const qtyReceived = parseNumber(source.qtyReceived) ?? 0;
  const qtyLeft =
    parseNumber(source.qtyLeft) ??
    (qtyExpected == null ? null : Math.max(0, qtyExpected - qtyReceived));

  if (qtyExpected != null || qtyReceived > 0 || qtyLeft != null || isPresent(source.incomingId)) {
    if ((qtyLeft != null && qtyLeft <= 0) || (qtyExpected != null && qtyExpected > 0 && qtyReceived >= qtyExpected)) {
      return "received";
    }
    if (qtyReceived > 0) return "partially_received";
    return "ready_for_warehouse";
  }

  if (isPresent(source.purchaseId) || isPresent(source.purchaseItemId)) {
    return "ready_for_warehouse";
  }

  if (hasTenderSignal(source)) return "tender";

  const status = normalizeText([
    source.procurementStatus,
    source.proposalStatus,
    source.purchaseStatus,
  ].filter(isPresent).join(" "));

  if (
    status.includes("ordered") ||
    status.includes("заказ") ||
    status.includes("закуп") ||
    status.includes("approved") ||
    status.includes("утверж")
  ) {
    return "ordered";
  }

  if (
    isPresent(source.proposalId) ||
    isPresent(source.proposalItemId) ||
    isPresent(source.supplier) ||
    isPresent(source.price) ||
    isPresent(source.note)
  ) {
    return "supplier_selection";
  }

  return "to_purchase";
}

export function resolveProcurementFinancialStatus(
  source: ProcurementLifecycleItemSource,
): ProcurementFinancialStatus {
  const paymentStatus = normalizeText(source.paymentStatus);
  const invoiceAmount = parseNumber(source.invoiceAmount);
  const outstandingAmount = parseNumber(source.outstandingAmount);
  const totalPaid = parseNumber(source.totalPaid) ?? 0;
  const amount = resolveBuyerAmount(source);
  const hasInvoice =
    source.hasInvoice === true ||
    isPresent(source.invoiceNumber) ||
    (invoiceAmount != null && invoiceAmount > 0);

  if (paymentStatus.includes("част") || (totalPaid > 0 && (outstandingAmount == null || outstandingAmount > 0))) {
    return "partially_paid";
  }

  if (
    paymentStatus.includes("paid") ||
    paymentStatus.includes("оплач") ||
    (totalPaid > 0 && outstandingAmount != null && outstandingAmount <= 0)
  ) {
    return "paid";
  }

  if (
    paymentStatus.includes("planned") ||
    paymentStatus.includes("plan") ||
    paymentStatus.includes("к оплат") ||
    paymentStatus.includes("ожида")
  ) {
    return "payment_planned";
  }

  if (hasInvoice) return "invoice_received";
  if (amount != null || isPresent(source.proposalId)) return "awaiting_invoice";
  return "not_started";
}

export function resolveBuyerAmount(source: ProcurementLifecycleItemSource): number | null {
  const price = parseNumber(source.price);
  if (price == null) return null;
  const qty = parseNumber(source.qty) ?? 1;
  return price * qty;
}

export function buildProcurementLifecycleItemView(
  source: ProcurementLifecycleItemSource,
): ProcurementLifecycleItemView {
  const requestItemId = cleanText(source.requestItemId);
  if (!requestItemId) {
    throw new Error("requestItemId is required for procurement lifecycle item view");
  }

  const qtyExpected = parseNumber(source.qtyExpected);
  const qtyOrdered = parseNumber(source.qtyOrdered) ?? qtyExpected ?? parseNumber(source.qty);
  const qtyReceived = parseNumber(source.qtyReceived) ?? 0;
  const qtyLeft =
    parseNumber(source.qtyLeft) ??
    (qtyExpected == null ? null : Math.max(0, qtyExpected - qtyReceived));
  const price = parseNumber(source.price);
  const amount = resolveBuyerAmount(source);
  const stage = resolveProcurementLifecycleStage(source);
  const financialStatus = resolveProcurementFinancialStatus(source);
  const supplierText = cleanText(source.supplier) || "Не выбран";
  const noteText = cleanText(source.note) || "—";
  const amountText =
    amount == null ? "появится после цены" : `${MONEY_FORMAT.format(amount)} сом`;
  const combinedText = [
    supplierText,
    noteText,
    amountText,
    PROCUREMENT_STAGE_LABELS[stage],
    PROCUREMENT_FINANCIAL_STATUS_LABELS[financialStatus],
  ].join(" ");

  return {
    requestId: cleanText(source.requestId) || null,
    requestItemId,
    proposalId: cleanText(source.proposalId) || null,
    proposalItemId: cleanText(source.proposalItemId) || null,
    purchaseId: cleanText(source.purchaseId) || null,
    purchaseItemId: cleanText(source.purchaseItemId) || null,
    supplierText,
    noteText,
    price,
    amount,
    amountText,
    stage,
    stageLabel: PROCUREMENT_STAGE_LABELS[stage],
    financialStatus,
    financialStatusLabel: PROCUREMENT_FINANCIAL_STATUS_LABELS[financialStatus],
    qtyExpected,
    qtyOrdered,
    qtyReceived,
    qtyLeft,
    orderedText:
      qtyOrdered == null ? "ожидает закупки" : MONEY_FORMAT.format(qtyOrdered),
    receivedText:
      qtyExpected == null
        ? qtyReceived > 0
          ? MONEY_FORMAT.format(qtyReceived)
          : "не принималось"
        : `${MONEY_FORMAT.format(qtyReceived)} из ${MONEY_FORMAT.format(qtyExpected)}`,
    remainingText:
      qtyLeft == null ? "ожидает закупки" : MONEY_FORMAT.format(Math.max(0, qtyLeft)),
    hasQuestionMarkPlaceholder: combinedText.includes("?"),
    hasFakeZeroAmount: price == null && amountText.includes("0 сом"),
  };
}

export function findDuplicateProcurementRecordKeys(
  records: ProcurementRecordIdentity[],
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    const requestItemId = cleanText(record.requestItemId);
    const proposalId = cleanText(record.proposalId);
    const proposalItemId = cleanText(record.proposalItemId);
    if (!requestItemId) continue;

    const supplier = normalizeText(record.supplier) || "no_supplier";
    const tenderState = normalizeText(record.tenderState);
    const key = proposalItemId
      ? `proposal_item:${proposalItemId}`
      : `request_item:${requestItemId}|proposal:${proposalId || "no_proposal"}|supplier:${supplier}|tender:${tenderState}`;

    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }

  return Array.from(duplicates).sort();
}

export function buildProcurementLifecycleRequestView(params: {
  requestId: string;
  expectedItemCount?: number | null;
  items: ProcurementLifecycleItemSource[];
  accountantInvoiceAmount?: unknown;
}): ProcurementLifecycleRequestView {
  const tenderSupported = params.items.some(hasTenderSignal);
  const items = params.items.map(buildProcurementLifecycleItemView);
  const stageRank: Record<ProcurementLifecycleStage, number> = {
    to_purchase: 0,
    supplier_selection: 1,
    tender: 2,
    ordered: 3,
    ready_for_warehouse: 4,
    partially_received: 5,
    received: 6,
  };
  const financialRank: Record<ProcurementFinancialStatus, number> = {
    not_started: 0,
    awaiting_invoice: 1,
    invoice_received: 2,
    payment_planned: 3,
    partially_paid: 4,
    paid: 5,
  };
  const status =
    items.reduce<ProcurementLifecycleStage>(
      (current, item) => (stageRank[item.stage] > stageRank[current] ? item.stage : current),
      "to_purchase",
    );
  const financialStatus =
    items.reduce<ProcurementFinancialStatus>(
      (current, item) =>
        financialRank[item.financialStatus] > financialRank[current]
          ? item.financialStatus
          : current,
      "not_started",
    );
  const duplicates = findDuplicateProcurementRecordKeys(items);
  const totalAmountRaw = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const knownAmountCount = items.filter((item) => item.amount != null).length;
  const totalExpected = items.reduce((sum, item) => sum + (item.qtyExpected ?? 0), 0);
  const totalOrdered = items.reduce((sum, item) => sum + (item.qtyOrdered ?? 0), 0);
  const totalReceived = items.reduce((sum, item) => sum + item.qtyReceived, 0);
  const accountantInvoiceAmount = parseNumber(params.accountantInvoiceAmount);
  const expectedItemCount =
    typeof params.expectedItemCount === "number" && params.expectedItemCount >= 0
      ? params.expectedItemCount
      : items.length;

  return {
    requestId: cleanText(params.requestId),
    items,
    status,
    statusLabel: PROCUREMENT_STAGE_LABELS[status],
    financialStatus,
    financialStatusLabel: PROCUREMENT_FINANCIAL_STATUS_LABELS[financialStatus],
    totalAmount: knownAmountCount ? totalAmountRaw : null,
    totalOrdered,
    totalReceived,
    totalExpected,
    buyerCanFillPrice: items.some((item) => item.price != null),
    buyerCanFillSupplier: items.some((item) => item.supplierText !== "Не выбран"),
    buyerCanFillNote: items.some((item) => item.noteText !== "—"),
    buyerCanMarkForTender: tenderSupported ? true : "skip_if_not_supported",
    procurementRecordCreated: items.some((item) => item.proposalId || item.proposalItemId),
    procurementRecordIdempotent: duplicates.length === 0,
    warehouseProcurementItemsVisible: items.some((item) => item.purchaseItemId || item.qtyExpected != null),
    warehousePartialReceiptSupported: items.some(
      (item) => item.qtyExpected != null && item.qtyReceived > 0 && (item.qtyLeft ?? 0) > 0,
    ),
    warehouseReceivedQtyPersisted: items.some((item) => item.qtyReceived > 0),
    accountantProcurementAmountsVisible: items.some(
      (item) => item.financialStatus !== "not_started" || item.amount != null,
    ),
    accountantAmountsMatchBuyerPrices:
      accountantInvoiceAmount == null || !knownAmountCount
        ? true
        : Math.abs(accountantInvoiceAmount - totalAmountRaw) < 0.01,
    foremanSeesProcurementProgress: items.length === expectedItemCount && items.some((item) => item.stage !== "to_purchase"),
    directorSeesProcurementProgress: items.length === expectedItemCount && items.some((item) => item.amount != null || item.stage !== "to_purchase"),
    noDuplicateProcurementRows: duplicates.length === 0,
    noQuestionMarkPlaceholders: items.every((item) => !item.hasQuestionMarkPlaceholder),
    noFakeZeroSum: items.every((item) => !item.hasFakeZeroAmount),
  };
}
