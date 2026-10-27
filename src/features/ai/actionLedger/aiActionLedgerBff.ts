import { AI_DOMAINS, type AiDomain, type AiUserRole } from "../policy/aiRolePolicy";
import {
  normalizeAiActionLedgerActionType,
  stableHashOpaqueId,
} from "./aiActionLedgerPolicy";
import {
  createAiActionLedgerRepository,
  type AiActionLedgerRepository,
  type AiActionLedgerPersistentBackend,
} from "./aiActionLedgerRepository";
import { createAiActionLedgerRpcBackend } from "./aiActionLedgerRpcBackend";
import {
  executeApprovedActionGateway,
  getApprovedActionExecutionStatus,
} from "../executors/executeApprovedActionGateway";
import { createApprovedProcurementRequestBffMutationBoundary } from "../executors/approvedProcurementRequestBffMutationBoundary";
import { createProcurementRequestExecutor } from "../executors/procurementRequestExecutor";
import type {
  ApprovedActionDomainExecutor,
  ApprovedActionExecutionResult,
} from "../executors/approvedActionExecutorTypes";
import type {
  AiActionDecisionOutput,
  AiActionLedgerActionType,
  AiActionStatusOutput,
  ExecuteApprovedAiActionOutput,
  SubmitAiActionForApprovalOutput,
} from "./aiActionLedgerTypes";

export const AI_ACTION_LEDGER_BFF_CONTRACT = Object.freeze({
  contractId: "ai_action_ledger_bff_v1",
  submitEndpoint: "POST /agent/action/submit-for-approval",
  statusEndpoint: "GET /agent/action/:actionId/status",
  approveEndpoint: "POST /agent/action/:actionId/approve",
  rejectEndpoint: "POST /agent/action/:actionId/reject",
  executeApprovedEndpoint: "POST /agent/action/:actionId/execute-approved",
  executionStatusEndpoint: "GET /agent/action/:actionId/execution-status",
  authRequired: true,
  roleResolvedServerSide: true,
  organizationScopeResolvedServerSide: true,
  idempotencyRequired: true,
  auditRequired: true,
  evidenceRequired: true,
  redactedPayloadOnly: true,
  finalExecution: false,
  directDomainMutation: false,
  fakeLocalApproval: false,
  providerCalled: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
} as const);

export type SubmitForApprovalInput = {
  actionType: string;
  screenId: string;
  domain: string;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: string[];
  idempotencyKey: string;
};

export type AiActionLedgerBffAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type SubmitForApprovalBffRequest = {
  auth: AiActionLedgerBffAuthContext | null;
  input: SubmitForApprovalInput;
  organizationId?: string;
  repository?: AiActionLedgerRepository;
};

export type ActionLedgerStatusBffRequest = {
  auth: AiActionLedgerBffAuthContext | null;
  actionId: string;
  organizationId?: string;
  repository?: AiActionLedgerRepository;
  backend?: AiActionLedgerPersistentBackend | null;
  procurementExecutor?: ApprovedActionDomainExecutor | null;
  idempotencyKey?: string;
};

export type ActionLedgerDecisionBffRequest = ActionLedgerStatusBffRequest & {
  reason?: string;
};

export type ActionLedgerBffDto =
  | {
      contractId: "ai_action_ledger_bff_v1";
      documentType: "ai_action_submit_for_approval";
      endpoint: "POST /agent/action/submit-for-approval";
      result: SubmitAiActionForApprovalOutput;
      roleScoped: true;
      evidenceBacked: true;
      idempotencyRequired: true;
      auditRequired: true;
      redactedPayloadOnly: true;
      finalExecution: false;
      directDomainMutation: false;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_action_ledger_bff_v1";
      documentType: "ai_action_status";
      endpoint: "GET /agent/action/:actionId/status";
      result: AiActionStatusOutput;
      roleScoped: true;
      readOnly: true;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_action_ledger_bff_v1";
      documentType: "ai_action_approve" | "ai_action_reject";
      endpoint: "POST /agent/action/:actionId/approve" | "POST /agent/action/:actionId/reject";
      result: AiActionDecisionOutput;
      roleScoped: true;
      auditRequired: true;
      finalExecution: false;
      directDomainMutation: false;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_action_ledger_bff_v1";
      documentType: "ai_action_execute_approved";
      endpoint: "POST /agent/action/:actionId/execute-approved";
      result: ExecuteApprovedAiActionOutput | ApprovedActionExecutionResult;
      roleScoped: true;
      auditRequired: true;
      finalExecution: false;
      directDomainMutation: false;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    }
  | {
      contractId: "ai_action_ledger_bff_v1";
      documentType: "ai_action_execution_status";
      endpoint: "GET /agent/action/:actionId/execution-status";
      result: ApprovedActionExecutionResult;
      roleScoped: true;
      readOnly: true;
      providerCalled: false;
      rawDbRowsExposed: false;
      rawPromptExposed: false;
    };

export type ActionLedgerBffEnvelope =
  | {
      ok: true;
      data: ActionLedgerBffDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AI_ACTION_LEDGER_AUTH_REQUIRED"
          | "AI_ACTION_LEDGER_INVALID_INPUT";
        message: string;
      };
    };

function authRequired(): ActionLedgerBffEnvelope {
  return {
    ok: false,
    error: {
      code: "AI_ACTION_LEDGER_AUTH_REQUIRED",
      message: "AI action ledger route requires authenticated role context",
    },
  };
}

function invalidInput(message: string): ActionLedgerBffEnvelope {
  return {
    ok: false,
    error: {
      code: "AI_ACTION_LEDGER_INVALID_INPUT",
      message,
    },
  };
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeDomain(value: unknown): AiDomain | null {
  return AI_DOMAINS.find((domain) => domain === value) ?? null;
}

function normalizeSubmitInput(input: SubmitForApprovalInput): {
  actionType: AiActionLedgerActionType;
  domain: AiDomain;
  screenId: string;
  summary: string;
  idempotencyKey: string;
  evidenceRefs: string[];
  redactedPayload: unknown;
} | null {
  const actionType = normalizeAiActionLedgerActionType(input.actionType);
  const domain = normalizeDomain(input.domain);
  const screenId = normalizeText(input.screenId);
  const summary = normalizeText(input.summary);
  const idempotencyKey = normalizeText(input.idempotencyKey);
  const evidenceRefs = Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [];
  if (!actionType || !domain || !screenId || !summary || !idempotencyKey) return null;
  return {
    actionType,
    domain,
    screenId,
    summary,
    idempotencyKey,
    evidenceRefs,
    redactedPayload: input.redactedPayload,
  };
}

function repositoryForBff(request: {
  auth: AiActionLedgerBffAuthContext;
  organizationId?: string;
  repository?: AiActionLedgerRepository;
}): AiActionLedgerRepository {
  if (request.repository) return request.repository;
  const backend = createAiActionLedgerRpcBackend({
    organizationId: request.organizationId ?? "",
    organizationIdHash: orgHash(request.auth, request.organizationId),
    actorUserId: request.auth.userId,
    actorUserIdHash: userHash(request.auth),
    actorRole: request.auth.role,
  });
  return createAiActionLedgerRepository(backend);
}

function backendForBff(request: {
  auth: AiActionLedgerBffAuthContext;
  organizationId?: string;
  backend?: AiActionLedgerPersistentBackend | null;
}): AiActionLedgerPersistentBackend | null {
  if (request.backend !== undefined) return request.backend;
  return createAiActionLedgerRpcBackend({
    organizationId: request.organizationId ?? "",
    organizationIdHash: orgHash(request.auth, request.organizationId),
    actorUserId: request.auth.userId,
    actorUserIdHash: userHash(request.auth),
    actorRole: request.auth.role,
  });
}

function procurementExecutorForBff(
  explicitExecutor: ApprovedActionDomainExecutor | null | undefined,
): ApprovedActionDomainExecutor | null {
  if (explicitExecutor !== undefined) return explicitExecutor;
  return createProcurementRequestExecutor(
    createApprovedProcurementRequestBffMutationBoundary(),
  );
}

function orgHash(auth: AiActionLedgerBffAuthContext, organizationId?: string): string {
  return stableHashOpaqueId("org", organizationId ?? `${auth.role}:organization_scope`);
}

function userHash(auth: AiActionLedgerBffAuthContext): string {
  return stableHashOpaqueId("user", auth.userId);
}

export async function submitActionForApprovalBff(
  request: SubmitForApprovalBffRequest,
): Promise<ActionLedgerBffEnvelope> {
  if (!request.auth || !request.auth.userId.trim() || request.auth.role === "unknown") {
    return authRequired();
  }
  const input = normalizeSubmitInput(request.input);
  if (!input) return invalidInput("submit-for-approval requires actionType, screenId, domain, summary, and idempotencyKey");

  const result = await repositoryForBff({ ...request, auth: request.auth }).submitForApproval(
    {
      ...input,
      requestedByUserIdHash: userHash(request.auth),
      organizationIdHash: orgHash(request.auth, request.organizationId),
    },
    request.auth.role,
  );

  return {
    ok: true,
    data: {
      contractId: AI_ACTION_LEDGER_BFF_CONTRACT.contractId,
      documentType: "ai_action_submit_for_approval",
      endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint,
      result,
      roleScoped: true,
      evidenceBacked: true,
      idempotencyRequired: true,
      auditRequired: true,
      redactedPayloadOnly: true,
      finalExecution: false,
      directDomainMutation: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function getActionLedgerStatusBff(
  request: ActionLedgerStatusBffRequest,
): Promise<ActionLedgerBffEnvelope> {
  if (!request.auth || !request.auth.userId.trim() || request.auth.role === "unknown") {
    return authRequired();
  }
  const actionId = normalizeText(request.actionId);
  if (!actionId) return invalidInput("actionId is required");

  const result = await repositoryForBff({ ...request, auth: request.auth }).getStatus(actionId, request.auth.role);
  return {
    ok: true,
    data: {
      contractId: AI_ACTION_LEDGER_BFF_CONTRACT.contractId,
      documentType: "ai_action_status",
      endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.statusEndpoint,
      result,
      roleScoped: true,
      readOnly: true,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function approveActionLedgerBff(
  request: ActionLedgerDecisionBffRequest,
): Promise<ActionLedgerBffEnvelope> {
  if (!request.auth || !request.auth.userId.trim() || request.auth.role === "unknown") {
    return authRequired();
  }
  const actionId = normalizeText(request.actionId);
  if (!actionId) return invalidInput("actionId is required");

  const result = await repositoryForBff({ ...request, auth: request.auth }).approve({
    actionId,
    approverRole: request.auth.role,
    approvedByUserIdHash: userHash(request.auth),
  });
  return {
    ok: true,
    data: {
      contractId: AI_ACTION_LEDGER_BFF_CONTRACT.contractId,
      documentType: "ai_action_approve",
      endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.approveEndpoint,
      result,
      roleScoped: true,
      auditRequired: true,
      finalExecution: false,
      directDomainMutation: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function rejectActionLedgerBff(
  request: ActionLedgerDecisionBffRequest,
): Promise<ActionLedgerBffEnvelope> {
  if (!request.auth || !request.auth.userId.trim() || request.auth.role === "unknown") {
    return authRequired();
  }
  const actionId = normalizeText(request.actionId);
  if (!actionId) return invalidInput("actionId is required");

  const result = await repositoryForBff({ ...request, auth: request.auth }).reject({
    actionId,
    rejectorRole: request.auth.role,
    rejectedByUserIdHash: userHash(request.auth),
    reason: request.reason,
  });
  return {
    ok: true,
    data: {
      contractId: AI_ACTION_LEDGER_BFF_CONTRACT.contractId,
      documentType: "ai_action_reject",
      endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.rejectEndpoint,
      result,
      roleScoped: true,
      auditRequired: true,
      finalExecution: false,
      directDomainMutation: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function executeApprovedActionLedgerBff(
  request: ActionLedgerStatusBffRequest,
): Promise<ActionLedgerBffEnvelope> {
  if (!request.auth || !request.auth.userId.trim() || request.auth.role === "unknown") {
    return authRequired();
  }
  const actionId = normalizeText(request.actionId);
  if (!actionId) return invalidInput("actionId is required");

  if (request.backend !== undefined) {
    const result = await executeApprovedActionGateway({
      backend: request.backend,
      request: {
        actionId,
        idempotencyKey: normalizeText(request.idempotencyKey),
        requestedByRole: request.auth.role,
        screenId: "agent.action.execute-approved",
      },
      executors: {
        procurement: procurementExecutorForBff(request.procurementExecutor),
      },
    });
    return {
      ok: true,
      data: {
        contractId: AI_ACTION_LEDGER_BFF_CONTRACT.contractId,
        documentType: "ai_action_execute_approved",
        endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.executeApprovedEndpoint,
        result,
        roleScoped: true,
        auditRequired: true,
        finalExecution: false,
        directDomainMutation: false,
        providerCalled: false,
        rawDbRowsExposed: false,
        rawPromptExposed: false,
      },
    };
  }

  const result = await executeApprovedActionGateway({
    backend: backendForBff({ ...request, auth: request.auth }),
    request: {
      actionId,
      idempotencyKey: normalizeText(request.idempotencyKey),
      requestedByRole: request.auth.role,
      screenId: "agent.action.execute-approved",
    },
    executors: {
      procurement: procurementExecutorForBff(request.procurementExecutor),
    },
  });

  return {
    ok: true,
    data: {
      contractId: AI_ACTION_LEDGER_BFF_CONTRACT.contractId,
      documentType: "ai_action_execute_approved",
      endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.executeApprovedEndpoint,
      result,
      roleScoped: true,
      auditRequired: true,
      finalExecution: false,
      directDomainMutation: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function getActionExecutionStatusBff(
  request: ActionLedgerStatusBffRequest,
): Promise<ActionLedgerBffEnvelope> {
  if (!request.auth || !request.auth.userId.trim() || request.auth.role === "unknown") {
    return authRequired();
  }
  const actionId = normalizeText(request.actionId);
  const idempotencyKey = normalizeText(request.idempotencyKey);
  if (!actionId) return invalidInput("actionId is required");
  if (!idempotencyKey) return invalidInput("idempotencyKey is required");

  const result = await getApprovedActionExecutionStatus({
    backend: backendForBff({ ...request, auth: request.auth }),
    actionId,
    idempotencyKey,
  });

  return {
    ok: true,
    data: {
      contractId: AI_ACTION_LEDGER_BFF_CONTRACT.contractId,
      documentType: "ai_action_execution_status",
      endpoint: AI_ACTION_LEDGER_BFF_CONTRACT.executionStatusEndpoint,
      result,
      roleScoped: true,
      readOnly: true,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}
