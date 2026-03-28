import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { createMemoryOfflineStorage } from "../src/lib/offline/offlineStorage";
import type { PlatformOfflineRetryTriggerSource } from "../src/lib/offline/platformOffline.model";
import {
  clearContractorProgressDraftStore,
  configureContractorProgressDraftStore,
  getContractorProgressDraft,
  hydrateContractorProgressDraftStore,
  patchContractorProgressDraftContext,
  setContractorProgressDraftFields,
  setContractorProgressDraftMaterials,
  useContractorProgressDraftStore,
  type ContractorProgressDraftMaterial,
} from "../src/screens/contractor/contractor.progressDraft.store";
import {
  clearContractorProgressQueue,
  configureContractorProgressQueue,
  enqueueContractorProgress,
  getContractorProgressPendingCount,
  getContractorProgressQueueEntry,
  loadContractorProgressQueue,
  markContractorProgressQueueInflight,
} from "../src/lib/offline/contractorProgressQueue";
import { flushContractorProgressQueue } from "../src/lib/offline/contractorProgressWorker";
import {
  getOfflineMutationTelemetryEvents,
  resetOfflineMutationTelemetryEvents,
  summarizeOfflineMutationTelemetryEvents,
} from "../src/lib/offline/mutation.telemetry";

type TestResult = {
  passed: boolean;
  details: Record<string, unknown>;
};

type FakeLogRow = {
  id: string;
  progress_id: string;
  qty: number;
  work_uom: string | null;
  stage_note: string | null;
  note: string | null;
};

type FakeServerState = {
  logs: FakeLogRow[];
  materialsByLogId: Map<string, ContractorProgressDraftMaterial[]>;
  failNextLogCount: number;
  failNextMaterialsCount: number;
  terminalMaterialsError: string | null;
  logInsertCount: number;
  materialsInsertCount: number;
  logSeq: number;
};

const artifactDir = path.join(process.cwd(), "artifacts");
const summaryPath = path.join(artifactDir, "contractor-reliability-wave1.summary.json");
const fullPath = path.join(artifactDir, "contractor-reliability-wave1.json");

const storage = createMemoryOfflineStorage();

configureContractorProgressDraftStore({ storage });
configureContractorProgressQueue({ storage });

let networkOnline = false;
const serverState: FakeServerState = {
  logs: [],
  materialsByLogId: new Map(),
  failNextLogCount: 0,
  failNextMaterialsCount: 0,
  terminalMaterialsError: null,
  logInsertCount: 0,
  materialsInsertCount: 0,
  logSeq: 0,
};

const makeProgressId = (suffix: string) => `11111111-1111-4111-8111-${suffix.padStart(12, "0")}`;

const createMaterial = (matCode: string, qtyFact: number): ContractorProgressDraftMaterial => ({
  id: null,
  materialId: null,
  matCode,
  name: `Материал ${matCode}`,
  uom: "шт",
  qty: qtyFact,
  qtyFact,
  price: null,
  available: null,
});

const pickFirstNonEmpty = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return null;
};

const createFakeSupabase = () => ({
  from(table: string) {
    if (table === "work_progress_log") {
      return {
        insert(payload: {
          progress_id: string;
          qty: number;
          work_uom: string | null;
          stage_note: string | null;
          note: string | null;
        }) {
          return {
            select() {
              return {
                async single() {
                  if (!networkOnline) {
                    return { data: null, error: { message: "offline" } };
                  }
                  if (serverState.failNextLogCount > 0) {
                    serverState.failNextLogCount -= 1;
                    return { data: null, error: { message: "temporary_network_failure" } };
                  }
                  serverState.logInsertCount += 1;
                  serverState.logSeq += 1;
                  const logId = `log-${serverState.logSeq}`;
                  serverState.logs.push({
                    id: logId,
                    progress_id: payload.progress_id,
                    qty: payload.qty,
                    work_uom: payload.work_uom,
                    stage_note: payload.stage_note,
                    note: payload.note,
                  });
                  return { data: { id: logId }, error: null };
                },
              };
            },
          };
        },
      };
    }

    if (table === "work_progress_log_materials") {
      return {
        select() {
          return {
            eq(_column: string, value: string) {
              return {
                async limit(limitCount: number) {
                  const rows = serverState.materialsByLogId.has(value)
                    ? [{ log_id: value }]
                    : [];
                  return {
                    data: rows.slice(0, limitCount),
                    error: null,
                  };
                },
              };
            },
          };
        },
        async insert(payload: {
          log_id: string;
          mat_code: string | null;
          uom_mat: string | null;
          qty_fact: number;
        }[]) {
          if (!networkOnline) {
            return { error: { message: "offline" } };
          }
          if (serverState.failNextMaterialsCount > 0) {
            serverState.failNextMaterialsCount -= 1;
            return { error: { message: "temporary_network_failure" } };
          }
          if (serverState.terminalMaterialsError) {
            return { error: { message: serverState.terminalMaterialsError } };
          }

          serverState.materialsInsertCount += 1;
          const firstLogId = String(payload[0]?.log_id ?? "").trim();
          serverState.materialsByLogId.set(
            firstLogId,
            payload.map((row) => ({
              id: null,
              materialId: null,
              matCode: row.mat_code,
              name: null,
              uom: row.uom_mat,
              qty: row.qty_fact,
              qtyFact: row.qty_fact,
              price: null,
              available: null,
            })),
          );
          return { error: null };
        },
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  },
});

const resetRuntimeStore = () => {
  useContractorProgressDraftStore.setState({
    hydrated: false,
    drafts: {},
  });
};

const resetEnvironment = async () => {
  networkOnline = false;
  serverState.logs = [];
  serverState.materialsByLogId.clear();
  serverState.failNextLogCount = 0;
  serverState.failNextMaterialsCount = 0;
  serverState.terminalMaterialsError = null;
  serverState.logInsertCount = 0;
  serverState.materialsInsertCount = 0;
  serverState.logSeq = 0;
  await clearContractorProgressQueue();
  await clearContractorProgressDraftStore();
  resetRuntimeStore();
  await hydrateContractorProgressDraftStore();
};

const simulateRestart = async () => {
  resetRuntimeStore();
  await hydrateContractorProgressDraftStore();
};

const seedDraft = async (progressId: string, overrides?: {
  stage?: string;
  comment?: string;
  location?: string;
  materials?: ContractorProgressDraftMaterial[];
}) => {
  await patchContractorProgressDraftContext(progressId, {
    workUom: "шт",
    rowObjectName: "Объект А",
    jobObjectName: "Объект А",
    workName: "Монтаж",
  });
  await setContractorProgressDraftFields(progressId, {
    selectedStage: overrides?.stage ?? "Этап 1",
    comment: overrides?.comment ?? "Локальный факт",
    location: overrides?.location ?? "Склад",
  });
  await setContractorProgressDraftMaterials(
    progressId,
    overrides?.materials ?? [createMaterial("MAT-1", 2)],
  );
};

const queueProgress = async (progressId: string) => {
  const draft = getContractorProgressDraft(progressId);
  await enqueueContractorProgress(progressId, {
    baseVersion: draft?.updatedAt != null ? String(draft.updatedAt) : null,
    serverVersionHint: draft?.pendingLogId ?? null,
  });
};

const flushQueue = async (
  triggerSource: PlatformOfflineRetryTriggerSource = "manual_retry",
) =>
  await flushContractorProgressQueue(
    {
      supabaseClient: createFakeSupabase(),
      pickFirstNonEmpty,
      refreshAfterSuccess: async () => {},
      getNetworkOnline: () => networkOnline,
    },
    triggerSource,
  );

const run = async () => {
  const tests: Record<string, TestResult> = {};
  resetOfflineMutationTelemetryEvents();

  await resetEnvironment();
  const offlineProgressId = makeProgressId("1");
  await seedDraft(offlineProgressId, {
    stage: "Подготовка",
    comment: "Черновик офлайн",
    location: "Секция 1",
    materials: [createMaterial("MAT-1", 2), createMaterial("MAT-2", 5)],
  });
  await simulateRestart();
  const restoredOfflineDraft = getContractorProgressDraft(offlineProgressId);
  tests.offline_draft = {
    passed:
      restoredOfflineDraft?.syncStatus === "dirty_local" &&
      restoredOfflineDraft.materials.length === 2 &&
      restoredOfflineDraft.fields.selectedStage === "Подготовка" &&
      restoredOfflineDraft.fields.comment === "Черновик офлайн" &&
      restoredOfflineDraft.fields.location === "Секция 1",
    details: {
      restoredStatus: restoredOfflineDraft?.syncStatus ?? null,
      restoredMaterialCount: restoredOfflineDraft?.materials.length ?? 0,
      restoredStage: restoredOfflineDraft?.fields.selectedStage ?? null,
      restoredComment: restoredOfflineDraft?.fields.comment ?? null,
      restoredLocation: restoredOfflineDraft?.fields.location ?? null,
    },
  };

  await resetEnvironment();
  const recoveryProgressId = makeProgressId("2");
  await seedDraft(recoveryProgressId);
  await queueProgress(recoveryProgressId);
  const offlineFlush = await flushQueue("manual_retry");
  const afterOfflineDraft = getContractorProgressDraft(recoveryProgressId);
  networkOnline = true;
  const recoveryFlush = await flushQueue("network_back");
  const afterRecoveryDraft = getContractorProgressDraft(recoveryProgressId);
  tests.online_recovery = {
    passed:
      offlineFlush.failed === true &&
      afterOfflineDraft?.syncStatus === "retry_wait" &&
      recoveryFlush.failed === false &&
      recoveryFlush.remainingCount === 0 &&
      afterRecoveryDraft?.syncStatus === "synced" &&
      serverState.logs.length === 1 &&
      serverState.materialsByLogId.size === 1,
    details: {
      offlineStatus: afterOfflineDraft?.syncStatus ?? null,
      recoveryStatus: afterRecoveryDraft?.syncStatus ?? null,
      remainingCount: recoveryFlush.remainingCount,
      logInsertCount: serverState.logInsertCount,
      materialsInsertCount: serverState.materialsInsertCount,
    },
  };

  await resetEnvironment();
  const restartProgressId = makeProgressId("3");
  await seedDraft(restartProgressId);
  await queueProgress(restartProgressId);
  const inflightEntry = await getContractorProgressQueueEntry(restartProgressId);
  if (inflightEntry) {
    await markContractorProgressQueueInflight(inflightEntry.id);
  }
  await simulateRestart();
  networkOnline = true;
  const queueBeforeFlush = await loadContractorProgressQueue();
  const restartFlush = await flushQueue("app_active");
  const afterRestartDraft = getContractorProgressDraft(restartProgressId);
  tests.kill_reopen = {
    passed:
      queueBeforeFlush.length === 1 &&
      queueBeforeFlush[0]?.status === "inflight" &&
      restartFlush.failed === false &&
      afterRestartDraft?.syncStatus === "synced" &&
      serverState.logs.length === 1,
    details: {
      queueLengthBeforeFlush: queueBeforeFlush.length,
      queueStatusBeforeFlush: queueBeforeFlush[0]?.status ?? null,
      finalStatus: afterRestartDraft?.syncStatus ?? null,
      logInsertCount: serverState.logInsertCount,
    },
  };

  await resetEnvironment();
  const retryProgressId = makeProgressId("4");
  await seedDraft(retryProgressId);
  await queueProgress(retryProgressId);
  networkOnline = true;
  serverState.failNextMaterialsCount = 1;
  const retryFail = await flushQueue("manual_retry");
  const draftAfterRetryFail = getContractorProgressDraft(retryProgressId);
  const retryQueueAfterFail = await loadContractorProgressQueue();
  const pendingLogIdAfterFail = draftAfterRetryFail?.pendingLogId ?? null;
  const retrySuccess = await flushQueue("manual_retry");
  const draftAfterRetrySuccess = getContractorProgressDraft(retryProgressId);
  tests.retry_path = {
    passed:
      retryFail.failed === true &&
      retryFail.failureClass === "retryable_sync_failure" &&
      draftAfterRetryFail?.syncStatus === "retry_wait" &&
      Boolean(pendingLogIdAfterFail) &&
      retryQueueAfterFail.length === 1 &&
      retrySuccess.failed === false &&
      draftAfterRetrySuccess?.syncStatus === "synced" &&
      serverState.logInsertCount === 1 &&
      serverState.materialsInsertCount === 1,
    details: {
      failedStatus: draftAfterRetryFail?.syncStatus ?? null,
      pendingLogIdAfterFail,
      queueLengthAfterFail: retryQueueAfterFail.length,
      finalStatus: draftAfterRetrySuccess?.syncStatus ?? null,
      logInsertCount: serverState.logInsertCount,
      materialsInsertCount: serverState.materialsInsertCount,
    },
  };

  await resetEnvironment();
  const coalescingProgressId = makeProgressId("5");
  await seedDraft(coalescingProgressId, { materials: [createMaterial("MAT-COAL", 1)] });
  await queueProgress(coalescingProgressId);
  await setContractorProgressDraftMaterials(coalescingProgressId, [createMaterial("MAT-COAL", 2)]);
  await queueProgress(coalescingProgressId);
  await setContractorProgressDraftMaterials(coalescingProgressId, [createMaterial("MAT-COAL", 3)]);
  await queueProgress(coalescingProgressId);
  await setContractorProgressDraftMaterials(coalescingProgressId, [createMaterial("MAT-COAL", 4)]);
  await queueProgress(coalescingProgressId);
  await setContractorProgressDraftMaterials(coalescingProgressId, [createMaterial("MAT-COAL", 5)]);
  await queueProgress(coalescingProgressId);
  const coalescedEntry = await getContractorProgressQueueEntry(coalescingProgressId);
  networkOnline = true;
  const coalescedFlush = await flushQueue("manual_retry");
  const coalescedDraft = getContractorProgressDraft(coalescingProgressId);
  const finalLogId = serverState.logs[0]?.id ?? "";
  const finalMaterials = serverState.materialsByLogId.get(finalLogId) ?? [];
  tests.coalescing = {
    passed:
      coalescedEntry?.coalescedCount === 4 &&
      coalescedFlush.failed === false &&
      coalescedDraft?.syncStatus === "synced" &&
      finalMaterials[0]?.qtyFact === 5 &&
      serverState.logInsertCount === 1 &&
      serverState.materialsInsertCount === 1,
    details: {
      coalescedCount: coalescedEntry?.coalescedCount ?? null,
      finalStatus: coalescedDraft?.syncStatus ?? null,
      finalQtyFact: finalMaterials[0]?.qtyFact ?? null,
      queueLengthAfterSync: await getContractorProgressPendingCount(coalescingProgressId),
      logInsertCount: serverState.logInsertCount,
      materialsInsertCount: serverState.materialsInsertCount,
    },
  };

  await resetEnvironment();
  const terminalProgressId = makeProgressId("6");
  await seedDraft(terminalProgressId);
  await queueProgress(terminalProgressId);
  networkOnline = true;
  serverState.terminalMaterialsError = "validation_conflict";
  const terminalFlush = await flushQueue("manual_retry");
  const terminalDraft = getContractorProgressDraft(terminalProgressId);
  const terminalQueue = await loadContractorProgressQueue();
  const terminalHistory = await loadContractorProgressQueue({ includeFinal: true });
  const terminalHistoryEntry =
    terminalHistory.find((entry) => entry.progressId === terminalProgressId) ?? null;
  tests.terminal_failure = {
    passed:
      terminalFlush.failed === true &&
      terminalFlush.failureClass === "conflicted" &&
      terminalDraft?.syncStatus === "failed_terminal" &&
      terminalDraft?.failureClass === "conflicted" &&
      terminalDraft?.lastErrorStage === "sync_materials" &&
      terminalQueue.length === 0 &&
      terminalHistoryEntry?.lifecycleStatus === "conflicted",
    details: {
      failureClass: terminalFlush.failureClass,
      finalStatus: terminalDraft?.syncStatus ?? null,
      finalFailureClass: terminalDraft?.failureClass ?? null,
      lastErrorStage: terminalDraft?.lastErrorStage ?? null,
      queueLength: terminalQueue.length,
      historyLifecycleStatus: terminalHistoryEntry?.lifecycleStatus ?? null,
      logInsertCount: serverState.logInsertCount,
      materialsInsertCount: serverState.materialsInsertCount,
    },
  };

  await resetEnvironment();
  const conflictProgressId = makeProgressId("7");
  await seedDraft(conflictProgressId);
  await queueProgress(conflictProgressId);
  networkOnline = true;
  serverState.terminalMaterialsError = "stale_progress_state";
  const conflictFlush = await flushQueue("manual_retry");
  const conflictDraft = getContractorProgressDraft(conflictProgressId);
  const conflictQueueActive = await loadContractorProgressQueue();
  const conflictQueueHistory = await loadContractorProgressQueue({ includeFinal: true });
  const conflictHistoryEntry =
    conflictQueueHistory.find((entry) => entry.progressId === conflictProgressId) ?? null;
  tests.conflict_state = {
    passed:
      conflictFlush.failed === true &&
      conflictFlush.failureClass === "conflicted" &&
      conflictDraft?.syncStatus === "failed_terminal" &&
      conflictDraft?.failureClass === "conflicted" &&
      conflictDraft?.conflictType === "stale_progress_state" &&
      conflictQueueActive.length === 0 &&
      conflictHistoryEntry?.lifecycleStatus === "conflicted",
    details: {
      failureClass: conflictFlush.failureClass,
      syncStatus: conflictDraft?.syncStatus ?? null,
      draftFailureClass: conflictDraft?.failureClass ?? null,
      conflictType: conflictDraft?.conflictType ?? null,
      activeQueueLength: conflictQueueActive.length,
      historyLifecycleStatus: conflictHistoryEntry?.lifecycleStatus ?? null,
    },
  };

  await resetEnvironment();
  const exhaustedProgressId = makeProgressId("8");
  await seedDraft(exhaustedProgressId);
  await queueProgress(exhaustedProgressId);
  networkOnline = true;
  serverState.failNextMaterialsCount = 8;
  const exhaustionAttempts = [];
  for (let index = 0; index < 5; index += 1) {
    exhaustionAttempts.push(await flushQueue("manual_retry"));
  }
  const exhaustedDraft = getContractorProgressDraft(exhaustedProgressId);
  const exhaustedQueueActive = await loadContractorProgressQueue();
  const exhaustedQueueHistory = await loadContractorProgressQueue({ includeFinal: true });
  const exhaustedHistoryEntry =
    exhaustedQueueHistory.find((entry) => entry.progressId === exhaustedProgressId) ?? null;
  tests.retry_exhaustion = {
    passed:
      exhaustionAttempts[0]?.failureClass === "retryable_sync_failure" &&
      exhaustionAttempts[4]?.failureClass === "failed_terminal" &&
      exhaustedDraft?.syncStatus === "failed_terminal" &&
      exhaustedDraft?.failureClass === "failed_terminal" &&
      exhaustedQueueActive.length === 0 &&
      exhaustedHistoryEntry?.lifecycleStatus === "failed_non_retryable",
    details: {
      failureClasses: exhaustionAttempts.map((entry) => entry.failureClass),
      finalStatus: exhaustedDraft?.syncStatus ?? null,
      finalFailureClass: exhaustedDraft?.failureClass ?? null,
      activeQueueLength: exhaustedQueueActive.length,
      historyLifecycleStatus: exhaustedHistoryEntry?.lifecycleStatus ?? null,
      retryCount: exhaustedDraft?.retryCount ?? null,
    },
  };

  const summary = {
    status: Object.values(tests).every((test) => test.passed) ? "passed" : "failed",
    mutationTelemetry: summarizeOfflineMutationTelemetryEvents(),
    ...tests,
  };

  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(
    fullPath,
    JSON.stringify(
      {
        ...summary,
        logs: serverState.logs,
        materialsByLogId: Object.fromEntries(serverState.materialsByLogId.entries()),
        mutationTelemetryEvents: getOfflineMutationTelemetryEvents(),
        storage: storage.dump(),
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
};

void run();
