import type { AiUserRole } from "../policy/aiRolePolicy";
import type { GetWarehouseStatusToolOutput } from "../tools/getWarehouseStatusTool";
import { buildAiWarehouseEvidenceRefs } from "./aiWarehouseEvidenceBuilder";
import type {
  AiWarehouseCopilotClassification,
  AiWarehouseCopilotMode,
  AiWarehouseCopilotRiskLevel,
  AiWarehouseEvidenceRef,
  AiWarehouseRiskCard,
} from "./aiWarehouseCopilotTypes";

export const AI_WAREHOUSE_RISK_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_risk_policy_v1",
  sourceTool: "get_warehouse_status",
  safeReadOnly: true,
  draftOnly: true,
  highRiskRequiresApproval: true,
  directExecutionWithoutApproval: false,
  mutationCount: 0,
  dbWrites: 0,
  stockMutated: false,
  reservationCreated: false,
  movementCreated: false,
  fakeWarehouseCards: false,
} as const);

export type AiWarehouseActionIntent =
  | "read_status"
  | "read_movements"
  | "risk_preview"
  | "draft_action"
  | "reserve_stock"
  | "create_movement"
  | "mutate_stock";

export type AiWarehouseActionPolicyDecision = {
  intent: AiWarehouseActionIntent;
  allowed: boolean;
  mode: AiWarehouseCopilotMode;
  classification: AiWarehouseCopilotClassification;
  riskLevel: AiWarehouseCopilotRiskLevel;
  approvalRequired: boolean;
  finalExecution: 0;
  mutationCount: 0;
  exactReason: string | null;
};

export function canUseAiWarehouseCopilot(role: AiUserRole): boolean {
  return role === "director" ||
    role === "control" ||
    role === "warehouse" ||
    role === "buyer" ||
    role === "foreman";
}

export function statusScopeAllowedForWarehouseRole(
  role: AiUserRole,
  status: GetWarehouseStatusToolOutput,
): boolean {
  if (role === "director" || role === "control") return true;
  if (role === "warehouse") return status.role_scope === "warehouse_access" || status.role_scope === "full_access";
  if (role === "buyer") return status.role_scope === "buyer_procurement_availability_scope";
  if (role === "foreman") return status.role_scope === "foreman_project_material_scope";
  return false;
}

export function decideAiWarehouseActionPolicy(params: {
  role: AiUserRole;
  intent: AiWarehouseActionIntent;
  riskLevel?: AiWarehouseCopilotRiskLevel;
}): AiWarehouseActionPolicyDecision {
  const riskLevel = params.riskLevel ?? "low";
  if (!canUseAiWarehouseCopilot(params.role)) {
    return {
      intent: params.intent,
      allowed: false,
      mode: "forbidden",
      classification: "WAREHOUSE_ROLE_FORBIDDEN_BLOCKED",
      riskLevel,
      approvalRequired: false,
      finalExecution: 0,
      mutationCount: 0,
      exactReason: "AI warehouse copilot is not visible for this role.",
    };
  }

  if (params.intent === "read_status" || params.intent === "read_movements" || params.intent === "risk_preview") {
    return {
      intent: params.intent,
      allowed: true,
      mode: "safe_read",
      classification: "WAREHOUSE_SAFE_READ_RECOMMENDATION",
      riskLevel,
      approvalRequired: false,
      finalExecution: 0,
      mutationCount: 0,
      exactReason: null,
    };
  }

  if (params.intent === "draft_action") {
    return {
      intent: params.intent,
      allowed: true,
      mode: "draft_only",
      classification: "WAREHOUSE_DRAFT_ACTION_RECOMMENDATION",
      riskLevel,
      approvalRequired: false,
      finalExecution: 0,
      mutationCount: 0,
      exactReason: null,
    };
  }

  return {
    intent: params.intent,
    allowed: false,
    mode: "approval_required",
    classification:
      riskLevel === "high"
        ? "WAREHOUSE_APPROVAL_REQUIRED_RECOMMENDATION"
        : "WAREHOUSE_FORBIDDEN_MUTATION_BLOCKED",
    riskLevel,
    approvalRequired: true,
    finalExecution: 0,
    mutationCount: 0,
    exactReason: "Warehouse stock, reservation, and movement mutations require approved execution gateway.",
  };
}

function urgencyForRisk(riskLevel: AiWarehouseCopilotRiskLevel): AiWarehouseRiskCard["urgency"] {
  if (riskLevel === "high") return "today";
  if (riskLevel === "medium") return "week";
  return "watch";
}

function riskEvidence(
  refs: readonly AiWarehouseEvidenceRef[],
  wanted: readonly AiWarehouseEvidenceRef["type"][],
): AiWarehouseEvidenceRef[] {
  const filtered = refs.filter((ref) => wanted.includes(ref.type));
  return filtered.length > 0 ? filtered : [...refs];
}

function riskCard(params: {
  riskId: string;
  title: string;
  summary: string;
  riskLevel: AiWarehouseCopilotRiskLevel;
  evidenceRefs: readonly AiWarehouseEvidenceRef[];
  nextActionToolId?: "draft_request" | null;
}): AiWarehouseRiskCard {
  return {
    riskId: params.riskId,
    title: params.title,
    summary: params.summary,
    riskLevel: params.riskLevel,
    urgency: urgencyForRisk(params.riskLevel),
    source: "get_warehouse_status",
    evidenceRefs: params.evidenceRefs,
    suggestedToolId: "get_warehouse_status",
    nextActionToolId: params.nextActionToolId ?? "draft_request",
    suggestedMode: params.nextActionToolId === null ? "safe_read" : "draft_only",
    approvalRequired: params.riskLevel === "high",
    mutationCount: 0,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    rawRowsReturned: false,
  };
}

export function riskLevelForWarehouseStatus(
  status: GetWarehouseStatusToolOutput | null,
): AiWarehouseCopilotRiskLevel {
  if (!status) return "low";
  if (status.low_stock_flags.some((flag) => flag.startsWith("no_available_stock:"))) return "high";
  if (status.available.total_quantity <= 0 && status.movement_summary.item_count > 0) return "high";
  if (status.low_stock_flags.some((flag) => flag.startsWith("reserved_pressure:"))) return "medium";
  if (status.reserved.total_quantity > status.available.total_quantity && status.available.total_quantity > 0) {
    return "medium";
  }
  return "low";
}

export function buildAiWarehouseRiskCards(
  status: GetWarehouseStatusToolOutput | null,
): AiWarehouseRiskCard[] {
  if (!status) return [];

  const refs = buildAiWarehouseEvidenceRefs(status);
  if (refs.length === 0) return [];

  const cards: AiWarehouseRiskCard[] = [];
  const lowStockEvidence = riskEvidence(refs, ["warehouse_low_stock", "warehouse_status"]);
  const movementEvidence = riskEvidence(refs, ["warehouse_movement", "warehouse_status"]);

  if (status.low_stock_flags.some((flag) => flag.startsWith("no_available_stock:"))) {
    cards.push(
      riskCard({
        riskId: "warehouse.stock.no_available",
        title: "Warehouse stock has unavailable material",
        summary: "Redacted warehouse status shows at least one material with no available stock.",
        riskLevel: "high",
        evidenceRefs: lowStockEvidence,
      }),
    );
  }

  if (status.low_stock_flags.some((flag) => flag.startsWith("reserved_pressure:"))) {
    cards.push(
      riskCard({
        riskId: "warehouse.stock.reserved_pressure",
        title: "Reserved warehouse quantity pressures availability",
        summary: "Redacted warehouse status shows reserved quantity pressure in the selected scope.",
        riskLevel: "medium",
        evidenceRefs: lowStockEvidence,
      }),
    );
  }

  if (status.incoming.status === "not_available_in_stock_scope" && status.movement_summary.item_count > 0) {
    cards.push(
      riskCard({
        riskId: "warehouse.movement.incoming_unavailable",
        title: "Incoming movement signal is unavailable",
        summary: "Warehouse status is available, but incoming movement quantity is not reported for this scope.",
        riskLevel: cards.length > 0 ? "medium" : "low",
        evidenceRefs: movementEvidence,
        nextActionToolId: null,
      }),
    );
  }

  return cards.filter((card) => card.evidenceRefs.length > 0);
}
