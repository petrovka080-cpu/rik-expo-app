import {
  OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG,
  classifyReplayFailure,
  getOfflineReplayOwnerSnapshot,
  recordReplayFailure,
  recordReplaySuccess,
  requestOfflineReplay,
  resetOfflineReplayCoordinator,
  resetOfflineReplayCoordinatorForTests,
  shouldAllowReplay,
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

  it("allows replay initially", () => {
    expect(shouldAllowReplay(1_000)).toEqual({
      allow: true,
      reason: "ok",
      retryAfterMs: 0,
    });
  });

  it("opens a shared cooldown after transient failures inside the window", () => {
    const now = 10_000;

    for (
      let index = 0;
      index < OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      index += 1
    ) {
      recordReplayFailure({
        worker: index % 2 === 0 ? "mutation" : "warehouseReceive",
        kind: "server_error",
        status: 503,
        now: now + index,
      });
    }

    const decision = shouldAllowReplay(now + 10);
    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe("cooldown");
    expect(decision.retryAfterMs).toBeGreaterThan(0);
    expect(decision.retryAfterMs).toBeLessThanOrEqual(
      OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.cooldownInitialMs,
    );
  });

  it("recovers after the cooldown expires", () => {
    const now = 20_000;

    for (
      let index = 0;
      index < OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      index += 1
    ) {
      recordReplayFailure({
        worker: "contractorProgress",
        kind: "network",
        now: now + index,
      });
    }

    expect(shouldAllowReplay(now + 100).allow).toBe(false);
    expect(
      shouldAllowReplay(
        now + OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.cooldownInitialMs + 100,
      ),
    ).toEqual({
      allow: true,
      reason: "ok",
      retryAfterMs: 0,
    });
  });

  it("success reduces pressure for the successful worker", () => {
    const now = 30_000;
    for (let index = 0; index < 4; index += 1) {
      recordReplayFailure({
        worker: "mutation",
        kind: "rate_limit",
        status: 429,
        now: now + index,
      });
    }

    recordReplaySuccess("mutation");
    recordReplayFailure({
      worker: "warehouseReceive",
      kind: "server_error",
      status: 503,
      now: now + 10,
    });

    expect(shouldAllowReplay(now + 20).allow).toBe(true);
  });

  it("does not carry old failures outside the rolling window", () => {
    const now = 40_000;
    for (let index = 0; index < 4; index += 1) {
      recordReplayFailure({
        worker: "mutation",
        kind: "network",
        now: now + index,
      });
    }
    recordReplayFailure({
      worker: "mutation",
      kind: "network",
      now:
        now +
        OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.failureWindowMs +
        1_000,
    });

    expect(
      shouldAllowReplay(
        now +
          OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.failureWindowMs +
          1_001,
      ).allow,
    ).toBe(true);
  });

  it("classifies transient replay failures but ignores permanent/domain errors", () => {
    expect(classifyReplayFailure({ status: 429 })).toEqual({
      kind: "rate_limit",
      status: 429,
    });
    expect(classifyReplayFailure({ status: 503 })).toEqual({
      kind: "server_error",
      status: 503,
    });
    expect(classifyReplayFailure(new Error("Network request failed"))).toEqual(
      expect.objectContaining({
        kind: "network",
      }),
    );
    expect(classifyReplayFailure(new Error("validation failed"))).toBeNull();
    expect(classifyReplayFailure({ status: 403 })).toBeNull();
    expect(classifyReplayFailure({ status: 409 })).toBeNull();
    expect(classifyReplayFailure({ status: 422 })).toBeNull();
  });
});
