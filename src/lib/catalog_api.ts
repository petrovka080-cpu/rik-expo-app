// src/lib/catalog_api.ts
import type { PaymentPdfDraft } from "./api/types";

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
  const mod = await import("./api/pdf_request");
  return await mod.batchResolveRequestLabels(ids);
}

export async function exportRequestPdf(
  requestId: string,
  mode: "preview" | "share" = "preview",
): Promise<string> {
  const mod = await import("./api/pdf_request");
  void mode;
  return await mod.exportRequestPdf(requestId);
}

export async function generateRequestPdfDocument(requestId: string) {
  const mod = await import("./documents/pdfDocumentGenerators");
  return await mod.generateRequestPdfDocument({
    requestId,
    originModule: "director",
  });
}

export async function buildProposalPdfHtml(proposalId: string | number): Promise<string> {
  const mod = await import("./api/pdf_proposal");
  return await mod.buildProposalPdfHtml(proposalId);
}

export async function exportProposalPdf(
  proposalId: string | number,
  mode: "preview" | "share" = "preview",
): Promise<string> {
  const mod = await import("./api/pdf_proposal");
  return await mod.exportProposalPdf(proposalId, mode);
}

export async function generateProposalPdfDocument(
  proposalId: string | number,
  originModule: "buyer" | "accountant" | "director" = "buyer",
) {
  const mod = await import("./documents/pdfDocumentGenerators");
  return await mod.generateProposalPdfDocument({ proposalId, originModule });
}

export async function exportPaymentOrderPdf(
  paymentId: string | number,
  modeOrDraft: "preview" | "share" | PaymentPdfDraft = "preview",
): Promise<string> {
  const mod = await import("./api/pdf_payment");
  const draft = typeof modeOrDraft === "string" ? undefined : modeOrDraft;
  return await mod.exportPaymentOrderPdf(Number(paymentId), draft);
}

export async function generatePaymentOrderPdfDocument(
  paymentId: string | number,
  originModule: "accountant" | "director" = "accountant",
) {
  const mod = await import("./documents/pdfDocumentGenerators");
  return await mod.generatePaymentOrderPdfDocument({ paymentId, originModule });
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
