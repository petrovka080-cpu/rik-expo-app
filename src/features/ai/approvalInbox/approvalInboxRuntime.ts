import {
  createAiActionLedgerRepository,
  isAiActionLedgerBackendBlockedError,
  type AiActionLedgerRepository,
  type AiActionLedgerPersistentBackend,
} from "../actionLedger/aiActionLedgerRepository";
import { createAiActionLedgerRpcBackend } from "../actionLedger/aiActionLedgerRpcBackend";
import {
  approveActionLedgerBff,
  executeApprovedActionLedgerBff,
  rejectActionLedgerBff,
} from "../actionLedger/aiActionLedgerBff";
import type {
  AiActionDecisionOutput,
  AiActionLedgerRecord,
} from "../actionLedger/aiActionLedgerTypes";
import {
  approvalInboxOrganizationHash,
  approvalInboxUserHash,
  canReadApprovalInboxAction,
  canExecuteApprovalInboxAction,
  resolveApprovalInboxReviewActions,
} from "./approvalInboxActionPolicy";
import {
  buildApprovalInboxRiskFlags,
  normalizeApprovalInboxEvidenceRefs,
} from "./approvalInboxEvidence";
import { redactApprovalInboxRecordPayload } from "./approvalInboxRedaction";
import type {
  ApprovalInboxActionCard,
  ApprovalInboxActionDetail,
  ApprovalInboxActionRequest,
  ApprovalInboxBffEnvelope,
  ApprovalInboxBlocker,
  ApprovalInboxCounts,
  ApprovalInboxDecisionRequest,
  ApprovalInboxEditPreviewOutput,
  ApprovalInboxListRequest,
  ApprovalInboxResponse,
} from "./approvalInboxTypes";

export const AI_APPROVAL_INBOX_BFF_CONTRACT = Object.freeze({
  contractId: "ai_approval_inbox_bff_v1",
  documentType: "ai_approval_inbox",
  endpoints: [
    "GET /agent/approval-inbox",
    "GET /agent/approval-inbox/:actionId",
    "POST /agent/approval-inbox/:actionId/approve",
    "POST /agent/approval-inbox/:actionId/reject",
    "POST /agent/approval-inbox/:actionId/edit-preview",
    "POST /agent/approval-inbox/:actionId/execute-approved",
  ],
  authRequired: true,
  roleResolvedServerSide: true,
  organizationResolvedServerSide: true,
  actionOwnershipChecked: true,
  riskPolicyChecked: true,
  screenPolicyChecked: true,
  idempotencyRequired: true,
  auditRequired: true,
  evidenceRequired: true,
  redactedPayloadOnly: true,
  reviewPanelRequired: true,
  approveWithoutReviewAllowed: false,
  fakeLocalApproval: false,
  finalExecution: false,
  directDomainMutation: false,
  directSupabaseFromUi: false,
  modelProviderFromUi: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
} as const);

const EMPTY_COUNTS: ApprovalInboxCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
  expired: 0,
};

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 20;
  const whole = Math.trunc(limit ?? 20);
  if (whole < 1) return 1;
  if (whole > 20) return 20;
  return whole;
}

function normalizeActionId(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function blockedResponse(params: {
  role: ApprovalInboxResponse["role"];
  blocker: ApprovalInboxBlocker;
  reason: string;
}): ApprovalInboxResponse {
  return {
    status: "blocked",
    role: params.role,
    actions: [],
    counts: EMPTY_COUNTS,
    nextCursor: null,
    blocker: params.blocker,
    reason: params.reason,
    persistentLedgerUsed: false,
    fakeLocalApproval: false,
    mutationCount: 0,
    finalMutationAllowed: false,
    directSupabaseFromUi: false,
    modelProviderFromUi: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
  };
}

function countActions(actions: readonly ApprovalInboxActionCard[]): ApprovalInboxCounts {
  return actions.reduce<ApprovalInboxCounts>(
    (acc, action) => {
      if (action.status === "pending") acc.pending += 1;
      if (action.status === "approved") acc.approved += 1;
      if (action.status === "rejected") acc.rejected += 1;
      if (action.status === "expired") acc.expired += 1;
      return acc;
    },
    { ...EMPTY_COUNTS },
  );
}

function titleForAction(record: AiActionLedgerRecord): string {
  const label = record.actionType.replace(/_/g, " ");
  return `AI ${label}`;
}

function isInboxStatus(record: AiActionLedgerRecord): boolean {
  return ["pending", "approved", "rejected", "expired", "blocked"].includes(record.status);
}

function isApprovalInboxBusinessAction(record: AiActionLedgerRecord): boolean {
  return record.riskLevel !== "safe_read" && isInboxStatus(record);
}

function buildActionCard(params: {
  record: AiActionLedgerRecord;
  role: ApprovalInboxResponse["role"];
}): ApprovalInboxActionCard | null {
  const { record, role } = params;
  if (!isApprovalInboxBusinessAction(record)) return null;
  const evidenceRefs = normalizeApprovalInboxEvidenceRefs(record.evidenceRefs);
  if (evidenceRefs.length === 0) return null;

  return {
    actionId: record.actionId,
    actionType: record.actionType,
    status: record.status as ApprovalInboxActionCard["status"],
    riskLevel: record.riskLevel as ApprovalInboxActionCard["riskLevel"],
    domain: record.domain,
    screenId: record.screenId,
    title: titleForAction(record),
    summary: record.summary,
    riskFlags: buildApprovalInboxRiskFlags(record),
    evidenceRefs,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    allowedReviewActions: resolveApprovalInboxReviewActions({ role, record }),
    executionAvailable: canExecuteApprovalInboxAction({ role, record }),
    executionStatus:
      record.status === "executed"
        ? "executed"
        : canExecuteApprovalInboxAction({ role, record })
          ? "ready_to_execute"
          : record.status === "approved"
            ? "blocked_executor_not_ready"
            : "not_ready",
    requiresApproval: true,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    rawProviderPayloadStored: false,
  };
}

function repositoryFor(request: ApprovalInboxListRequest): AiActionLedgerRepository {
  return createAiActionLedgerRepository(resolveApprovalInboxBackend(request));
}

function resolveApprovalInboxBackend(
  request: ApprovalInboxListRequest,
): AiActionLedgerPersistentBackend | null {
  if (request.backend) return request.backend;
  if (!request.auth || request.auth.role === "unknown" || !request.auth.userId.trim()) {
    return null;
  }
  return createAiActionLedgerRpcBackend({
    organizationId: request.organizationId ?? "",
    organizationIdHash: approvalInboxOrganizationHash({
      role: request.auth.role,
      organizationId: request.organizationId,
    }),
    actorUserId: request.auth.userId,
    actorUserIdHash: approvalInboxUserHash(request.auth.userId),
    actorRole: request.auth.role,
  });
}

async function findScopedRecord(
  request: ApprovalInboxActionRequest,
): Promise<AiActionLedgerRecord | null> {
  if (!request.auth || request.auth.role === "unknown" || !request.auth.userId.trim()) return null;
  const backend = resolveApprovalInboxBackend(request);
  if (!backend) return null;
  let record: AiActionLedgerRecord | null;
  try {
    record = await backend.findByActionId(normalizeActionId(request.actionId));
  } catch (error) {
    if (isAiActionLedgerBackendBlockedError(error)) return null;
    throw error;
  }
  if (!record) return null;
  const userIdHash = approvalInboxUserHash(request.auth.userId);
  return canReadApprovalInboxAction({ role: request.auth.role, userIdHash, record }) ? record : null;
}

export async function loadApprovalInbox(
  request: ApprovalInboxListRequest,
): Promise<ApprovalInboxResponse> {
  if (!request.auth || request.auth.role === "unknown" || !request.auth.userId.trim()) {
    return blockedResponse({
      role: request.auth?.role ?? "unknown",
      blocker: "BLOCKED_APPROVAL_INBOX_AUTH_REQUIRED",
      reason: "Approval Inbox requires authenticated role context.",
    });
  }
  const backend = resolveApprovalInboxBackend(request);
  if (!backend) {
    return blockedResponse({
      role: request.auth.role,
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      reason: "Persistent AI action ledger backend is not mounted.",
    });
  }

  const organizationIdHash = approvalInboxOrganizationHash({
    role: request.auth.role,
    organizationId: request.organizationId,
  });
  const userIdHash = approvalInboxUserHash(request.auth.userId);
  let page: Awaited<ReturnType<NonNullable<ApprovalInboxListRequest["backend"]>["listByOrganization"]>>;
  try {
    page = await backend.listByOrganization(organizationIdHash, {
      cursor: request.cursor,
      limit: normalizeLimit(request.limit),
    });
  } catch (error) {
    if (isAiActionLedgerBackendBlockedError(error)) {
      return blockedResponse({
        role: request.auth.role,
        blocker: error.blocker,
        reason: error.message,
      });
    }
    throw error;
  }
  const actions = page.records
    .filter((record) =>
      canReadApprovalInboxAction({
        role: request.auth!.role,
        userIdHash,
        record,
      }),
    )
    .map((record) => buildActionCard({ record, role: request.auth!.role }))
    .filter((card): card is ApprovalInboxActionCard => card !== null);

  return {
    status: actions.length > 0 ? "loaded" : "empty",
    role: request.auth.role,
    actions,
    counts: countActions(actions),
    nextCursor: page.nextCursor,
    persistentLedgerUsed: true,
    fakeLocalApproval: false,
    mutationCount: 0,
    finalMutationAllowed: false,
    directSupabaseFromUi: false,
    modelProviderFromUi: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
  };
}

export async function loadApprovalInboxAction(
  request: ApprovalInboxActionRequest,
): Promise<ApprovalInboxActionDetail> {
  const inbox = await loadApprovalInbox({ ...request, limit: 1 });
  if (inbox.status === "blocked") {
    return {
      ...inbox,
      action: null,
      redactedPayloadPreview: null,
    };
  }
  const record = await findScopedRecord(request);
  if (!record) {
    return {
      ...blockedResponse({
        role: request.auth?.role ?? "unknown",
        blocker: "BLOCKED_APPROVAL_ACTION_NOT_FOUND",
        reason: "Approval action was not found in the persistent ledger or is outside role scope.",
      }),
      action: null,
      redactedPayloadPreview: null,
    };
  }
  const action = buildActionCard({ record, role: request.auth!.role });
  return {
    ...inbox,
    status: action ? "loaded" : "blocked",
    actions: action ? [action] : [],
    counts: action ? countActions([action]) : EMPTY_COUNTS,
    action,
    redactedPayloadPreview: redactApprovalInboxRecordPayload(record),
  };
}

function reviewPanelRequiredDecision(params: {
  actionId: string;
  backendMounted: boolean;
  reason: string;
}): AiActionDecisionOutput {
  return {
    persistentBackend: params.backendMounted,
    fakeLocalApproval: false,
    finalExecution: false,
    directDomainMutation: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
    rawProviderPayloadStored: false,
    credentialsPrinted: false,
    status: "blocked",
    actionId: params.actionId,
    persisted: false,
    auditEvents: [],
    blocker: "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
    reason: params.reason,
  };
}

export async function approveApprovalInboxAction(
  request: ApprovalInboxDecisionRequest,
): Promise<AiActionDecisionOutput> {
  if (!request.reviewPanelConfirmed) {
    return reviewPanelRequiredDecision({
      actionId: normalizeActionId(request.actionId),
      backendMounted: Boolean(request.backend),
      reason: "Approval Inbox requires review panel confirmation before approve.",
    });
  }
  const result = await approveActionLedgerBff({
    auth: request.auth,
    actionId: request.actionId,
    repository: repositoryFor(request),
  });
  return result.ok && result.data.documentType === "ai_action_approve" ? result.data.result : reviewPanelRequiredDecision({
    actionId: normalizeActionId(request.actionId),
    backendMounted: Boolean(request.backend),
    reason: result.ok ? "Unexpected approval ledger response." : result.error.message,
  });
}

export async function rejectApprovalInboxAction(
  request: ApprovalInboxDecisionRequest,
): Promise<AiActionDecisionOutput> {
  if (!request.reviewPanelConfirmed) {
    return reviewPanelRequiredDecision({
      actionId: normalizeActionId(request.actionId),
      backendMounted: Boolean(request.backend),
      reason: "Approval Inbox requires review panel confirmation before reject.",
    });
  }
  const result = await rejectActionLedgerBff({
    auth: request.auth,
    actionId: request.actionId,
    reason: request.reason,
    repository: repositoryFor(request),
  });
  return result.ok && result.data.documentType === "ai_action_reject" ? result.data.result : reviewPanelRequiredDecision({
    actionId: normalizeActionId(request.actionId),
    backendMounted: Boolean(request.backend),
    reason: result.ok ? "Unexpected approval ledger response." : result.error.message,
  });
}

export async function previewApprovalInboxEdit(
  request: ApprovalInboxActionRequest,
): Promise<ApprovalInboxEditPreviewOutput> {
  const detail = await loadApprovalInboxAction(request);
  if (detail.status !== "loaded" || !detail.action) {
    return {
      status: "blocked",
      actionId: normalizeActionId(request.actionId),
      title: "Blocked",
      summary: detail.reason ?? "Approval action is not available for edit preview.",
      redactedPayloadPreview: null,
      evidenceRefs: [],
      mutationCount: 0,
      finalMutationAllowed: false,
      blocker: detail.blocker,
      reason: detail.reason,
    };
  }
  if (!detail.action.allowedReviewActions.includes("edit_preview")) {
    return {
      status: "blocked",
      actionId: detail.action.actionId,
      title: detail.action.title,
      summary: "Edit preview is not allowed for this role or action status.",
      redactedPayloadPreview: detail.redactedPayloadPreview,
      evidenceRefs: detail.action.evidenceRefs,
      mutationCount: 0,
      finalMutationAllowed: false,
      blocker: "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
      reason: "Edit preview is not allowed for this role or action status.",
    };
  }
  return {
    status: "loaded",
    actionId: detail.action.actionId,
    title: detail.action.title,
    summary: detail.action.summary,
    redactedPayloadPreview: detail.redactedPayloadPreview,
    evidenceRefs: detail.action.evidenceRefs,
    mutationCount: 0,
    finalMutationAllowed: false,
  };
}

export async function executeApprovedApprovalInboxAction(
  request: ApprovalInboxActionRequest,
) {
  if (request.procurementExecutor !== undefined && request.backend !== undefined) {
    const record = await findScopedRecord(request);
    return executeApprovedActionLedgerBff({
      auth: request.auth,
      actionId: request.actionId,
      backend: request.backend,
      procurementExecutor: request.procurementExecutor ?? null,
      idempotencyKey: record?.idempotencyKey,
    });
  }
  return executeApprovedActionLedgerBff({
    auth: request.auth,
    actionId: request.actionId,
    repository: repositoryFor(request),
  });
}

function authError(): ApprovalInboxBffEnvelope {
  return {
    ok: false,
    error: {
      code: "AI_APPROVAL_INBOX_AUTH_REQUIRED",
      message: "Approval Inbox route requires authenticated role context",
    },
  };
}

function invalidInput(message: string): ApprovalInboxBffEnvelope {
  return {
    ok: false,
    error: {
      code: "AI_APPROVAL_INBOX_INVALID_INPUT",
      message,
    },
  };
}

function isAuthenticated(request: ApprovalInboxListRequest): boolean {
  return Boolean(request.auth?.userId.trim() && request.auth.role !== "unknown");
}

export async function getApprovalInboxBff(
  request: ApprovalInboxListRequest,
): Promise<ApprovalInboxBffEnvelope> {
  if (!isAuthenticated(request)) return authError();
  return {
    ok: true,
    data: {
      contractId: AI_APPROVAL_INBOX_BFF_CONTRACT.contractId,
      documentType: "ai_approval_inbox",
      endpoint: "GET /agent/approval-inbox",
      result: await loadApprovalInbox(request),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function getApprovalInboxActionBff(
  request: ApprovalInboxActionRequest,
): Promise<ApprovalInboxBffEnvelope> {
  if (!isAuthenticated(request)) return authError();
  if (!normalizeActionId(request.actionId)) return invalidInput("actionId is required");
  return {
    ok: true,
    data: {
      contractId: AI_APPROVAL_INBOX_BFF_CONTRACT.contractId,
      documentType: "ai_approval_inbox_detail",
      endpoint: "GET /agent/approval-inbox/:actionId",
      result: await loadApprovalInboxAction(request),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function approveApprovalInboxActionBff(
  request: ApprovalInboxDecisionRequest,
): Promise<ApprovalInboxBffEnvelope> {
  if (!isAuthenticated(request)) return authError();
  if (!normalizeActionId(request.actionId)) return invalidInput("actionId is required");
  return {
    ok: true,
    data: {
      contractId: AI_APPROVAL_INBOX_BFF_CONTRACT.contractId,
      documentType: "ai_approval_inbox_approve",
      endpoint: "POST /agent/approval-inbox/:actionId/approve",
      result: await approveApprovalInboxAction(request),
      reviewPanelRequired: true,
      roleScoped: true,
      auditRequired: true,
      finalExecution: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function rejectApprovalInboxActionBff(
  request: ApprovalInboxDecisionRequest,
): Promise<ApprovalInboxBffEnvelope> {
  if (!isAuthenticated(request)) return authError();
  if (!normalizeActionId(request.actionId)) return invalidInput("actionId is required");
  return {
    ok: true,
    data: {
      contractId: AI_APPROVAL_INBOX_BFF_CONTRACT.contractId,
      documentType: "ai_approval_inbox_reject",
      endpoint: "POST /agent/approval-inbox/:actionId/reject",
      result: await rejectApprovalInboxAction(request),
      reviewPanelRequired: true,
      roleScoped: true,
      auditRequired: true,
      finalExecution: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function previewApprovalInboxEditBff(
  request: ApprovalInboxActionRequest,
): Promise<ApprovalInboxBffEnvelope> {
  if (!isAuthenticated(request)) return authError();
  if (!normalizeActionId(request.actionId)) return invalidInput("actionId is required");
  return {
    ok: true,
    data: {
      contractId: AI_APPROVAL_INBOX_BFF_CONTRACT.contractId,
      documentType: "ai_approval_inbox_edit_preview",
      endpoint: "POST /agent/approval-inbox/:actionId/edit-preview",
      result: await previewApprovalInboxEdit(request),
      roleScoped: true,
      readOnly: true,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}

export async function executeApprovedApprovalInboxActionBff(
  request: ApprovalInboxActionRequest,
): Promise<ApprovalInboxBffEnvelope> {
  if (!isAuthenticated(request)) return authError();
  if (!normalizeActionId(request.actionId)) return invalidInput("actionId is required");
  const result = await executeApprovedApprovalInboxAction(request);
  if (!result.ok) {
    return invalidInput(result.error.message);
  }
  if (result.data.documentType !== "ai_action_execute_approved") {
    return invalidInput("Unexpected approval ledger execute response.");
  }
  return {
    ok: true,
    data: {
      contractId: AI_APPROVAL_INBOX_BFF_CONTRACT.contractId,
      documentType: "ai_approval_inbox_execute_approved",
      endpoint: "POST /agent/approval-inbox/:actionId/execute-approved",
      result: result.data.result,
      roleScoped: true,
      auditRequired: true,
      finalExecution: false,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    },
  };
}
