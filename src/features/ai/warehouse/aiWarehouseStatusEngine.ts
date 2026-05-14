import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import type {
  GetWarehouseStatusToolInput,
  GetWarehouseStatusToolOutput,
} from "../tools/getWarehouseStatusTool";
import {
  aiWarehouseRiskCardsHaveEvidence,
  buildAiWarehouseEvidenceRefs,
} from "./aiWarehouseEvidenceBuilder";
import {
  buildAiWarehouseRiskCards,
  canUseAiWarehouseCopilot,
  decideAiWarehouseActionPolicy,
  riskLevelForWarehouseStatus,
  statusScopeAllowedForWarehouseRole,
} from "./aiWarehouseRiskPolicy";
import type {
  AiWarehouseCopilotAuthContext,
  AiWarehouseCopilotInput,
  AiWarehouseCopilotStatus,
  AiWarehouseCopilotStatusResult,
  AiWarehouseEmptyState,
  AiWarehouseEvidenceRef,
  AiWarehouseMovementSummaryPreview,
  AiWarehouseRiskCard,
  AiWarehouseRiskPreview,
} from "./aiWarehouseCopilotTypes";

export const AI_WAREHOUSE_STATUS_ENGINE_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_status_engine_v1",
  sourceTool: "get_warehouse_status",
  backendFirst: true,
  roleScoped: true,
  safeReadOnly: true,
  evidenceRequired: true,
  knownToolRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  directSupabaseFromUi: false,
  mobileExternalFetch: false,
  externalLiveFetch: false,
  providerCalled: false,
  finalExecution: 0,
  stockMutated: false,
  reservationCreated: false,
  movementCreated: false,
  fakeWarehouseCards: false,
  hardcodedAiAnswer: false,
} as const);

function isAuthenticated(auth: AiWarehouseCopilotAuthContext | null): auth is AiWarehouseCopilotAuthContext {
  return Boolean(auth && auth.userId.trim().length > 0 && auth.role !== "unknown");
}

function toolInput(input: AiWarehouseCopilotInput | undefined): GetWarehouseStatusToolInput {
  return {
    material_id: input?.material_id,
    material_code: input?.material_code,
    project_id: input?.project_id,
    warehouse_name: input?.warehouse_name,
    object_name: input?.object_name,
    limit: input?.limit ?? 10,
    cursor: input?.cursor,
  };
}

function emptyState(reason: string): AiWarehouseEmptyState {
  return {
    reason,
    honestEmptyState: true,
    fakeWarehouseCards: false,
    mutationCount: 0,
  };
}

function allCardsHaveRiskPolicy(cards: readonly AiWarehouseRiskCard[]): boolean {
  return cards.every((card) => card.riskLevel === "low" || card.riskLevel === "medium" || card.riskLevel === "high");
}

function baseResult(params: {
  status: AiWarehouseCopilotStatus;
  role: AiUserRole;
  warehouseStatus?: GetWarehouseStatusToolOutput | null;
  riskCards?: readonly AiWarehouseRiskCard[];
  evidenceRefs?: readonly AiWarehouseEvidenceRef[];
  blockedReason?: string | null;
  emptyReason?: string | null;
}): AiWarehouseCopilotStatusResult {
  const warehouseStatus = params.warehouseStatus ?? null;
  const riskCards = params.riskCards ?? [];
  const evidenceRefs = params.evidenceRefs ?? [];

  return {
    status: params.status,
    role: params.role,
    warehouseStatus,
    riskCards,
    emptyState:
      params.status === "empty"
        ? emptyState(params.emptyReason ?? "No eligible redacted warehouse evidence is available.")
        : null,
    blockedReason: params.blockedReason ?? null,
    evidenceRefs,
    roleScoped: true,
    developerControlFullAccess: hasDirectorFullAiAccess(params.role),
    roleIsolationE2eClaimed: false,
    evidenceRequired: true,
    allCardsHaveEvidence: aiWarehouseRiskCardsHaveEvidence(riskCards),
    allCardsHaveRiskPolicy: allCardsHaveRiskPolicy(riskCards),
    allCardsHaveKnownTool: riskCards.every((card) => card.suggestedToolId === "get_warehouse_status"),
    movementSummaryReady: Boolean(warehouseStatus && warehouseStatus.movement_summary.item_count >= 0),
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    directSupabaseFromUi: false,
    mobileExternalFetch: false,
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

export async function buildAiWarehouseCopilotStatus(params: {
  auth: AiWarehouseCopilotAuthContext | null;
  input?: AiWarehouseCopilotInput;
}): Promise<AiWarehouseCopilotStatusResult> {
  const role = params.auth?.role ?? "unknown";
  if (!isAuthenticated(params.auth)) {
    return baseResult({
      status: "blocked",
      role,
      blockedReason: "AI warehouse copilot requires authenticated role context.",
    });
  }

  if (!canUseAiWarehouseCopilot(params.auth.role)) {
    return baseResult({
      status: "blocked",
      role: params.auth.role,
      blockedReason: "AI warehouse copilot is not visible for this role.",
    });
  }

  let warehouseStatus = params.input?.warehouseStatus ?? null;
  if (warehouseStatus && !statusScopeAllowedForWarehouseRole(params.auth.role, warehouseStatus)) {
    return baseResult({
      status: "blocked",
      role: params.auth.role,
      blockedReason: "Warehouse status scope is not allowed for this role.",
    });
  }

  if (!warehouseStatus) {
    const { runGetWarehouseStatusToolSafeRead } = await import("../tools/getWarehouseStatusTool");
    const envelope = await runGetWarehouseStatusToolSafeRead({
      auth: params.auth,
      input: toolInput(params.input),
      readWarehouseStatus: params.input?.readWarehouseStatus,
    });

    if (!envelope.ok) {
      return baseResult({
        status: "blocked",
        role: params.auth.role,
        blockedReason: envelope.error.code,
      });
    }
    warehouseStatus = envelope.data;
  }

  const evidenceRefs = buildAiWarehouseEvidenceRefs(warehouseStatus);
  if (evidenceRefs.length === 0) {
    return baseResult({
      status: "empty",
      role: params.auth.role,
      warehouseStatus,
      emptyReason: "Warehouse status safe-read returned no redacted evidence refs.",
    });
  }

  const riskCards = buildAiWarehouseRiskCards(warehouseStatus);
  return baseResult({
    status: "loaded",
    role: params.auth.role,
    warehouseStatus,
    riskCards,
    evidenceRefs,
  });
}

export async function previewAiWarehouseMovements(params: {
  auth: AiWarehouseCopilotAuthContext | null;
  input?: AiWarehouseCopilotInput;
}): Promise<AiWarehouseMovementSummaryPreview> {
  const result = await buildAiWarehouseCopilotStatus(params);
  const previewStatus =
    result.status === "blocked" ? "blocked" : result.warehouseStatus && result.evidenceRefs.length > 0 ? "preview" : "empty";

  return {
    status: previewStatus,
    role: result.role,
    movementSummary: result.warehouseStatus?.movement_summary ?? null,
    evidenceRefs: result.evidenceRefs,
    roleScoped: true,
    evidenceBacked: result.evidenceRefs.length > 0,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    fakeWarehouseCards: false,
  };
}

export async function previewAiWarehouseRisk(params: {
  auth: AiWarehouseCopilotAuthContext | null;
  input?: AiWarehouseCopilotInput;
}): Promise<AiWarehouseRiskPreview> {
  const result = await buildAiWarehouseCopilotStatus(params);
  const riskLevel = riskLevelForWarehouseStatus(result.warehouseStatus);
  const policy = decideAiWarehouseActionPolicy({
    role: result.role,
    intent: "risk_preview",
    riskLevel,
  });
  const hasEvidence = result.evidenceRefs.length > 0;
  const previewStatus =
    result.status === "blocked" ? "blocked" : result.riskCards.length > 0 && hasEvidence ? "preview" : "empty";

  return {
    status: previewStatus,
    classification:
      previewStatus === "empty"
        ? "WAREHOUSE_INSUFFICIENT_EVIDENCE_BLOCKED"
        : policy.classification,
    riskLevel,
    title:
      previewStatus === "preview"
        ? "Warehouse risk preview"
        : previewStatus === "blocked"
          ? "Warehouse risk preview blocked"
          : "No warehouse risk preview available",
    summary:
      previewStatus === "preview"
        ? `${result.riskCards.length} evidence-backed warehouse risk card(s) are ready for review.`
        : result.blockedReason ?? result.emptyState?.reason ?? "No redacted warehouse risk evidence is available.",
    riskCards: result.riskCards,
    evidenceRefs: result.evidenceRefs,
    suggestedToolId: previewStatus === "blocked" ? null : "get_warehouse_status",
    suggestedMode: previewStatus === "blocked" ? "forbidden" : "safe_read",
    approvalRequired: false,
    roleScoped: true,
    evidenceBacked: hasEvidence,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    stockMutated: false,
    reservationCreated: false,
    movementCreated: false,
    fakeWarehouseCards: false,
  };
}
