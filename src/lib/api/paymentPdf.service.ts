import { buildPdfFileName } from "../documents/pdfDocument";
import {
  getPdfRpcRolloutAvailability,
  recordPdfRpcRolloutBranch,
  registerPdfRpcRolloutPath,
  resolvePdfRpcRolloutMode,
  setPdfRpcRolloutAvailability,
  type PdfRpcRolloutBranchMeta,
  type PdfRpcRolloutFallbackReason,
  type PdfRpcRolloutId,
  type PdfRpcRolloutMode,
} from "../documents/pdfRpcRollout";
import { recordCatchDiscipline } from "../observability/catchDiscipline";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import { supabase } from "../supabaseClient";
import type { PaymentPdfDraft } from "./types";

type PaymentOrderPdfRecord = Record<string, unknown>;

type PaymentOrderPdfRpcPayload = {
  company?: PaymentOrderPdfRecord | null;
  payment?: PaymentOrderPdfRecord | null;
  proposal?: PaymentOrderPdfRecord | null;
  items?: unknown[] | null;
  attachments?: unknown[] | null;
  payment_files?: unknown[] | null;
  files?: unknown[] | null;
  supplier?: unknown;
};

type PaymentPdfSourceEnvelopeV1 = {
  document_type: "payment_order";
  version: "v1";
  generated_at: string;
  document_id: string;
  source_branch: "canonical";
  header: {
    company?: PaymentOrderPdfRecord | null;
    payment?: PaymentOrderPdfRecord | null;
    proposal?: PaymentOrderPdfRecord | null;
    supplier?: unknown;
  };
  rows: unknown[];
  allocations: unknown[];
  attachments_meta?: unknown[];
  totals: PaymentOrderPdfRecord;
  meta?: PaymentOrderPdfRecord;
};

type PaymentOrderPdfPreparedItem = {
  itemKey: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplier: string;
  typeName: string;
  name: string;
  uom: string;
  qty: number;
  price: number;
  sum: number;
  paidAll: number;
  paidThis: number;
  rest: number;
};

type PaymentOrderPdfSource = {
  payload: PaymentOrderPdfRpcPayload;
  allocations: PaymentOrderPdfRecord[];
  branchMeta: PaymentPdfSourceBranchMeta;
  source: "rpc:pdf_payment_source_v1";
};

export type PaymentPdfSourceBranchMeta = PdfRpcRolloutBranchMeta;

export type PaymentOrderPdfAttachment = {
  name: string;
  url: string;
  kind: string;
};

export type PaymentOrderPdfLine = {
  name: string;
  uom: string;
  qty: number;
  price: number;
  sum: number;
  paidAll: number;
  paidThis: number;
  rest: number;
};

export type PaymentOrderPdfKindGroup = {
  typeName: string;
  total: number;
  paidAll: number;
  paidThis: number;
  rest: number;
  lines: PaymentOrderPdfLine[];
};

export type PaymentOrderPdfBillGroup = {
  invoiceNumber: string;
  invoiceDate: string;
  supplier: string;
  total: number;
  groups: PaymentOrderPdfKindGroup[];
};

export type PaymentOrderPdfCompany = {
  company_name: string;
  inn: string;
  kpp: string;
  address: string;
  bank_name: string;
  bik: string;
  account: string;
  corr_account: string;
  phone: string;
  email: string;
};

export type PaymentOrderPdfHeader = {
  payment_id: string;
  proposal_id: string;
  paid_at: string;
  currency: string;
  supplier: string;
  invoice_number: string;
  invoice_date: string;
  purpose: string;
  accountant_fio: string;
  method: string;
  pay_bank: string;
  pay_bik: string;
  pay_rs: string;
  pay_inn: string;
  pay_kpp: string;
  amount: number;
  total_paid: number;
  invoice_total: number;
  rest: number;
  overpay_all: number;
  this_overpay: number;
  amount_words: string;
  auto_note: string;
  total_lines: number;
};

export type PaymentOrderPdfPayload = {
  company: PaymentOrderPdfCompany;
  header: PaymentOrderPdfHeader;
  attachments: PaymentOrderPdfAttachment[];
  bills: PaymentOrderPdfBillGroup[];
};

export type PaymentOrderPdfContract = {
  version: 1;
  flow: "payment_order";
  template: "payment-order-v1";
  title: string;
  fileName: string;
  documentType: "payment_order";
  entityId: string;
  payload: PaymentOrderPdfPayload;
};

export type PreparedPaymentOrderPdf = {
  source: "rpc:pdf_payment_source_v1";
  branchMeta: PaymentPdfSourceBranchMeta;
  contract: PaymentOrderPdfContract;
};

const EMPTY_VALUE = "—";
const PAYMENT_PDF_SOURCE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_PAYMENT_PDF_SOURCE_RPC_V1 ?? "",
).trim().toLowerCase();

const PAYMENT_PDF_RPC_ROLLOUT_ID: PdfRpcRolloutId = "payment_pdf_source_v1";
const PAYMENT_PDF_RPC_MODE: PdfRpcRolloutMode = resolvePdfRpcRolloutMode(
  PAYMENT_PDF_SOURCE_RPC_V1_MODE_RAW,
);

registerPdfRpcRolloutPath(PAYMENT_PDF_RPC_ROLLOUT_ID, PAYMENT_PDF_RPC_MODE);

class PaymentPdfSourceValidationError extends Error {
  reason: "invalid_payload" | "missing_fields";

  constructor(reason: "invalid_payload" | "missing_fields", message: string) {
    super(message);
    this.name = "PaymentPdfSourceValidationError";
    this.reason = reason;
  }
}

class PaymentPdfSourceRpcError extends Error {
  code?: string;
  disableForSession: boolean;

  constructor(message: string, options?: { code?: string; disableForSession?: boolean }) {
    super(message);
    this.name = "PaymentPdfSourceRpcError";
    this.code = options?.code;
    this.disableForSession = options?.disableForSession === true;
  }
}

const asRecord = (value: unknown): PaymentOrderPdfRecord =>
  value && typeof value === "object" ? (value as PaymentOrderPdfRecord) : {};

const asArrayOfRecords = (value: unknown): PaymentOrderPdfRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const pick = (draftValue: unknown, dbValue: unknown, fallback = EMPTY_VALUE) => {
  const draftText = String(draftValue ?? "").trim();
  if (draftText) return draftText;
  const dbText = String(dbValue ?? "").trim();
  return dbText || fallback;
};

const nnum = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const allocProportional = (totalAmount: number, weights: number[]) => {
  const total = Math.max(0, nnum(totalAmount));
  const normalizedWeights = (weights || []).map((value) => Math.max(0, nnum(value)));
  const sumWeights = normalizedWeights.reduce((acc, value) => acc + value, 0);

  const result = normalizedWeights.map(() => 0);
  if (!total || sumWeights <= 0) return result;

  let acc = 0;
  for (let index = 0; index < normalizedWeights.length; index += 1) {
    if (index === normalizedWeights.length - 1) {
      result[index] = round2(total - acc);
      continue;
    }
    const value = round2((total * normalizedWeights[index]) / sumWeights);
    result[index] = value;
    acc = round2(acc + value);
  }

  return result;
};

const moneyToWordsKGS = (amount: number): string => {
  const n = Number.isFinite(amount) ? amount : 0;
  const som = Math.floor(n);
  const tyiyn = Math.round((n - som) * 100);

  const unitsM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const unitsF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = [
    "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
    "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
  ];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

  const morph = (num: number, f1: string, f2: string, f5: string) => {
    const n10 = num % 10;
    const n100 = num % 100;
    if (n100 >= 11 && n100 <= 19) return f5;
    if (n10 === 1) return f1;
    if (n10 >= 2 && n10 <= 4) return f2;
    return f5;
  };

  const triadToWords = (num: number, female: boolean) => {
    const units = female ? unitsF : unitsM;
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const d = num % 10;
    const out: string[] = [];
    if (h) out.push(hundreds[h]);
    if (t === 1) out.push(teens[num % 100 - 10]);
    else {
      if (t) out.push(tens[t]);
      if (d) out.push(units[d]);
    }
    return out.join(" ");
  };

  const parts: string[] = [];
  const billions = Math.floor(som / 1_000_000_000);
  const millions = Math.floor((som % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((som % 1_000_000) / 1000);
  const rest = som % 1000;

  if (billions) {
    parts.push(triadToWords(billions, false));
    parts.push(morph(billions, "миллиард", "миллиарда", "миллиардов"));
  }
  if (millions) {
    parts.push(triadToWords(millions, false));
    parts.push(morph(millions, "миллион", "миллиона", "миллионов"));
  }
  if (thousands) {
    parts.push(triadToWords(thousands, true));
    parts.push(morph(thousands, "тысяча", "тысячи", "тысяч"));
  }
  if (rest || parts.length === 0) parts.push(triadToWords(rest, false));

  const somWord = morph(som, "сом", "сома", "сомов");
  const tyiynWord = morph(tyiyn, "тыйын", "тыйына", "тыйынов");

  const somText = parts.join(" ").replace(/\s+/g, " ").trim();
  return `${somText} ${somWord} ${String(tyiyn).padStart(2, "0")} ${tyiynWord}`.trim();
};

const groupBy = <T,>(items: T[], keyFn: (value: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const item of items || []) {
    const key = keyFn(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups.entries());
};

const itemKey = (item: PaymentOrderPdfRecord) => {
  const key =
    item.proposal_item_id ??
    item.proposalItemId ??
    item.pi_id ??
    item.item_id ??
    item.id;
  return String(key ?? "").trim();
};

const kindOf = (item: PaymentOrderPdfRecord) => {
  const code = String(item.rik_code ?? "").toUpperCase();
  if (code.startsWith("MAT-")) return "Материалы";
  if (code.startsWith("WRK-")) return "Работы";
  if (code.startsWith("SRV-") || code.startsWith("SVC-")) return "Услуги";
  return "Прочее";
};

const requireNonEmptyString = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new PaymentPdfSourceValidationError("missing_fields", `pdf_payment_source_v1 missing ${field}`);
  }
  return text;
};

const requireRecord = (value: unknown, field: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PaymentPdfSourceValidationError("missing_fields", `pdf_payment_source_v1 missing ${field}`);
  }
  return value as PaymentOrderPdfRecord;
};

const requireArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new PaymentPdfSourceValidationError("missing_fields", `pdf_payment_source_v1 missing ${field}`);
  }
  return value;
};

const getPaymentPdfFailureReason = (error: unknown): PdfRpcRolloutFallbackReason => {
  if (error instanceof PaymentPdfSourceValidationError) return error.reason;
  return "rpc_error";
};

const shouldDisablePaymentPdfRpcForSession = (errorCode: unknown, errorMessage: unknown) => {
  const code = String(errorCode ?? "").trim().toUpperCase();
  const message = String(errorMessage ?? "").toLowerCase();
  if (code === "PGRST202") return true;
  if (message.includes("could not find the function")) return true;
  if (message.includes("schema cache")) return true;
  if (message.includes("function public.pdf_payment_source_v1")) return true;
  return false;
};

function validatePaymentPdfSourceV1(value: unknown): PaymentPdfSourceEnvelopeV1 {
  const root = requireRecord(value, "root");
  const documentType = requireNonEmptyString(root.document_type, "document_type");
  if (documentType !== "payment_order") {
    throw new PaymentPdfSourceValidationError("invalid_payload", `pdf_payment_source_v1 invalid document_type: ${documentType}`);
  }

  const version = requireNonEmptyString(root.version, "version");
  if (version !== "v1") {
    throw new PaymentPdfSourceValidationError("invalid_payload", `pdf_payment_source_v1 invalid version: ${version}`);
  }

  const documentId = requireNonEmptyString(root.document_id, "document_id");
  const header = requireRecord(root.header, "header");
  const payment = requireRecord(header.payment, "header.payment");
  const rows = requireArray(root.rows, "rows");
  const allocations = requireArray(root.allocations, "allocations");
  const totals = requireRecord(root.totals, "totals");

  if (!("amount" in totals) || !("total_paid" in totals)) {
    throw new PaymentPdfSourceValidationError("missing_fields", "pdf_payment_source_v1 missing totals.amount or totals.total_paid");
  }

  if (!String(payment.payment_id ?? "").trim()) {
    throw new PaymentPdfSourceValidationError("missing_fields", "pdf_payment_source_v1 missing header.payment.payment_id");
  }

  const attachmentsMeta = root.attachments_meta;
  if (attachmentsMeta != null && !Array.isArray(attachmentsMeta)) {
    throw new PaymentPdfSourceValidationError("invalid_payload", "pdf_payment_source_v1 invalid attachments_meta");
  }

  return {
    document_type: "payment_order",
    version: "v1",
    generated_at: String(root.generated_at ?? "").trim(),
    document_id: documentId,
    source_branch: "canonical",
    header: {
      company: asRecord(header.company),
      payment,
      proposal: asRecord(header.proposal),
      supplier: header.supplier,
    },
    rows,
    allocations,
    attachments_meta: attachmentsMeta as unknown[] | undefined,
    totals,
    meta: asRecord(root.meta),
  };
}

function logPaymentPdfSourceBranch(paymentId: number, meta: PaymentPdfSourceBranchMeta, source: string) {
  recordPdfRpcRolloutBranch(PAYMENT_PDF_RPC_ROLLOUT_ID, {
    source,
    branchMeta: meta,
  });
  if (!__DEV__) return;
  console.info("[payment-pdf-source]", {
    paymentId,
    source,
    sourceBranch: meta.sourceBranch,
    fallbackReason: meta.fallbackReason ?? null,
    rpcVersion: meta.rpcVersion ?? null,
    payloadShapeVersion: meta.payloadShapeVersion ?? null,
  });
}

const assertPaymentPdfRpcPrimary = (rpcMode: PdfRpcRolloutMode) => {
  if (rpcMode === "force_off") {
    throw new PaymentPdfSourceRpcError(
      "pdf_payment_source_v1 is force_off but legacy fallback branches were removed",
    );
  }
  if (
    rpcMode === "auto"
    && getPdfRpcRolloutAvailability(PAYMENT_PDF_RPC_ROLLOUT_ID) === "missing"
  ) {
    throw new PaymentPdfSourceRpcError(
      "pdf_payment_source_v1 unavailable in this session and legacy fallback branches were removed",
    );
  }
};

const recordPaymentPdfRpcFailure = (
  paymentId: number,
  rpcMode: PdfRpcRolloutMode,
  error: unknown,
) => {
  const failureReason = getPaymentPdfFailureReason(error);
  recordCatchDiscipline({
    screen: "accountant",
    surface: "payment_pdf_source",
    event: "payment_pdf_rpc_source_failed",
    kind: "critical_fail",
    error,
    sourceKind: "rpc:pdf_payment_source_v1",
    errorStage: "source_load",
    extra: {
      paymentId,
      failureReason,
      rpcMode,
      rpcAvailability: getPdfRpcRolloutAvailability(PAYMENT_PDF_RPC_ROLLOUT_ID),
      publishState: "error",
      fallbackUsed: false,
    },
  });
  if (rpcMode === "auto" && error instanceof PaymentPdfSourceRpcError && error.disableForSession) {
    setPdfRpcRolloutAvailability(PAYMENT_PDF_RPC_ROLLOUT_ID, "missing", {
      errorMessage: error.message,
    });
  }
  if (__DEV__) {
    console.warn("[payment-pdf-source] rpc_v1 hard-fail", {
      paymentId,
      failureReason,
      rpcMode,
      rpcAvailability: getPdfRpcRolloutAvailability(PAYMENT_PDF_RPC_ROLLOUT_ID),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
};

export async function fetchPaymentPdfSourceViaRpc(paymentId: number): Promise<PaymentOrderPdfSource> {
  const pid = Number(paymentId);
  if (!Number.isFinite(pid) || pid <= 0) throw new Error("payment_id invalid");

  const { data, error } = await supabase.rpc("pdf_payment_source_v1", { p_payment_id: pid });
  if (error) {
    throw new PaymentPdfSourceRpcError(`pdf_payment_source_v1 failed: ${error.message}`, {
      code: "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
      disableForSession: shouldDisablePaymentPdfRpcForSession(
        "code" in error ? (error as { code?: unknown }).code : undefined,
        "message" in error ? (error as { message?: unknown }).message : undefined,
      ),
    });
  }

  const envelope = validatePaymentPdfSourceV1(data);
  const payload: PaymentOrderPdfRpcPayload = {
    company: asRecord(envelope.header.company),
    payment: asRecord(envelope.header.payment),
    proposal: asRecord(envelope.header.proposal),
    supplier: envelope.header.supplier,
    items: envelope.rows,
    attachments: envelope.attachments_meta ?? [],
  };

  return {
    payload,
    allocations: asArrayOfRecords(envelope.allocations),
    branchMeta: {
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    },
    source: "rpc:pdf_payment_source_v1",
  };
}

export async function getPaymentPdfSource(paymentId: number): Promise<PaymentOrderPdfSource> {
  const pid = Number(paymentId);
  if (!Number.isFinite(pid) || pid <= 0) throw new Error("payment_id invalid");

  const rpcMode = PAYMENT_PDF_RPC_MODE;
  const observation = beginPdfLifecycleObservation({
    screen: "accountant",
    surface: "payment_pdf_source",
    event: "payment_pdf_source_load",
    stage: "source_load",
    sourceKind: "rpc:pdf_payment_source_v1",
    context: {
      documentFamily: "payment_order",
      documentType: "payment_order",
      entityId: pid,
      source: "rpc:pdf_payment_source_v1",
    },
  });

  try {
    assertPaymentPdfRpcPrimary(rpcMode);
    const rpcSource = await fetchPaymentPdfSourceViaRpc(pid);
    if (rpcMode === "auto") {
      setPdfRpcRolloutAvailability(PAYMENT_PDF_RPC_ROLLOUT_ID, "available");
    }
    logPaymentPdfSourceBranch(pid, rpcSource.branchMeta, rpcSource.source);
    observation.success({
      sourceKind: rpcSource.source,
      extra: {
        sourceBranch: rpcSource.branchMeta.sourceBranch,
        payloadShapeVersion: rpcSource.branchMeta.payloadShapeVersion ?? null,
      },
    });
    return rpcSource;
  } catch (error) {
    recordPaymentPdfRpcFailure(pid, rpcMode, error);
    throw observation.error(error, {
      fallbackMessage: "Payment PDF source load failed",
      extra: {
        paymentId: pid,
        rpcMode,
        fallbackUsed: false,
      },
    });
  }
}

const toManualAllocMap = (allocations: PaymentOrderPdfRecord[]) => {
  const manualAllocMap = new Map<string, number>();
  for (const row of allocations) {
    const key = String(row.proposal_item_id ?? "").trim();
    const amount = round2(nnum(row.amount));
    if (key && amount > 0) manualAllocMap.set(key, amount);
  }
  return manualAllocMap;
};

export function shapePaymentOrderPdfPayload(args: {
  paymentId: number;
  draft?: PaymentPdfDraft;
  source: Pick<PaymentOrderPdfSource, "payload" | "allocations">;
}): PaymentOrderPdfPayload {
  const payload = args.source.payload;
  const company = asRecord(payload.company);
  const payment = asRecord(payload.payment);
  const proposal = asRecord(payload.proposal);
  const manualAllocMap = toManualAllocMap(args.source.allocations);

  const attachmentsRaw =
    (Array.isArray(payload.attachments) && payload.attachments) ||
    (Array.isArray(payload.payment_files) && payload.payment_files) ||
    (Array.isArray(payload.files) && payload.files) ||
    [];

  const attachments = (attachmentsRaw as PaymentOrderPdfRecord[])
    .map((item) => ({
      name: String(item.file_name ?? item.name ?? item.filename ?? "file").trim(),
      url: String(item.url ?? item.file_url ?? item.public_url ?? item.signed_url ?? "").trim(),
      kind: String(item.kind ?? item.group_key ?? item.type ?? "").trim(),
    }))
    .filter((item) => item.url);

  const paidAt = payment.paid_at ? new Date(String(payment.paid_at)).toLocaleString("ru-RU") : EMPTY_VALUE;
  const currency = String(payment.currency ?? proposal.invoice_currency ?? "KGS");
  const accountantFio = String(payment.accountant_fio ?? "").trim();

  const supplier = pick(args.draft?.supplier, proposal.supplier ?? payment.supplier ?? payload.supplier);
  const invoiceNumber = pick(args.draft?.invoice_number, proposal.invoice_number ?? payment.invoice_number);
  const invoiceDate = pick(args.draft?.invoice_date, proposal.invoice_date ?? payment.invoice_date);

  const purposeDb = String(payment.purpose ?? payment.note ?? "").trim();
  const purposeAuto = `Оплата по счёту №${invoiceNumber} от ${invoiceDate}. Поставщик: ${supplier}.`;
  const purpose = purposeDb || purposeAuto;

  const payBank = pick(args.draft?.bank_name, payment.bank_name ?? proposal.bank_name, EMPTY_VALUE);
  const payBik = pick(args.draft?.bik, payment.bik ?? proposal.bik, EMPTY_VALUE);
  const payRs = pick(args.draft?.rs, payment.rs ?? proposal.rs, EMPTY_VALUE);
  const payInn = pick(args.draft?.inn, payment.inn ?? proposal.inn, EMPTY_VALUE);
  const payKpp = pick(args.draft?.kpp, payment.kpp ?? proposal.kpp, EMPTY_VALUE);

  const sourceItems = (Array.isArray(payload.items) ? payload.items : []).map(asRecord);
  const baseItems = sourceItems.map((item): Omit<PaymentOrderPdfPreparedItem, "paidAll" | "paidThis" | "rest"> => {
    const qty = nnum(item.qty);
    const price = nnum(item.price);
    return {
      itemKey: itemKey(item),
      invoiceNumber: String(item.invoice_number ?? invoiceNumber ?? EMPTY_VALUE).trim() || EMPTY_VALUE,
      invoiceDate: String(item.invoice_date ?? invoiceDate ?? EMPTY_VALUE).trim() || EMPTY_VALUE,
      supplier: String(item.supplier ?? proposal.supplier ?? EMPTY_VALUE).trim() || EMPTY_VALUE,
      typeName: kindOf(item),
      name: String(item.name_human ?? item.name ?? "").trim(),
      uom: String(item.uom ?? "").trim(),
      qty,
      price,
      sum: round2(qty * price),
    };
  });

  const payAmount = round2(nnum(payment.amount));
  const totalPaid = round2(nnum(payment.total_paid));
  const itemsTotal = round2(baseItems.reduce((sum, item) => sum + item.sum, 0));
  const invoiceTotal = round2(nnum(proposal.items_total) > 0 ? nnum(proposal.items_total) : itemsTotal);
  const safeInvoiceTotal = invoiceTotal > 0 ? invoiceTotal : itemsTotal;
  const paidBefore = round2(Math.max(0, totalPaid - payAmount));

  const lineTotals = baseItems.map((item) => item.sum);
  const beforeAllocRaw = allocProportional(paidBefore, lineTotals);
  const beforeAlloc = beforeAllocRaw.map((value, index) => Math.min(round2(value), lineTotals[index]));
  const remain = lineTotals.map((value, index) => round2(Math.max(0, value - beforeAlloc[index])));

  const hasManual = manualAllocMap.size > 0;
  let thisAlloc = baseItems.map(() => 0);

  if (hasManual) {
    thisAlloc = baseItems.map((item, index) => {
      const wanted = round2(nnum(manualAllocMap.get(item.itemKey) ?? 0));
      return Math.min(wanted, nnum(remain[index]));
    });
  } else {
    const alloc = allocProportional(payAmount, remain);
    thisAlloc = alloc.map((value, index) => Math.min(round2(value), nnum(remain[index])));
  }

  const paidItemTotal = lineTotals.map((value, index) => round2(nnum(beforeAlloc[index]) + nnum(thisAlloc[index])));
  const restItem = lineTotals.map((value, index) => round2(Math.max(0, nnum(value) - nnum(paidItemTotal[index]))));
  const thisSum = round2(thisAlloc.reduce((sum, value) => sum + nnum(value), 0));
  const thisOverpay = round2(Math.max(0, payAmount - thisSum));
  const rest = round2(Math.max(0, safeInvoiceTotal - Math.min(safeInvoiceTotal, totalPaid)));
  const overpayAll = round2(Math.max(0, totalPaid - safeInvoiceTotal));
  const amountWords = moneyToWordsKGS(payAmount);
  const autoNote = hasManual
    ? "Распределение по позициям: РУЧНОЕ (внесено бухгалтером)."
    : "Распределение по позициям рассчитано автоматически (пропорционально сумме позиций).";

  const preparedItems: PaymentOrderPdfPreparedItem[] = baseItems.map((item, index) => ({
    ...item,
    paidAll: paidItemTotal[index],
    paidThis: thisAlloc[index],
    rest: restItem[index],
  }));

  const bills = groupBy(
    preparedItems,
    (item) => `${item.invoiceNumber}||${item.invoiceDate}||${item.supplier}`,
  ).map(([, billItems]) => ({
    invoiceNumber: billItems[0]?.invoiceNumber || EMPTY_VALUE,
    invoiceDate: billItems[0]?.invoiceDate || EMPTY_VALUE,
    supplier: billItems[0]?.supplier || EMPTY_VALUE,
    total: round2(billItems.reduce((sum, item) => sum + item.sum, 0)),
    groups: groupBy(billItems, (item) => item.typeName).map(([, typeItems]) => ({
      typeName: typeItems[0]?.typeName || "Прочее",
      total: round2(typeItems.reduce((sum, item) => sum + item.sum, 0)),
      paidAll: round2(typeItems.reduce((sum, item) => sum + item.paidAll, 0)),
      paidThis: round2(typeItems.reduce((sum, item) => sum + item.paidThis, 0)),
      rest: round2(typeItems.reduce((sum, item) => sum + item.rest, 0)),
      lines: typeItems.map((item) => ({
        name: item.name,
        uom: item.uom,
        qty: item.qty,
        price: item.price,
        sum: item.sum,
        paidAll: item.paidAll,
        paidThis: item.paidThis,
        rest: item.rest,
      })),
    })),
  }));

  return {
    company: {
      company_name: String(company.company_name ?? "").trim(),
      inn: String(company.inn ?? "").trim(),
      kpp: String(company.kpp ?? "").trim(),
      address: String(company.address ?? "").trim(),
      bank_name: String(company.bank_name ?? "").trim(),
      bik: String(company.bik ?? "").trim(),
      account: String(company.account ?? "").trim(),
      corr_account: String(company.corr_account ?? "").trim(),
      phone: String(company.phone ?? "").trim(),
      email: String(company.email ?? "").trim(),
    },
    header: {
      payment_id: String(payment.payment_id ?? args.paymentId).trim() || String(args.paymentId),
      proposal_id: String(proposal.proposal_id ?? "").trim(),
      paid_at: paidAt,
      currency,
      supplier,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      purpose,
      accountant_fio: accountantFio,
      method: String(payment.method ?? "").trim(),
      pay_bank: payBank,
      pay_bik: payBik,
      pay_rs: payRs,
      pay_inn: payInn,
      pay_kpp: payKpp,
      amount: payAmount,
      total_paid: totalPaid,
      invoice_total: safeInvoiceTotal,
      rest,
      overpay_all: overpayAll,
      this_overpay: thisOverpay,
      amount_words: amountWords,
      auto_note: autoNote,
      total_lines: preparedItems.length,
    },
    attachments,
    bills,
  };
}

export function createPaymentOrderPdfContract(args: {
  paymentId: number;
  payload: PaymentOrderPdfPayload;
  title?: string;
  fileName?: string;
}): PaymentOrderPdfContract {
  const entityId = String(args.payload.header.payment_id || args.paymentId).trim() || String(args.paymentId);
  const title = String(args.title ?? "").trim() || `Payment Order ${entityId}`;
  const fileName =
    String(args.fileName ?? "").trim() ||
    buildPdfFileName({
      documentType: "payment_order",
      title: args.payload.header.supplier || title,
      entityId,
    });

  return {
    version: 1,
    flow: "payment_order",
    template: "payment-order-v1",
    title,
    fileName,
    documentType: "payment_order",
    entityId,
    payload: args.payload,
  };
}

export function createPaymentPdfContractFromSource(args: {
  paymentId: number;
  draft?: PaymentPdfDraft;
  source: PaymentOrderPdfSource;
  title?: string;
  fileName?: string;
}): PaymentOrderPdfContract {
  const payload = shapePaymentOrderPdfPayload({
    paymentId: args.paymentId,
    draft: args.draft,
    source: args.source,
  });

  return createPaymentOrderPdfContract({
    paymentId: args.paymentId,
    payload,
    title: args.title,
    fileName: args.fileName,
  });
}

export async function preparePaymentOrderPdf(args: {
  paymentId: number;
  draft?: PaymentPdfDraft;
  title?: string;
  fileName?: string;
}): Promise<PreparedPaymentOrderPdf> {
  const source = await getPaymentPdfSource(args.paymentId);
  const observation = beginPdfLifecycleObservation({
    screen: "accountant",
    surface: "payment_pdf_shape",
    event: "payment_pdf_shape",
    stage: "data_shaping",
    sourceKind: source.source,
    context: {
      documentFamily: "payment_order",
      documentType: "payment_order",
      entityId: args.paymentId,
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      fileName: args.fileName ?? null,
    },
  });
  try {
    const contract = createPaymentPdfContractFromSource({
      paymentId: args.paymentId,
      draft: args.draft,
      source,
      title: args.title,
      fileName: args.fileName,
    });
    observation.success({
      extra: {
        billCount: contract.payload.bills.length,
        attachmentCount: contract.payload.attachments.length,
      },
    });
    return {
      source: source.source,
      branchMeta: source.branchMeta,
      contract,
    };
  } catch (error) {
    throw observation.error(error, {
      fallbackMessage: "Payment PDF shaping failed",
      extra: {
        paymentId: args.paymentId,
      },
    });
  }
}
