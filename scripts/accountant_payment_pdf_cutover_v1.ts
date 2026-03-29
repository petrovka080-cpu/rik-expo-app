import fs from "node:fs";
import path from "node:path";

import { createVerifierAdmin } from "./_shared/testUserDiscipline";

type JsonRecord = Record<string, unknown>;

type PaymentRow = {
  id?: number | null;
  proposal_id?: string | null;
};

type NormalizedRow = {
  itemKey: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: string | null;
  rikCode: string | null;
  name: string | null;
  uom: string | null;
  qty: number;
  price: number;
  sum: number;
};

type NormalizedSummary = {
  amount: number;
  totalPaid: number;
  invoiceTotal: number;
  rest: number;
  overpayAll: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: string | null;
  totalLines: number;
  attachmentsCount: number;
  allocationsCount: number;
  rows: NormalizedRow[];
};

type SampleCheck = {
  paymentId: number;
  proposalId: string | null;
  canonicalSummary: NormalizedSummary;
  legacySummary: NormalizedSummary;
  headerParityOk: boolean;
  rowsParityOk: boolean;
  attachmentsParityOk: boolean;
  allocationsParityOk: boolean;
  overallParityOk: boolean;
};

const projectRoot = process.cwd();
const artifactBase = path.join(projectRoot, "artifacts", "accountant-payment-pdf-cutover-v1");
const admin = createVerifierAdmin("accountant-payment-pdf-cutover-v1");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const extractBlock = (source: string, marker: string) => {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const bodyStart = source.indexOf("{", markerIndex);
  if (bodyStart < 0) return "";
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(markerIndex, index + 1);
      }
    }
  }
  return source.slice(markerIndex);
};

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const asRecordArray = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const asTextOrNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const asNumber = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeRows = (rowsValue: unknown, fallback: {
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  supplier?: string | null;
}) =>
  asRecordArray(rowsValue).map((row) => {
    const qty = asNumber(row.qty);
    const price = asNumber(row.price);
    return {
      itemKey: asTextOrNull(
        row.proposal_item_id ?? row.proposalItemId ?? row.pi_id ?? row.item_id ?? row.id,
      ) ?? "",
      invoiceNumber: asTextOrNull(row.invoice_number) ?? fallback.invoiceNumber ?? null,
      invoiceDate: asTextOrNull(row.invoice_date) ?? fallback.invoiceDate ?? null,
      supplier: asTextOrNull(row.supplier) ?? fallback.supplier ?? null,
      rikCode: asTextOrNull(row.rik_code),
      name: asTextOrNull(row.name_human ?? row.name),
      uom: asTextOrNull(row.uom),
      qty,
      price,
      sum: round2(qty * price),
    } satisfies NormalizedRow;
  });

const summarizeLegacyPayload = (payloadValue: unknown, allocationsValue: unknown): NormalizedSummary => {
  const payload = asRecord(payloadValue);
  const payment = asRecord(payload.payment);
  const proposal = asRecord(payload.proposal);
  const supplier = asTextOrNull(proposal.supplier ?? payment.supplier ?? payload.supplier);
  const invoiceNumber = asTextOrNull(proposal.invoice_number ?? payment.invoice_number);
  const invoiceDate = asTextOrNull(proposal.invoice_date ?? payment.invoice_date);
  const rows = normalizeRows(payload.items, {
    invoiceNumber,
    invoiceDate,
    supplier,
  });
  const attachmentsCount = Array.isArray(payload.attachments)
    ? payload.attachments.length
    : Array.isArray(payload.payment_files)
      ? payload.payment_files.length
      : Array.isArray(payload.files)
        ? payload.files.length
        : 0;
  const itemsTotal = round2(rows.reduce((sum, row) => sum + row.sum, 0));
  const invoiceTotalCandidate = asNumber(proposal.items_total);
  const invoiceTotal = invoiceTotalCandidate > 0 ? round2(invoiceTotalCandidate) : itemsTotal;
  const totalPaid = round2(asNumber(payment.total_paid));
  return {
    amount: round2(asNumber(payment.amount)),
    totalPaid,
    invoiceTotal,
    rest: round2(Math.max(0, invoiceTotal - Math.min(invoiceTotal, totalPaid))),
    overpayAll: round2(Math.max(0, totalPaid - invoiceTotal)),
    invoiceNumber,
    invoiceDate,
    supplier,
    totalLines: rows.length,
    attachmentsCount,
    allocationsCount: asRecordArray(allocationsValue).length,
    rows,
  };
};

const summarizeCanonicalEnvelope = (envelopeValue: unknown): NormalizedSummary => {
  const envelope = asRecord(envelopeValue);
  const header = asRecord(envelope.header);
  const payment = asRecord(header.payment);
  const proposal = asRecord(header.proposal);
  const supplier = asTextOrNull(proposal.supplier ?? payment.supplier ?? header.supplier);
  const invoiceNumber = asTextOrNull(proposal.invoice_number ?? payment.invoice_number);
  const invoiceDate = asTextOrNull(proposal.invoice_date ?? payment.invoice_date);
  const rows = normalizeRows(envelope.rows, {
    invoiceNumber,
    invoiceDate,
    supplier,
  });
  const totals = asRecord(envelope.totals);
  const itemsTotal = round2(rows.reduce((sum, row) => sum + row.sum, 0));
  const invoiceTotalCandidate = asNumber(proposal.items_total);
  const invoiceTotal = invoiceTotalCandidate > 0 ? round2(invoiceTotalCandidate) : itemsTotal;
  const totalPaid = round2(asNumber(totals.total_paid));
  return {
    amount: round2(asNumber(totals.amount)),
    totalPaid,
    invoiceTotal,
    rest: round2(Math.max(0, invoiceTotal - Math.min(invoiceTotal, totalPaid))),
    overpayAll: round2(Math.max(0, totalPaid - invoiceTotal)),
    invoiceNumber,
    invoiceDate,
    supplier,
    totalLines: rows.length,
    attachmentsCount: Array.isArray(envelope.attachments_meta) ? envelope.attachments_meta.length : 0,
    allocationsCount: asRecordArray(envelope.allocations).length,
    rows,
  };
};

const rowSignature = (row: NormalizedRow) =>
  [
    row.itemKey,
    row.invoiceNumber ?? "",
    row.invoiceDate ?? "",
    row.supplier ?? "",
    row.rikCode ?? "",
    row.name ?? "",
    row.uom ?? "",
    row.qty,
    row.price,
    row.sum,
  ].join("|");

const headerSignature = (summary: NormalizedSummary) =>
  JSON.stringify({
    amount: summary.amount,
    totalPaid: summary.totalPaid,
    invoiceTotal: summary.invoiceTotal,
    rest: summary.rest,
    overpayAll: summary.overpayAll,
    invoiceNumber: summary.invoiceNumber,
    invoiceDate: summary.invoiceDate,
    supplier: summary.supplier,
    totalLines: summary.totalLines,
  });

async function loadPaymentSamples(limit: number) {
  const result = await admin
    .from("proposal_payments")
    .select("id, proposal_id")
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (result.error) throw result.error;
  return (result.data ?? []) as PaymentRow[];
}

async function verifySample(paymentRow: PaymentRow): Promise<SampleCheck> {
  const paymentId = Number(paymentRow.id ?? 0);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error(`Invalid payment id in sample: ${JSON.stringify(paymentRow)}`);
  }

  const [canonicalRpc, legacyRpc, allocationsQuery] = await Promise.all([
    admin.rpc("pdf_payment_source_v1", { p_payment_id: paymentId }),
    admin.rpc("get_payment_order_data", { p_payment_id: paymentId }),
    admin
      .from("proposal_payment_allocations")
      .select("proposal_item_id, amount")
      .eq("payment_id", paymentId),
  ]);

  if (canonicalRpc.error) throw canonicalRpc.error;
  if (legacyRpc.error) throw legacyRpc.error;
  if (allocationsQuery.error) throw allocationsQuery.error;

  const canonicalSummary = summarizeCanonicalEnvelope(canonicalRpc.data);
  const legacySummary = summarizeLegacyPayload(legacyRpc.data, allocationsQuery.data ?? []);

  const headerParityOk = headerSignature(canonicalSummary) === headerSignature(legacySummary);
  const rowsParityOk =
    JSON.stringify(canonicalSummary.rows.map(rowSignature)) === JSON.stringify(legacySummary.rows.map(rowSignature));
  const attachmentsParityOk = canonicalSummary.attachmentsCount === legacySummary.attachmentsCount;
  const allocationsParityOk = canonicalSummary.allocationsCount === legacySummary.allocationsCount;

  return {
    paymentId,
    proposalId: asTextOrNull(paymentRow.proposal_id),
    canonicalSummary,
    legacySummary,
    headerParityOk,
    rowsParityOk,
    attachmentsParityOk,
    allocationsParityOk,
    overallParityOk: headerParityOk && rowsParityOk && attachmentsParityOk && allocationsParityOk,
  };
}

async function main() {
  const source = readSource("src/lib/api/paymentPdf.service.ts");
  const getterSource = extractBlock(source, "export async function getPaymentPdfSource(");

  const sourceBoundary = {
    getterRpcOnly:
      getterSource.includes("assertPaymentPdfRpcPrimary(")
      && getterSource.includes("recordPaymentPdfRpcFailure(")
      && !getterSource.includes("fetchPaymentPdfSourceFallback")
      && !getterSource.includes("legacySource")
      && !getterSource.includes("get_payment_order_data")
      && !getterSource.includes("legacy_fallback"),
    fileLegacyMarkersRemoved:
      !source.includes('sourceBranch: "legacy_fallback"')
      && !source.includes("rpc:get_payment_order_data")
      && !source.includes("get_payment_order_data failed")
      && !source.includes(".from(\"proposal_payment_allocations\")"),
    filePrimarySourceExplicit:
      source.includes('source: "rpc:pdf_payment_source_v1"')
      && source.includes('event: "payment_pdf_rpc_source_failed"')
      && source.includes('kind: "critical_fail"'),
  };

  const sampleRows = await loadPaymentSamples(5);
  const sampledChecks: SampleCheck[] = [];
  for (const sample of sampleRows) {
    sampledChecks.push(await verifySample(sample));
  }

  const parityPassedCount = sampledChecks.filter((item) => item.overallParityOk).length;
  const parityFailedCount = sampledChecks.length - parityPassedCount;
  const gate =
    sourceBoundary.getterRpcOnly
    && sourceBoundary.fileLegacyMarkersRemoved
    && sourceBoundary.filePrimarySourceExplicit
    && sampledChecks.length > 0
    && parityFailedCount === 0
      ? "GREEN"
      : "NOT_GREEN";

  const summary = {
    status: gate === "GREEN" ? "passed" : "failed",
    gate,
    primaryOwner: "rpc_v1",
    sourceKind: "rpc:pdf_payment_source_v1",
    fallbackUsed: false,
    sampledPaymentIds: sampledChecks.map((item) => item.paymentId),
    parityPassedCount,
    parityFailedCount,
    sourceBoundary,
    assertions: {
      no_pdf_fallback: sourceBoundary.getterRpcOnly && sourceBoundary.fileLegacyMarkersRemoved,
      paymentPdfRpcOnly: sourceBoundary.getterRpcOnly,
      liveRpcSamplesOk: sampledChecks.length > 0,
      legacyParityOk: parityFailedCount === 0,
    },
  };

  writeJson(`${artifactBase}.json`, {
    summary,
    sampledChecks,
    sourceBoundary,
  });
  writeJson(`${artifactBase}.summary.json`, summary);

  console.log(JSON.stringify(summary, null, 2));

  if (gate !== "GREEN") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
