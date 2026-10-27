import type { AiUserRole } from "../policy/aiRolePolicy";
import type { GetWarehouseStatusToolOutput } from "../tools/getWarehouseStatusTool";
import {
  aiWarehouseEvidenceComplete,
  buildAiWarehouseEvidenceRefs,
} from "./aiWarehouseEvidenceBuilder";
import {
  buildAiWarehouseCopilotStatus,
} from "./aiWarehouseStatusEngine";
import type {
  AiWarehouseCopilotAuthContext,
  AiWarehouseCopilotInput,
  AiWarehouseEvidenceRef,
} from "./aiWarehouseCopilotTypes";

export type AiWarehouseOperationsScreenId =
  | "warehouse.main"
  | "warehouse.incoming"
  | "warehouse.issue";

export type AiWarehouseEvidenceResolverFinalStatus =
  | "loaded"
  | "empty"
  | "blocked";

export type AiWarehouseEvidenceSummary = {
  stockStatus: string;
  incomingStatus: string;
  issueStatus: string;
  movementSummary: string;
};

export type AiWarehouseEvidenceResolverResult = {
  status: AiWarehouseEvidenceResolverFinalStatus;
  screenId: AiWarehouseOperationsScreenId;
  role: AiUserRole;
  warehouseStatus: GetWarehouseStatusToolOutput | null;
  evidenceSummary: AiWarehouseEvidenceSummary;
  evidenceRefs: readonly AiWarehouseEvidenceRef[];
  evidenceBacked: boolean;
  roleScoped: true;
  coversWarehouseMain: boolean;
  coversWarehouseIncoming: boolean;
  coversWarehouseIssue: boolean;
  stockStatusExplained: boolean;
  incomingStatusExplained: boolean;
  issueStatusExplained: boolean;
  movementSummaryReady: boolean;
  safeReadOnly: true;
  draftOnly: true;
  approvalRequiredForMutation: true;
  directStockMutationAllowed: false;
  finalIssueAllowed: false;
  finalReceiveAllowed: false;
  stockMutated: false;
  reservationCreated: false;
  movementCreated: false;
  mutationCount: 0;
  dbWrites: 0;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  providerCalled: false;
  fakeWarehouseEvidence: false;
  exactReason: string | null;
};

export const AI_WAREHOUSE_EVIDENCE_RESOLVER_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_evidence_resolver_v1",
  screens: ["warehouse.main", "warehouse.incoming", "warehouse.issue"],
  sourceTool: "get_warehouse_status",
  safeReadOnly: true,
  draftOnly: true,
  approvalRequiredForMutation: true,
  directStockMutationAllowed: false,
  finalIssueAllowed: false,
  finalReceiveAllowed: false,
  mutationCount: 0,
  dbWrites: 0,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  providerCalled: false,
  fakeWarehouseEvidence: false,
} as const);

const WAREHOUSE_OPERATION_SCREENS: readonly AiWarehouseOperationsScreenId[] = [
  "warehouse.main",
  "warehouse.incoming",
  "warehouse.issue",
];

function isWarehouseOperationScreenId(value: string): value is AiWarehouseOperationsScreenId {
  return WAREHOUSE_OPERATION_SCREENS.includes(value as AiWarehouseOperationsScreenId);
}

function quantity(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "0";
}

function statusText(status: GetWarehouseStatusToolOutput | null): AiWarehouseEvidenceSummary {
  if (!status) {
    return {
      stockStatus: "Warehouse stock status is not available.",
      incomingStatus: "Incoming material status is not available.",
      issueStatus: "Warehouse issue status is not available.",
      movementSummary: "Warehouse movement summary is not available.",
    };
  }

  return {
    stockStatus:
      `Available ${quantity(status.available.total_quantity)}, reserved ${quantity(status.reserved.total_quantity)}.`,
    incomingStatus:
      `Incoming ${quantity(status.incoming.total_quantity)} with ${status.incoming.status} scope.`,
    issueStatus:
      `Issue pressure uses reserved ${quantity(status.reserved.total_quantity)} and available ${quantity(status.available.total_quantity)}.`,
    movementSummary: status.movement_summary.summary,
  };
}

function baseResult(params: {
  status: AiWarehouseEvidenceResolverFinalStatus;
  screenId: AiWarehouseOperationsScreenId;
  role: AiUserRole;
  warehouseStatus?: GetWarehouseStatusToolOutput | null;
  evidenceRefs?: readonly AiWarehouseEvidenceRef[];
  exactReason?: string | null;
}): AiWarehouseEvidenceResolverResult {
  const warehouseStatus = params.warehouseStatus ?? null;
  const evidenceRefs = params.evidenceRefs ?? [];
  const evidenceBacked = aiWarehouseEvidenceComplete({ evidenceRefs });

  return {
    status: params.status,
    screenId: params.screenId,
    role: params.role,
    warehouseStatus,
    evidenceSummary: statusText(warehouseStatus),
    evidenceRefs,
    evidenceBacked,
    roleScoped: true,
    coversWarehouseMain: true,
    coversWarehouseIncoming: true,
    coversWarehouseIssue: true,
    stockStatusExplained: warehouseStatus !== null && evidenceBacked,
    incomingStatusExplained: warehouseStatus !== null && evidenceBacked,
    issueStatusExplained: warehouseStatus !== null && evidenceBacked,
    movementSummaryReady: Boolean(warehouseStatus && warehouseStatus.movement_summary.item_count >= 0),
    safeReadOnly: true,
    draftOnly: true,
    approvalRequiredForMutation: true,
    directStockMutationAllowed: false,
    finalIssueAllowed: false,
    finalReceiveAllowed: false,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    mutationCount: 0,
    dbWrites: 0,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    providerCalled: false,
    fakeWarehouseEvidence: false,
    exactReason: params.exactReason ?? null,
  };
}

export async function resolveAiWarehouseEvidence(params: {
  auth: AiWarehouseCopilotAuthContext | null;
  screenId: string;
  input?: AiWarehouseCopilotInput;
}): Promise<AiWarehouseEvidenceResolverResult> {
  const screenId = isWarehouseOperationScreenId(params.screenId)
    ? params.screenId
    : "warehouse.main";
  const role = params.auth?.role ?? "unknown";
  if (!isWarehouseOperationScreenId(params.screenId)) {
    return baseResult({
      status: "blocked",
      screenId,
      role,
      exactReason: "Warehouse evidence resolver only covers warehouse.main, warehouse.incoming, and warehouse.issue.",
    });
  }

  const statusResult = await buildAiWarehouseCopilotStatus({
    auth: params.auth,
    input: params.input,
  });
  if (statusResult.status === "blocked") {
    return baseResult({
      status: "blocked",
      screenId,
      role: statusResult.role,
      exactReason: statusResult.blockedReason ?? "Warehouse safe-read evidence route is blocked.",
    });
  }

  const warehouseStatus = statusResult.warehouseStatus;
  const evidenceRefs = buildAiWarehouseEvidenceRefs(warehouseStatus);
  if (!warehouseStatus || evidenceRefs.length === 0) {
    return baseResult({
      status: "empty",
      screenId,
      role: statusResult.role,
      warehouseStatus,
      evidenceRefs,
      exactReason: statusResult.emptyState?.reason ?? "No redacted warehouse evidence refs were returned.",
    });
  }

  return baseResult({
    status: "loaded",
    screenId,
    role: statusResult.role,
    warehouseStatus,
    evidenceRefs,
  });
}
