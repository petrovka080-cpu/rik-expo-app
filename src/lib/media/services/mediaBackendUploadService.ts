import type { MediaKind, MediaOwnerRole, MediaPurpose } from "../mediaTypes";
import { recordPlatformObservability } from "../../observability/platformObservability";

export type BackendMediaTargetType =
  | "request_draft"
  | "procurement_request"
  | "work"
  | "act"
  | "report"
  | "remark"
  | "warehouse_event"
  | "marketplace_product"
  | "document";

export type MediaBackendOperation =
  | "createMediaUploadSession"
  | "completeMediaUploadSession"
  | "getMediaSignedReadUrl"
  | "confirmMediaLink"
  | "attachDraftMediaToRequest"
  | "queueMediaProcessingJob"
  | "runMediaAiAnalysisJob"
  | "expireStaleMediaUploadSessions"
  | "enqueueOrphanMediaStorageCleanup"
  | "claimMediaProcessingJobs"
  | "recordMediaProcessingJobResult"
  | "claimMediaStorageCleanupJobs"
  | "recordMediaStorageCleanupResult";

export type MediaBackendTransport = {
  call: <TResult>(
    operation: MediaBackendOperation,
    payload: Record<string, unknown>,
  ) => Promise<TResult>;
};

export type CreateMediaUploadSessionBackendInput = {
  orgId: string;
  projectId?: string;
  requestedByUserId: string;
  requestedByRole: MediaOwnerRole;
  targetType: BackendMediaTargetType;
  targetId?: string;
  mediaKind: MediaKind;
  purpose: MediaPurpose;
  expectedMimeType: string;
  expectedByteSizeMax: number;
  expectedDurationMsMax?: number;
};

export type CreateMediaUploadSessionBackendResult = {
  uploadSessionId: string;
  storageBucket: "private-media" | "client-visible-media" | "public-marketplace-media";
  uploadUrl: string;
  expiresAt: string;
};

export type CompleteMediaUploadSessionBackendInput = {
  uploadSessionId: string;
  mimeType: string;
  byteSize: number;
  contentHash: string;
  durationMs?: number;
  width?: number;
  height?: number;
};

export type CompleteMediaUploadSessionBackendResult = {
  mediaAssetId: string;
  queuedVariantJob: true;
  queuedAiAnalysisJob: true;
};

export type SignedReadUrlInput = {
  mediaAssetId: string;
  role: MediaOwnerRole;
  userId: string;
  orgId: string;
};

export type SignedReadUrlResult = {
  readUrl: string;
  expiresAt: string;
  storageKeyVisibleToUser: false;
};

export type MediaBackpressureResult = {
  bounded: true;
  skipLocked?: true;
  limit: number;
};

export type MediaProcessingJobResult = {
  status: "completed" | "retry_scheduled" | "failed_final";
  retryScheduled: boolean;
  delayMinutes?: number;
};

function toMediaBackendPayload(input: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input));
}

const recordMediaUploadMutationEvent = (
  event: string,
  result: "success" | "error",
  extra: Record<string, unknown>,
  error?: unknown,
) => {
  recordPlatformObservability({
    screen: "contractor",
    surface: "media_backend_upload",
    category: "ui",
    event,
    result,
    sourceKind: "mutation:media_upload",
    errorClass: error instanceof Error ? error.name : error ? "MediaUploadMutationError" : undefined,
    errorMessage: error instanceof Error ? error.message : error ? String(error) : undefined,
    extra,
  });
};

export function createMediaUploadSession(
  transport: MediaBackendTransport,
  input: CreateMediaUploadSessionBackendInput,
): Promise<CreateMediaUploadSessionBackendResult> {
  recordMediaUploadMutationEvent("media_upload_session_create_started", "success", {
    targetType: input.targetType,
    requestedByRole: input.requestedByRole,
    mediaKind: input.mediaKind,
  });
  return transport.call<CreateMediaUploadSessionBackendResult>(
    "createMediaUploadSession",
    toMediaBackendPayload(input),
  ).then((result) => {
    recordMediaUploadMutationEvent("media_upload_session_create_terminal_success", "success", {
      targetType: input.targetType,
      requestedByRole: input.requestedByRole,
      mediaKind: input.mediaKind,
      uploadSessionId: result.uploadSessionId,
    });
    return result;
  }).catch((error) => {
    recordMediaUploadMutationEvent("media_upload_session_create_terminal_failure", "error", {
      targetType: input.targetType,
      requestedByRole: input.requestedByRole,
      mediaKind: input.mediaKind,
    }, error);
    throw error;
  });
}

export function completeMediaUploadSession(
  transport: MediaBackendTransport,
  input: CompleteMediaUploadSessionBackendInput,
): Promise<CompleteMediaUploadSessionBackendResult> {
  recordMediaUploadMutationEvent("media_upload_session_complete_started", "success", {
    uploadSessionId: input.uploadSessionId,
    mimeType: input.mimeType,
  });
  return transport.call<CompleteMediaUploadSessionBackendResult>(
    "completeMediaUploadSession",
    toMediaBackendPayload(input),
  ).then((result) => {
    recordMediaUploadMutationEvent("media_upload_session_complete_terminal_success", "success", {
      uploadSessionId: input.uploadSessionId,
      mediaAssetId: result.mediaAssetId,
    });
    return result;
  }).catch((error) => {
    recordMediaUploadMutationEvent("media_upload_session_complete_terminal_failure", "error", {
      uploadSessionId: input.uploadSessionId,
    }, error);
    throw error;
  });
}

export function getMediaSignedReadUrl(
  transport: MediaBackendTransport,
  input: SignedReadUrlInput,
): Promise<SignedReadUrlResult> {
  return transport.call<SignedReadUrlResult>(
    "getMediaSignedReadUrl",
    toMediaBackendPayload(input),
  );
}

export function confirmMediaLink(
  transport: MediaBackendTransport,
  input: {
    mediaAssetId: string;
    targetType: BackendMediaTargetType;
    targetId: string;
    role: MediaOwnerRole;
    userId: string;
    orgId: string;
  },
): Promise<{ mediaLinkId: string; finalLinkedByHuman: true }> {
  return transport.call<{ mediaLinkId: string; finalLinkedByHuman: true }>(
    "confirmMediaLink",
    toMediaBackendPayload(input),
  );
}

export function attachDraftMediaToRequest(
  transport: MediaBackendTransport,
  input: {
    orgId: string;
    requestDraftId: string;
    procurementRequestId: string;
    actorUserId: string;
  },
): Promise<{ attachedCount: number; clientVisible: false }> {
  return transport.call<{ attachedCount: number; clientVisible: false }>(
    "attachDraftMediaToRequest",
    toMediaBackendPayload(input),
  );
}

export function queueMediaProcessingJob(
  transport: MediaBackendTransport,
  input: { mediaAssetId: string; jobType: "variant_generation" | "ai_analysis" },
): Promise<{ jobId: string; status: "queued" }> {
  return transport.call<{ jobId: string; status: "queued" }>(
    "queueMediaProcessingJob",
    toMediaBackendPayload(input),
  );
}

export function runMediaAiAnalysisJob(
  transport: MediaBackendTransport,
  input: { mediaAssetId: string; analysisKind: string },
): Promise<{ analysisId: string; finalFact: false }> {
  return transport.call<{ analysisId: string; finalFact: false }>(
    "runMediaAiAnalysisJob",
    toMediaBackendPayload(input),
  );
}

export function expireStaleMediaUploadSessions(
  transport: MediaBackendTransport,
  input: { limit?: number; nowIso?: string } = {},
): Promise<MediaBackpressureResult & { expiredCount: number }> {
  return transport.call<MediaBackpressureResult & { expiredCount: number }>(
    "expireStaleMediaUploadSessions",
    toMediaBackendPayload(input),
  );
}

export function enqueueOrphanMediaStorageCleanup(
  transport: MediaBackendTransport,
  input: { limit?: number; olderThanSeconds?: number } = {},
): Promise<MediaBackpressureResult & { cleanupJobsEnqueued: number; storageDeleteExecutedInDb: false }> {
  return transport.call<MediaBackpressureResult & { cleanupJobsEnqueued: number; storageDeleteExecutedInDb: false }>(
    "enqueueOrphanMediaStorageCleanup",
    toMediaBackendPayload(input),
  );
}

export function claimMediaProcessingJobs(
  transport: MediaBackendTransport,
  input: { limit?: number; workerId?: string } = {},
): Promise<MediaBackpressureResult & { claimedCount: number }> {
  return transport.call<MediaBackpressureResult & { claimedCount: number }>(
    "claimMediaProcessingJobs",
    toMediaBackendPayload(input),
  );
}

export function recordMediaProcessingJobResult(
  transport: MediaBackendTransport,
  input: { jobId: string; completed: boolean; errorCode?: string; errorRu?: string },
): Promise<MediaProcessingJobResult> {
  return transport.call<MediaProcessingJobResult>(
    "recordMediaProcessingJobResult",
    toMediaBackendPayload(input),
  );
}

export function claimMediaStorageCleanupJobs(
  transport: MediaBackendTransport,
  input: { limit?: number; workerId?: string } = {},
): Promise<MediaBackpressureResult & { claimedCount: number }> {
  return transport.call<MediaBackpressureResult & { claimedCount: number }>(
    "claimMediaStorageCleanupJobs",
    toMediaBackendPayload(input),
  );
}

export function recordMediaStorageCleanupResult(
  transport: MediaBackendTransport,
  input: { jobId: string; deleted: boolean; errorCode?: string },
): Promise<MediaProcessingJobResult> {
  return transport.call<MediaProcessingJobResult>(
    "recordMediaStorageCleanupResult",
    toMediaBackendPayload(input),
  );
}
