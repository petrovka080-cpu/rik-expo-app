import {
  canUseAiCapability,
  hasDirectorFullAiAccess,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { loadAiTaskStreamRuntime } from "../taskStream/aiTaskStreamRuntime";
import type { AiTaskStreamCard } from "../taskStream/aiTaskStreamRuntimeTypes";
import {
  AI_WORKDAY_EMPTY_STATE_REASON,
  hasAiWorkdayEvidenceRefs,
  toAiWorkdayEvidenceRefs,
} from "./aiWorkdayTaskEvidence";
import { evaluateAiWorkdayTaskPolicy, isKnownAiWorkdayToolName } from "./aiWorkdayTaskPolicy";
import {
  rankAiWorkdayTasks,
  riskForWorkdayMode,
  urgencyForWorkdayPriority,
} from "./aiWorkdayTaskRanking";
import type {
  AiWorkdayTaskCard,
  AiWorkdayTaskEngineInput,
  AiWorkdayTaskEngineResult,
  AiWorkdayTaskNextAction,
  AiWorkdayTaskSafeMode,
  AiWorkdayTaskSourceCard,
} from "./aiWorkdayTaskTypes";

export const AI_WORKDAY_TASK_ENGINE_CONTRACT = Object.freeze({
  contractId: "ai_workday_task_intelligence_v1",
  source: "runtime:ai_workday_task_intelligence_v1",
  backendFirst: true,
  roleScoped: true,
  evidenceRequired: true,
  internalFirst: true,
  readOnly: true,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  providerCalled: false,
  finalExecution: 0,
  fakeCards: false,
  hardcodedAiAnswer: false,
} as const);

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  const whole = Math.trunc(value ?? 20);
  if (whole < 1) return 1;
  if (whole > 20) return 20;
  return whole;
}

function roleScopeForCard(
  card: AiWorkdayTaskSourceCard,
  role: AiUserRole,
): readonly AiUserRole[] {
  if (card.scope.kind === "role_domain") return card.scope.allowedRoles;
  if (card.scope.kind === "own_record") return [role];
  return ["director", "control"];
}

function canSeeWorkdaySourceCard(
  card: AiWorkdayTaskSourceCard,
  auth: NonNullable<AiWorkdayTaskEngineInput["auth"]>,
): boolean {
  if (!hasAiWorkdayEvidenceRefs(card.evidenceRefs)) return false;
  if (hasDirectorFullAiAccess(auth.role)) return true;
  if (!canUseAiCapability({ role: auth.role, domain: card.domain, capability: "read_context" })) {
    return false;
  }
  if (card.scope.kind === "cross_domain") return false;
  if (card.scope.kind === "role_domain") return card.scope.allowedRoles.includes(auth.role);
  return card.scope.ownerUserIdHash === auth.userId;
}

function sourceCardToWorkdaySourceCard(card: AiTaskStreamCard): AiWorkdayTaskSourceCard {
  return {
    id: card.id,
    type: card.type,
    title: card.title,
    summary: card.summary,
    domain: card.domain,
    priority: card.priority,
    createdAt: card.createdAt,
    evidenceRefs: card.evidenceRefs,
    scope: card.scope,
    recommendedToolName: card.recommendedToolName,
    nextActionLabel: card.nextActionLabel,
    sourceScreenId: card.sourceScreenId,
    sourceEntityType: card.sourceEntityType,
    sourceEntityIdHash: card.sourceEntityIdHash,
    requiresApproval: card.requiresApproval,
  };
}

function fallbackToolForCard(card: AiWorkdayTaskSourceCard): string | undefined {
  if (card.recommendedToolName) return card.recommendedToolName;
  if (card.type === "warehouse_low_stock") return "get_warehouse_status";
  if (card.type === "finance_risk") return "get_finance_summary";
  if (card.type === "approval_pending") return "get_action_status";
  if (card.type === "report_ready") return "draft_report";
  if (card.type === "missing_document") return "draft_act";
  if (card.type === "draft_ready") return "draft_request";
  if (card.type === "supplier_price_change" || card.type === "recommended_next_action") {
    return "compare_suppliers";
  }
  return undefined;
}

function nextActionForMode(params: {
  mode: AiWorkdayTaskSafeMode;
  toolName: string | undefined;
  sourceNextActionLabel: string | undefined;
}): AiWorkdayTaskNextAction {
  if (params.mode === "forbidden") return "forbidden";
  if (params.toolName === "get_action_status") return "open_status";
  if (params.mode === "approval_required") return "submit_for_approval";
  if (params.toolName === "draft_report") return "draft_report";
  if (params.toolName === "draft_act") return "draft_act";
  if (params.toolName === "draft_request" || params.mode === "draft_only") return "draft_request";
  if (params.sourceNextActionLabel === "submit_for_approval") return "submit_for_approval";
  return "preview";
}

function buildCard(
  source: AiWorkdayTaskSourceCard,
  auth: NonNullable<AiWorkdayTaskEngineInput["auth"]>,
): AiWorkdayTaskCard | null {
  const evidenceRefs = toAiWorkdayEvidenceRefs(source);
  const toolName = fallbackToolForCard(source);
  const firstPolicy = evaluateAiWorkdayTaskPolicy({
    role: auth.role,
    toolName,
    riskLevel: "low",
    evidenceRefs,
    approvalRequired: source.requiresApproval === true,
  });
  const mode = firstPolicy.suggestedMode;
  const riskLevel = riskForWorkdayMode({ mode, priority: source.priority });
  const policy = evaluateAiWorkdayTaskPolicy({
    role: auth.role,
    toolName,
    riskLevel,
    evidenceRefs,
    approvalRequired: source.requiresApproval === true,
  });

  if (!policy.allowed || !policy.suggestedToolId || !isKnownAiWorkdayToolName(toolName)) {
    return null;
  }

  return {
    taskId: `workday.${source.id}`,
    sourceCardId: source.id,
    roleScope: roleScopeForCard(source, auth.role),
    domain: source.domain,
    source: `task_stream:${source.type}`,
    title: source.title,
    summary: source.summary,
    riskLevel,
    urgency: urgencyForWorkdayPriority(source.priority),
    evidenceRefs,
    suggestedToolId: policy.suggestedToolId,
    suggestedMode: policy.suggestedMode,
    nextAction: nextActionForMode({
      mode: policy.suggestedMode,
      toolName: policy.suggestedToolId,
      sourceNextActionLabel: source.nextActionLabel,
    }),
    approvalRequired: policy.approvalRequired,
    safeMode: true,
    classification: policy.classification,
    blockCode: policy.blockCode,
    policyReason: policy.reason,
    mutationCount: 0,
  };
}

function baseResult(params: {
  status: AiWorkdayTaskEngineResult["status"];
  screenId: string;
  role: AiUserRole;
  taskStreamStatus?: AiWorkdayTaskEngineResult["taskStreamStatus"];
  cards?: readonly AiWorkdayTaskCard[];
  blockedReason?: string | null;
}): AiWorkdayTaskEngineResult {
  const cards = params.cards ?? [];
  const emptyState =
    params.status === "empty"
      ? {
          reason: AI_WORKDAY_EMPTY_STATE_REASON,
          honest: true as const,
          fakeCards: false as const,
          mutationCount: 0 as const,
        }
      : null;

  return {
    status: params.status,
    screenId: params.screenId,
    role: params.role,
    cards,
    emptyState,
    blockedReason: params.blockedReason ?? null,
    taskStreamStatus: params.taskStreamStatus ?? "empty",
    roleScoped: true,
    developerControlFullAccess: params.role === "director" || params.role === "control",
    roleIsolationE2eClaimed: false,
    evidenceRequired: true,
    allCardsHaveEvidence: cards.every((card) => card.evidenceRefs.length > 0),
    allCardsHaveRiskPolicy: cards.every((card) => card.policyReason.length > 0),
    allCardsHaveKnownTool: cards.every((card) => isKnownAiWorkdayToolName(card.suggestedToolId)),
    highRiskRequiresApproval: cards.every(
      (card) =>
        (card.riskLevel !== "high" && card.riskLevel !== "critical") ||
        card.approvalRequired,
    ),
    forbiddenActionsBlocked: true,
    internalFirst: true,
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
    fakeCards: false,
    hardcodedAiAnswer: false,
    source: AI_WORKDAY_TASK_ENGINE_CONTRACT.source,
  };
}

export function buildAiWorkdayTasks(
  input: AiWorkdayTaskEngineInput,
): AiWorkdayTaskEngineResult {
  const screenId = input.screenId?.trim() || "ai.command_center";
  if (!input.auth || input.auth.userId.trim().length === 0 || input.auth.role === "unknown") {
    return baseResult({
      status: "blocked",
      screenId,
      role: input.auth?.role ?? "unknown",
      taskStreamStatus: "blocked",
      blockedReason: "AI workday task intelligence requires authenticated role context.",
    });
  }

  const runtime =
    input.sourceCards === undefined
      ? loadAiTaskStreamRuntime({
          auth: input.auth,
          screenId,
          limit: 50,
          evidence: input.runtimeEvidence,
          nowIso: input.nowIso,
        })
      : null;
  const sourceCards = input.sourceCards ?? runtime?.cards.map(sourceCardToWorkdaySourceCard) ?? [];
  const visibleSourceCards = sourceCards.filter((card) =>
    canSeeWorkdaySourceCard(card, input.auth!),
  );
  const cards = rankAiWorkdayTasks(
    visibleSourceCards
      .map((card) => buildCard(card, input.auth!))
      .filter((card): card is AiWorkdayTaskCard => card !== null),
  ).slice(0, normalizeLimit(input.limit));

  if (runtime?.status === "blocked" && cards.length === 0) {
    return baseResult({
      status: "blocked",
      screenId,
      role: input.auth.role,
      taskStreamStatus: "blocked",
      blockedReason: runtime.blockedReason ?? "AI task stream runtime blocked workday inputs.",
    });
  }

  return baseResult({
    status: cards.length > 0 ? "loaded" : "empty",
    screenId,
    role: input.auth.role,
    taskStreamStatus: runtime?.status ?? (cards.length > 0 ? "loaded" : "empty"),
    cards,
  });
}
