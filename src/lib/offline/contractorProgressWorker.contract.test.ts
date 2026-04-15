import { createMemoryOfflineStorage } from "./offlineStorage";
import {
  clearContractorProgressQueue,
  configureContractorProgressQueue,
  enqueueContractorProgress,
  loadContractorProgressQueue,
} from "./contractorProgressQueue";
import {
  flushContractorProgressQueue,
  CONTRACTOR_PROGRESS_REPLAY_POLICY,
} from "./contractorProgressWorker";
import { resetOfflineReplayCoordinatorForTests } from "./offlineReplayCoordinator";
import {
  clearContractorProgressDraftStore,
  clearContractorProgressDraftForProgress,
  configureContractorProgressDraftStore,
  getContractorProgressDraft,
  patchContractorProgressDraftContext,
  setContractorProgressDraftFields,
  setContractorProgressDraftMaterials,
} from "../../screens/contractor/contractor.progressDraft.store";
import { clearContractorProgressLocalRecovery } from "../../screens/contractor/contractor.terminalRecovery";

const mockEnsureWorkProgressSubmission = jest.fn();

jest.mock("../../screens/contractor/contractor.progressService", () => ({
  buildWorkProgressMaterialsPayload: jest.fn((materials) => materials),
  buildWorkProgressNote: jest.fn((location, comment) =>
    [location, comment].filter(Boolean).join(" "),
  ),
  ensureWorkProgressSubmission: (...args: unknown[]) =>
    mockEnsureWorkProgressSubmission(...args),
}));

const waitUntil = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(message);
};

const createDeferred = <T,>() => {
  let resolveValue!: (value: T) => void;
  let rejectValue!: (error: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });

  return {
    promise,
    resolve: resolveValue,
    reject: rejectValue,
  };
};

const seedProgressDraft = async (progressId = "progress-1") => {
  await patchContractorProgressDraftContext(progressId, {
    workUom: "m2",
    rowObjectName: "Runtime Object",
    jobObjectName: null,
    workName: "Runtime Work",
  });
  await setContractorProgressDraftFields(progressId, {
    selectedStage: "done",
    comment: "offline replay",
    location: "floor 1",
    qtyDone: 1,
  });
  await setContractorProgressDraftMaterials(progressId, [
    {
      id: "mat-row-1",
      materialId: "material-1",
      matCode: "MAT-1",
      name: "Material 1",
      uom: "pcs",
      qty: 1,
      qtyFact: 1,
      price: null,
      available: null,
    },
  ]);
  await enqueueContractorProgress(progressId, {
    baseVersion: "1",
  });
};

describe("contractorProgressWorker replay discipline", () => {
  beforeEach(async () => {
    resetOfflineReplayCoordinatorForTests();
    configureContractorProgressQueue({ storage: createMemoryOfflineStorage() });
    configureContractorProgressDraftStore({ storage: createMemoryOfflineStorage() });
    mockEnsureWorkProgressSubmission.mockReset();
    await clearContractorProgressQueue();
    await clearContractorProgressDraftStore();
  });

  it("declares a serial FIFO replay policy owned by the worker", () => {
    expect(CONTRACTOR_PROGRESS_REPLAY_POLICY).toMatchObject({
      queueKey: "contractor_progress",
      owner: "contractor_progress_worker",
      concurrencyLimit: 1,
      ordering: "created_at_fifo",
      backpressure: "coalesce_triggers_and_rerun_once",
    });
  });

  it("does not run parallel submits when reconnect and manual retry collide", async () => {
    await seedProgressDraft();

    const deferred = createDeferred<{
      ok: true;
      logId: string;
    }>();
    let active = 0;
    let maxActive = 0;
    mockEnsureWorkProgressSubmission.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      try {
        return await deferred.promise;
      } finally {
        active -= 1;
      }
    });

    const deps = {
      supabaseClient: {},
      pickFirstNonEmpty: (...values: unknown[]) =>
        values.map((value) => String(value ?? "").trim()).find(Boolean) ?? null,
      getNetworkOnline: () => true,
    };

    const first = flushContractorProgressQueue(deps, "network_back");
    const second = flushContractorProgressQueue(deps, "manual_retry");

    await waitUntil(
      () => mockEnsureWorkProgressSubmission.mock.calls.length === 1,
      "progress submit did not start",
    );
    expect(mockEnsureWorkProgressSubmission).toHaveBeenCalledTimes(1);

    deferred.resolve({ ok: true, logId: "log-1" });
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.failed).toBe(false);
    expect(secondResult.failed).toBe(false);
    expect(maxActive).toBe(1);
    expect(await loadContractorProgressQueue()).toEqual([]);
    expect(getContractorProgressDraft("progress-1")?.syncStatus).toBe("synced");
  });

  it("cleanup removes progress draft and queue entry for terminal work", async () => {
    await seedProgressDraft("progress-terminal");

    const result = await clearContractorProgressLocalRecovery("progress-terminal");

    expect(result).toMatchObject({
      kind: "contractor_progress",
      entityId: "progress-terminal",
      cleared: true,
      clearedOwners: [
        "contractor_progress_queue_v2",
        "contractor_progress_draft_store_v2",
      ],
    });
    expect(getContractorProgressDraft("progress-terminal")).toBeNull();
    expect(await loadContractorProgressQueue()).toEqual([]);
  });

  it("removing one progress draft leaves unrelated local recovery untouched", async () => {
    await seedProgressDraft("progress-terminal");
    await seedProgressDraft("progress-active");

    await clearContractorProgressDraftForProgress("progress-terminal");

    expect(getContractorProgressDraft("progress-terminal")).toBeNull();
    expect(getContractorProgressDraft("progress-active")).toBeTruthy();
  });

  it("app active flush clears terminal progress recovery instead of submitting it", async () => {
    await seedProgressDraft("progress-terminal");
    mockEnsureWorkProgressSubmission.mockResolvedValue({
      ok: true,
      logId: "log-terminal",
    });

    const result = await flushContractorProgressQueue(
      {
        supabaseClient: {},
        pickFirstNonEmpty: (...values: unknown[]) =>
          values.map((value) => String(value ?? "").trim()).find(Boolean) ?? null,
        getNetworkOnline: () => true,
        inspectRemoteProgress: async () => ({
          kind: "contractor_progress",
          entityId: "progress-terminal",
          terminal: true,
          reason: "work_closed_on_server",
        }),
      },
      "app_active",
    );

    expect(result.failed).toBe(false);
    expect(mockEnsureWorkProgressSubmission).not.toHaveBeenCalled();
    expect(getContractorProgressDraft("progress-terminal")).toBeNull();
    expect(await loadContractorProgressQueue()).toEqual([]);
  });

  it("worker still processes active progress recovery when remote truth is not terminal", async () => {
    await seedProgressDraft("progress-active");
    mockEnsureWorkProgressSubmission.mockResolvedValue({
      ok: true,
      logId: "log-active",
    });

    const result = await flushContractorProgressQueue(
      {
        supabaseClient: {},
        pickFirstNonEmpty: (...values: unknown[]) =>
          values.map((value) => String(value ?? "").trim()).find(Boolean) ?? null,
        getNetworkOnline: () => true,
        inspectRemoteProgress: async () => ({
          kind: "contractor_progress",
          entityId: "progress-active",
          terminal: false,
          status: "ready",
          remainingCount: 1,
        }),
      },
      "network_back",
    );

    expect(result.failed).toBe(false);
    expect(mockEnsureWorkProgressSubmission).toHaveBeenCalledTimes(1);
    expect(getContractorProgressDraft("progress-active")?.syncStatus).toBe("synced");
  });
});
