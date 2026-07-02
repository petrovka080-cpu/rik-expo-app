import { Alert, Platform } from "react-native";
import { decode } from "base64-arraybuffer";

import { pickFilesAny } from "../../lib/filePick";
import { MARKET_ADD_MEDIA_LIMITS } from "../../lib/media";
import type { MediaKind, MediaOwnerRole } from "../../lib/media/mediaTypes";
import {
  completeSupabaseMediaUploadSession,
  createSupabaseMediaUploadSession,
  getSupabaseMediaPublicUrl,
  uploadSupabaseMediaObject,
} from "../../lib/media/services/mediaBackendUploadService";
import {
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
type MobilePhotoCaptureServiceModule = typeof import("../../lib/mobilePhotoCapture/mobilePhotoCaptureService");

type PickedMarketplaceMedia = {
  clientMediaId: string;
  uploadBody: MarketplaceUploadBody;
  mediaKind: MediaKind;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/quicktime" | "video/webm";
  byteSize: number;
  contentHash: string;
  pendingPreviewUrl?: string | null;
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

const MARKETPLACE_MEDIA_BUCKET = "public-marketplace-media";
const MARKETPLACE_PHOTO_ACCEPT = MARKET_ADD_MEDIA_LIMITS.allowedPhotoMimeTypes.join(",");
const MARKETPLACE_VIDEO_ACCEPT = MARKET_ADD_MEDIA_LIMITS.allowedVideoMimeTypes.join(",");
const MARKETPLACE_MEDIA_ERROR_TITLE = "\u041c\u0435\u0434\u0438\u0430 \u0442\u043e\u0432\u0430\u0440\u0430";
const MARKETPLACE_MEDIA_ERROR_MESSAGE =
  "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043c\u0435\u0434\u0438\u0430 \u0442\u043e\u0432\u0430\u0440\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MARKETPLACE_MEDIA_UPLOAD_CONCURRENCY = 2;
const WEBM_TIMECODE_SCALE_DEFAULT_NS = 1_000_000;
const WEBM_SEGMENT_ID = [0x18, 0x53, 0x80, 0x67] as const;
const WEBM_INFO_ID = [0x15, 0x49, 0xa9, 0x66] as const;
const WEBM_DURATION_ID = [0x44, 0x89] as const;
const WEBM_TIMECODE_SCALE_ID = [0x2a, 0xd7, 0xb1] as const;

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

async function mapBounded<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(Math.floor(concurrency), items.length || 1));
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function createWebObjectUrl(file: File): string | null {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }
  return URL.createObjectURL(file);
}

function revokeWebObjectUrl(url: string | null): void {
  if (!url || typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
    return;
  }
  URL.revokeObjectURL(url);
}

function readEbmlVint(input: Uint8Array, offset: number, keepMarker: boolean) {
  const first = input[offset];
  if (first == null) return null;
  let length = 1;
  let marker = 0x80;
  while (length <= 8 && (first & marker) === 0) {
    length += 1;
    marker >>= 1;
  }
  if (length > 8 || offset + length > input.length) return null;
  let value = keepMarker ? first : first & (marker - 1);
  for (let index = 1; index < length; index += 1) {
    value = value * 256 + input[offset + index];
  }
  const unknown = !keepMarker && value === (2 ** (7 * length)) - 1;
  return { length, value, unknown };
}

function ebmlIdMatches(input: Uint8Array, offset: number, length: number, target: readonly number[]): boolean {
  if (length !== target.length) return false;
  for (let index = 0; index < target.length; index += 1) {
    if (input[offset + index] !== target[index]) return false;
  }
  return true;
}

function findEbmlElement(
  input: Uint8Array,
  start: number,
  end: number,
  target: readonly number[],
) {
  let offset = start;
  while (offset < end) {
    const id = readEbmlVint(input, offset, true);
    if (!id) return null;
    const sizeOffset = offset + id.length;
    const size = readEbmlVint(input, sizeOffset, false);
    if (!size) return null;
    const contentStart = sizeOffset + size.length;
    const contentEnd = size.unknown ? end : contentStart + size.value;
    if (contentEnd > end || contentEnd > input.length) return null;
    if (ebmlIdMatches(input, offset, id.length, target)) {
      return { contentStart, contentEnd };
    }
    offset = contentEnd;
  }
  return null;
}

function readEbmlFloat(input: Uint8Array, start: number, end: number): number | null {
  if (start < 0 || end > input.length || end <= start) return null;
  const view = new DataView(input.buffer, input.byteOffset + start, end - start);
  if (view.byteLength === 4) return view.getFloat32(0, false);
  if (view.byteLength === 8) return view.getFloat64(0, false);
  return null;
}

function readEbmlUnsignedInteger(input: Uint8Array, start: number, end: number): number | null {
  if (start < 0 || end > input.length || end <= start || end - start > 8) return null;
  let value = 0;
  for (let index = start; index < end; index += 1) {
    const byte = input[index];
    if (byte == null) return null;
    value = value * 256 + byte;
    if (!Number.isSafeInteger(value)) return null;
  }
  return value;
}

function normalizeWebmDurationMs(duration: number, timecodeScale: number): number | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (!Number.isFinite(timecodeScale) || timecodeScale <= 0) return null;
  const durationMsValue = duration * timecodeScale / 1_000_000;
  if (
    !Number.isFinite(durationMsValue) ||
    durationMsValue <= 0 ||
    durationMsValue > MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs
  ) {
    return null;
  }
  return Math.max(1, Math.round(durationMsValue));
}

export function readWebmDurationMsFromArrayBuffer(buffer: ArrayBuffer): number | null {
  const input = new Uint8Array(buffer);
  const segment = findEbmlElement(input, 0, input.length, WEBM_SEGMENT_ID);
  if (!segment) return null;
  const info = findEbmlElement(input, segment.contentStart, segment.contentEnd, WEBM_INFO_ID);
  if (!info) return null;
  const timecodeScaleElement = findEbmlElement(
    input,
    info.contentStart,
    info.contentEnd,
    WEBM_TIMECODE_SCALE_ID,
  );
  const timecodeScale = timecodeScaleElement
    ? readEbmlUnsignedInteger(input, timecodeScaleElement.contentStart, timecodeScaleElement.contentEnd)
    : WEBM_TIMECODE_SCALE_DEFAULT_NS;
  if (timecodeScale == null) return null;
  const durationElement = findEbmlElement(input, info.contentStart, info.contentEnd, WEBM_DURATION_ID);
  if (!durationElement) return null;
  const duration = readEbmlFloat(input, durationElement.contentStart, durationElement.contentEnd);
  return duration == null ? null : normalizeWebmDurationMs(duration, timecodeScale);
}

function readWebmContainerMetadata(bytes: ArrayBuffer, mimeType: string): {
  durationMs?: number;
  width?: number;
  height?: number;
} {
  if (!mimeType.toLowerCase().includes("webm")) return {};
  const durationMsFromContainer = readWebmDurationMsFromArrayBuffer(bytes);
  return durationMsFromContainer == null ? {} : { durationMs: durationMsFromContainer };
}

async function readWebVideoMetadata(file: File, objectUrl: string | null, bytes: ArrayBuffer): Promise<{
  durationMs?: number;
  width?: number;
  height?: number;
}> {
  if (typeof document === "undefined") {
    throw new Error("Marketplace web video metadata requires a browser document");
  }
  const ownedObjectUrl = objectUrl ? null : createWebObjectUrl(file);
  const sourceUrl = objectUrl ?? ownedObjectUrl;
  if (!sourceUrl) {
    throw new Error("Marketplace web video metadata requires a stable object URL");
  }
  try {
    return await new Promise<{ durationMs?: number; width?: number; height?: number }>((resolve, reject) => {
      const video = document.createElement("video");
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const finish = (value: Error | { durationMs?: number; width?: number; height?: number }) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        video.onloadedmetadata = null;
        video.ontimeupdate = null;
        video.onerror = null;
        if (value instanceof Error) reject(value);
        else resolve(value);
      };
      const readMetadata = () => ({
        durationMs: durationMs(video.duration * 1000),
        width: positiveDimension(video.videoWidth),
        height: positiveDimension(video.videoHeight),
      });
      const finishIfDurationReady = () => {
        const metadata = readMetadata();
        if (metadata.durationMs) {
          finish(metadata);
          return true;
        }
        return false;
      };
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () => {
        if (finishIfDurationReady()) return;
        video.ontimeupdate = () => {
          finishIfDurationReady();
        };
        timeoutId = setTimeout(
          () => finish(new Error("Marketplace web video metadata duration could not be resolved")),
          3_000,
        );
        try {
          video.currentTime = Number.MAX_SAFE_INTEGER;
        } catch (error) {
          finish(error instanceof Error ? error : new Error("Marketplace web video metadata seek failed"));
        }
      };
      video.onerror = () => finish(new Error("Marketplace web video metadata could not be read"));
      video.src = sourceUrl;
      video.load();
    }).catch((error) => {
      const metadata = readWebmContainerMetadata(bytes, file.type);
      if (metadata.durationMs) return metadata;
      throw error;
    });
  } finally {
    revokeWebObjectUrl(ownedObjectUrl);
  }
}

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

function createClientMediaId(mediaKind: MediaKind, index: number, contentHash: string): string {
  return `${mediaKind}:${Date.now()}:${index}:${contentHash.slice(0, 16)}`;
}

async function pickWebMarketplaceMedia(params: {
  mediaKind: MediaKind;
  selectionLimit?: number;
  enablePendingPreview?: boolean;
}): Promise<PickedMarketplaceMedia[] | null> {
  const { mediaKind } = params;
  const accept = mediaKind === "photo" ? MARKETPLACE_PHOTO_ACCEPT : MARKETPLACE_VIDEO_ACCEPT;
  const selectionLimit = Math.max(1, Math.floor(Number(params.selectionLimit ?? 1)));
  const files = await pickFilesAny({
    accept,
    multiple: mediaKind === "photo" && selectionLimit > 1,
    maxFiles: selectionLimit,
  });
  if (files.length < 1) return null;
  return mapBounded(files, MARKETPLACE_MEDIA_UPLOAD_CONCURRENCY, async (file, index) => {
    if (!(file instanceof File)) {
      throw new Error("Marketplace media picker returned an unsupported web file");
    }
    const mimeType = mediaKind === "photo" ? asPhotoMimeType(file.type) : asVideoMimeType(file.type);
    if (mediaKind === "photo" && !String(file.type || mimeType).startsWith("image/")) {
      throw new Error("Selected marketplace media is not an image");
    }
    if (mediaKind === "video" && !String(file.type || mimeType).startsWith("video/")) {
      throw new Error("Selected marketplace media is not a video");
    }
    const bytes = await file.arrayBuffer();
    const contentHash = await sha256Hex(bytes);
    const videoMetadata = mediaKind === "video"
      ? await readWebVideoMetadata(file, null, bytes)
      : {};
    return {
      clientMediaId: createClientMediaId(mediaKind, index, contentHash),
      uploadBody: file,
      mediaKind,
      mimeType,
      byteSize: fileSizeOrThrow(file.size || bytes.byteLength),
      contentHash,
      pendingPreviewUrl: params.enablePendingPreview && mediaKind === "photo"
        ? createWebObjectUrl(file)
        : null,
      durationMs: videoMetadata.durationMs,
      width: videoMetadata.width,
      height: videoMetadata.height,
    };
  });
}

async function loadFileSystem(): Promise<FileSystemModule> {
  return (await import("expo-file-system/legacy")) as FileSystemModule;
}

async function readNativeUploadBody(uri: string): Promise<ArrayBuffer> {
  const fileSystemModule = await loadFileSystem();
  const base64 = await fileSystemModule.readAsStringAsync(uri, { encoding: "base64" });
  return decode(base64);
}

async function nativeFileSize(uri: string, fallbackSize?: number | null): Promise<number> {
  const fallback = Number(fallbackSize);
  if (Number.isFinite(fallback) && fallback > 0) return Math.round(fallback);
  const fileSystemModule = await loadFileSystem();
  const info = await fileSystemModule.getInfoAsync?.(uri, { size: true });
  return fileSizeOrThrow(info?.size);
}

async function createNativeMarketplacePhotoCaptureService() {
  const module: MobilePhotoCaptureServiceModule = await import(
    "../../lib/mobilePhotoCapture/mobilePhotoCaptureService"
  );
  return module.createMobilePhotoCaptureService();
}

async function pickNativeMarketplacePhoto(params: {
  source: MarketplaceMediaSource;
  selectionLimit?: number;
}): Promise<PickedMarketplaceMedia[] | null> {
  const service = await createNativeMarketplacePhotoCaptureService();
  const scanId = `marketplace_product_photo:${params.source}:${Date.now()}`;
  const assets = params.source === "camera"
    ? [await service.launchSystemCamera({ scanId, kind: "PRODUCT_FRONT" })].filter(isPresent)
    : await service.pickManyFromLibrary({
        scanId,
        kind: "PRODUCT_FRONT",
        selectionLimit: params.selectionLimit,
      });
  if (assets.length < 1) return null;
  return mapBounded(assets, MARKETPLACE_MEDIA_UPLOAD_CONCURRENCY, async (asset, index) => {
    return {
      clientMediaId: createClientMediaId("photo", index, asset.contentSha256),
      uploadBody: await readNativeUploadBody(asset.localUri),
      mediaKind: "photo",
      mimeType: asPhotoMimeType(asset.mimeType),
      byteSize: asset.byteSize,
      contentHash: asset.contentSha256,
      width: asset.width,
      height: asset.height,
    };
  });
}

function firstVideoAsset(result: NativeVideoPickerResult): NativeVideoPickerAsset | null {
  if (result.canceled === true || result.cancelled === true) return null;
  const asset = result.assets?.[0];
  const uri = String(asset?.uri ?? "").trim();
  return uri ? asset ?? null : null;
}

async function pickNativeMarketplaceVideo(params: {
  source: MarketplaceMediaSource;
}): Promise<PickedMarketplaceMedia[] | null> {
  const imagePicker = (await import("expo-image-picker")) as NativeVideoPickerModule;
  const options = {
    allowsEditing: false,
    allowsMultipleSelection: false,
    mediaTypes: "videos",
    quality: 1,
    videoMaxDuration: MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs / 1000,
  };
  const result = params.source === "camera"
    ? await imagePicker.launchCameraAsync(options)
    : await imagePicker.launchImageLibraryAsync(options);
  const asset = firstVideoAsset(result);
  if (!asset?.uri) return null;
  const byteSize = await nativeFileSize(asset.uri, asset.fileSize);
  const uploadBody = await readNativeUploadBody(asset.uri);
  const contentHash = await sha256Hex(uploadBody);
  return [{
    clientMediaId: createClientMediaId("video", 0, contentHash),
    uploadBody,
    mediaKind: "video",
    mimeType: asVideoMimeType(asset.mimeType),
    byteSize,
    contentHash,
    durationMs: durationMs(asset.duration),
    width: positiveDimension(asset.width),
    height: positiveDimension(asset.height),
  }];
}

async function pickMarketplaceMedia(params: {
  mediaKind: MediaKind;
  source: MarketplaceMediaSource;
  selectionLimit?: number;
  enablePendingPreview?: boolean;
}): Promise<PickedMarketplaceMedia[] | null> {
  if (Platform.OS === "web") {
    return pickWebMarketplaceMedia({
      mediaKind: params.mediaKind,
      selectionLimit: params.selectionLimit,
      enablePendingPreview: params.enablePendingPreview,
    });
  }
  return params.mediaKind === "photo"
    ? pickNativeMarketplacePhoto({
        source: params.source,
        selectionLimit: params.selectionLimit,
      })
    : pickNativeMarketplaceVideo({
        source: params.source,
      });
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
  if (!isPhoto) {
    const videoDurationMs = media.durationMs;
    if (typeof videoDurationMs !== "number" || !Number.isFinite(videoDurationMs) || videoDurationMs <= 0) {
      throw new Error("Marketplace video duration could not be read.");
    }
    if (videoDurationMs > MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs) {
      throw new Error("Marketplace video must be 15 seconds or shorter.");
    }
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

async function uploadPickedMarketplaceMedia(params: {
  media: PickedMarketplaceMedia;
  orgId: string;
  userId: string;
  role: MediaOwnerRole;
}): Promise<MarketplaceUploadedMedia> {
  const session = await createMarketplaceUploadSession({
    orgId: params.orgId,
    userId: params.userId,
    role: params.role,
    mediaKind: params.media.mediaKind,
    mimeType: params.media.mimeType,
    byteSize: params.media.byteSize,
  });

  await uploadSupabaseMediaObject({
    storageBucket: session.storageBucket,
    storageKey: session.storageKey,
    body: params.media.uploadBody,
    contentType: params.media.mimeType,
    upsert: false,
  });

  const { mediaAssetId } = await completeSupabaseMediaUploadSession({
    uploadSessionId: session.uploadSessionId,
    mimeType: params.media.mimeType,
    byteSize: params.media.byteSize,
    contentHash: params.media.contentHash,
    durationMs: params.media.durationMs ?? null,
    width: params.media.width ?? null,
    height: params.media.height ?? null,
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
    mediaKind: params.media.mediaKind,
    mimeType: params.media.mimeType,
    durationMs: params.media.durationMs,
    width: params.media.width,
    height: params.media.height,
  };
}

export async function uploadMarketplaceProductMedia(params: {
  userId: string;
  companyId: string | null;
  role: unknown;
  mediaKind: MediaKind;
  source: MarketplaceMediaSource;
  selectionLimit?: number;
  onPendingMediaPreview?: (items: {
    clientMediaId: string;
    mediaKind: MediaKind;
    publicUrl?: string | null;
    durationMs?: number;
    width?: number;
    height?: number;
  }[]) => void;
}): Promise<MarketplaceUploadedMedia | MarketplaceUploadedMedia[] | null> {
  const mediaItems = await pickMarketplaceMedia({
    mediaKind: params.mediaKind,
    source: params.source,
    selectionLimit: params.selectionLimit,
    enablePendingPreview: typeof params.onPendingMediaPreview === "function",
  });
  if (!mediaItems?.length) return null;
  mediaItems.forEach((media) => {
    if (media.mediaKind !== params.mediaKind) {
      throw new Error(`Marketplace media picker returned ${media.mediaKind} for ${params.mediaKind} button`);
    }
    assertMarketplaceMediaValid(media);
  });

  const orgId = String(params.companyId || params.userId || "").trim();
  const userId = String(params.userId || "").trim();
  if (!UUID_RE.test(orgId) || !UUID_RE.test(userId)) {
    throw new Error("Marketplace media upload requires valid owner ids");
  }
  const role = normalizeMarketplaceOwnerRole(params.role);
  params.onPendingMediaPreview?.(mediaItems.map((media) => ({
    clientMediaId: media.clientMediaId,
    mediaKind: media.mediaKind,
    publicUrl: media.pendingPreviewUrl ?? null,
    durationMs: media.durationMs,
    width: media.width,
    height: media.height,
  })));
  const uploaded = await mapBounded(mediaItems, MARKETPLACE_MEDIA_UPLOAD_CONCURRENCY, (media) =>
    uploadPickedMarketplaceMedia({
      media,
      orgId,
      userId,
      role,
    })
  );
  return uploaded.length === 1 ? uploaded[0] ?? null : uploaded;
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
