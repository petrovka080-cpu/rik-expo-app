import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiActionLedgerAuditEvent,
  AiActionLedgerBlockedCode,
  AiActionLedgerRecord,
} from "../actionLedger/aiActionLedgerTypes";

export type ApprovedActionExecutionStatus =
  | "executed"
  | "blocked"
  | "already_executed"
  | "domain_executor_not_ready";

export type ApprovedActionExecutionRequest = {
  actionId: string;
  idempotencyKey: string;
  requestedByRole: AiUserRole;
  screenId: string;
};

export type ApprovedActionCreatedEntityRef = {
  entityType: "request";
  entityIdHash: string;
};

export type ApprovedActionExecutionResult = {
  status: ApprovedActionExecutionStatus;
  actionId: string;
  domain: "procurement";
  actionType: "submit_request" | "draft_request";
  idempotencyKey: string;
  evidenceRefs: string[];
  auditEventId?: string;
  createdEntityRef?: ApprovedActionCreatedEntityRef;
  reason?: string;
  blocker?: AiActionLedgerBlockedCode | "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND";
  auditEvents: AiActionLedgerAuditEvent[];
  finalExecution: false;
  directDomainMutation: false;
  directMutationFromUi: false;
  directSupabaseFromUi: false;
  domainExecutorReady: boolean;
  modelProviderFromExecutor: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  rawProviderPayloadStored: false;
  duplicateExecutionCreatesDuplicate: false;
};

export type ApprovedActionDomainExecutorResult = {
  createdEntityRef: ApprovedActionCreatedEntityRef;
  executedAt: string;
  auditEventId?: string;
};

export type ApprovedActionDomainExecutor = {
  readonly domain: "procurement";
  readonly actionTypes: readonly ("draft_request" | "submit_request")[];
  readonly routeScoped: true;
  readonly directSupabaseMutation: false;
  readonly broadMutationRoute: false;
  execute: (
    record: AiActionLedgerRecord,
    request: ApprovedActionExecutionRequest,
  ) => Promise<ApprovedActionDomainExecutorResult>;
};

export type ApprovedActionExecutorRegistry = {
  procurement?: ApprovedActionDomainExecutor | null;
};
