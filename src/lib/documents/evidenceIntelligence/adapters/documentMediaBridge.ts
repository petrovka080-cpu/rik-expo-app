import type { MediaAsset } from "../../../media";
import { createDraftDocumentAsset } from "../documentAsset";
import type { DocumentAsset } from "../documentTypes";

export function createDocumentDraftFromMediaScan(input: {
  mediaAsset: MediaAsset;
  documentId: string;
  createdAt: string;
}): {
  document: DocumentAsset;
  finalLinkAllowed: false;
  requiresHumanReview: true;
} {
  return {
    document: createDraftDocumentAsset({
      id: input.documentId,
      orgId: input.mediaAsset.orgId,
      projectId: input.mediaAsset.projectId,
      ownerUserId: input.mediaAsset.ownerUserId,
      ownerRole: input.mediaAsset.ownerRole,
      documentKind: "photo_document_scan",
      mimeType: input.mediaAsset.mimeType,
      byteSize: input.mediaAsset.byteSize,
      createdAt: input.createdAt,
      workId: input.mediaAsset.workId,
      requestId: input.mediaAsset.requestId,
      paymentId: input.mediaAsset.paymentId,
      invoiceId: input.mediaAsset.invoiceId,
      actId: input.mediaAsset.actId,
    }),
    finalLinkAllowed: false,
    requiresHumanReview: true,
  };
}
