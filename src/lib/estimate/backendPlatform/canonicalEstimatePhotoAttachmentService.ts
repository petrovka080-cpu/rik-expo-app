import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

import type { PhotoMaterialStoredImage } from "../../ai/photoMaterialExistingRow";
import type { CapturedPhotoAsset } from "../../mobilePhotoCapture/mobilePhotoCaptureService";
import {
  mobilePhotoBase64Bytes,
  mobilePhotoSha256Hex,
  mobilePhotoUtf8Bytes,
} from "../../mobilePhotoCapture/mobilePhotoNormalizationService";
import {
  createCanonicalEstimatePhotoUpload,
  finalizeCanonicalEstimatePhotoUpload,
  uploadCanonicalEstimatePhotoObject,
} from "./canonicalEstimateClient";
import { CanonicalEstimateApiError, type CanonicalEstimatePhotoAttachmentView } from "./contracts";

export type CommitCanonicalEstimateRowPhotoInput = {
  asset: CapturedPhotoAsset;
  requestId: string;
  catalogId: string;
  revisionId: string;
  rowId: string;
  replacesAttachmentId?: string | null;
  signal?: AbortSignal | null;
};

export type CommitCanonicalEstimateRowPhotoResult = {
  attachment: CanonicalEstimatePhotoAttachmentView;
  storedImage: PhotoMaterialStoredImage;
  created: boolean;
};

export function canonicalEstimatePhotoIdempotencyKey(input: Pick<
  CommitCanonicalEstimateRowPhotoInput,
  "requestId" | "catalogId" | "revisionId" | "rowId" | "replacesAttachmentId"
> & { captureId: string; contentSha256: string }): string {
  const canonical = [
    input.requestId,
    input.catalogId,
    input.revisionId,
    input.rowId,
    input.captureId,
    input.contentSha256,
    input.replacesAttachmentId ?? "",
  ].map((value) => String(value).normalize("NFC"))
    .map((value) => `${mobilePhotoUtf8Bytes(value).length}:${value}`)
    .join("|");
  return `estimate-photo-r55-${mobilePhotoSha256Hex(mobilePhotoUtf8Bytes(canonical))}`;
}

async function readAndVerifyLocalAsset(asset: CapturedPhotoAsset): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: "base64" });
  const bytes = mobilePhotoBase64Bytes(base64);
  if (bytes.byteLength !== asset.byteSize) {
    throw new CanonicalEstimateApiError("Размер локального снимка изменился.", {
      code: "PHOTO_LOCAL_SIZE_MISMATCH",
      httpStatus: 422,
    });
  }
  if (mobilePhotoSha256Hex(bytes) !== asset.contentSha256) {
    throw new CanonicalEstimateApiError("Контрольная сумма локального снимка изменилась.", {
      code: "PHOTO_LOCAL_HASH_MISMATCH",
      httpStatus: 422,
    });
  }
  return decode(base64);
}

function assertCommittedAttachment(
  attachment: CanonicalEstimatePhotoAttachmentView,
  input: CommitCanonicalEstimateRowPhotoInput,
): void {
  if (attachment.status !== "committed"
    || attachment.requestId !== input.requestId
    || attachment.catalogId !== input.catalogId
    || attachment.parentRevisionId !== input.revisionId
    || attachment.rowId !== input.rowId
    || attachment.contentSha256 !== input.asset.contentSha256
    || attachment.mimeType !== input.asset.mimeType
    || attachment.sizeBytes !== input.asset.byteSize
    || !attachment.attachmentId
    || !attachment.attachmentEventId) {
    throw new CanonicalEstimateApiError("Backend вернул вложение другой строки или версии сметы.", {
      code: "PHOTO_ATTACHMENT_IDENTITY_MISMATCH",
      httpStatus: 409,
    });
  }
}

export async function commitCanonicalEstimateRowPhoto(
  input: CommitCanonicalEstimateRowPhotoInput,
): Promise<CommitCanonicalEstimateRowPhotoResult> {
  if (!input.asset.metadataStripped || !input.asset.orientationNormalized) {
    throw new CanonicalEstimateApiError("Снимок не прошёл безопасную нормализацию.", {
      code: "PHOTO_NORMALIZATION_REQUIRED",
      httpStatus: 422,
    });
  }
  const idempotencyKey = canonicalEstimatePhotoIdempotencyKey({
    requestId: input.requestId,
    catalogId: input.catalogId,
    revisionId: input.revisionId,
    rowId: input.rowId,
    captureId: input.asset.captureId,
    contentSha256: input.asset.contentSha256,
    replacesAttachmentId: input.replacesAttachmentId,
  });
  const intent = await createCanonicalEstimatePhotoUpload({
    revisionId: input.revisionId,
    idempotencyKey,
    requestId: input.requestId,
    catalogId: input.catalogId,
    rowId: input.rowId,
    contentSha256: input.asset.contentSha256,
    mimeType: input.asset.mimeType,
    sizeBytes: input.asset.byteSize,
    replacesAttachmentId: input.replacesAttachmentId,
    signal: input.signal,
  });
  if (intent.status === "staged") {
    if (!intent.uploadUrl || !intent.uploadToken) {
      throw new CanonicalEstimateApiError("Backend не выдал безопасную сессию загрузки снимка.", {
        code: "PHOTO_UPLOAD_INTENT_INVALID",
        httpStatus: 503,
        retryable: true,
      });
    }
    if (new Date(intent.expiresAt).getTime() <= Date.now()) {
      throw new CanonicalEstimateApiError("Сессия загрузки снимка истекла.", {
        code: "PHOTO_UPLOAD_INTENT_EXPIRED",
        httpStatus: 409,
        retryable: true,
      });
    }
    await uploadCanonicalEstimatePhotoObject({
      uploadUrl: intent.uploadUrl,
      uploadToken: intent.uploadToken,
      body: await readAndVerifyLocalAsset(input.asset),
      mimeType: input.asset.mimeType,
      signal: input.signal,
    });
  }
  const finalized = await finalizeCanonicalEstimatePhotoUpload({
    revisionId: input.revisionId,
    uploadId: intent.uploadId,
    signal: input.signal,
  });
  assertCommittedAttachment(finalized.attachment, input);
  return {
    attachment: finalized.attachment,
    created: finalized.created,
    storedImage: {
      imageId: finalized.attachment.attachmentId,
      scanId: input.asset.scanId,
      kind: input.asset.kind === "OTHER" ? "OTHER" : input.asset.kind,
      mimeType: finalized.attachment.mimeType,
      byteSize: finalized.attachment.sizeBytes,
      width: input.asset.width,
      height: input.asset.height,
      decodedPixelCount: input.asset.width * input.asset.height,
      contentSha256: finalized.attachment.contentSha256,
      storageBucket: finalized.attachment.storageBucket,
      storagePath: finalized.attachment.storageObjectKey,
      privateObject: true,
      exifGpsStripped: true,
      signedUrlExposed: false,
    },
  };
}
