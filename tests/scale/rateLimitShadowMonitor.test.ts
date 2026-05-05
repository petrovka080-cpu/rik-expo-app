import {
  createRateLimitShadowMonitor,
  InMemoryRateLimitAdapter,
  observeRateLimitPrivateSmokeInShadowMonitor,
  RuntimeRateEnforcementProvider,
  type RateLimitPrivateSmokeResult,
  type RuntimeRateEnforcementDecision,
} from "../../src/shared/scale/rateLimitAdapters";
import { getRateEnforcementPolicy } from "../../src/shared/scale/rateLimitPolicies";
import { InMemoryScaleObservabilityAdapter } from "../../src/shared/scale/scaleObservabilityAdapters";

describe("rate limit shadow monitor aggregate safety", () => {
  const input = {
    operation: "ai.workflow.action" as const,
    keyInput: {
      actorId: "actor-opaque",
      companyId: "company-opaque",
      routeKey: "ai-action",
    },
  };

  it("collects would-allow and would-throttle counters without exposing key material", async () => {
    const policy = getRateEnforcementPolicy(input.operation);
    expect(policy).toBeTruthy();
    if (!policy) return;

    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 80_000 }),
      namespace: "rik-staging",
    });
    const monitor = createRateLimitShadowMonitor();

    const firstDecision = await provider.evaluate(input);
    await expect(monitor.observe(firstDecision)).resolves.toEqual(
      expect.objectContaining({
        accepted: true,
        eventRecorded: false,
        metricRecorded: false,
      }),
    );

    let latestDecision = firstDecision;
    for (let index = 0; index < policy.maxRequests + policy.burst + 1; index += 1) {
      latestDecision = await provider.evaluate(input);
      await monitor.observe(latestDecision);
    }

    expect(latestDecision.providerState).toBe("hard_limited");
    expect(latestDecision.blocked).toBe(false);
    expect(latestDecision.realUsersBlocked).toBe(false);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: expect.any(Number),
        wouldThrottleCount: expect.any(Number),
        keyCardinalityRedacted: 1,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
        realUsersBlocked: false,
      }),
    );
    expect(monitor.snapshot().wouldAllowCount).toBeGreaterThan(0);
    expect(monitor.snapshot().wouldThrottleCount).toBeGreaterThan(0);

    const serializedSnapshot = JSON.stringify(monitor.snapshot());
    expect(serializedSnapshot).not.toContain("actor-opaque");
    expect(serializedSnapshot).not.toContain("company-opaque");
    expect(serializedSnapshot).not.toContain("ai-action");
    if (latestDecision.safeSubjectHash) {
      expect(serializedSnapshot).not.toContain(latestDecision.safeSubjectHash);
    }
  });

  it("records only redacted aggregate observability events and metrics", async () => {
    const policy = getRateEnforcementPolicy(input.operation);
    expect(policy).toBeTruthy();
    if (!policy) return;

    const observability = new InMemoryScaleObservabilityAdapter({
      nowMs: () => 90_000,
    });
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 90_000 }),
      namespace: "rik-staging",
    });
    const monitor = createRateLimitShadowMonitor({ observability });

    let latestDecision = await provider.evaluate(input);
    for (let index = 0; index < policy.maxRequests + policy.burst + 1; index += 1) {
      latestDecision = await provider.evaluate(input);
    }

    const result = await monitor.observe(latestDecision);

    expect(result.accepted).toBe(true);
    expect(result.eventRecorded).toBe(true);
    expect(result.metricRecorded).toBe(true);
    expect(observability.events).toEqual([
      expect.objectContaining({
        eventName: "rate_limit.hard_limited",
        routeOrOperation: input.operation,
        safeActorScope: "present_redacted",
        safeCompanyScope: "not_applicable",
        redacted: true,
      }),
    ]);
    expect(observability.metrics).toEqual([
      expect.objectContaining({
        metricName: "rate_limit.hard_limit_rate",
        value: 1,
        tags: {
          operation: input.operation,
          result: "limited",
        },
      }),
    ]);

    const serializedObservability = JSON.stringify({
      events: observability.events,
      metrics: observability.metrics,
      snapshot: monitor.snapshot(),
    });
    expect(serializedObservability).not.toContain("actor-opaque");
    expect(serializedObservability).not.toContain("company-opaque");
    if (latestDecision.safeSubjectHash) {
      expect(serializedObservability).not.toContain(latestDecision.safeSubjectHash);
    }
  });

  it("rejects unsafe decisions that claim real users were blocked", async () => {
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 100_000 }),
      namespace: "rik-staging",
    });
    const monitor = createRateLimitShadowMonitor();
    const safeDecision = await provider.evaluate(input);
    const unsafeDecision = {
      ...safeDecision,
      realUsersBlocked: true,
    } as unknown as RuntimeRateEnforcementDecision;

    await expect(monitor.observe(unsafeDecision)).resolves.toEqual(
      expect.objectContaining({
        accepted: false,
        eventRecorded: false,
        metricRecorded: false,
      }),
    );
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: 0,
        invalidDecisionCount: 1,
        realUsersBlocked: false,
      }),
    );
  });

  it("records private synthetic smoke results as redacted monitor aggregates", async () => {
    const monitor = createRateLimitShadowMonitor();
    const result: RateLimitPrivateSmokeResult = {
      status: "ready",
      operation: "proposal.submit",
      providerKind: "redis_url",
      providerEnabled: true,
      externalNetworkEnabled: true,
      namespacePresent: true,
      syntheticIdentityUsed: true,
      realUserIdentityUsed: false,
      wouldAllowVerified: true,
      wouldThrottleVerified: true,
      cleanupAttempted: true,
      cleanupOk: true,
      ttlBounded: true,
      enforcementEnabled: false,
      productionUserBlocked: false,
      rawKeyReturned: false,
      rawPayloadLogged: false,
      piiLogged: false,
      reason: "synthetic_private_smoke_ready",
    };

    await expect(
      observeRateLimitPrivateSmokeInShadowMonitor({ monitor, result }),
    ).resolves.toEqual(
      expect.objectContaining({
        attempted: true,
        allowObserved: true,
        throttleObserved: true,
        reason: "synthetic_private_smoke_shadow_observed",
      }),
    );

    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: 1,
        wouldThrottleCount: 1,
        keyCardinalityRedacted: 1,
        observedDecisionCount: 2,
        blockedDecisionsObserved: 0,
        realUsersBlocked: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );

    const serializedSnapshot = JSON.stringify(monitor.snapshot());
    expect(serializedSnapshot).not.toContain("synthetic-rate-smoke");
    expect(serializedSnapshot).not.toContain("rate:v1:");
  });
});
