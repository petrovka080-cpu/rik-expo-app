import type { GlobalSourceRefreshQueueItem } from "./globalExternalSourceTypes";

export function queueGlobalEstimateSourceRefresh(input: {
  normalizedKey: string;
  detectedCategory: string;
  originalText: string;
  reason: GlobalSourceRefreshQueueItem["reason"];
}): GlobalSourceRefreshQueueItem {
  return {
    id: `source_refresh_${input.normalizedKey}_${input.reason}`.replace(/[^a-z0-9_]+/gi, "_"),
    normalizedKey: input.normalizedKey,
    detectedCategory: input.detectedCategory,
    originalText: input.originalText,
    reason: input.reason,
    status: "queued",
    createdAt: "2026-05-23T00:00:00+06:00",
  };
}

export function missingRateQueuesRefresh(input: {
  normalizedKey: string;
  detectedCategory: string;
  originalText: string;
}): GlobalSourceRefreshQueueItem {
  return queueGlobalEstimateSourceRefresh({ ...input, reason: "missing_rate" });
}
