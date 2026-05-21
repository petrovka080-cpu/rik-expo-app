import { createDraftDocumentAsset } from "../documentAsset";
import { DOCUMENT_LIMITS } from "../documentLimits";
import type { DocumentAsset, DocumentKind, DocumentOwnerRole } from "../documentTypes";

export type DocumentIngestionInput = {
  id: string;
  orgId: string;
  ownerUserId: string;
  ownerRole: DocumentOwnerRole;
  documentKind?: DocumentKind;
  mimeType: string;
  byteSize: number;
  pageCount?: number;
  originalFileName?: string;
  createdAt: string;
  projectId?: string;
  workId?: string;
  requestId?: string;
  paymentId?: string;
  invoiceId?: string;
  supplierId?: string;
  companyId?: string;
};

export type DocumentIngestionResult = {
  passed: boolean;
  document?: DocumentAsset;
  rejectionReasonsRu: string[];
  finalLinkAllowed: false;
  dbWriteUsed: false;
};

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function ingestDocumentDraft(input: DocumentIngestionInput): DocumentIngestionResult {
  const rejectionReasonsRu: string[] = [];
  if (!ALLOWED_MIME.has(input.mimeType)) {
    rejectionReasonsRu.push("Тип документа не поддержан.");
  }
  if (input.mimeType === "application/pdf" && input.byteSize > DOCUMENT_LIMITS.maxPdfUploadBytes) {
    rejectionReasonsRu.push("PDF превышает безопасный лимит размера.");
  }
  if (input.mimeType !== "application/pdf" && input.byteSize > DOCUMENT_LIMITS.maxImageScanBytes) {
    rejectionReasonsRu.push("Скан документа превышает безопасный лимит размера.");
  }
  if ((input.pageCount ?? 1) > DOCUMENT_LIMITS.maxPagesPerDocument) {
    rejectionReasonsRu.push("В документе слишком много страниц для безопасной обработки.");
  }

  if (rejectionReasonsRu.length > 0) {
    return {
      passed: false,
      rejectionReasonsRu,
      finalLinkAllowed: false,
      dbWriteUsed: false,
    };
  }

  return {
    passed: true,
    document: createDraftDocumentAsset(input),
    rejectionReasonsRu,
    finalLinkAllowed: false,
    dbWriteUsed: false,
  };
}
