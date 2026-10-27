import type {
  ProcurementRequestContext,
  SupplierMatchPreviewOutput,
} from "./procurementContextTypes";
import { evidenceRefIds, mergeEvidenceRefIds } from "./procurementEvidenceBuilder";
import { hashOpaqueId, uniqueProcurementRefs } from "./procurementRedaction";

export type AiProcurementRiskLevel = "low" | "medium" | "high";

export type AiProcurementRiskSignalId =
  | "missing_request_data"
  | "critical_urgency"
  | "supplier_candidates_missing"
  | "supplier_candidate_risk"
  | "evidence_gap"
  | "approval_required";

export type AiProcurementRiskSignal = {
  id: AiProcurementRiskSignalId;
  riskLevel: AiProcurementRiskLevel;
  label: string;
  evidenceRefs: readonly string[];
  approvalRequired: boolean;
};

export type AiProcurementRiskSignalInput = {
  context: ProcurementRequestContext;
  supplierMatch?: SupplierMatchPreviewOutput | null;
};

export type AiProcurementRiskSignalResult = {
  riskLevel: AiProcurementRiskLevel;
  riskSignals: readonly AiProcurementRiskSignal[];
  evidenceRefs: readonly string[];
  internalFirst: true;
  externalFetch: false;
  supplierConfirmed: false;
  orderCreated: false;
  warehouseMutated: false;
  paymentCreated: false;
  mutationCount: 0;
};

export const AI_PROCUREMENT_RISK_SIGNALS_CONTRACT = Object.freeze({
  contractId: "ai_procurement_risk_signals_v1",
  internalFirst: true,
  externalFetch: false,
  supplierConfirmed: false,
  orderCreated: false,
  warehouseMutated: false,
  paymentCreated: false,
  mutationCount: 0,
} as const);

function riskWeight(level: AiProcurementRiskLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function maxRisk(signals: readonly AiProcurementRiskSignal[]): AiProcurementRiskLevel {
  const highest = signals.reduce((max, signal) => Math.max(max, riskWeight(signal.riskLevel)), 1);
  if (highest >= 3) return "high";
  if (highest >= 2) return "medium";
  return "low";
}

function signal(params: {
  id: AiProcurementRiskSignalId;
  riskLevel: AiProcurementRiskLevel;
  label: string;
  evidenceRefs: readonly string[];
}): AiProcurementRiskSignal {
  return {
    id: params.id,
    riskLevel: params.riskLevel,
    label: params.label,
    evidenceRefs: uniqueProcurementRefs([...params.evidenceRefs]),
    approvalRequired: true,
  };
}

export function buildAiProcurementRiskSignals(
  input: AiProcurementRiskSignalInput,
): AiProcurementRiskSignalResult {
  const internalEvidenceRefs = evidenceRefIds(input.context.internalEvidenceRefs);
  const supplierEvidenceRefs = input.supplierMatch?.evidenceRefs ?? [];
  const evidenceRefs = mergeEvidenceRefIds([...internalEvidenceRefs], [...supplierEvidenceRefs]);
  const signals: AiProcurementRiskSignal[] = [];

  if (input.context.missingFields.length > 0) {
    signals.push(
      signal({
        id: "missing_request_data",
        riskLevel: "medium",
        label: "Required procurement request data is missing.",
        evidenceRefs: [
          ...internalEvidenceRefs,
          `internal_app:missing:${hashOpaqueId("missing_fields", input.context.missingFields.join("|"))}`,
        ],
      }),
    );
  }

  if (input.context.requestedItems.some((item) => item.urgency === "critical")) {
    signals.push(
      signal({
        id: "critical_urgency",
        riskLevel: "high",
        label: "At least one requested material is marked critical.",
        evidenceRefs: internalEvidenceRefs,
      }),
    );
  }

  if (input.supplierMatch && input.supplierMatch.supplierCards.length === 0) {
    signals.push(
      signal({
        id: "supplier_candidates_missing",
        riskLevel: "medium",
        label: "No internal supplier candidates were returned.",
        evidenceRefs,
      }),
    );
  }

  if (
    input.supplierMatch?.supplierCards.some(
      (card) => card.riskFlags.length > 0 || card.availabilityBucket === "limited",
    )
  ) {
    signals.push(
      signal({
        id: "supplier_candidate_risk",
        riskLevel: "medium",
        label: "Supplier candidate risk flags require review.",
        evidenceRefs,
      }),
    );
  }

  if (evidenceRefs.length === 0) {
    signals.push(
      signal({
        id: "evidence_gap",
        riskLevel: "high",
        label: "No redacted evidence references are available for the decision.",
        evidenceRefs: [`internal_app:evidence:${hashOpaqueId("evidence_gap", input.context.requestIdHash)}`],
      }),
    );
  }

  signals.push(
    signal({
      id: "approval_required",
      riskLevel: "low",
      label: "Procurement action requires approval before execution.",
      evidenceRefs,
    }),
  );

  return {
    riskLevel: maxRisk(signals),
    riskSignals: signals,
    evidenceRefs,
    internalFirst: true,
    externalFetch: false,
    supplierConfirmed: false,
    orderCreated: false,
    warehouseMutated: false,
    paymentCreated: false,
    mutationCount: 0,
  };
}
