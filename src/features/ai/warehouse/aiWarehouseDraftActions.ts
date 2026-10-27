import {
  canUseAiCapability,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { buildAiWarehouseDraftEvidenceRefs } from "./aiWarehouseEvidenceBuilder";
import { buildAiWarehouseCopilotStatus } from "./aiWarehouseStatusEngine";
import type {
  AiWarehouseCopilotAuthContext,
  AiWarehouseCopilotInput,
  AiWarehouseDraftAction,
} from "./aiWarehouseCopilotTypes";

export const AI_WAREHOUSE_DRAFT_ACTIONS_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_draft_actions_v1",
  deterministic: true,
  sourceTool: "get_warehouse_status",
  targetTool: "draft_request",
  draftOnly: true,
  evidenceRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  providerCalled: false,
  finalExecution: 0,
  stockMutated: false,
  reservationCreated: false,
  movementCreated: false,
  fakeWarehouseCards: false,
  hardcodedAiAnswer: false,
} as const);

function canDraftWarehouseAction(role: AiUserRole): boolean {
  return canUseAiCapability({ role, domain: "warehouse", capability: "draft" }) ||
    canUseAiCapability({ role, domain: "procurement", capability: "draft" });
}

function quantity(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "0";
}

function blockedDraft(reason: string): AiWarehouseDraftAction {
  return {
    status: "blocked",
    title: "Warehouse draft action blocked",
    summary: reason,
    bulletPoints: [],
    evidenceRefs: [],
    suggestedToolId: null,
    suggestedMode: "forbidden",
    approvalRequired: false,
    deterministic: true,
    roleScoped: true,
    evidenceBacked: false,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    fakeWarehouseCards: false,
    hardcodedAiAnswer: false,
  };
}

export async function draftAiWarehouseAction(params: {
  auth: AiWarehouseCopilotAuthContext | null;
  input?: AiWarehouseCopilotInput;
}): Promise<AiWarehouseDraftAction> {
  if (!params.auth || params.auth.userId.trim().length === 0 || params.auth.role === "unknown") {
    return blockedDraft("AI warehouse draft action requires authenticated role context.");
  }
  if (!canDraftWarehouseAction(params.auth.role)) {
    return blockedDraft("AI warehouse draft action is not visible for this role.");
  }

  const statusResult = await buildAiWarehouseCopilotStatus(params);
  if (statusResult.status === "blocked") {
    return blockedDraft(statusResult.blockedReason ?? "Warehouse status safe-read is blocked.");
  }
  if (!statusResult.warehouseStatus || statusResult.evidenceRefs.length === 0) {
    return {
      ...blockedDraft("No redacted warehouse evidence is available for a draft action."),
      status: "empty",
      title: "Warehouse draft action empty",
      suggestedMode: "draft_only",
      suggestedToolId: "draft_request",
    };
  }

  const status = statusResult.warehouseStatus;
  const evidenceRefs = buildAiWarehouseDraftEvidenceRefs(status);
  if (statusResult.riskCards.length === 0) {
    return {
      ...blockedDraft("No warehouse risk card is available for a draft action."),
      status: "empty",
      title: "Warehouse draft action empty",
      suggestedMode: "draft_only",
      suggestedToolId: "draft_request",
      evidenceRefs,
      evidenceBacked: evidenceRefs.length > 0,
    };
  }

  return {
    status: "draft",
    title: "Warehouse procurement draft action",
    summary: "Redacted warehouse evidence supports a draft-only request for human review.",
    bulletPoints: [
      `Available quantity in scope: ${quantity(status.available.total_quantity)}.`,
      `Reserved quantity in scope: ${quantity(status.reserved.total_quantity)}.`,
      `Incoming quantity in scope: ${quantity(status.incoming.total_quantity)}.`,
      `Warehouse risk cards: ${statusResult.riskCards.length}.`,
    ],
    evidenceRefs,
    suggestedToolId: "draft_request",
    suggestedMode: "draft_only",
    approvalRequired: false,
    deterministic: true,
    roleScoped: true,
    evidenceBacked: evidenceRefs.length > 0,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    fakeWarehouseCards: false,
    hardcodedAiAnswer: false,
  };
}
