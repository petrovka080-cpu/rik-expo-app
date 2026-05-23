import { assertGlobalExternalSourceConnectorReady } from "./globalExternalSourceConnector";
import type { GlobalExternalSourceRun } from "./globalExternalSourceTypes";

const CHECKED_AT = "2026-05-22T00:00:00+06:00";

export function runGlobalExternalSourceFetch(connectorId: string): GlobalExternalSourceRun {
  const connector = assertGlobalExternalSourceConnectorReady(connectorId);
  return {
    id: `source_run_${connector.id.replace(/[^a-z0-9]+/gi, "_")}_${CHECKED_AT.slice(0, 10)}`,
    connectorId: connector.id,
    startedAt: CHECKED_AT,
    finishedAt: CHECKED_AT,
    status: "success",
    observationsCount: 1,
  };
}

export function shouldBlockEstimateForSourceFetch(): false {
  return false;
}
