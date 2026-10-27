import type { DocumentAsset, DocumentOwnerRole } from "./documentTypes";

export function buildDocumentVisibilityPolicy(input: {
  rolesAllowed?: DocumentOwnerRole[];
  clientVisible?: boolean;
}): DocumentAsset["visibility"] {
  return {
    rolesAllowed: input.rolesAllowed ?? ["director", "accountant", "office"],
    clientVisible: input.clientVisible ?? false,
    requiresSignedUrl: true,
  };
}
