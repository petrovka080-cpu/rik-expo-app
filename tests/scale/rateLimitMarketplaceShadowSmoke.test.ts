import {
  InMemoryRateLimitAdapter,
  RateLimitStoreAdapter,
  RuntimeRateEnforcementProvider,
  createRateLimitShadowMonitor,
  observeRateLimitPrivateSmokeInShadowMonitor,
  runRateLimitPrivateSyntheticSmoke,
  type RateLimitStoreFetch,
} from "../../src/shared/scale/rateLimitAdapters";
import { getRateEnforcementPolicy } from "../../src/shared/scale/rateLimitPolicies";
import { InMemoryScaleObservabilityAdapter } from "../../src/shared/scale/scaleObservabilityAdapters";

const ROUTE = "marketplace.catalog.search" as const;
const ROUTE_KEY = "marketplace_catalog_search";
const SELECTED_SUBJECT = "synthetic-wave10-marketplace-selected";
const NON_SELECTED_SUBJECT = "synthetic-wave10-marketplace-non-selected";

const createPrivateSmokeFetch = (nowMs: number): RateLimitStoreFetch => {
  const counts = new Map<string, number>();
  const operations = new Map<string, unknown>();
  return async (_input, init) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    const command = String(body.command ?? "");
    const key = String(body.key ?? "");
    const policy = body.policy && typeof body.policy === "object"
      ? (body.policy as Record<string, unknown>)
      : {};
    const maxRequests = Number(policy.maxRequests ?? 1);
    const burst = Number(policy.burst ?? 1);
    const windowMs = Number(policy.windowMs ?? 60_000);
    const cost = Number(body.cost ?? 1);
    let result: unknown = null;

    if ((command === "check" || command === "consume") && key) {
      const current = counts.get(key) ?? 0;
      const next = current + cost;
      operations.set(key, body.operation);
      if (command === "consume" && next <= maxRequests + burst) counts.set(key, next);
      result = {
        state: next <= maxRequests ? "allowed" : next <= maxRequests + burst ? "soft_limited" : "hard_limited",
        key,
        operation: body.operation,
        remaining: Math.max(0, maxRequests - next),
        resetAtMs: nowMs + windowMs,
        retryAfterMs: next > maxRequests + burst ? 1_000 : null,
      };
    }

    if (command === "reset" && key) {
      counts.delete(key);
      operations.delete(key);
      result = { ok: true };
    }

    if (command === "status" && key) {
      result = {
        key,
        operation: operations.get(key),
        count: counts.get(key) ?? 0,
        resetAtMs: nowMs + windowMs,
      };
    }

    if (command === "refund" && key) {
      counts.set(key, Math.max(0, (counts.get(key) ?? 0) - cost));
      result = { ok: true };
    }

    return {
      ok: true,
      json: async () => ({ result }),
    };
  };
};

describe("marketplace catalog rate-limit shadow smoke", () => {
  it("proves same-route observe-only allow and throttle decisions with redacted metrics", async () => {
    const policy = getRateEnforcementPolicy(ROUTE);
    expect(policy).toBeTruthy();
    if (!policy) return;

    const nowMs = 1_800_000;
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => nowMs }),
      namespace: "rik-staging-shadow-smoke",
    });
    const observability = new InMemoryScaleObservabilityAdapter({ nowMs: () => nowMs });
    const monitor = createRateLimitShadowMonitor({ observability });

    const selectedKeyInput = {
      ipOrDeviceKey: SELECTED_SUBJECT,
      routeKey: ROUTE_KEY,
    };
    const nonSelectedKeyInput = {
      ipOrDeviceKey: NON_SELECTED_SUBJECT,
      routeKey: ROUTE_KEY,
    };

    const selectedAllowDecision = await provider.evaluate({
      operation: ROUTE,
      keyInput: selectedKeyInput,
      nowMs,
    });
    await monitor.observe(selectedAllowDecision);

    const selectedThrottleDecision = await provider.evaluate({
      operation: ROUTE,
      keyInput: selectedKeyInput,
      cost: policy.maxRequests + policy.burst + 1,
      nowMs,
    });
    await monitor.observe(selectedThrottleDecision);

    const nonSelectedAllowDecision = await provider.evaluate({
      operation: ROUTE,
      keyInput: nonSelectedKeyInput,
      nowMs,
    });
    await monitor.observe(nonSelectedAllowDecision);

    expect(selectedAllowDecision).toEqual(
      expect.objectContaining({
        action: "observe",
        operation: ROUTE,
        providerState: "allowed",
        blocked: false,
        realUsersBlocked: false,
      }),
    );
    expect(selectedThrottleDecision).toEqual(
      expect.objectContaining({
        action: "observe",
        operation: ROUTE,
        providerState: "hard_limited",
        blocked: false,
        realUsersBlocked: false,
      }),
    );
    expect(nonSelectedAllowDecision).toEqual(
      expect.objectContaining({
        action: "observe",
        operation: ROUTE,
        providerState: "allowed",
        blocked: false,
        realUsersBlocked: false,
      }),
    );
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: 2,
        wouldThrottleCount: 1,
        keyCardinalityRedacted: 2,
        observedDecisionCount: 3,
        blockedDecisionsObserved: 0,
        realUsersBlocked: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );

    const privateSmokeAdapter = new RateLimitStoreAdapter({
      storeUrl: "https://rate-limit-store.invalid",
      namespace: "rik-staging-shadow-smoke",
      fetchImpl: createPrivateSmokeFetch(nowMs),
    });
    const privateSmoke = await runRateLimitPrivateSyntheticSmoke({
      adapter: privateSmokeAdapter,
      nowMs,
    });
    await expect(
      observeRateLimitPrivateSmokeInShadowMonitor({
        monitor,
        result: privateSmoke,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        attempted: true,
        allowObserved: true,
        throttleObserved: true,
      }),
    );

    expect(privateSmoke).toEqual(
      expect.objectContaining({
        status: "ready",
        syntheticIdentityUsed: true,
        realUserIdentityUsed: false,
        wouldAllowVerified: true,
        wouldThrottleVerified: true,
        enforcementEnabled: false,
        productionUserBlocked: false,
        rawKeyReturned: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: 3,
        wouldThrottleCount: 2,
        keyCardinalityRedacted: 3,
        observedDecisionCount: 5,
        blockedDecisionsObserved: 0,
        realUsersBlocked: false,
      }),
    );

    const serialized = JSON.stringify({
      monitor: monitor.snapshot(),
      events: observability.events,
      metrics: observability.metrics,
      privateSmoke,
    });
    expect(serialized).not.toContain(SELECTED_SUBJECT);
    expect(serialized).not.toContain(NON_SELECTED_SUBJECT);
    expect(serialized).not.toContain("rate:v1:");
    expect(serialized).not.toContain("rate-limit-store.invalid");
  });
});
