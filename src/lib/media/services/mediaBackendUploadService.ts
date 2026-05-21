import type { MediaKind, MediaOwnerRole, MediaPurpose } from "../mediaTypes";

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
  | "runMediaAiAnalysisJob";

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

function toMediaBackendPayload(input: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input));
}

export function createMediaUploadSession(
  transport: MediaBackendTransport,
  input: CreateMediaUploadSessionBackendInput,
): Promise<CreateMediaUploadSessionBackendResult> {
  return transport.call<CreateMediaUploadSessionBackendResult>(
    "createMediaUploadSession",
    toMediaBackendPayload(input),
  );
}

export function completeMediaUploadSession(
  transport: MediaBackendTransport,
  input: CompleteMediaUploadSessionBackendInput,
): Promise<CompleteMediaUploadSessionBackendResult> {
  return transport.call<CompleteMediaUploadSessionBackendResult>(
    "completeMediaUploadSession",
    toMediaBackendPayload(input),
  );
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
