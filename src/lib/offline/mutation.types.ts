export type OfflineMutationOwner = "foreman" | "contractor";

export type OfflineMutationEntityType = "foreman_draft" | "contractor_progress";

export type OfflineMutationCompatibilityStatus = "pending" | "inflight" | "failed";

export type OfflineMutationLifecycleStatus =
  | "queued"
  | "processing"
  | "retry_scheduled"
  | "conflicted"
  | "failed_non_retryable"
  | "succeeded"
  | "discarded_by_policy";

export type OfflineMutationErrorKind =
  | "none"
  | "network_unreachable"
  | "timeout"
  | "transient_server"
  | "transport"
  | "contract_validation"
  | "auth_invalid"
  | "stale_state"
  | "remote_divergence"
  | "conflict"
  | "runtime";

export type OfflineMutationEnvelopeBase = {
  id: string;
  owner: OfflineMutationOwner;
  entityType: OfflineMutationEntityType;
  entityId: string;
  dedupeKey: string;
  baseVersion: string | null;
  serverVersionHint: string | null;
  createdAt: number;
  updatedAt: number;
  attemptCount: number;
  retryCount: number;
  status: OfflineMutationCompatibilityStatus;
  lifecycleStatus: OfflineMutationLifecycleStatus;
  lastAttemptAt: number | null;
  lastError: string | null;
  lastErrorCode: string | null;
  lastErrorKind: OfflineMutationErrorKind;
  nextRetryAt: number | null;
  maxAttempts: number;
};

export const isOfflineMutationActiveLifecycleStatus = (status: OfflineMutationLifecycleStatus) =>
  status === "queued" || status === "processing" || status === "retry_scheduled";

export const isOfflineMutationRetryLifecycleStatus = (status: OfflineMutationLifecycleStatus) =>
  status === "retry_scheduled";

export const isOfflineMutationFinalLifecycleStatus = (status: OfflineMutationLifecycleStatus) =>
  status === "conflicted" ||
  status === "failed_non_retryable" ||
  status === "succeeded" ||
  status === "discarded_by_policy";

