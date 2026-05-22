export type GlobalEstimateSourceRefreshMode =
  | "manual_admin_refresh"
  | "scheduled_refresh"
  | "stale_while_revalidate"
  | "internal_marketplace_sync";

export type GlobalEstimateSourceRefreshJob = {
  id: string;
  sourceId: string;
  mode: GlobalEstimateSourceRefreshMode;
  status: "queued" | "cache_written" | "failed" | "pending_admin_approval";
  blocksUserEstimate: false;
  writesActiveRateDirectly: false;
  failureDeletesOldRates: false;
};

export function enqueueGlobalEstimateSourceRefresh(input: {
  sourceId: string;
  mode: GlobalEstimateSourceRefreshMode;
}): GlobalEstimateSourceRefreshJob {
  return {
    id: `gesource_refresh_${input.sourceId}_${Date.now().toString(36)}`,
    sourceId: input.sourceId,
    mode: input.mode,
    status: "queued",
    blocksUserEstimate: false,
    writesActiveRateDirectly: false,
    failureDeletesOldRates: false,
  };
}

export function markGlobalEstimateSourceRefreshCacheWritten(
  job: GlobalEstimateSourceRefreshJob,
): GlobalEstimateSourceRefreshJob {
  return {
    ...job,
    status: "pending_admin_approval",
    blocksUserEstimate: false,
    writesActiveRateDirectly: false,
    failureDeletesOldRates: false,
  };
}
