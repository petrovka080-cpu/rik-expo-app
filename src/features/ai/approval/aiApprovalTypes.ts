import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionType, AiRiskLevel } from "../policy/aiRiskPolicy";

export type AiApprovalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "expired"
  | "blocked";

export type AiApprovalAction = {
  actionId: string;
  actionType: AiActionType;
  status: AiApprovalStatus;
  riskLevel: AiRiskLevel;
  screenId: string;
  domain: AiDomain;
  requestedByRole: AiUserRole;
  requestedByUserIdHash?: string;
  organizationIdHash?: string;
  summary: string;
  redactedPayload: unknown;
  evidenceRefs: string[];
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
};

export type AiPersistentApprovalQueueFinalStatus =
  | "GREEN_AI_PERSISTENT_APPROVAL_QUEUE_READY"
  | "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND";

export type AiPersistentApprovalQueueCandidateStatus =
  | "compatible"
  | "incompatible"
  | "local_only";

export type AiPersistentApprovalQueueCandidate = {
  storage: string;
  source: string;
  status: AiPersistentApprovalQueueCandidateStatus;
  persistent: boolean;
  supportsGenericAiActions: boolean;
  supportsIdempotencyKey: boolean;
  supportsAuditEvent: boolean;
  supportsApprovalDecisionLifecycle: boolean;
  supportsExecutionGuard: boolean;
  blockerReasons: readonly string[];
};

export type AiPersistentApprovalQueueReadiness = {
  finalStatus: AiPersistentApprovalQueueFinalStatus;
  greenStatus: "GREEN_AI_PERSISTENT_APPROVAL_QUEUE_READY";
  blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND";
  persistentBackendFound: boolean;
  compatibleCandidateCount: number;
  fakeLocalApproval: false;
  migrationProposalOnly: true;
  migrationApplied: false;
  dbWritesPerformed: false;
  authAdminUsed: false;
  listUsersUsed: false;
  serviceRoleUsed: false;
  requiredEndpoints: readonly string[];
  candidates: readonly AiPersistentApprovalQueueCandidate[];
  requiredPersistentFields: readonly string[];
  requiredDecisionStatuses: readonly string[];
};

export const AI_PERSISTENT_APPROVAL_QUEUE_REQUIRED_ENDPOINTS: readonly string[] = [
  "POST /agent/action/submit-for-approval",
  "GET /agent/action/:id/status",
  "POST /agent/action/:id/approve",
  "POST /agent/action/:id/reject",
];

export const AI_PERSISTENT_APPROVAL_QUEUE_REQUIRED_FIELDS: readonly string[] = [
  "action_id",
  "action_type",
  "status",
  "risk_level",
  "screen_id",
  "domain",
  "requested_by_role",
  "requested_by_user_id_hash",
  "organization_id_hash",
  "summary",
  "redacted_payload",
  "evidence_refs",
  "idempotency_key",
  "audit_event",
  "created_at",
  "expires_at",
  "decided_at",
  "decided_by_user_id_hash",
];

export const AI_PERSISTENT_APPROVAL_QUEUE_DECISION_STATUSES: readonly string[] = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "executed",
  "blocked",
];

export const AI_PERSISTENT_APPROVAL_QUEUE_CANDIDATES: readonly AiPersistentApprovalQueueCandidate[] = [
  {
    storage: "public.approval_queue",
    source: "src/lib/database.types.ts",
    status: "incompatible",
    persistent: true,
    supportsGenericAiActions: false,
    supportsIdempotencyKey: false,
    supportsAuditEvent: false,
    supportsApprovalDecisionLifecycle: true,
    supportsExecutionGuard: false,
    blockerReasons: [
      "request-item approval queue only",
      "missing idempotency_key",
      "missing audit_event",
      "missing generic AI action_type and redacted_payload contract",
      "no agent action approve/reject/status BFF binding",
    ],
  },
  {
    storage: "public.approval_ledger",
    source: "db/20260415_director_pipeline_atomic_v1.sql",
    status: "incompatible",
    persistent: true,
    supportsGenericAiActions: false,
    supportsIdempotencyKey: true,
    supportsAuditEvent: false,
    supportsApprovalDecisionLifecycle: false,
    supportsExecutionGuard: false,
    blockerReasons: [
      "director approval side-effect ledger, not a pending approval queue",
      "records idempotent results after domain execution",
      "missing rejected and expired decision lifecycle",
      "missing AI audit_event field",
    ],
  },
  {
    storage: "public.submit_jobs",
    source: "supabase/migrations/20260422110000_rls_coverage_hardening_submit_jobs_phase1.sql",
    status: "incompatible",
    persistent: true,
    supportsGenericAiActions: false,
    supportsIdempotencyKey: true,
    supportsAuditEvent: false,
    supportsApprovalDecisionLifecycle: false,
    supportsExecutionGuard: false,
    blockerReasons: [
      "worker job queue lifecycle, not human approval state",
      "missing approve/reject decision fields",
      "missing rejected and expired approval semantics",
      "not scoped to agent action endpoints",
    ],
  },
  {
    storage: "local_ai_approval_gate",
    source: "src/features/ai/approval/aiApprovalGate.ts",
    status: "local_only",
    persistent: false,
    supportsGenericAiActions: true,
    supportsIdempotencyKey: true,
    supportsAuditEvent: true,
    supportsApprovalDecisionLifecycle: false,
    supportsExecutionGuard: true,
    blockerReasons: [
      "local policy gate only",
      "submit_for_approval currently returns persisted=false",
      "get_action_status currently performs no persisted lookup",
    ],
  },
];

export const AI_PERSISTENT_APPROVAL_QUEUE_READINESS: AiPersistentApprovalQueueReadiness = {
  finalStatus: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
  greenStatus: "GREEN_AI_PERSISTENT_APPROVAL_QUEUE_READY",
  blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
  persistentBackendFound: false,
  compatibleCandidateCount: 0,
  fakeLocalApproval: false,
  migrationProposalOnly: true,
  migrationApplied: false,
  dbWritesPerformed: false,
  authAdminUsed: false,
  listUsersUsed: false,
  serviceRoleUsed: false,
  requiredEndpoints: AI_PERSISTENT_APPROVAL_QUEUE_REQUIRED_ENDPOINTS,
  candidates: AI_PERSISTENT_APPROVAL_QUEUE_CANDIDATES,
  requiredPersistentFields: AI_PERSISTENT_APPROVAL_QUEUE_REQUIRED_FIELDS,
  requiredDecisionStatuses: AI_PERSISTENT_APPROVAL_QUEUE_DECISION_STATUSES,
};

export function getCompatiblePersistentApprovalQueueCandidates(): AiPersistentApprovalQueueCandidate[] {
  return AI_PERSISTENT_APPROVAL_QUEUE_CANDIDATES.filter(
    (candidate) =>
      candidate.status === "compatible" &&
      candidate.persistent &&
      candidate.supportsGenericAiActions &&
      candidate.supportsIdempotencyKey &&
      candidate.supportsAuditEvent &&
      candidate.supportsApprovalDecisionLifecycle &&
      candidate.supportsExecutionGuard,
  );
}

export function getPersistentApprovalQueueBlockers(): string[] {
  return AI_PERSISTENT_APPROVAL_QUEUE_CANDIDATES.flatMap((candidate) =>
    candidate.blockerReasons.map((reason) => `${candidate.storage}: ${reason}`),
  );
}
