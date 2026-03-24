import { renderPdfHtmlToUri } from "../pdf/pdf.runner";
import { renderPaymentOrderPdfHtml } from "../pdf/pdf.payment";
import {
  preparePaymentOrderPdf,
  type PaymentOrderPdfAttachment,
  type PaymentOrderPdfBillGroup,
  type PaymentOrderPdfCompany,
  type PaymentOrderPdfContract,
  type PaymentOrderPdfHeader,
} from "./paymentPdf.service";
import type { PaymentPdfDraft } from "./types";

export function renderPaymentOrderHtml(contract: PaymentOrderPdfContract): string {
  return renderPaymentOrderPdfHtml(contract);
}

export async function buildPaymentOrderHtml(paymentId: number, draft?: PaymentPdfDraft): Promise<string> {
  const prepared = await preparePaymentOrderPdf({ paymentId, draft });
  return renderPaymentOrderPdfHtml(prepared.contract);
}

export async function exportPaymentOrderPdfContract(contract: PaymentOrderPdfContract): Promise<string> {
  return renderPdfHtmlToUri({
    html: renderPaymentOrderPdfHtml(contract),
    documentType: "payment_order",
    source: "payment_order_pdf",
  });
}

export async function exportPaymentOrderPdf(paymentId: number, draft?: PaymentPdfDraft): Promise<string> {
  const prepared = await preparePaymentOrderPdf({ paymentId, draft });
  return exportPaymentOrderPdfContract(prepared.contract);
}

export type {
  PaymentOrderPdfAttachment,
  PaymentOrderPdfBillGroup,
  PaymentOrderPdfCompany,
  PaymentOrderPdfContract,
  PaymentOrderPdfHeader,
};
