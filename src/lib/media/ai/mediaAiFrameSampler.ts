import { MEDIA_LIMITS } from "../mediaLimits";

export type MediaAiSampledFrame = {
  frameIndex: number;
  timestampMs: number;
  summaryRu: string;
};

export function sampleMediaVideoFrames(input: {
  durationMs: number;
  maxFrames?: number;
}): MediaAiSampledFrame[] {
  const maxFrames = Math.min(input.maxFrames ?? MEDIA_LIMITS.maxAnalysisFramesPerVideo, MEDIA_LIMITS.maxAnalysisFramesPerVideo);
  const duration = Math.min(input.durationMs, MEDIA_LIMITS.maxVideoDurationMs);
  if (duration <= 0) return [];

  return Array.from({ length: maxFrames }, (_, index) => {
    const timestampMs = Math.round((duration * index) / Math.max(maxFrames - 1, 1));
    return {
      frameIndex: index,
      timestampMs,
      summaryRu: "Кадр выбран для безопасного AI-анализа без финального вывода.",
    };
  });
}
