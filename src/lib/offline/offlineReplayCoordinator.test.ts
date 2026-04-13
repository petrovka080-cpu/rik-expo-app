import {
  getOfflineReplayOwnerSnapshot,
  requestOfflineReplay,
  resetOfflineReplayCoordinator,
  resetOfflineReplayCoordinatorForTests,
  type OfflineReplayPolicy,
} from "./offlineReplayCoordinator";

const TEST_POLICY = {
  queueKey: "test_queue",
  owner: "test_worker",
  concurrencyLimit: 1,
  ordering: "created_at_fifo",
  backpressure: "coalesce_triggers_and_rerun_once",
} as const satisfies OfflineReplayPolicy;

const waitUntil = async (predicate: () => boolean, message: string) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
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

describe("offlineReplayCoordinator", () => {
  beforeEach(() => {
    resetOfflineReplayCoordinatorForTests();
  });

  it("keeps one serial owner and coalesces duplicate triggers into one follow-up drain", async () => {
    const first = createDeferred<number>();
    const triggers: string[] = [];
    let active = 0;
    let maxActive = 0;

    const run = jest.fn(async (triggerSource: string) => {
      triggers.push(triggerSource);
      active += 1;
      maxActive = Math.max(maxActive, active);
      try {
        if (triggers.length === 1) {
          return await first.promise;
        }
        return 2;
      } finally {
        active -= 1;
      }
    });

    const firstRequest = requestOfflineReplay(TEST_POLICY, "network_back", run);
    const secondRequest = requestOfflineReplay(TEST_POLICY, "manual_retry", run);
    const thirdRequest = requestOfflineReplay(TEST_POLICY, "app_active", run);

    await waitUntil(() => run.mock.calls.length === 1, "first replay did not start");
    expect(getOfflineReplayOwnerSnapshot("test_queue")).toMatchObject({
      active: true,
      running: true,
      pending: true,
      currentTriggerSource: "network_back",
      pendingTriggerSource: "app_active",
    });

    first.resolve(1);
    await expect(Promise.all([firstRequest, secondRequest, thirdRequest])).resolves.toEqual([
      1,
      1,
      1,
    ]);
    await waitUntil(() => run.mock.calls.length === 2, "pending replay did not drain");
    await waitUntil(
      () => !getOfflineReplayOwnerSnapshot("test_queue").active,
      "replay owner stayed active",
    );

    expect(triggers).toEqual(["network_back", "app_active"]);
    expect(maxActive).toBe(1);
    expect(getOfflineReplayOwnerSnapshot("test_queue")).toMatchObject({
      active: false,
      running: false,
      pending: false,
      runCount: 2,
    });
  });

  it("rejects non-serial policies in the app offline replay runtime", async () => {
    const unsafePolicy = {
      ...TEST_POLICY,
      queueKey: "unsafe_queue",
      concurrencyLimit: 2,
    } as unknown as OfflineReplayPolicy;

    expect(() =>
      requestOfflineReplay(unsafePolicy, "manual_retry", async () => 1),
    ).toThrow("must be serial");
  });

  it("clears coordinator owner state on a session boundary reset", async () => {
    await requestOfflineReplay(TEST_POLICY, "manual_retry", async () => "ok");

    expect(getOfflineReplayOwnerSnapshot("test_queue").runCount).toBe(1);

    resetOfflineReplayCoordinator();

    expect(getOfflineReplayOwnerSnapshot("test_queue")).toEqual({
      queueKey: "test_queue",
      active: false,
      running: false,
      pending: false,
      currentTriggerSource: null,
      pendingTriggerSource: null,
      runCount: 0,
    });
  });
});
