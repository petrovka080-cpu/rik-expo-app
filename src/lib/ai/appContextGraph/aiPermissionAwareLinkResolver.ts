import {
  buildAiDeepLink,
  getAiDeepLinkDefinition,
  type AiAppPermission,
} from "./aiDeepLinkRegistry";
import type { AiSourceRef } from "./aiSourceRef";

export type AiContextGraphRole =
  | "director"
  | "control"
  | "foreman"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "office"
  | "documents"
  | "admin"
  | "unknown"
  | string;

export type AiPermissionDecision = {
  canOpen: boolean;
  requiredPermission: AiAppPermission;
  reasonRu?: string;
};

export const AI_APP_CONTEXT_GRAPH_PERMISSION_MATRIX: Readonly<Record<string, readonly AiAppPermission[]>> =
  Object.freeze({
    director: [
      "procurement.read",
      "warehouse.read",
      "finance.read",
      "field.read",
      "documents.read",
      "marketplace.read",
      "reports.read",
      "admin.read",
    ],
    control: [
      "procurement.read",
      "warehouse.read",
      "finance.read",
      "field.read",
      "documents.read",
      "marketplace.read",
      "reports.read",
      "admin.read",
    ],
    admin: ["documents.read", "reports.read", "admin.read"],
    foreman: ["procurement.read", "warehouse.read", "field.read", "documents.read", "reports.read"],
    buyer: ["procurement.read", "warehouse.read", "documents.read", "marketplace.read", "reports.read"],
    accountant: ["finance.read", "procurement.read", "warehouse.read", "documents.read", "reports.read"],
    warehouse: ["warehouse.read", "procurement.read", "field.read", "documents.read", "marketplace.read", "reports.read"],
    contractor: ["field.read", "documents.read", "reports.read"],
    office: ["procurement.read", "field.read", "documents.read", "reports.read"],
    documents: ["documents.read", "reports.read"],
    unknown: [],
  });

export function permissionsForAiContextRole(role: AiContextGraphRole): AiAppPermission[] {
  return [...(AI_APP_CONTEXT_GRAPH_PERMISSION_MATRIX[String(role)] ?? [])];
}

export function canRoleOpenAiPermission(role: AiContextGraphRole, permission: AiAppPermission): boolean {
  return permissionsForAiContextRole(role).includes(permission);
}

export function resolveAiPermissionForRef(role: AiContextGraphRole, ref: AiSourceRef): AiPermissionDecision {
  const definition = getAiDeepLinkDefinition(ref.entityType);
  const canOpen = canRoleOpenAiPermission(role, definition.requiredPermission);
  return {
    canOpen,
    requiredPermission: definition.requiredPermission,
    reasonRu: canOpen ? undefined : `Роль ${String(role)} не имеет права ${definition.requiredPermission}.`,
  };
}

export function resolveAiSourceRefForRole(
  ref: AiSourceRef,
  role: AiContextGraphRole,
  routeParams?: Record<string, string>,
  options?: { includeBlockedAppLink?: boolean },
): AiSourceRef {
  const decision = resolveAiPermissionForRef(role, ref);
  const shouldExposeLink = decision.canOpen || options?.includeBlockedAppLink === true;
  const builtLink = shouldExposeLink ? buildAiDeepLink(ref, routeParams) : undefined;
  const appLink = builtLink
    ? {
        ...builtLink,
        page: ref.appLink?.page ?? builtLink.page,
        highlightText: ref.appLink?.highlightText ?? builtLink.highlightText,
      }
    : undefined;

  return {
    ...ref,
    appLink,
    permission: {
      canOpen: decision.canOpen,
      reasonRu: decision.reasonRu,
    },
  };
}
