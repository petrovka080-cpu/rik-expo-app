import {
  canUseAiCapability,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { loadAiTaskStreamRuntime } from "../taskStream/aiTaskStreamRuntime";
import type {
  AiTaskStreamCardType,
  AiTaskStreamPriority,
  AiTaskStreamRuntimeEvidenceInput,
  AiTaskStreamRuntimeResult,
  AiTaskStreamScope,
} from "../taskStream/aiTaskStreamRuntimeTypes";
import type { AiToolDefinition } from "../tools/aiToolTypes";

export type AgentTaskStreamCardType = AiTaskStreamCardType;
export type AgentTaskStreamPriority = AiTaskStreamPriority;
export type AgentTaskStreamScope = AiTaskStreamScope;

export type AgentTaskStreamCard = {
  id: string;
  type: AgentTaskStreamCardType;
  title: string;
  summary: string;
  domain: AiDomain;
  priority: AgentTaskStreamPriority;
  createdAt: string;
  evidenceRefs: readonly string[];
  scope: AgentTaskStreamScope;
  recommendedToolName?: AiToolDefinition["name"];
  nextActionLabel?: string;
};

export type AgentTaskStreamAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentTaskStreamPageInput = {
  limit?: number;
  cursor?: string | null;
};

export type AgentTaskStreamRequest = {
  auth: AgentTaskStreamAuthContext | null;
  screenId?: string;
  page?: AgentTaskStreamPageInput;
  sourceCards?: readonly AgentTaskStreamCard[];
  runtimeEvidence?: AiTaskStreamRuntimeEvidenceInput;
};

export type AgentTaskStreamDto = {
  contractId: "agent_task_stream_bff_v1";
  documentType: "agent_task_stream";
  endpoint: "GET /agent/task-stream";
  cards: readonly AgentTaskStreamCard[];
  page: {
    limit: number;
    cursor: string | null;
    nextCursor: string | null;
  };
  paginated: true;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  executed: false;
  providerCalled: false;
  dbAccessedDirectly: false;
  source: "bff:agent_task_stream_v1";
  runtimeStatus: AiTaskStreamRuntimeResult["status"];
  blockedReason: string | null;
  countsByType: Record<string, number>;
};

export type AgentTaskStreamEnvelope =
  | {
      ok: true;
      data: AgentTaskStreamDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_TASK_STREAM_AUTH_REQUIRED" | "AGENT_TASK_STREAM_INVALID_PAGE";
        message: string;
      };
    };

export const AGENT_TASK_STREAM_BFF_CONTRACT = Object.freeze({
  contractId: "agent_task_stream_bff_v1",
  documentType: "agent_task_stream",
  endpoint: "GET /agent/task-stream",
  readOnly: true,
  paginated: true,
  roleScoped: true,
  evidenceBacked: true,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  executionEnabled: false,
  trafficEnabledByDefault: false,
  productionTrafficEnabled: false,
  supportedCardTypes: [
    "approval_pending",
    "supplier_price_change",
    "warehouse_low_stock",
    "draft_ready",
    "report_ready",
    "finance_risk",
    "missing_document",
    "recommended_next_action",
  ],
  runtimeAdapter: "runtime:ai_task_stream_v1",
} as const);

function isAuthenticated(
  auth: AgentTaskStreamAuthContext | null,
): auth is AgentTaskStreamAuthContext {
  return auth !== null && auth.userId.length > 0 && auth.role !== "unknown";
}

function normalizePageLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  const whole = Math.trunc(value ?? 20);
  if (whole < 1) return 1;
  if (whole > 50) return 50;
  return whole;
}

function normalizeCursor(value: string | null | undefined): number | null {
  if (value === undefined || value === null || value.trim().length === 0) return 0;
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function hasEvidence(card: AgentTaskStreamCard): boolean {
  return card.evidenceRefs.some((ref) => ref.trim().length > 0);
}

function canSeeTaskStreamCard(
  card: AgentTaskStreamCard,
  auth: AgentTaskStreamAuthContext,
): boolean {
  if (!hasEvidence(card)) return false;
  if (auth.role === "director" || auth.role === "control") return true;
  if (!canUseAiCapability({ role: auth.role, domain: card.domain, capability: "read_context" })) {
    return false;
  }
  if (card.scope.kind === "cross_domain") return false;
  if (card.scope.kind === "role_domain") return card.scope.allowedRoles.includes(auth.role);
  return card.scope.ownerUserIdHash === auth.userId;
}

function sortTaskStreamCards(cards: readonly AgentTaskStreamCard[]): AgentTaskStreamCard[] {
  return [...cards].sort((left, right) => {
    const dateDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (dateDelta !== 0 && Number.isFinite(dateDelta)) return dateDelta;
    return left.id.localeCompare(right.id);
  });
}

function countTaskStreamCardsByType(cards: readonly AgentTaskStreamCard[]): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    acc[card.type] = (acc[card.type] ?? 0) + 1;
    return acc;
  }, {});
}

export function getAgentTaskStream(request: AgentTaskStreamRequest): AgentTaskStreamEnvelope {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "AGENT_TASK_STREAM_AUTH_REQUIRED",
        message: "Agent task stream requires authenticated role context",
      },
    };
  }

  const offset = normalizeCursor(request.page?.cursor);
  if (offset === null) {
    return {
      ok: false,
      error: {
        code: "AGENT_TASK_STREAM_INVALID_PAGE",
        message: "Agent task stream cursor must be a non-negative integer string",
      },
    };
  }

  const auth = request.auth;
  const limit = normalizePageLimit(request.page?.limit);
  const runtime =
    request.sourceCards === undefined
      ? loadAiTaskStreamRuntime({
          auth,
          screenId: request.screenId ?? "ai.command.center",
          cursor: null,
          limit: 50,
          evidence: request.runtimeEvidence,
        })
      : null;
  const sourceCards = request.sourceCards ?? runtime?.cards ?? [];
  const visibleCards = sortTaskStreamCards(sourceCards).filter((card) =>
    canSeeTaskStreamCard(card, auth),
  );
  const pageCards = visibleCards.slice(offset, offset + limit);
  const nextOffset = offset + pageCards.length;
  const nextCursor = nextOffset < visibleCards.length ? String(nextOffset) : null;

  return {
    ok: true,
    data: {
      contractId: AGENT_TASK_STREAM_BFF_CONTRACT.contractId,
      documentType: AGENT_TASK_STREAM_BFF_CONTRACT.documentType,
      endpoint: AGENT_TASK_STREAM_BFF_CONTRACT.endpoint,
      cards: pageCards,
      page: {
        limit,
        cursor: request.page?.cursor ?? null,
        nextCursor,
      },
      paginated: true,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      executed: false,
      providerCalled: false,
      dbAccessedDirectly: false,
      source: "bff:agent_task_stream_v1",
      runtimeStatus:
        runtime?.status ?? (pageCards.length > 0 ? "loaded" : "empty"),
      blockedReason: runtime?.blockedReason ?? null,
      countsByType: runtime?.countsByType ?? countTaskStreamCardsByType(pageCards),
    },
  };
}
