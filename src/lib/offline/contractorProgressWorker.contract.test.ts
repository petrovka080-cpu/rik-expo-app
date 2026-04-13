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
  configureContractorProgressDraftStore,
  getContractorProgressDraft,
  patchContractorProgressDraftContext,
  setContractorProgressDraftFields,
  setContractorProgressDraftMaterials,
} from "../../screens/contractor/contractor.progressDraft.store";

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
});
