import type { DocumentAsset, DocumentOwnerRole } from "../documentTypes";
import { canRoleOpenDocument } from "../documentRoleAccessPolicy";

export type DocumentSignedUrlPolicy = {
  documentId: string;
  requesterUserId: string;
  requesterRole: DocumentOwnerRole;
  orgId: string;
  ttlSeconds: number;
  canIssue: boolean;
  reasonRu?: string;
  logSafe: {
    canLogUrl: false;
    canLogStorageKey: false;
    canLogDocumentId: true;
  };
};

export function buildDocumentSignedUrlPolicy(input: {
  document: DocumentAsset;
  requesterUserId: string;
  requesterRole: DocumentOwnerRole;
  orgId: string;
  ttlSeconds?: number;
}): DocumentSignedUrlPolicy {
  const access = canRoleOpenDocument({ document: input.document, requesterRole: input.requesterRole });
  return {
    documentId: input.document.id,
    requesterUserId: input.requesterUserId,
    requesterRole: input.requesterRole,
    orgId: input.orgId,
    ttlSeconds: input.ttlSeconds ?? 300,
    canIssue: access.canOpen,
    reasonRu: access.reasonRu,
    logSafe: {
      canLogUrl: false,
      canLogStorageKey: false,
      canLogDocumentId: true,
    },
  };
}
