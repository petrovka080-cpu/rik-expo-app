import { createDocumentContentHash } from "./documentHashService";
import { createDocumentPreviewRefs } from "./documentPreviewService";
import type { DocumentAsset, DocumentKind, DocumentOwnerRole } from "./documentTypes";

export function createDraftDocumentAsset(input: {
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
  actId?: string;
  supplierId?: string;
  companyId?: string;
}): DocumentAsset {
  const documentKind = input.documentKind ?? "unknown";
  const storageKey = `documents/${input.orgId}/${input.id}/original`;
  return {
    id: input.id,
    orgId: input.orgId,
    projectId: input.projectId,
    workId: input.workId,
    requestId: input.requestId,
    paymentId: input.paymentId,
    invoiceId: input.invoiceId,
    actId: input.actId,
    supplierId: input.supplierId,
    companyId: input.companyId,
    ownerUserId: input.ownerUserId,
    ownerRole: input.ownerRole,
    documentKind,
    originalFileName: input.originalFileName,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    pageCount: input.pageCount,
    storageKey,
    contentHash: createDocumentContentHash(input),
    createdAt: input.createdAt,
    preview: createDocumentPreviewRefs({ documentId: input.id, pageCount: input.pageCount }),
    visibility: {
      rolesAllowed: ["director", "accountant", "office", input.ownerRole],
      clientVisible: false,
      requiresSignedUrl: true,
    },
    reviewStatus: "draft",
    aiStatus: "not_processed",
    finalLinkedByHuman: false,
    extractedDataStatus: "not_extracted",
  };
}
