import {
  canUseAiCapability,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { planAiToolUse, type AiToolPlan } from "../tools/aiToolPlanPolicy";
import { AI_TOOL_REGISTRY } from "../tools/aiToolRegistry";
import type { AiToolDefinition } from "../tools/aiToolTypes";

export type AgentBffRouteShellContractId = "agent_bff_route_shell_v1";
export type AgentBffRouteShellDocumentType = "agent_bff_route_shell";

export type AgentBffRouteOperation =
  | "agent.tools.list"
  | "agent.tools.validate"
  | "agent.tools.preview"
  | "agent.action.status";

export type AgentBffHttpMethod = "GET" | "POST";

export type AgentBffRouteDefinition = {
  operation: AgentBffRouteOperation;
  method: AgentBffHttpMethod;
  endpoint: string;
  authRequired: true;
  roleFiltered: boolean;
  mutates: false;
  executesTool: false;
  callsModelProvider: false;
  callsDatabaseDirectly: false;
  exposesForbiddenTools: false;
  responseEnvelope: "AgentBffRouteShellEnvelope";
};

export type AgentBffAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentBffShellRequest = {
  auth: AgentBffAuthContext | null;
};

export type AgentBffToolRouteRequest = AgentBffShellRequest & {
  toolName: string;
  input?: unknown;
};

export type AgentBffActionStatusRequest = AgentBffShellRequest & {
  actionId: string;
};

export type AgentBffVisibleTool = {
  name: AiToolDefinition["name"];
  description: string;
  domain: AiToolDefinition["domain"];
  riskLevel: AiToolDefinition["riskLevel"];
  approvalRequired: boolean;
  rateLimitScope: string;
  cacheAllowed: boolean;
  evidenceRequired: boolean;
  routeMode: AiToolPlan["mode"];
};

export type AgentBffToolValidationDto = {
  toolName: string;
  valid: boolean;
  plan: AiToolPlan;
  mutationCount: 0;
  executed: false;
};

export type AgentBffToolPreviewDto = {
  toolName: string;
  previewAvailable: boolean;
  plan: AiToolPlan;
  mutationCount: 0;
  executed: false;
  persisted: false;
  providerCalled: false;
  dbAccessed: false;
  previewKind: "schema_only" | "blocked";
};

export type AgentBffActionStatusDto = {
  actionId: string;
  status: "not_found";
  lookupPerformed: false;
  mutationCount: 0;
  executed: false;
  providerCalled: false;
  dbAccessed: false;
};

export type AgentTaskStreamCardType =
  | "approval_pending"
  | "supplier_price_change"
  | "warehouse_low_stock"
  | "draft_ready"
  | "report_ready"
  | "finance_risk"
  | "missing_document"
  | "recommended_next_action";

export type AgentTaskStreamPriority = "low" | "normal" | "high" | "critical";

export type AgentTaskStreamScope =
  | {
      kind: "cross_domain";
    }
  | {
      kind: "role_domain";
      allowedRoles: readonly AiUserRole[];
    }
  | {
      kind: "own_record";
      ownerUserIdHash: string;
    };

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

export type AgentTaskStreamPageInput = {
  limit?: number;
  cursor?: string | null;
};

export type AgentTaskStreamRequest = AgentBffShellRequest & {
  page?: AgentTaskStreamPageInput;
  sourceCards?: readonly AgentTaskStreamCard[];
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

export type AgentBffRouteShellDto =
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.tools.list";
      tools: readonly AgentBffVisibleTool[];
      mutationCount: 0;
      source: "bff:agent_route_shell_v1";
    }
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.tools.validate";
      result: AgentBffToolValidationDto;
      source: "bff:agent_route_shell_v1";
    }
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.tools.preview";
      result: AgentBffToolPreviewDto;
      source: "bff:agent_route_shell_v1";
    }
  | {
      contractId: AgentBffRouteShellContractId;
      documentType: AgentBffRouteShellDocumentType;
      operation: "agent.action.status";
      result: AgentBffActionStatusDto;
      source: "bff:agent_route_shell_v1";
    };

export type AgentBffRouteShellErrorCode =
  | "AGENT_BFF_AUTH_REQUIRED"
  | "AGENT_BFF_TOOL_NOT_VISIBLE"
  | "AGENT_BFF_INVALID_ACTION_ID";

export type AgentBffRouteShellEnvelope =
  | {
      ok: true;
      data: AgentBffRouteShellDto;
    }
  | {
      ok: false;
      error: {
        code: AgentBffRouteShellErrorCode;
        message: string;
      };
    };

export const AGENT_BFF_ROUTE_SHELL_CONTRACT = Object.freeze({
  contractId: "agent_bff_route_shell_v1",
  documentType: "agent_bff_route_shell",
  source: "bff:agent_route_shell_v1",
  readOnly: true,
  trafficEnabledByDefault: false,
  productionTrafficEnabled: false,
  authRequired: true,
  roleFilteredTools: true,
  previewMutates: false,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  executionEnabled: false,
  forbiddenToolsHidden: true,
} as const);

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
} as const);

export const AGENT_BFF_ROUTE_DEFINITIONS = Object.freeze([
  {
    operation: "agent.tools.list",
    method: "GET",
    endpoint: "GET /agent/tools",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentBffRouteShellEnvelope",
  },
  {
    operation: "agent.tools.validate",
    method: "POST",
    endpoint: "POST /agent/tools/:name/validate",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentBffRouteShellEnvelope",
  },
  {
    operation: "agent.tools.preview",
    method: "POST",
    endpoint: "POST /agent/tools/:name/preview",
    authRequired: true,
    roleFiltered: true,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentBffRouteShellEnvelope",
  },
  {
    operation: "agent.action.status",
    method: "GET",
    endpoint: "GET /agent/action/:id/status",
    authRequired: true,
    roleFiltered: false,
    mutates: false,
    executesTool: false,
    callsModelProvider: false,
    callsDatabaseDirectly: false,
    exposesForbiddenTools: false,
    responseEnvelope: "AgentBffRouteShellEnvelope",
  },
] as const satisfies readonly AgentBffRouteDefinition[]);

function authRequiredError(): AgentBffRouteShellEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_BFF_AUTH_REQUIRED",
      message: "Agent BFF route shell requires authenticated role context",
    },
  };
}

function toolNotVisibleError(): AgentBffRouteShellEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_BFF_TOOL_NOT_VISIBLE",
      message: "Agent tool is not visible for this role",
    },
  };
}

function isAuthenticated(auth: AgentBffAuthContext | null): auth is AgentBffAuthContext {
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

function canSeeTaskStreamCard(card: AgentTaskStreamCard, auth: AgentBffAuthContext): boolean {
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

function isToolVisibleForRole(toolName: string, role: AiUserRole): boolean {
  return planAiToolUse({ toolName, role }).allowed;
}

function toVisibleTool(tool: AiToolDefinition, role: AiUserRole): AgentBffVisibleTool | null {
  const plan = planAiToolUse({ toolName: tool.name, role });
  if (!plan.allowed) return null;

  return {
    name: tool.name,
    description: tool.description,
    domain: tool.domain,
    riskLevel: tool.riskLevel,
    approvalRequired: tool.approvalRequired,
    rateLimitScope: tool.rateLimitScope,
    cacheAllowed: tool.cacheAllowed,
    evidenceRequired: tool.evidenceRequired,
    routeMode: plan.mode,
  };
}

export function listAgentBffTools(request: AgentBffShellRequest): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();

  const { auth } = request;
  const tools = AI_TOOL_REGISTRY
    .map((tool) => toVisibleTool(tool, auth.role))
    .filter((tool): tool is AgentBffVisibleTool => tool !== null);

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.tools.list",
      tools,
      mutationCount: 0,
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
}

export function validateAgentBffTool(request: AgentBffToolRouteRequest): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  const { auth } = request;
  if (!isToolVisibleForRole(request.toolName, auth.role)) return toolNotVisibleError();

  const plan = planAiToolUse({ toolName: request.toolName, role: auth.role });

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.tools.validate",
      result: {
        toolName: request.toolName,
        valid: plan.allowed,
        plan,
        mutationCount: 0,
        executed: false,
      },
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
}

export function previewAgentBffTool(request: AgentBffToolRouteRequest): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  const { auth } = request;
  if (!isToolVisibleForRole(request.toolName, auth.role)) return toolNotVisibleError();

  const plan = planAiToolUse({ toolName: request.toolName, role: auth.role });

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.tools.preview",
      result: {
        toolName: request.toolName,
        previewAvailable: plan.allowed,
        plan,
        mutationCount: 0,
        executed: false,
        persisted: false,
        providerCalled: false,
        dbAccessed: false,
        previewKind: plan.allowed ? "schema_only" : "blocked",
      },
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
}

export function getAgentBffActionStatus(
  request: AgentBffActionStatusRequest,
): AgentBffRouteShellEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  if (!request.actionId.trim()) {
    return {
      ok: false,
      error: {
        code: "AGENT_BFF_INVALID_ACTION_ID",
        message: "Agent action id is required",
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_BFF_ROUTE_SHELL_CONTRACT.contractId,
      documentType: AGENT_BFF_ROUTE_SHELL_CONTRACT.documentType,
      operation: "agent.action.status",
      result: {
        actionId: request.actionId,
        status: "not_found",
        lookupPerformed: false,
        mutationCount: 0,
        executed: false,
        providerCalled: false,
        dbAccessed: false,
      },
      source: AGENT_BFF_ROUTE_SHELL_CONTRACT.source,
    },
  };
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
  const visibleCards = sortTaskStreamCards(request.sourceCards ?? []).filter((card) =>
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
    },
  };
}
