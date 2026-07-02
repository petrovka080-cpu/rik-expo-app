export const MEDIA_LIMITS = {
  maxPhotosPerGroup: 5,
  maxVideosPerGroup: 1,
  maxVideoDurationMs: 15_000,
  recommendedVideoDurationMs: 10_000,
  maxPhotoUploadBytes: 8 * 1024 * 1024,
  maxVideoUploadBytes: 60 * 1024 * 1024,
  maxAnalysisFramesPerVideo: 5,
  maxMediaGroupAssets: 6,
} as const;

export type MediaLimits = typeof MEDIA_LIMITS;

export const MARKET_ADD_MEDIA_LIMITS = {
  maxPhotos: 7,
  maxVideos: MEDIA_LIMITS.maxVideosPerGroup,
  maxVideoDurationMs: MEDIA_LIMITS.maxVideoDurationMs,
  maxPhotoBytes: MEDIA_LIMITS.maxPhotoUploadBytes,
  maxVideoBytes: 50 * 1024 * 1024,
  allowedPhotoMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedVideoMimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
} as const;

export type MarketAddMediaLimits = typeof MARKET_ADD_MEDIA_LIMITS;
