import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  ApprovedActionDomainExecutor,
} from "../executors/approvedActionExecutorTypes";
import {
  approveActionLedgerBff,
  executeApprovedActionLedgerBff,
  getActionLedgerStatusBff,
  rejectActionLedgerBff,
  submitActionForApprovalBff,
  type ActionLedgerBffEnvelope,
  type SubmitForApprovalInput,
} from "./aiActionLedgerBff";
import {
  createAiActionLedgerRpcRepository,
  type AiActionLedgerRpcRepositoryMount,
} from "./aiActionLedgerRpcRepository";
import type { AiActionLedgerRpcTransport } from "./aiActionLedgerRpcTypes";

export const AI_ACTION_LEDGER_RUNTIME_MOUNT_CONTRACT = Object.freeze({
  mountId: "ai_action_ledger_rpc_runtime_mount_v1",
  submitRpc: "ai_action_ledger_submit_for_approval_v1",
  getStatusRpc: "ai_action_ledger_get_status_v1",
  approveRpc: "ai_action_ledger_approve_v1",
  rejectRpc: "ai_action_ledger_reject_v1",
  executeApprovedRpc: "ai_action_ledger_execute_approved_v1",
  serverSideOnly: true,
  authRequired: true,
  roleResolvedServerSide: true,
  idempotencyRequired: true,
  evidenceRequired: true,
  auditRequired: true,
  redactedPayloadOnly: true,
  serviceRoleFromMobile: false,
  directUiSupabase: false,
  finalExecutionFromUi: false,
} as const);

export type AiActionLedgerRuntimeMountAuth = {
  userId: string;
  role: AiUserRole;
};

export type AiActionLedgerRuntimeMountOptions = {
  auth: AiActionLedgerRuntimeMountAuth | null;
  organizationId: string;
  organizationIdHash?: string;
  transport?: AiActionLedgerRpcTransport;
  executeApprovedStatusTransitionMounted?: true;
  procurementExecutor?: ApprovedActionDomainExecutor | null;
};

export type AiActionLedgerRuntimeMount = {
  contract: typeof AI_ACTION_LEDGER_RUNTIME_MOUNT_CONTRACT;
  repositoryMount: AiActionLedgerRpcRepositoryMount | null;
  submitForApproval(input: SubmitForApprovalInput): Promise<ActionLedgerBffEnvelope>;
  getStatus(actionId: string): Promise<ActionLedgerBffEnvelope>;
  approve(actionId: string, reason?: string): Promise<ActionLedgerBffEnvelope>;
  reject(actionId: string, reason: string): Promise<ActionLedgerBffEnvelope>;
  executeApproved(actionId: string, idempotencyKey: string): Promise<ActionLedgerBffEnvelope>;
};

function createRepositoryMount(
  options: AiActionLedgerRuntimeMountOptions,
): AiActionLedgerRpcRepositoryMount | null {
  if (!options.auth) return null;
  return createAiActionLedgerRpcRepository({
    organizationId: options.organizationId,
    organizationIdHash: options.organizationIdHash,
    actorUserId: options.auth.userId,
    actorRole: options.auth.role,
    transport: options.transport,
    executeApprovedStatusTransitionMounted: options.executeApprovedStatusTransitionMounted,
  });
}

export function createAiActionLedgerRuntimeMount(
  options: AiActionLedgerRuntimeMountOptions,
): AiActionLedgerRuntimeMount {
  const repositoryMount = createRepositoryMount(options);
  const baseRequest = {
    auth: options.auth,
    organizationId: options.organizationId,
  };

  return {
    contract: AI_ACTION_LEDGER_RUNTIME_MOUNT_CONTRACT,
    repositoryMount,
    submitForApproval(input) {
      return submitActionForApprovalBff({
        ...baseRequest,
        input,
        repository: repositoryMount?.repository,
      });
    },
    getStatus(actionId) {
      return getActionLedgerStatusBff({
        ...baseRequest,
        actionId,
        repository: repositoryMount?.repository,
      });
    },
    approve(actionId, reason) {
      return approveActionLedgerBff({
        ...baseRequest,
        actionId,
        reason,
        repository: repositoryMount?.repository,
      });
    },
    reject(actionId, reason) {
      return rejectActionLedgerBff({
        ...baseRequest,
        actionId,
        reason,
        repository: repositoryMount?.repository,
      });
    },
    executeApproved(actionId, idempotencyKey) {
      return executeApprovedActionLedgerBff({
        ...baseRequest,
        actionId,
        idempotencyKey,
        backend: repositoryMount?.backend ?? null,
        procurementExecutor: options.procurementExecutor,
      });
    },
  };
}
