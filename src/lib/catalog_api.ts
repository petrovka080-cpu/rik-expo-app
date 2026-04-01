// src/lib/catalog_api.ts
import type { PaymentPdfDraft } from "./api/types";
import {
  buildProposalPdfHtml as buildProposalPdfHtmlFromApi,
  exportProposalPdf as exportProposalPdfFromApi,
} from "./api/pdf_proposal";
import { exportPaymentOrderPdf as exportPaymentOrderPdfFromApi } from "./api/pdf_payment";
import {
  batchResolveRequestLabels as batchResolveRequestLabelsFromPdfRequest,
  exportRequestPdf as exportRequestPdfFromApi,
} from "./api/pdf_request";
import {
  generatePaymentOrderPdfDocument as generatePaymentOrderPdfDocumentDescriptor,
  generateProposalPdfDocument as generateProposalPdfDocumentDescriptor,
  generateRequestPdfDocument as generateRequestPdfDocumentDescriptor,
} from "./documents/pdfDocumentGenerators";

export {
  ensureRequestSmart,
  requestCreateDraft,
  requestSubmit,
  addRequestItemFromRik,
  addRequestItemsFromRikBatch,
  clearCachedDraftRequestId,
} from "./api/requests";
export { directorReturnToBuyer } from "./api/director";
export { listBuyerInbox } from "./api/buyer";
export {
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  proposalItems,
  proposalSnapshotItems,
  proposalSetItemsMeta,
  listDirectorProposalsPending,
} from "./api/proposals";
export {
  proposalSendToAccountant,
  listAccountantInbox,
  accountantReturnToBuyer,
  accountantAddPayment,
} from "./api/accountant";
export { notifList, notifMarkRead } from "./api/notifications";
export type { BuyerInboxRow, AccountantInboxRow } from "./api/types";

export type {
  CatalogItem,
  CatalogGroup,
  UomRef,
  IncomingItem,
  Supplier,
  UnifiedCounterpartyType,
  UnifiedCounterparty,
} from "./catalog/catalog.facade";
export {
  listUnifiedCounterparties,
  searchCatalogItems,
  listCatalogGroups,
  listUoms,
  listIncomingItems,
  listSuppliers,
  rikQuickSearch,
} from "./catalog/catalog.facade";

export type {
  RequestHeader,
  RequestItem,
  ReqItemRow,
  ForemanRequestSummary,
  RequestDetails,
  RequestMetaPatch,
} from "./catalog/catalog.request.service";
export {
  getLocalDraftId,
  setLocalDraftId,
  clearLocalDraftId,
  getOrCreateDraftRequestId,
  getRequestHeader,
  fetchRequestDisplayNo,
  fetchRequestDetails,
  updateRequestMeta,
  listRequestItems,
  requestItemUpdateQty,
  listForemanRequests,
  requestItemCancel,
} from "./catalog/catalog.request.service";

export type {
  ProposalBucketInput,
  CreateProposalsOptions,
  CreateProposalsResult,
} from "./catalog/catalog.proposalCreation.service";
export { createProposalsBySupplier } from "./catalog/catalog.proposalCreation.service";

export async function batchResolveRequestLabels(
  ids: Array<string | number>,
): Promise<Record<string, string>> {
  return await batchResolveRequestLabelsFromPdfRequest(ids);
}

export async function exportRequestPdf(
  requestId: string,
  mode: "preview" | "share" = "preview",
): Promise<string> {
  void mode;
  return await exportRequestPdfFromApi(requestId);
}

export async function generateRequestPdfDocument(requestId: string) {
  return await generateRequestPdfDocumentDescriptor({
    requestId,
    originModule: "director",
  });
}

export async function buildProposalPdfHtml(proposalId: string | number): Promise<string> {
  return await buildProposalPdfHtmlFromApi(proposalId);
}

export async function exportProposalPdf(
  proposalId: string | number,
  mode: "preview" | "share" = "preview",
): Promise<string> {
  return await exportProposalPdfFromApi(proposalId, mode);
}

export async function generateProposalPdfDocument(
  proposalId: string | number,
  originModule: "buyer" | "accountant" | "director" = "buyer",
) {
  return await generateProposalPdfDocumentDescriptor({ proposalId, originModule });
}

export async function exportPaymentOrderPdf(
  paymentId: string | number,
  modeOrDraft: "preview" | "share" | PaymentPdfDraft = "preview",
): Promise<string> {
  const draft = typeof modeOrDraft === "string" ? undefined : modeOrDraft;
  return await exportPaymentOrderPdfFromApi(Number(paymentId), draft);
}

export async function generatePaymentOrderPdfDocument(
  paymentId: string | number,
  originModule: "accountant" | "director" = "accountant",
) {
  return await generatePaymentOrderPdfDocumentDescriptor({ paymentId, originModule });
}

export async function uploadProposalAttachment(
  proposalId: string,
  file: unknown,
  filename: string,
  kind: "invoice" | "payment" | "proposal_pdf" | string,
): Promise<void> {
  const mod = await import("./api/storage");
  return await mod.uploadProposalAttachment(proposalId, file, filename, kind);
}
