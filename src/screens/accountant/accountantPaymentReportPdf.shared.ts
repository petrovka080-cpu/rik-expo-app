import type {
  PaymentOrderPdfAttachment,
  PaymentOrderPdfBillGroup,
  PaymentOrderPdfCompany,
  PaymentOrderPdfContract,
  PaymentOrderPdfHeader,
  PaymentOrderPdfKindGroup,
  PaymentOrderPdfLine,
} from "../../lib/api/paymentPdf.service";

const trimText = (value: unknown) => String(value ?? "").trim();

const sanitizePathSegment = (value: string) =>
  trimText(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "version";

const normalizeNullableText = (value: unknown) => {
  const text = trimText(value);
  return text || null;
};

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function stableJsonStringify(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(trimText(value));
}

function hashString32(input: string): string {
  let hash = 2166136261;
  const source = String(input || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export const ACCOUNTANT_PAYMENT_REPORT_PDF_MANIFEST_VERSION =
  "pdf_acc_1_payment_report_manifest_v1";
export const ACCOUNTANT_PAYMENT_REPORT_PDF_DOCUMENT_KIND =
  "accountant_payment_report";
export const ACCOUNTANT_PAYMENT_REPORT_PDF_TEMPLATE_VERSION =
  "payment-order-v1";
export const ACCOUNTANT_PAYMENT_REPORT_PDF_RENDER_CONTRACT_VERSION =
  "local_payment_order_pdf_render_v1";
export const ACCOUNTANT_PAYMENT_REPORT_PDF_ARTIFACT_CONTRACT_VERSION =
  "accountant_payment_report_artifact_v1";

const ACCOUNTANT_PAYMENT_REPORT_PDF_SOURCE_VERSION_PREFIX = "aprep_src_v1";
const ACCOUNTANT_PAYMENT_REPORT_PDF_ARTIFACT_VERSION_PREFIX = "aprep_art_v1";
const ACCOUNTANT_PAYMENT_REPORT_PDF_SCOPE_VERSION_PREFIX = "aprep_scope_v1";
const ACCOUNTANT_PAYMENT_REPORT_PDF_ARTIFACT_ROOT =
  "accountant/payment-report/artifacts/v1";
const ACCOUNTANT_PAYMENT_REPORT_PDF_MANIFEST_ROOT =
  "accountant/payment-report/manifests/v1";

export type AccountantPaymentReportPdfManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type AccountantPaymentReportPdfDocumentScope = {
  role: "accountant";
  family: "payment_report";
  paymentId: string;
};

export type AccountantPaymentReportPdfManifestContract = {
  version: typeof ACCOUNTANT_PAYMENT_REPORT_PDF_MANIFEST_VERSION;
  documentKind: typeof ACCOUNTANT_PAYMENT_REPORT_PDF_DOCUMENT_KIND;
  documentScope: AccountantPaymentReportPdfDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  status: AccountantPaymentReportPdfManifestStatus;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastBuiltAt: string | null;
  lastSourceChangeAt: string | null;
  lastSuccessfulArtifact: string | null;
  templateVersion: typeof ACCOUNTANT_PAYMENT_REPORT_PDF_TEMPLATE_VERSION;
  renderContractVersion: typeof ACCOUNTANT_PAYMENT_REPORT_PDF_RENDER_CONTRACT_VERSION;
};

export function buildAccountantPaymentReportPdfDocumentScope(
  paymentId: string | number,
): AccountantPaymentReportPdfDocumentScope {
  const id = trimText(paymentId);
  if (!id) {
    throw new Error("accountant payment report manifest missing paymentId");
  }
  return {
    role: "accountant",
    family: "payment_report",
    paymentId: id,
  };
}

function normalizeCompany(company: PaymentOrderPdfCompany) {
  return {
    company_name: normalizeNullableText(company.company_name),
    inn: normalizeNullableText(company.inn),
    kpp: normalizeNullableText(company.kpp),
    address: normalizeNullableText(company.address),
    bank_name: normalizeNullableText(company.bank_name),
    bik: normalizeNullableText(company.bik),
    account: normalizeNullableText(company.account),
    corr_account: normalizeNullableText(company.corr_account),
    phone: normalizeNullableText(company.phone),
    email: normalizeNullableText(company.email),
  };
}

function normalizeHeader(header: PaymentOrderPdfHeader) {
  return {
    payment_id: normalizeNullableText(header.payment_id),
    proposal_id: normalizeNullableText(header.proposal_id),
    paid_at: normalizeNullableText(header.paid_at),
    currency: normalizeNullableText(header.currency),
    supplier: normalizeNullableText(header.supplier),
    invoice_number: normalizeNullableText(header.invoice_number),
    invoice_date: normalizeNullableText(header.invoice_date),
    purpose: normalizeNullableText(header.purpose),
    accountant_fio: normalizeNullableText(header.accountant_fio),
    method: normalizeNullableText(header.method),
    pay_bank: normalizeNullableText(header.pay_bank),
    pay_bik: normalizeNullableText(header.pay_bik),
    pay_rs: normalizeNullableText(header.pay_rs),
    pay_inn: normalizeNullableText(header.pay_inn),
    pay_kpp: normalizeNullableText(header.pay_kpp),
    amount: normalizeNumber(header.amount),
    total_paid: normalizeNumber(header.total_paid),
    invoice_total: normalizeNumber(header.invoice_total),
    rest: normalizeNumber(header.rest),
    overpay_all: normalizeNumber(header.overpay_all),
    this_overpay: normalizeNumber(header.this_overpay),
    amount_words: normalizeNullableText(header.amount_words),
    auto_note: normalizeNullableText(header.auto_note),
    total_lines: normalizeNumber(header.total_lines),
  };
}

function normalizeAttachment(attachment: PaymentOrderPdfAttachment, index: number) {
  return {
    index,
    name: normalizeNullableText(attachment.name),
    url: normalizeNullableText(attachment.url),
    kind: normalizeNullableText(attachment.kind),
  };
}

function normalizeLine(line: PaymentOrderPdfLine, index: number) {
  return {
    index,
    name: normalizeNullableText(line.name),
    uom: normalizeNullableText(line.uom),
    qty: normalizeNumber(line.qty),
    price: normalizeNumber(line.price),
    sum: normalizeNumber(line.sum),
    paidAll: normalizeNumber(line.paidAll),
    paidThis: normalizeNumber(line.paidThis),
    rest: normalizeNumber(line.rest),
  };
}

function normalizeKindGroup(group: PaymentOrderPdfKindGroup, index: number) {
  const lines = Array.isArray(group.lines) ? group.lines : [];
  return {
    index,
    typeName: normalizeNullableText(group.typeName),
    total: normalizeNumber(group.total),
    paidAll: normalizeNumber(group.paidAll),
    paidThis: normalizeNumber(group.paidThis),
    rest: normalizeNumber(group.rest),
    lines: lines.map(normalizeLine),
  };
}

function normalizeBillGroup(group: PaymentOrderPdfBillGroup, index: number) {
  const groups = Array.isArray(group.groups) ? group.groups : [];
  return {
    index,
    invoiceNumber: normalizeNullableText(group.invoiceNumber),
    invoiceDate: normalizeNullableText(group.invoiceDate),
    supplier: normalizeNullableText(group.supplier),
    total: normalizeNumber(group.total),
    groups: groups.map(normalizeKindGroup),
  };
}

export function buildAccountantPaymentReportPdfSourceModel(
  contract: PaymentOrderPdfContract,
) {
  const attachments = Array.isArray(contract.payload.attachments)
    ? contract.payload.attachments
    : [];
  const bills = Array.isArray(contract.payload.bills)
    ? contract.payload.bills
    : [];

  return {
    contract: {
      version: contract.version,
      flow: contract.flow,
      template: contract.template,
      documentType: contract.documentType,
      entityId: normalizeNullableText(contract.entityId),
    },
    payload: {
      company: normalizeCompany(contract.payload.company),
      header: normalizeHeader(contract.payload.header),
      attachments: attachments.map(normalizeAttachment),
      bills: bills.map(normalizeBillGroup),
    },
  };
}

export function buildAccountantPaymentReportPdfClientSourceFingerprint(
  contract: PaymentOrderPdfContract,
) {
  const documentScope = buildAccountantPaymentReportPdfDocumentScope(contract.entityId);
  const sourceModel = buildAccountantPaymentReportPdfSourceModel(contract);
  return `aprep_client_v1_${hashString32(stableJsonStringify({
    version: "accountant_payment_report_client_source_v1",
    documentScope,
    sourceModel,
  }))}`;
}

export function buildAccountantPaymentReportPdfManifestContract(
  contract: PaymentOrderPdfContract,
): AccountantPaymentReportPdfManifestContract {
  const documentScope = buildAccountantPaymentReportPdfDocumentScope(contract.entityId);
  const fileName = trimText(contract.fileName) || "accountant_payment_report.pdf";
  const sourceModel = buildAccountantPaymentReportPdfSourceModel(contract);
  const clientSourceFingerprint =
    buildAccountantPaymentReportPdfClientSourceFingerprint(contract);
  const sourceIdentity = {
    contractVersion: ACCOUNTANT_PAYMENT_REPORT_PDF_MANIFEST_VERSION,
    documentKind: ACCOUNTANT_PAYMENT_REPORT_PDF_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "accountant_payment_report_rpc_source_v1",
      clientSourceFingerprint,
      sourceModel,
    },
  };
  const sourceVersion = `${ACCOUNTANT_PAYMENT_REPORT_PDF_SOURCE_VERSION_PREFIX}_${hashString32(stableJsonStringify(sourceIdentity))}`;
  const artifactVersion = `${ACCOUNTANT_PAYMENT_REPORT_PDF_ARTIFACT_VERSION_PREFIX}_${hashString32(stableJsonStringify({
    artifactContractVersion: ACCOUNTANT_PAYMENT_REPORT_PDF_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: ACCOUNTANT_PAYMENT_REPORT_PDF_TEMPLATE_VERSION,
    renderContractVersion: ACCOUNTANT_PAYMENT_REPORT_PDF_RENDER_CONTRACT_VERSION,
  }))}`;
  const scopeHash = hashString32(stableJsonStringify({
    scopeVersion: ACCOUNTANT_PAYMENT_REPORT_PDF_SCOPE_VERSION_PREFIX,
    documentKind: ACCOUNTANT_PAYMENT_REPORT_PDF_DOCUMENT_KIND,
    documentScope,
  }));

  return {
    version: ACCOUNTANT_PAYMENT_REPORT_PDF_MANIFEST_VERSION,
    documentKind: ACCOUNTANT_PAYMENT_REPORT_PDF_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    status: "ready",
    artifactPath: `${ACCOUNTANT_PAYMENT_REPORT_PDF_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${ACCOUNTANT_PAYMENT_REPORT_PDF_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastBuiltAt: null,
    lastSourceChangeAt: null,
    lastSuccessfulArtifact: null,
    templateVersion: ACCOUNTANT_PAYMENT_REPORT_PDF_TEMPLATE_VERSION,
    renderContractVersion: ACCOUNTANT_PAYMENT_REPORT_PDF_RENDER_CONTRACT_VERSION,
  };
}
