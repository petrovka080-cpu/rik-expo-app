import { decode } from "base64-arraybuffer";

import type { MobilePhotoQueuedUpload } from "./mobilePhotoUploadQueue";
import { createMobilePhotoCaptureError } from "./mobilePhotoCaptureErrors";
import {
  completeSupabaseMediaUploadSession,
  createSupabaseMediaUploadSession,
  uploadSupabaseMediaObject,
} from "../media/services/mediaBackendUploadService";
import { currentUserId } from "../supabaseClient";

export type MobilePhotoUploadIntent = {
  uploadToken: string;
  uploadUrl: string;
  storageBucket: "private-media";
  storageKey: string;
  expiresAt: string;
};

export type MobilePhotoUploadTransport = {
  createUploadIntent: (item: MobilePhotoQueuedUpload) => Promise<MobilePhotoUploadIntent>;
  uploadFile: (input: {
    item: MobilePhotoQueuedUpload;
    intent: MobilePhotoUploadIntent;
  }) => Promise<{ uploaded: true }>;
  completeUpload: (input: {
    item: MobilePhotoQueuedUpload;
    intent: MobilePhotoUploadIntent;
  }) => Promise<{ scanImageId: string; recognitionJobStarted: true }>;
};

export type MobilePhotoUploadService = {
  uploadQueuedItem: (item: MobilePhotoQueuedUpload) => Promise<{ scanImageId: string; recognitionJobStarted: true }>;
};

type FileSystemModule = {
  readAsStringAsync: (uri: string, options: { encoding: "base64" }) => Promise<string>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_MEDIA_BUCKET = "private-media" as const;
const PHOTO_MATERIAL_TARGET_TYPE = "photo_material_scan";
const PHOTO_MATERIAL_PURPOSE = "product_photo";

function loadFileSystem(): FileSystemModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-file-system/legacy") as FileSystemModule;
  } catch {
    return null;
  }
}

async function readLocalFileBody(uri: string): Promise<ArrayBuffer> {
  const fileSystem = loadFileSystem();
  if (!fileSystem?.readAsStringAsync) {
    throw createMobilePhotoCaptureError("PHOTO_LOCAL_FILE_MISSING");
  }
  const base64 = await fileSystem.readAsStringAsync(uri, { encoding: "base64" });
  return decode(base64);
}

async function requireCurrentUserId(): Promise<string> {
  const userId = String((await currentUserId()) ?? "").trim();
  if (!UUID_RE.test(userId)) {
    throw createMobilePhotoCaptureError("PHOTO_UPLOAD_ACCESS_DENIED");
  }
  return userId;
}

function uploadExpiresAt(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

function toUploadIntent(
  userId: string,
  session: {
    uploadSessionId: string;
    storageKey: string;
    uploadUrl: string;
    expiresAt: string;
  },
): MobilePhotoUploadIntent {
  return {
    uploadToken: session.uploadSessionId,
    uploadUrl: session.uploadUrl,
    storageBucket: PRIVATE_MEDIA_BUCKET,
    storageKey: session.storageKey || `${userId}/${session.uploadSessionId}/original`,
    expiresAt: session.expiresAt,
  };
}

export function createSupabaseMobilePhotoUploadTransport(): MobilePhotoUploadTransport {
  return {
    async createUploadIntent(item: MobilePhotoQueuedUpload) {
      const userId = await requireCurrentUserId();
      try {
        const session = await createSupabaseMediaUploadSession({
          orgId: userId,
          projectId: null,
          requestedByUserId: userId,
          requestedByRole: "client",
          targetType: PHOTO_MATERIAL_TARGET_TYPE,
          targetId: item.scanId,
          mediaKind: "photo",
          purpose: PHOTO_MATERIAL_PURPOSE,
          expectedMimeType: item.mimeType,
          expectedByteSizeMax: item.byteSize,
          expectedDurationMsMax: null,
          storageBucket: PRIVATE_MEDIA_BUCKET,
          storageKeyPrefix: userId,
          uploadUrl: "private-media-upload-session",
          expiresAt: uploadExpiresAt(),
        });
        return toUploadIntent(userId, session);
      } catch (error) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED", error);
      }
    },
    async uploadFile({ item, intent }) {
      try {
        const body = await readLocalFileBody(item.localUri);
        return await uploadSupabaseMediaObject({
          storageBucket: intent.storageBucket,
          storageKey: intent.storageKey,
          body,
          contentType: item.mimeType,
          upsert: false,
        });
      } catch (error) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_NETWORK_UNAVAILABLE", error);
      }
    },
    async completeUpload({ item, intent }) {
      try {
        const { mediaAssetId } = await completeSupabaseMediaUploadSession({
          uploadSessionId: intent.uploadToken,
          mimeType: item.mimeType,
          byteSize: item.byteSize,
          contentHash: item.contentSha256,
          durationMs: null,
          width: null,
          height: null,
        });
        return { scanImageId: mediaAssetId, recognitionJobStarted: true };
      } catch (error) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED", error);
      }
    },
  };
}

export function createMobilePhotoUploadService(
  transport: MobilePhotoUploadTransport = createSupabaseMobilePhotoUploadTransport(),
): MobilePhotoUploadService {
  return {
    async uploadQueuedItem(item) {
      const intent = await transport.createUploadIntent(item);
      if (new Date(intent.expiresAt).getTime() <= Date.now()) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_EXPIRED");
      }
      await transport.uploadFile({ item, intent });
      return transport.completeUpload({ item, intent });
    },
  };
}
