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
