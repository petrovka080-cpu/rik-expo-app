import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getOfflineMutationRetryPolicy } from "../src/lib/offline/mutation.retryPolicy";

type JsonRecord = Record<string, unknown>;

const artifactDir = path.join(process.cwd(), "artifacts");

const readJson = <T,>(filename: string): T => {
  const fullPath = path.join(artifactDir, filename);
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
};

const writeArtifact = (filename: string, value: unknown) => {
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(path.join(artifactDir, filename), JSON.stringify(value, null, 2), "utf8");
};

const foremanSummary = readJson<JsonRecord>("foreman-field-reliability.summary.json");
const foremanFull = readJson<JsonRecord>("foreman-field-reliability.json");
const contractorSummary = readJson<JsonRecord>("contractor-reliability-wave1.summary.json");
const contractorFull = readJson<JsonRecord>("contractor-reliability-wave1.json");

const foremanRuntimeSummaryPath = path.join(artifactDir, "foreman-request-sync-runtime.summary.json");
const contractorRuntimeSummaryPath = path.join(artifactDir, "contractor-runtime.summary.json");

const safeReadOptionalJson = (fullPath: string): JsonRecord | null => {
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as JsonRecord;
  } catch {
    return null;
  }
};

const foremanRuntime = safeReadOptionalJson(foremanRuntimeSummaryPath);
const contractorRuntime = safeReadOptionalJson(contractorRuntimeSummaryPath);

const foremanPolicy = getOfflineMutationRetryPolicy("foreman_default");
const contractorPolicy = getOfflineMutationRetryPolicy("contractor_default");

const foremanTests = {
  onlineRecovery: foremanSummary.first_sync_concurrent_mutation,
  retryAfterFlakyNetwork: foremanSummary.retry_after_flaky_network,
  retryExhaustion: foremanSummary.retry_exhaustion,
  serverTerminalConflict: foremanSummary.server_terminal_conflict,
  validationConflict: foremanSummary.validation_conflict,
  rehydrateFromServer: foremanSummary.rehydrate_from_server,
  restoreLocalAfterConflict: foremanSummary.restore_local_after_conflict,
};

const contractorTests = {
  onlineRecovery: contractorSummary.online_recovery,
  retryPath: contractorSummary.retry_path,
  retryExhaustion: contractorSummary.retry_exhaustion,
  terminalFailure: contractorSummary.terminal_failure,
  conflictState: contractorSummary.conflict_state,
  coalescing: contractorSummary.coalescing,
};

const foremanArtifact = {
  owner: "foreman",
  mutationTypesInScope: ["background_sync", "qty_update", "catalog_add", "submit", "whole_cancel"],
  statusModel: [
    "queued",
    "processing",
    "succeeded",
    "retry_scheduled",
    "conflicted",
    "failed_non_retryable",
    "discarded_by_policy",
  ],
  retryPolicy: foremanPolicy,
  conflictPolicy: {
    classifiedConflictTypes: [
      "server_terminal_conflict",
      "validation_conflict",
      "stale_local_snapshot",
      "remote_divergence_requires_attention",
    ],
    retryableConflictType: "retryable_sync_failure",
    queueKeepsConflictHistory: true,
    silentOverwrite: false,
  },
  dedupeStrategy: {
    scope: "draftKey + mutationKind + snapshotUpdatedAt + submitRequested",
    coalescing: "same draft keeps latest snapshot, duplicate dedupeKey suppressed",
  },
  smoke: foremanTests,
  runtime: foremanRuntime,
  mutationTelemetry: foremanFull.mutationTelemetry ?? null,
  mutationTelemetryEvents: foremanFull.mutationTelemetryEvents ?? [],
  status: foremanSummary.status === "passed" ? "GREEN" : "NOT GREEN",
};

const contractorArtifact = {
  owner: "contractor",
  mutationTypesInScope: ["progress_submit"],
  statusModel: [
    "queued",
    "processing",
    "succeeded",
    "retry_scheduled",
    "conflicted",
    "failed_non_retryable",
    "discarded_by_policy",
  ],
  retryPolicy: contractorPolicy,
  conflictPolicy: {
    classifiedConflictTypes: [
      "server_terminal_conflict",
      "validation_conflict",
      "stale_progress_state",
      "remote_divergence_requires_attention",
    ],
    queueKeepsConflictHistory: true,
    activeQueueIgnoresFinalHistory: true,
    silentOverwrite: false,
  },
  dedupeStrategy: {
    scope: "progressId + draft.updatedAt + pendingLogId",
    coalescing: "same progress reuses single active queue entry, duplicate dedupeKey suppressed",
  },
  smoke: contractorTests,
  runtime: contractorRuntime,
  mutationTelemetry: contractorFull.mutationTelemetry ?? null,
  mutationTelemetryEvents: contractorFull.mutationTelemetryEvents ?? [],
  status: contractorSummary.status === "passed" ? "GREEN" : "NOT GREEN",
};

const combinedEvents = [
  ...((foremanFull.mutationTelemetryEvents as JsonRecord[] | undefined) ?? []),
  ...((contractorFull.mutationTelemetryEvents as JsonRecord[] | undefined) ?? []),
].sort((left, right) => Number(left.at ?? 0) - Number(right.at ?? 0));

const retryLogLines = combinedEvents
  .filter((event) =>
    ["retry_scheduled", "retry_exhausted", "processing_started", "inflight_restored"].includes(
      String(event.action ?? ""),
    ),
  )
  .map(
    (event) =>
      [
        String(event.owner ?? "unknown"),
        String(event.entityId ?? "unknown"),
        String(event.action ?? "unknown"),
        `attempt=${String(event.attemptCount ?? "0")}`,
        `retry=${String(event.retryCount ?? "0")}`,
        `status=${String(event.lifecycleStatus ?? "unknown")}`,
        `error=${String(event.errorKind ?? "none")}`,
        `nextRetryAt=${String(event.nextRetryAt ?? "null")}`,
      ].join(" | "),
  );

const conflictCases = {
  foreman: {
    serverTerminal: foremanSummary.server_terminal_conflict,
    validation: foremanSummary.validation_conflict,
    remoteRehydrate: foremanSummary.rehydrate_from_server,
    restoreLocal: foremanSummary.restore_local_after_conflict,
    retryExhaustion: foremanSummary.retry_exhaustion,
  },
  contractor: {
    terminalValidation: contractorSummary.terminal_failure,
    staleState: contractorSummary.conflict_state,
    retryExhaustion: contractorSummary.retry_exhaustion,
  },
};

const runtimeSmoke = {
  gateMode: "informational",
  foremanRequestSync: foremanRuntime?.status ?? null,
  contractorRuntime: contractorRuntime?.status ?? null,
};

const summary = {
  scope: "Offline Reliability Hardening - Conflict Resolution Wave 1 (Foreman + Contractor)",
  statusModel: contractorArtifact.statusModel,
  foreman: {
    status: foremanArtifact.status,
    retryPolicy: foremanPolicy,
    conflictGate: foremanSummary.server_terminal_conflict,
    retryGate: foremanSummary.retry_exhaustion,
  },
  contractor: {
    status: contractorArtifact.status,
    retryPolicy: contractorPolicy,
    conflictGate: contractorSummary.conflict_state,
    retryGate: contractorSummary.retry_exhaustion,
  },
  runtimeSmoke,
  nonBlockingChecks: {
    foremanRequestSync:
      foremanRuntime == null || String(foremanRuntime.status) === "passed"
        ? "clean"
        : "outside_offline_scope",
    contractorRuntime:
      contractorRuntime == null || String(contractorRuntime.status) === "passed"
        ? "clean"
        : "outside_offline_scope",
  },
  dedupeStrategy: {
    foreman: foremanArtifact.dedupeStrategy,
    contractor: contractorArtifact.dedupeStrategy,
  },
  overallStatus:
    foremanArtifact.status === "GREEN" &&
    contractorArtifact.status === "GREEN"
      ? "GREEN"
      : "NOT GREEN",
};

writeArtifact("offline-conflict-wave1-summary.json", summary);
writeArtifact("offline-conflict-wave1-foreman.json", foremanArtifact);
writeArtifact("offline-conflict-wave1-contractor.json", contractorArtifact);
writeArtifact("offline-conflict-wave1-conflict-cases.json", conflictCases);
writeFileSync(
  path.join(artifactDir, "offline-conflict-wave1-retry-log.txt"),
  retryLogLines.join("\n"),
  "utf8",
);

console.log(JSON.stringify(summary, null, 2));

if (summary.overallStatus !== "GREEN") {
  process.exitCode = 1;
}
