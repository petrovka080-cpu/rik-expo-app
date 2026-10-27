import {
  buildAiWarehouseRiskCards,
  riskLevelForWarehouseStatus,
} from "./aiWarehouseRiskPolicy";
import type {
  AiWarehouseCopilotRiskLevel,
  AiWarehouseRiskCard,
} from "./aiWarehouseCopilotTypes";
import type {
  AiWarehouseEvidenceResolverResult,
} from "./aiWarehouseEvidenceResolver";

export type AiWarehouseStockMovementRiskKind =
  | "stockout"
  | "reserved_pressure"
  | "incoming_visibility_gap"
  | "issue_pressure"
  | "watch";

export type AiWarehouseStockMovementRiskSignal = {
  kind: AiWarehouseStockMovementRiskKind;
  level: AiWarehouseCopilotRiskLevel;
  summary: string;
  evidenceRefs: readonly string[];
  approvalRequiredForMutation: true;
  directMutationAllowed: false;
};

export type AiWarehouseRiskClassifierResult = {
  status: "classified" | "empty" | "blocked";
  riskLevel: AiWarehouseCopilotRiskLevel;
  riskCards: readonly AiWarehouseRiskCard[];
  riskSignals: readonly AiWarehouseStockMovementRiskSignal[];
  evidenceBacked: boolean;
  stockMovementRiskClassified: boolean;
  approvalRequiredForStockMovement: true;
  draftOnly: true;
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
  fakeRiskSignals: false;
  exactReason: string | null;
};

export const AI_WAREHOUSE_RISK_CLASSIFIER_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_risk_classifier_v1",
  riskKinds: ["stockout", "reserved_pressure", "incoming_visibility_gap", "issue_pressure", "watch"],
  approvalRequiredForStockMovement: true,
  draftOnly: true,
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
  fakeRiskSignals: false,
} as const);

function evidenceIds(result: AiWarehouseEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function signal(params: {
  kind: AiWarehouseStockMovementRiskKind;
  level: AiWarehouseCopilotRiskLevel;
  summary: string;
  evidenceRefs: readonly string[];
}): AiWarehouseStockMovementRiskSignal {
  return {
    kind: params.kind,
    level: params.level,
    summary: params.summary,
    evidenceRefs: [...params.evidenceRefs],
    approvalRequiredForMutation: true,
    directMutationAllowed: false,
  };
}

function buildSignals(
  result: AiWarehouseEvidenceResolverResult,
  riskLevel: AiWarehouseCopilotRiskLevel,
): AiWarehouseStockMovementRiskSignal[] {
  const status = result.warehouseStatus;
  const refs = evidenceIds(result);
  if (!status || refs.length === 0) return [];

  const signals: AiWarehouseStockMovementRiskSignal[] = [];
  if (status.low_stock_flags.some((flag) => flag.startsWith("no_available_stock:"))) {
    signals.push(signal({
      kind: "stockout",
      level: "high",
      summary: "At least one warehouse material has no available stock in the redacted scope.",
      evidenceRefs: refs,
    }));
  }
  if (status.low_stock_flags.some((flag) => flag.startsWith("reserved_pressure:"))) {
    signals.push(signal({
      kind: "reserved_pressure",
      level: "medium",
      summary: "Reserved quantity is pressuring warehouse availability.",
      evidenceRefs: refs,
    }));
  }
  if (status.incoming.status === "not_available_in_stock_scope" && status.movement_summary.item_count > 0) {
    signals.push(signal({
      kind: "incoming_visibility_gap",
      level: riskLevel === "high" ? "medium" : "low",
      summary: "Incoming movement quantity is not visible for the selected warehouse scope.",
      evidenceRefs: refs,
    }));
  }
  if (status.reserved.total_quantity > status.available.total_quantity) {
    signals.push(signal({
      kind: "issue_pressure",
      level: status.available.total_quantity <= 0 ? "high" : "medium",
      summary: "Issue demand may exceed currently available warehouse quantity.",
      evidenceRefs: refs,
    }));
  }

  if (signals.length === 0) {
    signals.push(signal({
      kind: "watch",
      level: riskLevel,
      summary: "No blocking warehouse movement risk was detected; continue evidence-backed monitoring.",
      evidenceRefs: refs,
    }));
  }

  return signals;
}

export function classifyAiWarehouseStockMovementRisk(
  result: AiWarehouseEvidenceResolverResult,
): AiWarehouseRiskClassifierResult {
  if (result.status === "blocked") {
    return {
      status: "blocked",
      riskLevel: "low",
      riskCards: [],
      riskSignals: [],
      evidenceBacked: false,
      stockMovementRiskClassified: false,
      approvalRequiredForStockMovement: true,
      draftOnly: true,
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
      fakeRiskSignals: false,
      exactReason: result.exactReason,
    };
  }

  const riskLevel = riskLevelForWarehouseStatus(result.warehouseStatus);
  const riskCards = buildAiWarehouseRiskCards(result.warehouseStatus);
  const riskSignals = buildSignals(result, riskLevel);
  const evidenceBacked = result.evidenceBacked && riskSignals.every((entry) => entry.evidenceRefs.length > 0);
  const status = evidenceBacked ? "classified" : "empty";

  return {
    status,
    riskLevel,
    riskCards,
    riskSignals,
    evidenceBacked,
    stockMovementRiskClassified: status === "classified",
    approvalRequiredForStockMovement: true,
    draftOnly: true,
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
    fakeRiskSignals: false,
    exactReason: status === "classified" ? null : "Warehouse risk classifier requires redacted warehouse evidence.",
  };
}
