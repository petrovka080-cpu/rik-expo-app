import { Alert, Platform } from "react-native";
import { decode } from "base64-arraybuffer";

import { pickFileAny } from "../../lib/filePick";
import { MARKET_ADD_MEDIA_LIMITS } from "../../lib/media";
import type { MediaKind, MediaOwnerRole } from "../../lib/media/mediaTypes";
import {
  completeSupabaseMediaUploadSession,
  createSupabaseMediaUploadSession,
  getSupabaseMediaPublicUrl,
  uploadSupabaseMediaObject,
} from "../../lib/media/services/mediaBackendUploadService";
import { createMobilePhotoCaptureService } from "../../lib/mobilePhotoCapture/mobilePhotoCaptureService";
import {
  mobilePhotoBase64Bytes,
  mobilePhotoSha256Hex,
} from "../../lib/mobilePhotoCapture/mobilePhotoNormalizationService";

type FileSystemModule = {
  getInfoAsync?: (uri: string, options?: { size?: boolean }) => Promise<{ exists?: boolean; size?: number }>;
  readAsStringAsync: (uri: string, options: { encoding: "base64" }) => Promise<string>;
};

type NativeVideoPickerAsset = {
  uri?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  duration?: number | null;
  mimeType?: string | null;
};

type NativeVideoPickerResult = {
  canceled?: boolean;
  cancelled?: boolean;
  assets?: NativeVideoPickerAsset[] | null;
};

type NativeVideoPickerModule = {
  launchCameraAsync: (options?: Record<string, unknown>) => Promise<NativeVideoPickerResult>;
  launchImageLibraryAsync: (options?: Record<string, unknown>) => Promise<NativeVideoPickerResult>;
};

type MarketplaceMediaSource = "camera" | "library";
type MarketplaceUploadBody = Blob | File | ArrayBuffer;

type PickedMarketplaceMedia = {
  uploadBody: MarketplaceUploadBody;
  mediaKind: MediaKind;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/quicktime" | "video/webm";
  byteSize: number;
  contentHash: string;
  durationMs?: number;
  width?: number;
  height?: number;
};

export type MarketplaceUploadedMedia = {
  mediaAssetId: string;
  publicUrl: string;
  mediaKind: MediaKind;
  mimeType: PickedMarketplaceMedia["mimeType"];
  durationMs?: number;
  width?: number;
  height?: number;
};

export type MarketplaceUploadedPhoto = MarketplaceUploadedMedia;

const MARKETPLACE_MEDIA_BUCKET = "public-marketplace-media";
const MARKETPLACE_PHOTO_ACCEPT = MARKET_ADD_MEDIA_LIMITS.allowedPhotoMimeTypes.join(",");
const MARKETPLACE_VIDEO_ACCEPT = MARKET_ADD_MEDIA_LIMITS.allowedVideoMimeTypes.join(",");
const MARKETPLACE_MEDIA_ERROR_TITLE = "\u041c\u0435\u0434\u0438\u0430 \u0442\u043e\u0432\u0430\u0440\u0430";
const MARKETPLACE_MEDIA_ERROR_MESSAGE =
  "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043c\u0435\u0434\u0438\u0430 \u0442\u043e\u0432\u0430\u0440\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
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

function asPhotoMimeType(value: unknown): PickedMarketplaceMedia["mimeType"] {
  const mimeType = String(value ?? "").trim().toLowerCase();
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function asVideoMimeType(value: unknown): PickedMarketplaceMedia["mimeType"] {
  const mimeType = String(value ?? "").trim().toLowerCase();
  if (mimeType === "video/quicktime" || mimeType === "video/mov") return "video/quicktime";
  if (mimeType === "video/webm") return "video/webm";
  return "video/mp4";
}

function durationMs(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

function positiveDimension(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  return mobilePhotoSha256Hex(new Uint8Array(bytes));
}

function fileSizeOrThrow(size: unknown): number {
  const parsed = Number(size);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Marketplace media file is empty");
  }
  return Math.round(parsed);
}

async function pickWebMarketplaceMedia(mediaKind: MediaKind): Promise<PickedMarketplaceMedia | null> {
  const accept = mediaKind === "photo" ? MARKETPLACE_PHOTO_ACCEPT : MARKETPLACE_VIDEO_ACCEPT;
  const file = await pickFileAny({ accept });
  if (!file) return null;
  if (!(file instanceof File)) {
    throw new Error("Marketplace media picker returned an unsupported web file");
  }
  const bytes = await file.arrayBuffer();
  const mimeType = mediaKind === "photo" ? asPhotoMimeType(file.type) : asVideoMimeType(file.type);
  if (mediaKind === "photo" && !String(file.type || mimeType).startsWith("image/")) {
    throw new Error("Selected marketplace media is not an image");
  }
  if (mediaKind === "video" && !String(file.type || mimeType).startsWith("video/")) {
    throw new Error("Selected marketplace media is not a video");
  }
  return {
    uploadBody: file,
    mediaKind,
    mimeType,
    byteSize: fileSizeOrThrow(file.size || bytes.byteLength),
    contentHash: await sha256Hex(bytes),
  };
}

async function loadFileSystem(): Promise<FileSystemModule> {
  return (await import("expo-file-system/legacy")) as FileSystemModule;
}

async function readNativeUploadBody(uri: string): Promise<ArrayBuffer> {
  const fileSystemModule = await loadFileSystem();
  const base64 = await fileSystemModule.readAsStringAsync(uri, { encoding: "base64" });
  return decode(base64);
}

async function sha256NativeFile(uri: string): Promise<string> {
  const fileSystemModule = await loadFileSystem();
  const base64 = await fileSystemModule.readAsStringAsync(uri, { encoding: "base64" });
  return mobilePhotoSha256Hex(mobilePhotoBase64Bytes(base64));
}

async function nativeFileSize(uri: string, fallbackSize?: number | null): Promise<number> {
  const fallback = Number(fallbackSize);
  if (Number.isFinite(fallback) && fallback > 0) return Math.round(fallback);
  const fileSystemModule = await loadFileSystem();
  const info = await fileSystemModule.getInfoAsync?.(uri, { size: true });
  return fileSizeOrThrow(info?.size);
}

async function pickNativeMarketplacePhoto(source: MarketplaceMediaSource): Promise<PickedMarketplaceMedia | null> {
  const service = createMobilePhotoCaptureService();
  const scanId = `marketplace_product_photo:${source}:${Date.now()}`;
  const asset = source === "camera"
    ? await service.launchSystemCamera({ scanId, kind: "PRODUCT_FRONT" })
    : await service.pickFromLibrary({ scanId, kind: "PRODUCT_FRONT" });
  if (!asset) return null;
  return {
    uploadBody: await readNativeUploadBody(asset.localUri),
    mediaKind: "photo",
    mimeType: asPhotoMimeType(asset.mimeType),
    byteSize: asset.byteSize,
    contentHash: asset.contentSha256,
    width: asset.width,
    height: asset.height,
  };
}

function firstVideoAsset(result: NativeVideoPickerResult): NativeVideoPickerAsset | null {
  if (result.canceled === true || result.cancelled === true) return null;
  const asset = result.assets?.[0];
  const uri = String(asset?.uri ?? "").trim();
  return uri ? asset ?? null : null;
}

async function pickNativeMarketplaceVideo(source: MarketplaceMediaSource): Promise<PickedMarketplaceMedia | null> {
  const imagePicker = (await import("expo-image-picker")) as NativeVideoPickerModule;
  const options = {
    allowsEditing: false,
    allowsMultipleSelection: false,
    mediaTypes: "videos",
    quality: 1,
    videoMaxDuration: MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs / 1000,
  };
  const result = source === "camera"
    ? await imagePicker.launchCameraAsync(options)
    : await imagePicker.launchImageLibraryAsync(options);
  const asset = firstVideoAsset(result);
  if (!asset?.uri) return null;
  const byteSize = await nativeFileSize(asset.uri, asset.fileSize);
  return {
    uploadBody: await readNativeUploadBody(asset.uri),
    mediaKind: "video",
    mimeType: asVideoMimeType(asset.mimeType),
    byteSize,
    contentHash: await sha256NativeFile(asset.uri),
    durationMs: durationMs(asset.duration),
    width: positiveDimension(asset.width),
    height: positiveDimension(asset.height),
  };
}

async function pickMarketplaceMedia(params: {
  mediaKind: MediaKind;
  source: MarketplaceMediaSource;
}): Promise<PickedMarketplaceMedia | null> {
  if (Platform.OS === "web") {
    return pickWebMarketplaceMedia(params.mediaKind);
  }
  return params.mediaKind === "photo"
    ? pickNativeMarketplacePhoto(params.source)
    : pickNativeMarketplaceVideo(params.source);
}

function assertMarketplaceMediaValid(media: PickedMarketplaceMedia): void {
  const isPhoto = media.mediaKind === "photo";
  const allowedMimeTypes = isPhoto
    ? MARKET_ADD_MEDIA_LIMITS.allowedPhotoMimeTypes
    : MARKET_ADD_MEDIA_LIMITS.allowedVideoMimeTypes;
  const maxBytes = isPhoto
    ? MARKET_ADD_MEDIA_LIMITS.maxPhotoBytes
    : MARKET_ADD_MEDIA_LIMITS.maxVideoBytes;

  if (!(allowedMimeTypes as readonly string[]).includes(media.mimeType)) {
    throw new Error("Неподдерживаемый тип файла.");
  }
  if (media.byteSize > maxBytes) {
    throw new Error("Файл превышает допустимый размер.");
  }
  if (!isPhoto && (media.durationMs ?? 0) > MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs) {
    throw new Error("Видео должно быть не длиннее 15 секунд.");
  }
}

async function createMarketplaceUploadSession(params: {
  orgId: string;
  userId: string;
  role: MediaOwnerRole;
  mediaKind: MediaKind;
  mimeType: string;
  byteSize: number;
}) {
  const maxBytes = params.mediaKind === "photo"
    ? MARKET_ADD_MEDIA_LIMITS.maxPhotoBytes
    : MARKET_ADD_MEDIA_LIMITS.maxVideoBytes;
  if (params.byteSize > maxBytes) {
    throw new Error("Marketplace media file exceeds upload policy");
  }
  return createSupabaseMediaUploadSession({
    orgId: params.orgId,
    projectId: null,
    requestedByUserId: params.userId,
    requestedByRole: params.role,
    targetType: "marketplace_product",
    targetId: null,
    mediaKind: params.mediaKind,
    purpose: params.mediaKind === "photo" ? "product_photo" : "product_video",
    expectedMimeType: params.mimeType,
    expectedByteSizeMax: maxBytes,
    expectedDurationMsMax: params.mediaKind === "video" ? MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs : null,
    storageBucket: MARKETPLACE_MEDIA_BUCKET,
    storageKeyPrefix: params.orgId,
    uploadUrl: "public-marketplace-media-upload-session",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}

export async function uploadMarketplaceProductMedia(params: {
  userId: string;
  companyId: string | null;
  role: unknown;
  mediaKind: MediaKind;
  source: MarketplaceMediaSource;
}): Promise<MarketplaceUploadedMedia | null> {
  const media = await pickMarketplaceMedia({
    mediaKind: params.mediaKind,
    source: params.source,
  });
  if (!media) return null;
  if (media.mediaKind !== params.mediaKind) {
    throw new Error(`Marketplace media picker returned ${media.mediaKind} for ${params.mediaKind} button`);
  }
  assertMarketplaceMediaValid(media);

  const orgId = String(params.companyId || params.userId || "").trim();
  const userId = String(params.userId || "").trim();
  if (!UUID_RE.test(orgId) || !UUID_RE.test(userId)) {
    throw new Error("Marketplace media upload requires valid owner ids");
  }

  const session = await createMarketplaceUploadSession({
    orgId,
    userId,
    role: normalizeMarketplaceOwnerRole(params.role),
    mediaKind: media.mediaKind,
    mimeType: media.mimeType,
    byteSize: media.byteSize,
  });

  await uploadSupabaseMediaObject({
    storageBucket: session.storageBucket,
    storageKey: session.storageKey,
    body: media.uploadBody,
    contentType: media.mimeType,
    upsert: false,
  });

  const { mediaAssetId } = await completeSupabaseMediaUploadSession({
    uploadSessionId: session.uploadSessionId,
    mimeType: media.mimeType,
    byteSize: media.byteSize,
    contentHash: media.contentHash,
    durationMs: media.durationMs ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
  });

  const publicUrl = getSupabaseMediaPublicUrl({
    storageBucket: session.storageBucket,
    storageKey: session.storageKey,
  });
  if (!publicUrl || publicUrl.startsWith("blob:")) {
    throw new Error("Marketplace media upload did not create a stable public URL");
  }

  return {
    mediaAssetId,
    publicUrl,
    mediaKind: media.mediaKind,
    mimeType: media.mimeType,
    durationMs: media.durationMs,
    width: media.width,
    height: media.height,
  };
}

export async function uploadMarketplaceProductPhoto(params: {
  userId: string;
  companyId: string | null;
  role: unknown;
}): Promise<MarketplaceUploadedPhoto | null> {
  return uploadMarketplaceProductMedia({
    ...params,
    mediaKind: "photo",
    source: "library",
  });
}

export function showMarketplaceMediaUploadError(error: unknown) {
  if (__DEV__) {
    console.warn(
      "uploadMarketplaceProductMedia error:",
      error instanceof Error ? error.message : String(error),
    );
  }
  Alert.alert(MARKETPLACE_MEDIA_ERROR_TITLE, MARKETPLACE_MEDIA_ERROR_MESSAGE);
}

export function showMarketplacePhotoUploadError(error: unknown) {
  showMarketplaceMediaUploadError(error);
}
