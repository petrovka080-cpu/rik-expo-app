import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  EXTERNAL_RATE_LIMIT_ADAPTER_CONTRACT,
  IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS,
  IN_MEMORY_RATE_LIMIT_MAX_TRACKED_KEYS,
  InMemoryRateLimitAdapter,
  NoopRateLimitAdapter,
  RATE_ENFORCEMENT_MODE_ENV_NAME,
  RATE_LIMIT_TEST_NAMESPACE_ENV_NAME,
  RateLimitStoreAdapter,
  RedisUrlRateLimitAdapter,
  RuntimeRateEnforcementProvider,
  createRateEnforcementProviderFromEnv,
  createRateLimitAdapterFromEnv,
  createRateLimitPrivateSmokeRunnerFromEnv,
  runRateLimitPrivateSyntheticSmoke,
  type RateLimitStoreFetch,
  resolveInMemoryRateLimitMaxTrackedKeys,
  resolveRateEnforcementMode,
} from "../../src/shared/scale/rateLimitAdapters";
import type {
  RedisCommand,
  RedisCommandExecutor,
} from "../../src/shared/scale/cacheAdapters";
import {
  BFF_MUTATION_RATE_LIMIT_OPERATIONS,
  BFF_READ_RATE_LIMIT_OPERATIONS,
  JOB_RATE_LIMIT_OPERATIONS,
  RATE_ENFORCEMENT_POLICY_REGISTRY,
  getRateEnforcementPoliciesByCategory,
  getRateEnforcementPolicy,
  getRateEnforcementPolicyForBffMutationOperation,
  getRateEnforcementPolicyForBffReadOperation,
  getRateEnforcementPolicyForJobType,
  validateRateEnforcementPolicy,
} from "../../src/shared/scale/rateLimitPolicies";
import {
  assertRateLimitKeyIsBounded,
  buildSafeRateLimitKey,
} from "../../src/shared/scale/rateLimitKeySafety";
import {
  buildAbuseEnforcementDecision,
  validateAbuseEnforcementDecision,
} from "../../src/shared/scale/abuseEnforcementBoundary";
import {
  BFF_STAGING_MUTATION_ROUTES,
  BFF_STAGING_READ_ROUTES,
  BFF_STAGING_SERVER_BOUNDARY_CONTRACT,
} from "../../scripts/server/stagingBffServerBoundary";
import {
  BFF_MUTATION_HANDLER_OPERATIONS,
  getBffMutationHandlerMetadata,
} from "../../src/shared/scale/bffMutationHandlers";
import {
  BFF_READ_HANDLER_OPERATIONS,
  getBffReadHandlerMetadata,
} from "../../src/shared/scale/bffReadHandlers";
import { JOB_POLICY_REGISTRY } from "../../src/shared/scale/jobPolicies";
import { SCALE_PROVIDER_RUNTIME_ENV_NAMES } from "../../src/shared/scale/providerRuntimeConfig";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const changedFiles = () =>
  execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const createRateLimitStoreMock = () => {
  const counts = new Map<string, number>();
  const requests: unknown[] = [];
  const fetchMock = jest.fn(async (_input: string, init: Parameters<RateLimitStoreFetch>[1]) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    requests.push(body);
    const key = String(body.key ?? "");
    const maxRequests = Number((body.policy as Record<string, unknown> | undefined)?.maxRequests ?? 2);
    const burst = Number((body.policy as Record<string, unknown> | undefined)?.burst ?? 1);
    const cost = Number(body.cost ?? 1);
    let result: unknown = null;

    if ((body.command === "check" || body.command === "consume") && key) {
      const current = counts.get(key) ?? 0;
      const next = current + cost;
      if (body.command === "consume" && next <= maxRequests + burst) {
        counts.set(key, next);
      }
      result = {
        state: next <= maxRequests ? "allowed" : next <= maxRequests + burst ? "soft_limited" : "hard_limited",
        key,
        operation: body.operation,
        remaining: Math.max(0, maxRequests - next),
        resetAtMs: 20_000,
        retryAfterMs: next > maxRequests + burst ? 1000 : null,
      };
    }

    if (body.command === "refund" && key) {
      counts.set(key, Math.max(0, (counts.get(key) ?? 0) - cost));
      result = { ok: true };
    }

    if (body.command === "reset" && key) {
      counts.delete(key);
      result = { ok: true };
    }

    if (body.command === "status" && key) {
      result = {
        key,
        operation: "proposal.submit",
        count: counts.get(key) ?? 0,
        resetAtMs: 20_000,
      };
    }

    return {
      ok: true,
      json: async () => ({ result }),
    };
  }) as jest.MockedFunction<RateLimitStoreFetch>;

  return { fetchMock, requests };
};

const createRedisCommandMock = () => {
  const values = new Map<string, string>();
  const commands: string[][] = [];
  const commandMock = jest.fn(async (command: RedisCommand) => {
    const parts = command.map((part) => String(part));
    commands.push(parts);
    const [rawName, rawKey, rawValue] = parts;
    const name = rawName?.toUpperCase();
    const key = rawKey ?? "";

    if (name === "GET") {
      return values.get(key) ?? null;
    }

    if (name === "SET") {
      values.set(key, rawValue ?? "");
      return "OK";
    }

    if (name === "DEL") {
      const existed = values.delete(key);
      return existed ? 1 : 0;
    }

    return null;
  }) as jest.MockedFunction<RedisCommandExecutor>;

  return { commandMock, commands, values };
};

describe("S-50K-RATE-ENFORCEMENT-1 disabled rate enforcement boundary", () => {
  it("keeps noop and external adapters disabled without external store calls", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      const policy = getRateEnforcementPolicy("proposal.submit");
      expect(policy).toBeTruthy();
      if (!policy) return;

      const noop = new NoopRateLimitAdapter();
      await expect(
        noop.check({ key: "rate:v1:test", policy }),
      ).resolves.toEqual({
        state: "disabled",
        key: "rate:v1:test",
        operation: "proposal.submit",
        remaining: null,
        resetAtMs: null,
        retryAfterMs: null,
        enabled: false,
        realUserBlocked: false,
      });
      await expect(
        noop.consume({ key: "rate:v1:test", policy }),
      ).resolves.toEqual(
        expect.objectContaining({ state: "disabled", realUserBlocked: false }),
      );
      expect(noop.getHealth()).toEqual({
        kind: "noop",
        enabled: false,
        externalNetworkEnabled: false,
        enforcementEnabledByDefault: false,
        trackedKeys: 0,
      });
      expect(EXTERNAL_RATE_LIMIT_ADAPTER_CONTRACT).toEqual(
        expect.objectContaining({
          kind: "external_contract",
          check: "contract_only",
          externalStoreCallsInTests: false,
          enforcementEnabledByDefault: false,
        }),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", {
          configurable: true,
          writable: true,
          value: originalFetch,
        });
      } else {
        delete (globalThis as { fetch?: typeof fetch }).fetch;
      }
    }
  });

  it("uses the in-memory adapter only for deterministic local proof", async () => {
    let now = 10_000;
    const policy = getRateEnforcementPolicy("ai.workflow.action");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const adapter = new InMemoryRateLimitAdapter(() => now);
    const key = "rate:v1:ai.workflow.action:opaque";

    for (let index = 0; index < policy.maxRequests; index += 1) {
      await expect(adapter.consume({ key, policy })).resolves.toEqual(
        expect.objectContaining({ state: "allowed", realUserBlocked: false }),
      );
    }
    await expect(adapter.consume({ key, policy })).resolves.toEqual(
      expect.objectContaining({
        state: "soft_limited",
        realUserBlocked: false,
      }),
    );

    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        kind: "in_memory",
        enabled: true,
        externalNetworkEnabled: false,
        enforcementEnabledByDefault: false,
        trackedKeys: 1,
        maxTrackedKeys: IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS,
        evictedKeys: 0,
        invalidKeyDecisions: 0,
      }),
    );
    await expect(adapter.refund(key)).resolves.toBe(true);
    await expect(adapter.reset(key)).resolves.toBe(true);
    await expect(adapter.getStatus(key)).resolves.toBeNull();

    now += policy.windowMs + 1;
    await expect(adapter.check({ key, policy })).resolves.toEqual(
      expect.objectContaining({ state: "allowed" }),
    );
  });

  it("keeps the external rate store disabled by default and staging-gated", async () => {
    const store = createRateLimitStoreMock();
    const policy = getRateEnforcementPolicy("proposal.submit");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const disabled = createRateLimitAdapterFromEnv(
      {},
      {
        runtimeEnvironment: "staging",
        fetchImpl: store.fetchMock,
      },
    );
    expect(disabled).toBeInstanceOf(NoopRateLimitAdapter);
    await expect(
      disabled.consume({ key: "rate:v1:proposal.submit:opaque", policy }),
    ).resolves.toEqual(
      expect.objectContaining({
        state: "disabled",
        enabled: false,
        realUserBlocked: false,
      }),
    );
    expect(store.fetchMock).not.toHaveBeenCalled();

    const staging = createRateLimitAdapterFromEnv(
      {
        SCALE_RATE_LIMIT_STAGING_ENABLED: "true",
        SCALE_RATE_LIMIT_STORE_URL: "https://rate.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "staging",
        fetchImpl: store.fetchMock,
      },
    );
    expect(staging).toBeInstanceOf(RateLimitStoreAdapter);
    expect(staging.getHealth()).toEqual(
      expect.objectContaining({
        kind: "rate_store",
        enabled: true,
        externalNetworkEnabled: true,
        enforcementEnabledByDefault: false,
        namespace: "rik-staging",
      }),
    );

    const redis = createRedisCommandMock();
    const redisStaging = createRateLimitAdapterFromEnv(
      {
        SCALE_RATE_LIMIT_STAGING_ENABLED: "true",
        SCALE_RATE_LIMIT_STORE_URL: "rediss://rate.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-staging-test",
      },
      {
        runtimeEnvironment: "staging",
        redisCommandImpl: redis.commandMock,
      },
    );
    expect(redisStaging).toBeInstanceOf(RedisUrlRateLimitAdapter);
    expect(redisStaging.getHealth()).toEqual(
      expect.objectContaining({
        kind: "redis_url",
        enabled: true,
        externalNetworkEnabled: true,
        enforcementEnabledByDefault: false,
        namespace: "rik-staging-test",
      }),
    );

    const production = createRateLimitAdapterFromEnv(
      {
        SCALE_RATE_LIMIT_STAGING_ENABLED: "true",
        SCALE_RATE_LIMIT_STORE_URL: "https://rate.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "production",
        fetchImpl: store.fetchMock,
      },
    );
    expect(production).toBeInstanceOf(NoopRateLimitAdapter);
    expect(production.getHealth().externalNetworkEnabled).toBe(false);

    const redisProduction = createRateLimitAdapterFromEnv(
      {
        SCALE_RATE_LIMIT_STAGING_ENABLED: "true",
        SCALE_RATE_LIMIT_STORE_URL: "rediss://rate.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-staging-test",
      },
      {
        runtimeEnvironment: "production",
        redisCommandImpl: redis.commandMock,
      },
    );
    expect(redisProduction).toBeInstanceOf(NoopRateLimitAdapter);
    expect(redis.commandMock).not.toHaveBeenCalled();
  });

  it("checks, consumes, refunds, resets, and reads status through a mocked rate store", async () => {
    const store = createRateLimitStoreMock();
    const policy = getRateEnforcementPolicy("proposal.submit");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const adapter = new RateLimitStoreAdapter({
      storeUrl: "https://rate.example.invalid",
      namespace: "rik-staging",
      fetchImpl: store.fetchMock,
    });
    const key = "rate:v1:proposal.submit:opaque";

    await expect(adapter.check({ key, policy })).resolves.toEqual(
      expect.objectContaining({
        state: "allowed",
        key,
        operation: "proposal.submit",
        enabled: true,
        realUserBlocked: false,
      }),
    );
    await expect(adapter.consume({ key, policy })).resolves.toEqual(
      expect.objectContaining({ state: "allowed", realUserBlocked: false }),
    );
    await expect(adapter.consume({ key, policy, cost: policy.maxRequests })).resolves.toEqual(
      expect.objectContaining({ state: "soft_limited", realUserBlocked: false }),
    );
    await expect(adapter.consume({ key, policy, cost: policy.maxRequests + policy.burst + 1 })).resolves.toEqual(
      expect.objectContaining({ state: "hard_limited", realUserBlocked: false }),
    );
    await expect(adapter.getStatus(key)).resolves.toEqual(
      expect.objectContaining({
        key,
        operation: "proposal.submit",
        count: expect.any(Number),
      }),
    );
    await expect(adapter.refund(key)).resolves.toBe(true);
    await expect(adapter.reset(key)).resolves.toBe(true);

    expect(store.requests.map((request) => (request as { command?: string }).command)).toEqual([
      "check",
      "consume",
      "consume",
      "consume",
      "status",
      "refund",
      "reset",
    ]);
    const serializedRequests = JSON.stringify(store.requests);
    expect(serializedRequests).toContain("rik-staging");
    expect(serializedRequests).toContain("proposal.submit");
    expect(serializedRequests).not.toContain("person@example.test");
    expect(serializedRequests).not.toContain("rawPayload");
  });

  it("checks, consumes, refunds, resets, and reads status through a Redis URL rate store", async () => {
    const redis = createRedisCommandMock();
    const policy = getRateEnforcementPolicy("proposal.submit");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const adapter = new RedisUrlRateLimitAdapter({
      redisUrl: "rediss://rate.example.invalid",
      namespace: "rik-staging-test",
      commandImpl: redis.commandMock,
    });
    const key = "rate:v1:proposal.submit:opaque";

    await expect(adapter.check({ key, policy })).resolves.toEqual(
      expect.objectContaining({
        state: "allowed",
        key,
        operation: "proposal.submit",
        enabled: true,
        realUserBlocked: false,
      }),
    );
    await expect(adapter.consume({ key, policy })).resolves.toEqual(
      expect.objectContaining({ state: "allowed", realUserBlocked: false }),
    );
    await expect(adapter.consume({ key, policy, cost: policy.maxRequests })).resolves.toEqual(
      expect.objectContaining({ state: "soft_limited", realUserBlocked: false }),
    );
    await expect(
      adapter.consume({
        key,
        policy,
        cost: policy.maxRequests + policy.burst + 1,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ state: "hard_limited", realUserBlocked: false }),
    );
    await expect(adapter.getStatus(key)).resolves.toEqual(
      expect.objectContaining({
        key,
        operation: "proposal.submit",
        count: expect.any(Number),
      }),
    );
    const serializedValues = JSON.stringify([...redis.values.values()]);
    await expect(adapter.refund(key)).resolves.toBe(true);
    await expect(adapter.reset(key)).resolves.toBe(true);
    await expect(adapter.getStatus(key)).resolves.toBeNull();

    expect(redis.commands.map((command) => command[0])).toEqual(
      expect.arrayContaining(["GET", "SET", "DEL"]),
    );
    expect(serializedValues).toContain("proposal.submit");
    expect(serializedValues).not.toContain("person@example.test");
    expect(serializedValues).not.toContain("rawPayload");
  });

  it("runs a synthetic private Redis smoke without enabling production enforcement or returning raw keys", async () => {
    const redis = createRedisCommandMock();
    const adapter = new RedisUrlRateLimitAdapter({
      redisUrl: "rediss://rate.example.invalid",
      namespace: "rik-production",
      commandImpl: redis.commandMock,
    });

    const result = await runRateLimitPrivateSyntheticSmoke({
      adapter,
      nowMs: Date.now(),
    });

    expect(result).toEqual(
      expect.objectContaining({
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
      }),
    );
    expect(redis.commands.map((command) => command[0])).toEqual(
      expect.arrayContaining(["GET", "SET", "DEL"]),
    );
    expect(redis.values.size).toBe(0);

    const serializedResult = JSON.stringify(result);
    expect(serializedResult).not.toContain("synthetic-rate-smoke-actor");
    expect(serializedResult).not.toContain("synthetic-rate-smoke-company");
    expect(serializedResult).not.toContain("synthetic-rate-smoke-idempotency");
    expect(serializedResult).not.toContain("rate:v1:");
  });

  it("creates the private Redis smoke runner only from safe Redis URL env shape", async () => {
    const redis = createRedisCommandMock();

    expect(
      createRateLimitPrivateSmokeRunnerFromEnv({
        SCALE_RATE_LIMIT_STORE_URL: "https://rate.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-production",
      }),
    ).toBeNull();
    expect(
      createRateLimitPrivateSmokeRunnerFromEnv({
        SCALE_RATE_LIMIT_STORE_URL: "rediss://rate.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "bad namespace",
      }),
    ).toBeNull();

    const runner = createRateLimitPrivateSmokeRunnerFromEnv(
      {
        SCALE_RATE_LIMIT_STORE_URL: "rediss://rate.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-production",
      },
      { redisCommandImpl: redis.commandMock },
    );

    await expect(runner?.run()).resolves.toEqual(
      expect.objectContaining({
        status: "ready",
        enforcementEnabled: false,
        productionUserBlocked: false,
      }),
    );
  });

  it("rejects unsafe rate store keys and namespaces before provider calls", async () => {
    const store = createRateLimitStoreMock();
    const policy = getRateEnforcementPolicy("proposal.submit");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const unsafeNamespace = new RateLimitStoreAdapter({
      storeUrl: "https://rate.example.invalid",
      namespace: "bad namespace with spaces",
      fetchImpl: store.fetchMock,
    });
    await expect(
      unsafeNamespace.consume({
        key: "rate:v1:proposal.submit:opaque",
        policy,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        state: "unknown",
        enabled: true,
        realUserBlocked: false,
      }),
    );
    await expect(
      unsafeNamespace.getStatus("rate:v1:proposal.submit:opaque"),
    ).resolves.toBeNull();

    const adapter = new RateLimitStoreAdapter({
      storeUrl: "https://rate.example.invalid",
      namespace: "rik-staging",
      fetchImpl: store.fetchMock,
    });
    await expect(adapter.consume({ key: "person@example.test", policy })).resolves.toEqual(
      expect.objectContaining({
        state: "disabled",
        key: "rate:v1:invalid",
        realUserBlocked: false,
      }),
    );
    expect(store.fetchMock).not.toHaveBeenCalled();
  });

  it("keeps rate store env names server-only", () => {
    const rateStoreEnvNames = [
      SCALE_PROVIDER_RUNTIME_ENV_NAMES.rate_limit.enabled,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.rate_limit.required,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.rate_limit.optional,
    ];

    expect(rateStoreEnvNames).toEqual([
      "SCALE_RATE_LIMIT_STAGING_ENABLED",
      "SCALE_RATE_LIMIT_STORE_URL",
      "SCALE_RATE_LIMIT_NAMESPACE",
      "SCALE_RATE_ENFORCEMENT_MODE",
      "SCALE_RATE_LIMIT_TEST_NAMESPACE",
    ]);
    expect(rateStoreEnvNames.every((name) => !name.startsWith("EXPO_PUBLIC_"))).toBe(true);
    expect(rateStoreEnvNames).not.toContain("BFF_SERVER_AUTH_SECRET");
    expect(rateStoreEnvNames).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
    expect(readProjectFile("src/shared/scale/rateLimitAdapters.ts")).not.toContain(
      "EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET",
    );
  });

  it("keeps the in-memory adapter bounded for future runtime use", async () => {
    let now = 20_000;
    const policy = getRateEnforcementPolicy("buyer.summary.inbox");
    expect(policy).toBeTruthy();
    if (!policy) return;

    expect(resolveInMemoryRateLimitMaxTrackedKeys(2)).toBe(2);
    expect(resolveInMemoryRateLimitMaxTrackedKeys(500_000)).toBe(
      IN_MEMORY_RATE_LIMIT_MAX_TRACKED_KEYS,
    );
    expect(resolveInMemoryRateLimitMaxTrackedKeys(0)).toBe(
      IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS,
    );

    const adapter = new InMemoryRateLimitAdapter({
      now: () => now,
      maxTrackedKeys: 2,
    });
    const firstKey = "rate:v1:buyer.summary.inbox:first";
    const secondKey = "rate:v1:buyer.summary.inbox:second";
    const thirdKey = "rate:v1:buyer.summary.inbox:third";

    await expect(adapter.consume({ key: firstKey, policy })).resolves.toEqual(
      expect.objectContaining({ state: "allowed", realUserBlocked: false }),
    );
    await expect(adapter.consume({ key: secondKey, policy })).resolves.toEqual(
      expect.objectContaining({ state: "allowed", realUserBlocked: false }),
    );
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        trackedKeys: 2,
        maxTrackedKeys: 2,
        evictedKeys: 0,
      }),
    );

    await expect(adapter.consume({ key: thirdKey, policy })).resolves.toEqual(
      expect.objectContaining({ state: "allowed", realUserBlocked: false }),
    );
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        trackedKeys: 2,
        maxTrackedKeys: 2,
        evictedKeys: 1,
      }),
    );
    await expect(adapter.getStatus(firstKey)).resolves.toBeNull();
    await expect(adapter.getStatus(secondKey)).resolves.toEqual(
      expect.objectContaining({ key: secondKey }),
    );
    await expect(adapter.getStatus(thirdKey)).resolves.toEqual(
      expect.objectContaining({ key: thirdKey }),
    );

    await expect(adapter.consume({ key: "", policy })).resolves.toEqual(
      expect.objectContaining({
        state: "disabled",
        key: "rate:v1:invalid",
        enabled: false,
        realUserBlocked: false,
      }),
    );
    await expect(
      adapter.consume({ key: `rate:v1:${"x".repeat(300)}`, policy }),
    ).resolves.toEqual(
      expect.objectContaining({ state: "disabled", key: "rate:v1:invalid" }),
    );
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        trackedKeys: 2,
        invalidKeyDecisions: 2,
      }),
    );

    now += policy.windowMs + 1;
    await expect(adapter.check({ key: thirdKey, policy })).resolves.toEqual(
      expect.objectContaining({ state: "allowed", realUserBlocked: false }),
    );
    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        trackedKeys: 1,
        expiredKeysPurged: 2,
      }),
    );
  });

  it("keeps runtime rate enforcement disabled by default", async () => {
    const adapter = new InMemoryRateLimitAdapter();
    const provider = createRateEnforcementProviderFromEnv(
      {},
      {
        runtimeEnvironment: "staging",
        adapter,
      },
    );

    expect(resolveRateEnforcementMode(undefined)).toBe("disabled");
    expect(provider.getHealth()).toEqual(
      expect.objectContaining({
        mode: "disabled",
        providerEnabled: true,
        externalNetworkEnabled: false,
        productionGuard: true,
        blocksRealUsersGlobally: false,
      }),
    );
    await expect(
      provider.evaluate({
        operation: "ai.workflow.action",
        keyInput: {
          actorId: "actor-opaque",
          companyId: "company-opaque",
          routeKey: "ai-action",
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        action: "disabled",
        providerState: "disabled",
        blocked: false,
        realUsersBlocked: false,
      }),
    );
    expect(adapter.getHealth().trackedKeys).toBe(0);
  });

  it("keeps observe-only runtime mode from blocking even after provider hard limits", async () => {
    const adapter = new InMemoryRateLimitAdapter({ now: () => 30_000 });
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter,
      namespace: "rik-staging",
    });
    const input = {
      operation: "ai.workflow.action" as const,
      keyInput: {
        actorId: "actor-opaque",
        companyId: "company-opaque",
        routeKey: "ai-action",
      },
    };

    let latest = await provider.evaluate(input);
    const policy = getRateEnforcementPolicy("ai.workflow.action");
    expect(policy).toBeTruthy();
    if (!policy) return;
    for (let index = 0; index < policy.maxRequests + policy.burst + 1; index += 1) {
      latest = await provider.evaluate(input);
    }

    expect(latest).toEqual(
      expect.objectContaining({
        action: "observe",
        mode: "observe_only",
        providerState: "hard_limited",
        providerEnabled: true,
        blocked: false,
        realUsersBlocked: false,
        rawPayloadLogged: false,
        piiLogged: false,
        reason: "not_blocking_real_users",
      }),
    );
  });

  it("blocks only an isolated staging test namespace in enforce mode", async () => {
    const policy = getRateEnforcementPolicy("ai.workflow.action");
    expect(policy).toBeTruthy();
    if (!policy) return;
    const input = {
      operation: "ai.workflow.action" as const,
      keyInput: {
        actorId: "actor-opaque",
        companyId: "company-opaque",
        routeKey: "ai-action",
      },
    };

    const liveNamespaceProvider = new RuntimeRateEnforcementProvider({
      mode: "enforce_staging_test_namespace_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 40_000 }),
      namespace: "rik-staging",
      isolatedTestNamespace: "rik-staging-test",
    });
    let liveDecision = await liveNamespaceProvider.evaluate(input);
    for (let index = 0; index < policy.maxRequests + policy.burst + 1; index += 1) {
      liveDecision = await liveNamespaceProvider.evaluate(input);
    }
    expect(liveDecision).toEqual(
      expect.objectContaining({
        action: "observe",
        providerState: "hard_limited",
        blocked: false,
        realUsersBlocked: false,
      }),
    );

    const isolatedProvider = new RuntimeRateEnforcementProvider({
      mode: "enforce_staging_test_namespace_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 50_000 }),
      namespace: "rik-staging-test",
      isolatedTestNamespace: "rik-staging-test",
    });
    let isolatedDecision = await isolatedProvider.evaluate(input);
    for (let index = 0; index < policy.maxRequests + policy.burst + 1; index += 1) {
      isolatedDecision = await isolatedProvider.evaluate(input);
    }
    expect(isolatedDecision).toEqual(
      expect.objectContaining({
        action: "block",
        mode: "enforce_staging_test_namespace_only",
        providerState: "hard_limited",
        blocked: true,
        realUsersBlocked: false,
        enforcementNamespace: "rik-staging-test",
        isolatedTestNamespace: "rik-staging-test",
        reason: "isolated_test_namespace_limited",
      }),
    );
  });

  it("keeps runtime enforcement key hashing PII-safe", async () => {
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 60_000 }),
      namespace: "rik-staging",
    });
    const decision = await provider.evaluate({
      operation: "proposal.submit",
      keyInput: {
        actorId: "actor-opaque",
        companyId: "company-opaque",
        idempotencyKey: "idem-opaque",
        routeKey: "proposal-submit",
      },
    });

    expect(decision.safeSubjectHash).toEqual(expect.any(String));
    expect(decision.keyLength).toEqual(expect.any(Number));
    expect(decision.rawPiiInKey).toBe(false);
    expect(JSON.stringify(decision)).not.toContain("actor-opaque");
    expect(JSON.stringify(decision)).not.toContain("company-opaque");
    expect(JSON.stringify(decision)).not.toContain("idem-opaque");

    await expect(
      provider.evaluate({
        operation: "proposal.submit",
        keyInput: {
          actorId: "actor-opaque",
          companyId: "company-opaque",
          idempotencyKey: "idem-opaque",
          payload: { email: "person@example.test" },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        action: "observe",
        providerState: "key_rejected",
        blocked: false,
        rawPiiInKey: false,
        rawPayloadLogged: false,
        piiLogged: false,
        reason: "forbidden_field",
      }),
    );
  });

  it("keeps production runtime guarded even with enforce env values", async () => {
    const adapter = new InMemoryRateLimitAdapter({ now: () => 70_000 });
    const provider = createRateEnforcementProviderFromEnv(
      {
        [RATE_ENFORCEMENT_MODE_ENV_NAME]: "enforce_staging_test_namespace_only",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-staging-test",
        [RATE_LIMIT_TEST_NAMESPACE_ENV_NAME]: "rik-staging-test",
      },
      {
        runtimeEnvironment: "production",
        adapter,
      },
    );

    await expect(
      provider.evaluate({
        operation: "ai.workflow.action",
        keyInput: {
          actorId: "actor-opaque",
          companyId: "company-opaque",
          routeKey: "ai-action",
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        action: "disabled",
        mode: "enforce_staging_test_namespace_only",
        providerState: "disabled",
        blocked: false,
        realUsersBlocked: false,
        reason: "production_guard",
      }),
    );
    expect(provider.getHealth()).toEqual(
      expect.objectContaining({
        productionGuard: false,
        blocksRealUsersGlobally: false,
      }),
    );
    expect(adapter.getHealth().trackedKeys).toBe(0);
  });

  it("defines disabled policies for read, mutation, job, realtime, and AI operations", () => {
    expect(RATE_ENFORCEMENT_POLICY_REGISTRY).toHaveLength(19);
    expect(getRateEnforcementPoliciesByCategory("read")).toHaveLength(8);
    expect(getRateEnforcementPoliciesByCategory("mutation")).toHaveLength(5);
    expect(getRateEnforcementPoliciesByCategory("job")).toHaveLength(3);
    expect(getRateEnforcementPoliciesByCategory("realtime")).toHaveLength(2);
    expect(getRateEnforcementPoliciesByCategory("ai")).toHaveLength(1);

    for (const policy of RATE_ENFORCEMENT_POLICY_REGISTRY) {
      expect(validateRateEnforcementPolicy(policy)).toBe(true);
      expect(policy.defaultEnabled).toBe(false);
      expect(policy.enforcementEnabledByDefault).toBe(false);
      expect(policy.piiSafeKey).toBe(true);
    }

    for (const operation of BFF_READ_RATE_LIMIT_OPERATIONS) {
      expect(getRateEnforcementPolicy(operation)).toEqual(
        expect.objectContaining({ category: "read", defaultEnabled: false }),
      );
    }
    for (const operation of BFF_MUTATION_RATE_LIMIT_OPERATIONS) {
      expect(getRateEnforcementPolicy(operation)).toEqual(
        expect.objectContaining({
          category: "mutation",
          idempotencyKeyRequiredForMutations: true,
          defaultEnabled: false,
        }),
      );
    }

    expect(getRateEnforcementPolicy("ai.workflow.action")).toEqual(
      expect.objectContaining({
        category: "ai",
        maxRequests: 5,
        burst: 1,
        defaultEnabled: false,
      }),
    );
    expect(getRateEnforcementPolicy("notification.fanout")).toEqual(
      expect.objectContaining({
        category: "job",
        maxRequests: 5,
        burst: 1,
        severity: "critical",
      }),
    );
  });

  it("attaches disabled rate metadata to BFF read and mutation boundaries", () => {
    expect(BFF_READ_HANDLER_OPERATIONS).toEqual(BFF_READ_RATE_LIMIT_OPERATIONS);
    for (const operation of BFF_READ_HANDLER_OPERATIONS) {
      const policy = getRateEnforcementPolicyForBffReadOperation(operation);
      expect(policy).toBeTruthy();
      expect(
        getBffReadHandlerMetadata(operation).rateEnforcementPolicy,
      ).toEqual(
        expect.objectContaining({
          operation,
          defaultEnabled: false,
          enforcementEnabledByDefault: false,
        }),
      );
    }

    expect(BFF_MUTATION_HANDLER_OPERATIONS).toEqual(
      BFF_MUTATION_RATE_LIMIT_OPERATIONS,
    );
    for (const operation of BFF_MUTATION_HANDLER_OPERATIONS) {
      const policy = getRateEnforcementPolicyForBffMutationOperation(operation);
      expect(policy).toBeTruthy();
      expect(
        getBffMutationHandlerMetadata(operation).rateEnforcementPolicy,
      ).toEqual(
        expect.objectContaining({
          operation,
          idempotencyKeyRequiredForMutations: true,
          defaultEnabled: false,
          enforcementEnabledByDefault: false,
        }),
      );
    }

    for (const route of BFF_STAGING_READ_ROUTES) {
      expect(route.rateLimitPolicyOperation).toBe(route.operation);
      expect(route.rateLimitPolicyDefaultEnabled).toBe(false);
      expect(route.rateLimitEnforcementEnabledByDefault).toBe(false);
    }
    for (const route of BFF_STAGING_MUTATION_ROUTES) {
      expect(route.rateLimitPolicyOperation).toBe(route.operation);
      expect(route.rateLimitPolicyDefaultEnabled).toBe(false);
      expect(route.rateLimitEnforcementEnabledByDefault).toBe(false);
      expect(route.requiresRateLimitMetadata).toBe(true);
    }
    expect(BFF_STAGING_SERVER_BOUNDARY_CONTRACT).toEqual(
      expect.objectContaining({
        readRoutesWithRateLimitMetadata: 5,
        mutationRoutesWithRateLimitMetadata: 5,
        rateLimitEnforcementEnabledByDefault: false,
      }),
    );
  });

  it("attaches job/cache/idempotency rate metadata without enabling execution", () => {
    expect(JOB_RATE_LIMIT_OPERATIONS).toEqual([
      "notification.fanout",
      "cache.readmodel.refresh",
      "offline.replay.bridge",
    ]);

    const mappedJobs = JOB_POLICY_REGISTRY.filter((policy) =>
      getRateEnforcementPolicyForJobType(policy.jobType),
    );
    expect(mappedJobs).toHaveLength(8);
    for (const policy of mappedJobs) {
      expect(policy.rateLimitEnforcementOperation).toBe(
        getRateEnforcementPolicyForJobType(policy.jobType)?.operation,
      );
      expect(policy.rateLimitEnforcementDefaultEnabled).toBe(false);
      expect(policy.rateLimitEnforcementEnabledByDefault).toBe(false);
    }

    expect(
      getRateEnforcementPolicyForJobType("cache.readmodel.refresh"),
    ).toEqual(
      expect.objectContaining({
        operation: "cache.readmodel.refresh",
        category: "job",
      }),
    );
    expect(getRateEnforcementPolicyForJobType("offline.replay.bridge")).toEqual(
      expect.objectContaining({
        operation: "offline.replay.bridge",
        idempotencyKeyRequiredForMutations: true,
      }),
    );
  });

  it("builds deterministic bounded PII-safe keys and rejects unsafe key material", () => {
    const policy = getRateEnforcementPolicy("proposal.submit");
    expect(policy).toBeTruthy();
    if (!policy) return;

    const first = buildSafeRateLimitKey(policy, {
      actorId: "actor-opaque",
      companyId: "company-opaque",
      idempotencyKey: "idem-opaque",
      routeKey: "proposal-submit-route",
    });
    const second = buildSafeRateLimitKey(policy, {
      companyId: "company-opaque",
      routeKey: "proposal-submit-route",
      idempotencyKey: "idem-opaque",
      actorId: "actor-opaque",
    });

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (first.ok) {
      expect(assertRateLimitKeyIsBounded(first.key)).toBe(true);
      expect(first.key).toContain("proposal.submit");
      expect(first.key).not.toContain("actor-opaque");
      expect(first.key).not.toContain("company-opaque");
      expect(first.key).not.toContain("idem-opaque");
      expect(first.rawPiiInKey).toBe(false);
    }

    expect(
      buildSafeRateLimitKey(policy, {
        actorId: "actor-opaque",
        companyId: "company-opaque",
        payload: { email: "person@example.test" },
        idempotencyKey: "idem-opaque",
      }),
    ).toEqual({ ok: false, reason: "forbidden_field" });
    expect(
      buildSafeRateLimitKey(policy, {
        actorId: "actor-opaque",
        companyId: "company-opaque",
        idempotencyKey:
          "https://files.example.invalid/doc.pdf?token=signed-secret",
      }),
    ).toEqual({ ok: false, reason: "sensitive_value" });
    expect(
      buildSafeRateLimitKey(policy, {
        actorId: "actor-opaque",
        companyId: "company-opaque",
      }),
    ).toEqual({ ok: false, reason: "missing_idempotency_key" });
  });

  it("returns redacted observe-only abuse decisions without blocking real users by default", () => {
    const missingIdempotency = buildAbuseEnforcementDecision({
      missingIdempotencyKey: true,
    });
    expect(missingIdempotency).toEqual({
      action: "observe",
      reasonCode: "missing_idempotency_key",
      safeMessage: "Mutation request is missing idempotency metadata",
      enforcementEnabled: false,
      realUsersBlocked: false,
      rawPayloadLogged: false,
      piiLogged: false,
      observability: expect.objectContaining({
        suspiciousEvent: "abuse.suspicious",
        externalExportEnabledByDefault: false,
      }),
    });
    expect(validateAbuseEnforcementDecision(missingIdempotency)).toBe(true);

    const burst = buildAbuseEnforcementDecision({
      rateLimitState: "soft_limited",
    });
    expect(burst.reasonCode).toBe("burst_exceeded");
    expect(burst.realUsersBlocked).toBe(false);

    const fanout = buildAbuseEnforcementDecision({
      fanoutCount: 10_000,
      fanoutMax: 100,
    });
    expect(fanout.reasonCode).toBe("suspicious_fanout");
    expect(JSON.stringify(fanout)).not.toContain("10_000");
    expect(validateAbuseEnforcementDecision(fanout)).toBe(true);
  });

  it("does not replace app flows, log raw payloads, or touch forbidden platform files", () => {
    const roots = [
      "app",
      "src/screens",
      "src/components",
      "src/features",
      "src/lib/api",
    ];
    const activeImports: string[] = [];

    const walk = (relativeDir: string) => {
      const fullDir = path.join(PROJECT_ROOT, relativeDir);
      if (!fs.existsSync(fullDir)) return;
      for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        const relativePath = path.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
          walk(relativePath);
          continue;
        }
        if (
          !/\.(ts|tsx)$/.test(entry.name) ||
          entry.name.endsWith(".test.ts") ||
          entry.name.endsWith(".test.tsx")
        ) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (
          source.includes("shared/scale/rateLimitAdapters") ||
          source.includes("shared/scale/rateLimitPolicies") ||
          source.includes("shared/scale/rateLimitKeySafety") ||
          source.includes("shared/scale/abuseEnforcementBoundary")
        ) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);

    expect(changedFiles()).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^(package\.json|package-lock\.json|app\.json|eas\.json)$/,
        ),
        expect.stringMatching(/^(android\/|ios\/|supabase\/migrations\/)/),
      ]),
    );

    const changedSource = [
      "src/shared/scale/rateLimitAdapters.ts",
      "src/shared/scale/rateLimitPolicies.ts",
      "src/shared/scale/rateLimitKeySafety.ts",
      "src/shared/scale/abuseEnforcementBoundary.ts",
    ]
      .map(readProjectFile)
      .join("\n");
    expect(changedSource).not.toMatch(/console\.(log|warn|error|info)/);
    expect(changedSource).not.toMatch(
      /rawPayloadLogged:\s*true|piiLogged:\s*true/,
    );
  });

  it("keeps artifacts valid JSON", () => {
    const matrix = JSON.parse(
      readProjectFile("artifacts/S_50K_RATE_ENFORCEMENT_1_matrix.json"),
    );
    expect(matrix.wave).toBe("S-50K-RATE-ENFORCEMENT-1");
    expect(matrix.rateLimitBoundary.enabledByDefault).toBe(false);
    expect(matrix.rateLimitBoundary.realUsersBlockedByDefault).toBe(false);
    expect(matrix.policies.total).toBe(19);
    expect(matrix.integration.bffReadRoutesWithRateLimitMetadata).toBe(5);
    expect(matrix.integration.bffMutationRoutesWithRateLimitMetadata).toBe(5);
    expect(matrix.safety.packageNativeChanged).toBe(false);

    const runtimeMatrix = JSON.parse(
      readProjectFile("artifacts/S_50K_RATE_RUNTIME_ADAPTER_2_matrix.json"),
    );
    expect(runtimeMatrix.wave).toBe("S-50K-RATE-RUNTIME-ADAPTER-2");
    expect(runtimeMatrix.status).toBe("GREEN_RATE_RUNTIME_GUARDRAIL_READY");
    expect(runtimeMatrix.runtimeGuardrails.maxTrackedKeysDefault).toBe(
      IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS,
    );
    expect(runtimeMatrix.safety.productionTouched).toBe(false);
    expect(runtimeMatrix.safety.stagingTouched).toBe(false);
    expect(runtimeMatrix.safety.appRuntimeRateLimitEnabled).toBe(false);
  });
});
