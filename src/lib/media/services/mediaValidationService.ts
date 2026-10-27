import { MEDIA_LIMITS } from "../mediaLimits";
import type { MediaUploadDescriptor, MediaValidationResult } from "../mediaTypes";

export type MediaMetadataSanitizerResult = {
  safeMetadata: Record<string, string | number | boolean>;
  removedKeys: string[];
  containsSensitiveInfo: boolean;
};

const BLOCKED_METADATA_KEYS = new Set(["gps", "location", "latitude", "longitude", "deviceId", "ownerName"]);

function isSupportedMime(descriptor: MediaUploadDescriptor): boolean {
  if (descriptor.mediaKind === "photo") return descriptor.mimeType.startsWith("image/");
  return descriptor.mimeType.startsWith("video/");
}

export function validateMediaUploadGroup(descriptors: readonly MediaUploadDescriptor[]): MediaValidationResult {
  const accepted: MediaUploadDescriptor[] = [];
  const rejected: MediaValidationResult["rejected"] = [];
  let photos = 0;
  let videos = 0;

  for (const descriptor of descriptors) {
    const nextPhotos = photos + (descriptor.mediaKind === "photo" ? 1 : 0);
    const nextVideos = videos + (descriptor.mediaKind === "video" ? 1 : 0);
    const nextTotal = accepted.length + 1;
    const sizeLimit =
      descriptor.mediaKind === "photo" ? MEDIA_LIMITS.maxPhotoUploadBytes : MEDIA_LIMITS.maxVideoUploadBytes;

    let reasonRu: string | null = null;
    if (!isSupportedMime(descriptor)) {
      reasonRu = "Неподдерживаемый тип файла.";
    } else if (descriptor.byteSize > sizeLimit) {
      reasonRu = "Файл превышает допустимый размер.";
    } else if (nextPhotos > MEDIA_LIMITS.maxPhotosPerGroup) {
      reasonRu = "Можно добавить не больше 5 фото в одну группу.";
    } else if (nextVideos > MEDIA_LIMITS.maxVideosPerGroup) {
      reasonRu = "Можно добавить не больше 1 видео в одну группу.";
    } else if (nextTotal > MEDIA_LIMITS.maxMediaGroupAssets) {
      reasonRu = "В группе может быть не больше 6 медиафайлов.";
    } else if (
      descriptor.mediaKind === "video" &&
      (descriptor.durationMs ?? 0) > MEDIA_LIMITS.maxVideoDurationMs
    ) {
      reasonRu = "Видео должно быть не длиннее 15 секунд.";
    }

    if (reasonRu) {
      rejected.push({ descriptor, reasonRu });
      continue;
    }

    accepted.push(descriptor);
    photos = nextPhotos;
    videos = nextVideos;
  }

  return {
    passed: rejected.length === 0,
    accepted,
    rejected,
    groupCounts: {
      photos,
      videos,
      total: accepted.length,
    },
  };
}

export function assertMediaUploadGroupIsValid(descriptors: readonly MediaUploadDescriptor[]): void {
  const validation = validateMediaUploadGroup(descriptors);
  if (!validation.passed) {
    throw new Error(validation.rejected.map((item) => item.reasonRu).join("; "));
  }
}

export function sanitizeMediaMetadata(metadata: Record<string, unknown>): MediaMetadataSanitizerResult {
  const safeMetadata: Record<string, string | number | boolean> = {};
  const removedKeys: string[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (BLOCKED_METADATA_KEYS.has(key) || /gps|location|latitude|longitude|device|owner/i.test(key)) {
      removedKeys.push(key);
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safeMetadata[key] = value;
    } else {
      removedKeys.push(key);
    }
  }

  return {
    safeMetadata,
    removedKeys,
    containsSensitiveInfo: removedKeys.length > 0,
  };
}
