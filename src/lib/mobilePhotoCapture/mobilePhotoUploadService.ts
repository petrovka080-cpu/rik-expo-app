import type { MobilePhotoQueuedUpload } from "./mobilePhotoUploadQueue";
import { createMobilePhotoCaptureError } from "./mobilePhotoCaptureErrors";
import { decode } from "base64-arraybuffer";
import { currentUserId, supabase } from "../supabaseClient";

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
  const userId = String(await currentUserId() ?? "").trim();
  if (!UUID_RE.test(userId)) {
    throw createMobilePhotoCaptureError("PHOTO_UPLOAD_ACCESS_DENIED");
  }
  return userId;
}

function uploadExpiresAt(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

export function createSupabaseMobilePhotoUploadTransport(): MobilePhotoUploadTransport {
  return {
    async createUploadIntent(item) {
      const userId = await requireCurrentUserId();
      const { data, error } = await supabase.rpc("media_backend_create_upload_session" as never, {
        p_org_id: userId,
        p_project_id: null,
        p_requested_by_user_id: userId,
        p_requested_by_role: "client",
        p_target_type: PHOTO_MATERIAL_TARGET_TYPE,
        p_target_id: item.scanId,
        p_media_kind: "photo",
        p_purpose: PHOTO_MATERIAL_PURPOSE,
        p_expected_mime_type: item.mimeType,
        p_expected_byte_size_max: item.byteSize,
        p_expected_duration_ms_max: null,
      } as never);
      if (error) throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED", error);
      const uploadSessionId = String(data ?? "").trim();
      if (!UUID_RE.test(uploadSessionId)) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED");
      }
      return {
        uploadToken: uploadSessionId,
        uploadUrl: "private-media-upload-session",
        storageBucket: PRIVATE_MEDIA_BUCKET,
        storageKey: `${userId}/${uploadSessionId}/original`,
        expiresAt: uploadExpiresAt(),
      };
    },
    async uploadFile({ item, intent }) {
      const body = await readLocalFileBody(item.localUri);
      const uploaded = await supabase.storage
        .from(intent.storageBucket)
        .upload(intent.storageKey, body, {
          contentType: item.mimeType,
          upsert: false,
        });
      if (uploaded.error) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_NETWORK_UNAVAILABLE", uploaded.error);
      }
      return { uploaded: true };
    },
    async completeUpload({ item, intent }) {
      const completed = await supabase.rpc("media_backend_complete_upload_session" as never, {
        p_session_id: intent.uploadToken,
        p_mime_type: item.mimeType,
        p_byte_size: item.byteSize,
        p_content_hash: item.contentSha256,
        p_duration_ms: null,
        p_width: null,
        p_height: null,
      } as never);
      if (completed.error) throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED", completed.error);
      const scanImageId = String(completed.data ?? "").trim();
      if (!UUID_RE.test(scanImageId)) {
        throw createMobilePhotoCaptureError("PHOTO_UPLOAD_INTENT_FAILED");
      }
      return { scanImageId, recognitionJobStarted: true };
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
