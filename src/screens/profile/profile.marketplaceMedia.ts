import { Alert, Platform } from "react-native";
import { decode } from "base64-arraybuffer";

import { pickFileAny } from "../../lib/filePick";
import { MEDIA_LIMITS } from "../../lib/media";
import type { MediaOwnerRole } from "../../lib/media/mediaTypes";
import { createMobilePhotoNormalizationService } from "../../lib/mobilePhotoCapture/mobilePhotoNormalizationService";
import { supabase } from "../../lib/supabaseClient";

type FileSystemModule = {
  readAsStringAsync: (uri: string, options: { encoding: "base64" }) => Promise<string>;
};

type PickedMarketplacePhoto = {
  uploadBody: Blob | File | ArrayBuffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  contentHash: string;
  width?: number;
  height?: number;
};

export type MarketplaceUploadedPhoto = {
  mediaAssetId: string;
  publicUrl: string;
};

const MARKETPLACE_MEDIA_BUCKET = "public-marketplace-media";
const MARKETPLACE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const MARKETPLACE_PHOTO_ERROR_TITLE = "Фото товара";
const MARKETPLACE_PHOTO_ERROR_MESSAGE = "Не удалось загрузить фото товара. Попробуйте ещё раз.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeMarketplaceOwnerRole(value: unknown): MediaOwnerRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (
    role === "director" ||
    role === "foreman" ||
    role === "contractor" ||
    role === "buyer" ||
    role === "supplier" ||
    role === "warehouse" ||
    role === "accountant" ||
    role === "office" ||
    role === "client" ||
    role === "admin" ||
    role === "security"
  ) {
    return role;
  }
  return "supplier";
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return bytesToHex(new Uint8Array(digest));
  }
  const seed = `${bytes.byteLength}:${Date.now()}`;
  return `web-fallback-${seed}`;
}

function asImageMimeType(value: unknown): PickedMarketplacePhoto["mimeType"] {
  const mimeType = String(value ?? "").trim().toLowerCase();
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  return "image/jpeg";
}

async function pickWebMarketplacePhoto(): Promise<PickedMarketplacePhoto | null> {
  const file = await pickFileAny({ accept: MARKETPLACE_PHOTO_ACCEPT });
  if (!file) return null;
  if (!(file instanceof File)) {
    throw new Error("Marketplace photo picker returned an unsupported web file");
  }
  const mimeType = asImageMimeType(file.type);
  if (!String(file.type || mimeType).startsWith("image/")) {
    throw new Error("Selected marketplace media is not an image");
  }
  const bytes = await file.arrayBuffer();
  return {
    uploadBody: file,
    mimeType,
    byteSize: file.size || bytes.byteLength,
    contentHash: await sha256Hex(bytes),
  };
}

async function readNativeUploadBody(uri: string): Promise<ArrayBuffer> {
  const fileSystemModule = (await import("expo-file-system/legacy")) as FileSystemModule;
  const base64 = await fileSystemModule.readAsStringAsync(uri, { encoding: "base64" });
  return decode(base64);
}

async function pickNativeMarketplacePhoto(): Promise<PickedMarketplacePhoto | null> {
  const imagePicker = await import("expo-image-picker");
  const result = await imagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: false,
    mediaTypes: "images",
    quality: 0.86,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  const normalized = await createMobilePhotoNormalizationService().normalize({
    captureId: `marketplace-${Date.now()}`,
    sourceUri: asset.uri,
    width: asset.width ?? null,
    height: asset.height ?? null,
  });

  return {
    uploadBody: await readNativeUploadBody(normalized.uri),
    mimeType: normalized.mimeType,
    byteSize: normalized.byteSize,
    contentHash: normalized.contentSha256,
    width: normalized.width,
    height: normalized.height,
  };
}

async function pickMarketplacePhoto(): Promise<PickedMarketplacePhoto | null> {
  return Platform.OS === "web"
    ? pickWebMarketplacePhoto()
    : pickNativeMarketplacePhoto();
}

async function createMarketplaceUploadSession(params: {
  orgId: string;
  userId: string;
  role: MediaOwnerRole;
  mimeType: string;
  byteSize: number;
}) {
  const { data, error } = await supabase.rpc("media_backend_create_upload_session" as never, {
    p_org_id: params.orgId,
    p_project_id: null,
    p_requested_by_user_id: params.userId,
    p_requested_by_role: params.role,
    p_target_type: "marketplace_product",
    p_target_id: null,
    p_media_kind: "photo",
    p_purpose: "product_photo",
    p_expected_mime_type: params.mimeType,
    p_expected_byte_size_max: Math.max(params.byteSize, MEDIA_LIMITS.maxPhotoUploadBytes),
    p_expected_duration_ms_max: null,
  } as never);
  if (error) throw error;
  const uploadSessionId = String(data ?? "").trim();
  if (!UUID_RE.test(uploadSessionId)) {
    throw new Error("Marketplace media upload session did not return a valid id");
  }
  return {
    uploadSessionId,
    storageBucket: MARKETPLACE_MEDIA_BUCKET,
    storageKey: `${params.orgId}/${uploadSessionId}/original`,
  };
}

export async function uploadMarketplaceProductPhoto(params: {
  userId: string;
  companyId: string | null;
  role: unknown;
}): Promise<MarketplaceUploadedPhoto | null> {
  const photo = await pickMarketplacePhoto();
  if (!photo) return null;

  const orgId = String(params.companyId || params.userId || "").trim();
  const userId = String(params.userId || "").trim();
  if (!UUID_RE.test(orgId) || !UUID_RE.test(userId)) {
    throw new Error("Marketplace media upload requires valid owner ids");
  }

  const session = await createMarketplaceUploadSession({
    orgId,
    userId,
    role: normalizeMarketplaceOwnerRole(params.role),
    mimeType: photo.mimeType,
    byteSize: photo.byteSize,
  });

  const upload = await supabase.storage
    .from(session.storageBucket)
    .upload(session.storageKey, photo.uploadBody, {
      contentType: photo.mimeType,
      upsert: false,
    });
  if (upload.error) throw upload.error;

  const completed = await supabase.rpc("media_backend_complete_upload_session" as never, {
    p_session_id: session.uploadSessionId,
    p_mime_type: photo.mimeType,
    p_byte_size: photo.byteSize,
    p_content_hash: photo.contentHash,
    p_duration_ms: null,
    p_width: photo.width ?? null,
    p_height: photo.height ?? null,
  } as never);
  if (completed.error) throw completed.error;

  const mediaAssetId = String(completed.data ?? "").trim();
  if (!UUID_RE.test(mediaAssetId)) {
    throw new Error("Marketplace media upload did not create a valid media asset");
  }

  const { data } = supabase.storage.from(session.storageBucket).getPublicUrl(session.storageKey);
  const publicUrl = String(data.publicUrl ?? "").trim();
  if (!publicUrl || publicUrl.startsWith("blob:")) {
    throw new Error("Marketplace media upload did not create a stable public URL");
  }

  return { mediaAssetId, publicUrl };
}

export function showMarketplacePhotoUploadError(error: unknown) {
  if (__DEV__) {
    console.warn(
      "uploadMarketplaceProductPhoto error:",
      error instanceof Error ? error.message : String(error),
    );
  }
  Alert.alert(MARKETPLACE_PHOTO_ERROR_TITLE, MARKETPLACE_PHOTO_ERROR_MESSAGE);
}
