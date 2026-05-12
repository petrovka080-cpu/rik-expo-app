import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiActionLedgerActionType,
  AiActionRiskLevel,
  AiActionStatus,
} from "./aiActionLedgerTypes";

export const AI_ACTION_LEDGER_RPC_FUNCTIONS = Object.freeze({
  submitForApproval: "ai_action_ledger_submit_for_approval_v1",
  getStatus: "ai_action_ledger_get_status_v1",
  findByIdempotencyKey: "ai_action_ledger_find_by_idempotency_key_v1",
  listByOrganization: "ai_action_ledger_list_by_org_v1",
  approve: "ai_action_ledger_approve_v1",
  reject: "ai_action_ledger_reject_v1",
  executeApproved: "ai_action_ledger_execute_approved_v1",
} as const);

export type AiActionLedgerRpcFunctionName =
  (typeof AI_ACTION_LEDGER_RPC_FUNCTIONS)[keyof typeof AI_ACTION_LEDGER_RPC_FUNCTIONS];

export type AiActionLedgerRpcBlockedPayload = {
  status: "blocked";
  blocker?: string;
  reason?: string;
  finalExecution?: false;
};

export type AiActionLedgerRpcSafeRecord = {
  actionId: string;
  actionType: AiActionLedgerActionType;
  status: AiActionStatus;
  riskLevel: AiActionRiskLevel;
  role: AiUserRole;
  screenId: string;
  domain: AiDomain;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: string[];
  idempotencyKey: string;
  requestedByUserIdHash: string;
  organizationIdHash: string;
  createdAt: string;
  expiresAt: string;
  approvedByUserIdHash?: string;
  executedAt?: string;
};

export type AiActionLedgerRpcPage = {
  status: "loaded" | "empty";
  records: AiActionLedgerRpcSafeRecord[];
  nextCursor: string | null;
  finalExecution: false;
};

export type AiActionLedgerRpcTransportResult = {
  data: unknown;
  error: unknown;
};

export type AiActionLedgerRpcTransport = (
  fn: AiActionLedgerRpcFunctionName,
  args: Record<string, unknown>,
) => Promise<AiActionLedgerRpcTransportResult>;
