import type { RequestRecord } from "../api/types";
import type { RequestDraftMeta } from "../../screens/foreman/foreman.types";
import type {
  ForemanLocalDraftSnapshot,
  ForemanLocalDraftSyncResult,
} from "../../screens/foreman/foreman.localDraft";

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

export type ForemanMutationWorkerResult = {
  processedCount: number;
  remainingCount: number;
  requestId: string | null;
  submitted: RequestRecord | null;
  failed: boolean;
  errorMessage: string | null;
  batchLimitReached: boolean;
  drainDurationMs: number | null;
};

export type ForemanMutationWorkerDeps = {
  getSnapshot: () => ForemanLocalDraftSnapshot | null;
  buildRequestDraftMeta: () => RequestDraftMeta;
  persistSnapshot: (
    snapshot: ForemanLocalDraftSnapshot | null,
  ) => void | Promise<void>;
  applySnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: "none" | "snapshot" | "remoteDraft";
      restoreIdentity?: string | null;
    },
  ) => void | Promise<void>;
  onSubmitted?: (
    requestId: string,
    submitted: RequestRecord | null,
  ) => void | Promise<void>;
  getNetworkOnline?: () => boolean | null;
  inspectRemoteDraft?: (params: {
    requestId: string;
    localSnapshot: ForemanLocalDraftSnapshot | null;
  }) => Promise<{
    snapshot: ForemanLocalDraftSnapshot | null;
    status: string | null;
    isTerminal: boolean;
  }>;
  syncSnapshot: (params: {
    snapshot: ForemanLocalDraftSnapshot;
    headerMeta: RequestDraftMeta;
    mutationKind?:
      | "catalog_add"
      | "calc_add"
      | "ai_local_add"
      | "qty_update"
      | "row_remove"
      | "whole_cancel"
      | "submit"
      | "background_sync";
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }) => Promise<ForemanLocalDraftSyncResult>;
  loopIterationLimit?: number | null;
};
