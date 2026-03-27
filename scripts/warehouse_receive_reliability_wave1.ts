import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { createMemoryOfflineStorage } from "../src/lib/offline/offlineStorage";
import type { PlatformOfflineRetryTriggerSource } from "../src/lib/offline/platformOffline.model";
import {
  clearWarehouseReceiveDraftStore,
  configureWarehouseReceiveDraftStore,
  getWarehouseReceiveDraft,
  hydrateWarehouseReceiveDraftStore,
  markWarehouseReceiveDraftQueued,
  setWarehouseReceiveDraftItems,
  useWarehouseReceiveDraftStore,
  type WarehouseReceiveDraftItem,
} from "../src/screens/warehouse/warehouse.receiveDraft.store";
import {
  clearWarehouseReceiveQueue,
  configureWarehouseReceiveQueue,
  enqueueWarehouseReceive,
  getWarehouseReceivePendingCount,
  getWarehouseReceiveQueueEntry,
  loadWarehouseReceiveQueue,
  markWarehouseReceiveQueueInflight,
} from "../src/screens/warehouse/warehouseReceiveQueue";
import { flushWarehouseReceiveQueue } from "../src/screens/warehouse/warehouseReceiveWorker";

type TestResult = {
  passed: boolean;
  details: Record<string, unknown>;
};

type AppliedSnapshot = {
  incomingId: string;
  items: { purchase_item_id: string; qty: number }[];
};

const artifactDir = path.join(process.cwd(), "artifacts");
const summaryPath = path.join(artifactDir, "warehouse-receive-wave1.summary.json");
const fullPath = path.join(artifactDir, "warehouse-receive-wave1.json");

const storage = createMemoryOfflineStorage();

configureWarehouseReceiveDraftStore({ storage });
configureWarehouseReceiveQueue({ storage });

let networkOnline = false;
let failNextApplyCount = 0;
const appliedSnapshots: AppliedSnapshot[] = [];
const serverState = new Map<string, { purchase_item_id: string; qty: number }[]>();

const createItem = (itemId: string, qty: number): WarehouseReceiveDraftItem => ({
  itemId,
  qty,
  localUpdatedAt: Date.now(),
});

const setDraft = async (incomingId: string, items: WarehouseReceiveDraftItem[]) => {
  await setWarehouseReceiveDraftItems(incomingId, items);
};

const queueDraft = async (incomingId: string) => {
  await enqueueWarehouseReceive(incomingId);
  await markWarehouseReceiveDraftQueued(incomingId, await getWarehouseReceivePendingCount(incomingId));
};

const flushQueue = async (
  triggerSource: PlatformOfflineRetryTriggerSource = "manual_retry",
) =>
  await flushWarehouseReceiveQueue(
    {
      getWarehousemanFio: () => "Warehouse Tester",
      applyReceive: async ({ incomingId, items }) => {
        if (!networkOnline) {
          throw new Error("offline");
        }

        if (failNextApplyCount > 0) {
          failNextApplyCount -= 1;
          throw new Error("flaky_network");
        }

        const snapshot = items.map((item) => ({
          purchase_item_id: String(item.purchase_item_id),
          qty: Number(item.qty),
        }));
        appliedSnapshots.push({
          incomingId,
          items: snapshot,
        });
        serverState.set(incomingId, snapshot);

        return {
          data: {
            ok: snapshot.length,
            fail: 0,
            left_after: 0,
          },
          error: null,
        };
      },
      refreshAfterSuccess: async () => {},
      getNetworkOnline: () => networkOnline,
    },
    triggerSource,
  );

const resetRuntimeStore = () => {
  useWarehouseReceiveDraftStore.setState({
    hydrated: false,
    drafts: {},
  });
};

const resetEnvironment = async () => {
  networkOnline = false;
  failNextApplyCount = 0;
  appliedSnapshots.length = 0;
  serverState.clear();
  await clearWarehouseReceiveQueue();
  await clearWarehouseReceiveDraftStore();
  resetRuntimeStore();
  await hydrateWarehouseReceiveDraftStore();
};

const simulateRestart = async () => {
  resetRuntimeStore();
  await hydrateWarehouseReceiveDraftStore();
};

const run = async () => {
  const tests: Record<string, TestResult> = {};

  await resetEnvironment();
  await setDraft("incoming-offline", [createItem("pi-1", 3), createItem("pi-2", 5)]);
  await simulateRestart();
  const restoredOfflineDraft = getWarehouseReceiveDraft("incoming-offline");
  tests.offline_receive = {
    passed:
      restoredOfflineDraft?.status === "dirty_local" &&
      restoredOfflineDraft.items.length === 2 &&
      restoredOfflineDraft.items[0]?.qty === 3 &&
      restoredOfflineDraft.items[1]?.qty === 5 &&
      (await getWarehouseReceivePendingCount("incoming-offline")) === 0,
    details: {
      restoredStatus: restoredOfflineDraft?.status ?? null,
      restoredItemCount: restoredOfflineDraft?.items.length ?? 0,
      restoredQtys: restoredOfflineDraft?.items.map((item) => item.qty) ?? [],
      pendingCount: await getWarehouseReceivePendingCount("incoming-offline"),
      submitSemantics: "explicit_manual_submit",
    },
  };

  await resetEnvironment();
  await setDraft("incoming-online", [createItem("pi-10", 2), createItem("pi-11", 4)]);
  await queueDraft("incoming-online");
  const offlineFlush = await flushQueue("manual_retry");
  const afterOfflineAttempt = getWarehouseReceiveDraft("incoming-online");
  networkOnline = true;
  const onlineFlush = await flushQueue("network_back");
  const afterOnlineSync = getWarehouseReceiveDraft("incoming-online");
  tests.online_sync = {
    passed:
      offlineFlush.failed === true &&
      afterOfflineAttempt?.status === "retry_wait" &&
      onlineFlush.failed === false &&
      onlineFlush.remainingCount === 0 &&
      afterOnlineSync?.status === "synced" &&
      (afterOnlineSync?.items.length ?? 0) === 0 &&
      (serverState.get("incoming-online")?.length ?? 0) === 2,
    details: {
      offlineStatus: afterOfflineAttempt?.status ?? null,
      onlineStatus: afterOnlineSync?.status ?? null,
      remainingCount: onlineFlush.remainingCount,
      syncedCount: serverState.get("incoming-online")?.length ?? 0,
      lastSyncAt: afterOnlineSync?.lastSyncAt ?? null,
    },
  };

  await resetEnvironment();
  await setDraft("incoming-restart", [createItem("pi-20", 7)]);
  await queueDraft("incoming-restart");
  const inflightEntry = await getWarehouseReceiveQueueEntry("incoming-restart");
  if (inflightEntry) {
    await markWarehouseReceiveQueueInflight(inflightEntry.id);
  }
  await simulateRestart();
  networkOnline = true;
  const afterRestartBeforeFlush = await loadWarehouseReceiveQueue();
  const restartFlush = await flushQueue("app_active");
  const afterRestartDraft = getWarehouseReceiveDraft("incoming-restart");
  tests.kill_reopen = {
    passed:
      afterRestartBeforeFlush.length === 1 &&
      restartFlush.failed === false &&
      restartFlush.remainingCount === 0 &&
      afterRestartDraft?.status === "synced" &&
      (serverState.get("incoming-restart")?.[0]?.qty ?? 0) === 7,
    details: {
      queueLengthBeforeFlush: afterRestartBeforeFlush.length,
      queueStatusBeforeFlush: afterRestartBeforeFlush[0]?.status ?? null,
      finalStatus: afterRestartDraft?.status ?? null,
      syncedQty: serverState.get("incoming-restart")?.[0]?.qty ?? null,
    },
  };

  await resetEnvironment();
  await setDraft("incoming-retry", [createItem("pi-30", 9)]);
  await queueDraft("incoming-retry");
  networkOnline = true;
  failNextApplyCount = 1;
  const retryFail = await flushQueue("manual_retry");
  const retryQueueAfterFail = await loadWarehouseReceiveQueue();
  const retryDraftAfterFail = getWarehouseReceiveDraft("incoming-retry");
  const retrySuccess = await flushQueue("manual_retry");
  const retryDraftAfterSuccess = getWarehouseReceiveDraft("incoming-retry");
  tests.retry = {
    passed:
      retryFail.failed === true &&
      retryDraftAfterFail?.status === "retry_wait" &&
      retryQueueAfterFail.length === 1 &&
      retrySuccess.failed === false &&
      retryDraftAfterSuccess?.status === "synced" &&
      appliedSnapshots.filter((entry) => entry.incomingId === "incoming-retry").length === 1,
    details: {
      failedStatus: retryDraftAfterFail?.status ?? null,
      queueLengthAfterFail: retryQueueAfterFail.length,
      finalStatus: retryDraftAfterSuccess?.status ?? null,
      applyCount: appliedSnapshots.filter((entry) => entry.incomingId === "incoming-retry").length,
      finalQty: serverState.get("incoming-retry")?.[0]?.qty ?? null,
    },
  };

  await resetEnvironment();
  await setDraft("incoming-coalesce", [createItem("pi-40", 1)]);
  await queueDraft("incoming-coalesce");
  await setDraft("incoming-coalesce", [createItem("pi-40", 2)]);
  await queueDraft("incoming-coalesce");
  await setDraft("incoming-coalesce", [createItem("pi-40", 3)]);
  await queueDraft("incoming-coalesce");
  await setDraft("incoming-coalesce", [createItem("pi-40", 4)]);
  await queueDraft("incoming-coalesce");
  await setDraft("incoming-coalesce", [createItem("pi-40", 5)]);
  await queueDraft("incoming-coalesce");
  const coalescedEntry = await getWarehouseReceiveQueueEntry("incoming-coalesce");
  networkOnline = true;
  const coalescedFlush = await flushQueue("manual_retry");
  const coalescedDraft = getWarehouseReceiveDraft("incoming-coalesce");
  tests.coalescing = {
    passed:
      coalescedEntry?.coalescedCount === 4 &&
      (await getWarehouseReceivePendingCount("incoming-coalesce")) === 0 &&
      coalescedFlush.failed === false &&
      coalescedDraft?.status === "synced" &&
      (serverState.get("incoming-coalesce")?.[0]?.qty ?? 0) === 5 &&
      appliedSnapshots.filter((entry) => entry.incomingId === "incoming-coalesce").length === 1,
    details: {
      queueEntryPresent: Boolean(coalescedEntry),
      coalescedCount: coalescedEntry?.coalescedCount ?? null,
      finalStatus: coalescedDraft?.status ?? null,
      finalQty: serverState.get("incoming-coalesce")?.[0]?.qty ?? null,
      applyCount: appliedSnapshots.filter((entry) => entry.incomingId === "incoming-coalesce").length,
    },
  };

  const summary = {
    status: Object.values(tests).every((test) => test.passed) ? "passed" : "failed",
    explicitSubmitSemantics: true,
    ...tests,
  };

  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  writeFileSync(
    fullPath,
    JSON.stringify(
      {
        ...summary,
        appliedSnapshots,
        serverState: Object.fromEntries(serverState.entries()),
        storage: storage.dump(),
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
};

void run();
