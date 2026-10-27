import type {
  EvidenceRef,
  ProcurementAllowedNextAction,
  ProcurementAuthContext,
  ProcurementRequestContext,
  ProcurementRequestContextResolverInput,
  ProcurementRequestedItem,
  ProcurementSafeRequestItemSnapshot,
} from "./procurementContextTypes";
import { buildProcurementEvidenceRef } from "./procurementEvidenceBuilder";
import {
  hashOpaqueId,
  normalizeProcurementOptionalText,
  normalizeProcurementPositiveNumber,
  normalizeProcurementText,
  toLocationBucket,
} from "./procurementRedaction";

export const PROCUREMENT_CONTEXT_ALLOWED_ROLES = ["director", "control", "buyer"] as const;
export const PROCUREMENT_CONTEXT_MAX_ITEMS = 20;

function isAuthenticated(auth: ProcurementAuthContext | null): auth is ProcurementAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export function canUseProcurementRequestContext(role: ProcurementAuthContext["role"]): boolean {
  return PROCUREMENT_CONTEXT_ALLOWED_ROLES.some((allowedRole) => allowedRole === role);
}

function normalizeRequestedItem(
  item: ProcurementSafeRequestItemSnapshot,
  index: number,
): {
  value: ProcurementRequestedItem;
  missingFields: string[];
} {
  const materialLabel = normalizeProcurementText(item.materialLabel);
  const quantity = normalizeProcurementPositiveNumber(item.quantity);
  const unit = normalizeProcurementOptionalText(item.unit);
  const missingFields = [
    materialLabel.length > 0 ? null : `items[${index}].materialLabel`,
    quantity !== undefined ? null : `items[${index}].quantity`,
    unit !== undefined ? null : `items[${index}].unit`,
  ].filter((field): field is string => field !== null);

  return {
    value: {
      materialLabel: materialLabel || `item_${index + 1}`,
      quantity,
      unit,
      category: normalizeProcurementOptionalText(item.category),
      urgency: item.urgency,
    },
    missingFields,
  };
}

function blockedContext(input: ProcurementRequestContextResolverInput): ProcurementRequestContext {
  return {
    status: "blocked",
    requestIdHash: hashOpaqueId("request", input.requestId),
    role: input.auth?.role ?? "unknown",
    screenId: normalizeProcurementText(input.screenId) || "unknown",
    projectSummary: {},
    requestedItems: [],
    internalEvidenceRefs: [],
    missingFields: ["role_scope_denied"],
    allowedNextActions: [],
    approvalRequired: true,
  };
}

function emptyContext(input: ProcurementRequestContextResolverInput, missingFields: string[]): ProcurementRequestContext {
  return {
    status: "empty",
    requestIdHash: hashOpaqueId("request", input.requestId),
    role: input.auth?.role ?? "unknown",
    screenId: normalizeProcurementText(input.screenId) || "unknown",
    projectSummary: {},
    requestedItems: [],
    internalEvidenceRefs: [],
    missingFields,
    allowedNextActions: ["search_catalog"],
    approvalRequired: true,
  };
}

function buildInternalEvidenceRefs(input: ProcurementRequestContextResolverInput): EvidenceRef[] {
  const snapshot = input.requestSnapshot;
  if (!snapshot) return [];

  const baseEvidence = [
    buildProcurementEvidenceRef({
      source: "internal_app",
      scope: "request",
      value: snapshot.requestId,
      label: "Procurement request context",
    }),
  ];
  const itemEvidence = (snapshot.items ?? []).slice(0, PROCUREMENT_CONTEXT_MAX_ITEMS).map((item, index) =>
    buildProcurementEvidenceRef({
      source: "internal_app",
      scope: "request_item",
      value: `${snapshot.requestId}:${index}:${item.materialLabel ?? ""}`,
      label: "Requested material",
    }),
  );

  return [...baseEvidence, ...itemEvidence];
}

function allowedActionsForItems(items: readonly ProcurementRequestedItem[]): ProcurementAllowedNextAction[] {
  if (items.length === 0) return ["search_catalog"];
  return ["search_catalog", "compare_suppliers", "draft_request", "submit_for_approval"];
}

export function resolveProcurementRequestContext(
  input: ProcurementRequestContextResolverInput,
): ProcurementRequestContext {
  if (!isAuthenticated(input.auth) || !canUseProcurementRequestContext(input.auth.role)) {
    return blockedContext(input);
  }

  const requestId = normalizeProcurementText(input.requestId);
  const screenId = normalizeProcurementText(input.screenId);
  if (!requestId || !screenId) {
    return emptyContext(input, [
      requestId ? null : "requestId",
      screenId ? null : "screenId",
    ].filter((field): field is string => field !== null));
  }

  const snapshot = input.requestSnapshot;
  if (!snapshot) {
    return emptyContext(input, ["request_snapshot"]);
  }
  if (normalizeProcurementText(snapshot.requestId) !== requestId) {
    return {
      ...blockedContext(input),
      missingFields: ["request_scope_mismatch"],
    };
  }

  const normalizedItems = (snapshot.items ?? [])
    .slice(0, PROCUREMENT_CONTEXT_MAX_ITEMS)
    .map(normalizeRequestedItem);
  const requestedItems = normalizedItems.map((entry) => entry.value);
  const missingFields = [
    snapshot.projectId ? null : "projectId",
    requestedItems.length > 0 ? null : "items",
    ...normalizedItems.flatMap((entry) => entry.missingFields),
  ].filter((field): field is string => field !== null);
  const internalEvidenceRefs = buildInternalEvidenceRefs(input);

  return {
    status: requestedItems.length > 0 ? "loaded" : "empty",
    requestIdHash: hashOpaqueId("request", requestId),
    role: input.auth.role,
    screenId,
    projectSummary: {
      projectIdHash: snapshot.projectId ? hashOpaqueId("project", snapshot.projectId) : undefined,
      title: normalizeProcurementOptionalText(snapshot.projectTitle ?? snapshot.title),
      locationBucket: toLocationBucket(snapshot.location),
    },
    requestedItems,
    internalEvidenceRefs,
    missingFields,
    allowedNextActions: allowedActionsForItems(requestedItems),
    approvalRequired: true,
  };
}
