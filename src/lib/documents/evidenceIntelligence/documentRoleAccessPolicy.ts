import type { DocumentAsset, DocumentOwnerRole } from "./documentTypes";

export function canRoleOpenDocument(input: {
  document: DocumentAsset;
  requesterRole: DocumentOwnerRole;
}): { canOpen: boolean; reasonRu?: string } {
  if (input.requesterRole === "admin" || input.requesterRole === "security") {
    return { canOpen: true };
  }
  if (input.document.visibility.rolesAllowed.includes(input.requesterRole)) {
    return { canOpen: true };
  }
  if (input.requesterRole === "client" && input.document.visibility.clientVisible) {
    return { canOpen: true };
  }
  return {
    canOpen: false,
    reasonRu: "Документ скрыт по роли пользователя.",
  };
}
