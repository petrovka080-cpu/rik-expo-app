import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  NoopCacheAdapter,
  InMemoryCacheAdapter,
  RedisRestCacheAdapter,
  createRedisCacheAdapterFromEnv,
  type RedisRestFetch,
} from "../../src/shared/scale/cacheAdapters";
import {
  CACHE_HOTSPOT_ROUTES,
  CACHE_POLICY_REGISTRY,
  CACHE_READ_ROUTE_OPERATIONS,
  getCachePolicy,
  getHotspotCachePolicies,
  getReadRouteCachePolicies,
} from "../../src/shared/scale/cachePolicies";
import {
  assertCacheKeyIsBounded,
  buildSafeCacheKey,
} from "../../src/shared/scale/cacheKeySafety";
import {
  CACHE_INVALIDATION_MAPPINGS,
  getInvalidationTagsForOperation,
  isCacheInvalidationExecutionEnabled,
  type CacheInvalidationOperation,
} from "../../src/shared/scale/cacheInvalidation";
import {
  BFF_STAGING_MUTATION_ROUTES,
  BFF_STAGING_READ_ROUTES,
} from "../../scripts/server/stagingBffServerBoundary";
import {
  getBffReadHandlerMetadata,
  type BffReadOperation,
} from "../../src/shared/scale/bffReadHandlers";
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

const createRedisRestMock = () => {
  let now = 0;
  const values = new Map<string, { value: string; expiresAt: number | null }>();
  const sets = new Map<string, { members: Set<string>; expiresAt: number | null }>();
  const commands: (string | number)[][] = [];

  const purgeExpired = () => {
    for (const [key, entry] of values.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) values.delete(key);
    }
    for (const [key, entry] of sets.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) sets.delete(key);
    }
  };

  const fetchMock = jest.fn(async (_input: string, init: Parameters<RedisRestFetch>[1]) => {
    purgeExpired();
    const command = JSON.parse(init.body) as (string | number)[];
    commands.push(command);
    const operation = String(command[0] ?? "").toUpperCase();
    let result: unknown = null;

    if (operation === "SET" && typeof command[1] === "string" && typeof command[2] === "string") {
      const ttlIndex = command.findIndex((part) => String(part).toUpperCase() === "PX");
      const ttlMs = ttlIndex >= 0 ? Number(command[ttlIndex + 1]) : 0;
      values.set(command[1], {
        value: command[2],
        expiresAt: Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : null,
      });
      result = "OK";
    }

    if (operation === "GET" && typeof command[1] === "string") {
      result = values.get(command[1])?.value ?? null;
    }

    if (operation === "DEL") {
      let deleted = 0;
      for (const key of command.slice(1)) {
        if (typeof key !== "string") continue;
        if (values.delete(key)) deleted += 1;
        if (sets.delete(key)) deleted += 1;
      }
      result = deleted;
    }

    if (operation === "SADD" && typeof command[1] === "string") {
      const set = sets.get(command[1]) ?? { members: new Set<string>(), expiresAt: null };
      for (const member of command.slice(2)) {
        if (typeof member === "string") set.members.add(member);
      }
      sets.set(command[1], set);
      result = set.members.size;
    }

    if (operation === "PEXPIRE" && typeof command[1] === "string") {
      const ttlMs = Number(command[2]);
      const set = sets.get(command[1]);
      if (set && Number.isFinite(ttlMs) && ttlMs > 0) {
        set.expiresAt = now + ttlMs;
        result = 1;
      } else {
        result = 0;
      }
    }

    if (operation === "SMEMBERS" && typeof command[1] === "string") {
      result = Array.from(sets.get(command[1])?.members ?? []);
    }

    return {
      ok: true,
      json: async () => ({ result }),
    };
  }) as jest.MockedFunction<RedisRestFetch>;

  return {
    commands,
    fetchMock,
    advance: (ms: number) => {
      now += ms;
    },
  };
};

describe("S-50K-CACHE-INTEGRATION-1 disabled cache boundary", () => {
  it("keeps noop and in-memory adapters local without external network calls", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      const noop = new NoopCacheAdapter();
      await expect(noop.get("key")).resolves.toBeNull();
      await expect(noop.set("key", { ok: true }, { ttlMs: 1000, tags: ["tag"] })).resolves.toBeUndefined();
      await expect(noop.invalidateByTag("tag")).resolves.toBe(0);
      expect(noop.getStatus()).toEqual({
        kind: "noop",
        enabled: false,
        externalNetworkEnabled: false,
      });

      let now = 1_000;
      const memory = new InMemoryCacheAdapter(() => now);
      await memory.set("cache:v1:test", { row: 1 }, { ttlMs: 50, tags: ["proposal"] });
      await expect(memory.get("cache:v1:test")).resolves.toEqual({ row: 1 });
      now = 1_060;
      await expect(memory.get("cache:v1:test")).resolves.toBeNull();

      await memory.set("cache:v1:a", "a", { ttlMs: 1_000, tags: ["proposal"] });
      await memory.set("cache:v1:b", "b", { ttlMs: 1_000, tags: ["stock"] });
      await expect(memory.invalidateByTag("proposal")).resolves.toBe(1);
      await expect(memory.get("cache:v1:a")).resolves.toBeNull();
      await expect(memory.get("cache:v1:b")).resolves.toBe("b");
      expect(memory.getStatus()).toEqual(expect.objectContaining({
        kind: "in_memory",
        enabled: true,
        externalNetworkEnabled: false,
        entryCount: 1,
        maxEntries: 1_000,
        maxValueBytes: 262_144,
      }));
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

  it("keeps the in-memory runtime adapter bounded without logging payloads", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      let now = 2_000;
      const memory = new InMemoryCacheAdapter({
        now: () => now,
        maxEntries: 2,
        maxValueBytes: 32,
        maxTags: 2,
        maxTagLength: 12,
      });

      await memory.set("cache:v1:a", "a", { ttlMs: 1_000, tags: ["keep"] });
      await memory.set("cache:v1:b", "b", { ttlMs: 1_000, tags: ["keep", "keep", "second", "third"] });
      await memory.set("cache:v1:c", "c", { ttlMs: 1_000, tags: ["third"] });

      await expect(memory.get("cache:v1:a")).resolves.toBeNull();
      await expect(memory.get("cache:v1:b")).resolves.toBe("b");
      await expect(memory.get("cache:v1:c")).resolves.toBe("c");
      expect(memory.getStatus()).toEqual(expect.objectContaining({
        kind: "in_memory",
        enabled: true,
        externalNetworkEnabled: false,
        entryCount: 2,
        maxEntries: 2,
        maxValueBytes: 32,
      }));

      await memory.set("cache:v1:oversize", { payload: "x".repeat(64) }, { ttlMs: 1_000, tags: ["keep"] });
      await memory.set("", "invalid", { ttlMs: 1_000, tags: ["keep"] });
      await expect(memory.get("cache:v1:oversize")).resolves.toBeNull();
      await expect(memory.get("")).resolves.toBeNull();

      await expect(memory.invalidateByTag("third")).resolves.toBe(1);
      await expect(memory.get("cache:v1:c")).resolves.toBeNull();
      await expect(memory.get("cache:v1:b")).resolves.toBe("b");

      now = 3_100;
      await expect(memory.get("cache:v1:b")).resolves.toBeNull();
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
  });

  it("keeps Redis/Upstash cache provider disabled by default and staging-gated", async () => {
    const redis = createRedisRestMock();

    const disabled = createRedisCacheAdapterFromEnv({}, {
      runtimeEnvironment: "staging",
      fetchImpl: redis.fetchMock,
    });
    expect(disabled).toBeInstanceOf(NoopCacheAdapter);
    expect(disabled.getStatus()).toEqual({
      kind: "noop",
      enabled: false,
      externalNetworkEnabled: false,
    });
    await disabled.set("cache:v1:disabled", { ok: true }, { ttlMs: 1_000 });
    expect(redis.fetchMock).not.toHaveBeenCalled();

    const staging = createRedisCacheAdapterFromEnv(
      {
        SCALE_REDIS_CACHE_STAGING_ENABLED: "true",
        SCALE_REDIS_CACHE_URL: "https://cache.example.invalid",
        SCALE_REDIS_CACHE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "staging",
        fetchImpl: redis.fetchMock,
      },
    );
    expect(staging.getStatus()).toEqual(
      expect.objectContaining({
        kind: "redis_rest",
        enabled: true,
        externalNetworkEnabled: true,
        namespace: "rik-staging",
      }),
    );

    const production = createRedisCacheAdapterFromEnv(
      {
        SCALE_REDIS_CACHE_STAGING_ENABLED: "true",
        SCALE_REDIS_CACHE_URL: "https://cache.example.invalid",
        SCALE_REDIS_CACHE_NAMESPACE: "rik-staging",
      },
      {
        runtimeEnvironment: "production",
        fetchImpl: redis.fetchMock,
      },
    );
    expect(production).toBeInstanceOf(NoopCacheAdapter);
    expect(production.getStatus().externalNetworkEnabled).toBe(false);
  });

  it("implements Redis/Upstash set/get/delete and TTL behavior through a mocked provider", async () => {
    const redis = createRedisRestMock();
    const adapter = new RedisRestCacheAdapter({
      baseUrl: "https://cache.example.invalid",
      namespace: "rik-staging",
      fetchImpl: redis.fetchMock,
    });

    await adapter.set("cache:v1:item", { ok: true, count: 2 }, { ttlMs: 50, tags: ["item"] });
    await expect(adapter.get("cache:v1:item")).resolves.toEqual({ ok: true, count: 2 });

    redis.advance(51);
    await expect(adapter.get("cache:v1:item")).resolves.toBeNull();

    await adapter.set("cache:v1:item", "present", { ttlMs: 1_000, tags: ["item"] });
    await expect(adapter.get("cache:v1:item")).resolves.toBe("present");
    await adapter.delete("cache:v1:item");
    await expect(adapter.get("cache:v1:item")).resolves.toBeNull();
  });

  it("keeps Redis/Upstash cache keys namespace-isolated for tag invalidation", async () => {
    const redis = createRedisRestMock();
    const stagingA = new RedisRestCacheAdapter({
      baseUrl: "https://cache.example.invalid",
      namespace: "rik-staging-a",
      fetchImpl: redis.fetchMock,
    });
    const stagingB = new RedisRestCacheAdapter({
      baseUrl: "https://cache.example.invalid",
      namespace: "rik-staging-b",
      fetchImpl: redis.fetchMock,
    });

    await stagingA.set("cache:v1:shared", "a", { ttlMs: 1_000, tags: ["shared"] });
    await stagingB.set("cache:v1:shared", "b", { ttlMs: 1_000, tags: ["shared"] });

    await expect(stagingA.invalidateByTag("shared")).resolves.toBe(1);
    await expect(stagingA.get("cache:v1:shared")).resolves.toBeNull();
    await expect(stagingB.get("cache:v1:shared")).resolves.toBe("b");

    const touchedRedisKeys = redis.commands.flatMap((command) =>
      command
        .slice(1)
        .filter((part): part is string => typeof part === "string" && part.includes("cache:v1")),
    );
    expect(touchedRedisKeys.length).toBeGreaterThan(0);
    expect(
      touchedRedisKeys.every(
        (key) => key.startsWith("rik-staging-a:") || key.startsWith("rik-staging-b:"),
      ),
    ).toBe(true);
  });

  it("keeps Redis/Upstash provider secrets out of public mobile env names", () => {
    const redisEnvNames = [
      SCALE_PROVIDER_RUNTIME_ENV_NAMES.redis_cache.enabled,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.redis_cache.required,
      ...SCALE_PROVIDER_RUNTIME_ENV_NAMES.redis_cache.optional,
    ];

    expect(redisEnvNames).toEqual([
      "SCALE_REDIS_CACHE_STAGING_ENABLED",
      "SCALE_REDIS_CACHE_URL",
      "SCALE_REDIS_CACHE_NAMESPACE",
    ]);
    expect(redisEnvNames.every((name) => !name.startsWith("EXPO_PUBLIC_"))).toBe(true);
    expect(redisEnvNames).not.toContain("BFF_SERVER_AUTH_SECRET");
    expect(redisEnvNames).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
    expect(readProjectFile("src/shared/scale/cacheAdapters.ts")).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
  });

  it("defines disabled cache policies for BFF read routes and load hotspots", () => {
    expect(CACHE_POLICY_REGISTRY).toHaveLength(8);
    expect(CACHE_POLICY_REGISTRY.every((policy) => policy.defaultEnabled === false)).toBe(true);
    expect(CACHE_POLICY_REGISTRY.every((policy) => policy.piiSafe === true)).toBe(true);
    expect(CACHE_POLICY_REGISTRY.every((policy) => policy.maxPayloadBytes <= 262_144)).toBe(true);

    expect(getReadRouteCachePolicies().map((policy) => policy.route)).toEqual(CACHE_READ_ROUTE_OPERATIONS);
    expect(getHotspotCachePolicies().map((policy) => policy.route)).toEqual(CACHE_HOTSPOT_ROUTES);

    expect(getCachePolicy("accountant.invoice.list")).toEqual(
      expect.objectContaining({
        ttlMs: 15_000,
        payloadClass: "finance_sensitive",
        defaultEnabled: false,
      }),
    );
    expect(getCachePolicy("warehouse.stock.page")).toEqual(
      expect.objectContaining({
        ttlMs: 5_000,
        staleWhileRevalidateMs: 0,
        disabledReason: expect.stringContaining("freshness proof"),
      }),
    );
  });

  it("adds cache policy metadata to read routes without enabling execution", () => {
    expect(BFF_STAGING_READ_ROUTES).toHaveLength(5);
    for (const route of BFF_STAGING_READ_ROUTES) {
      const operation = route.operation as BffReadOperation;
      expect(route.cachePolicyRoute).toBe(operation);
      expect(route.cachePolicyDefaultEnabled).toBe(false);

      const metadata = getBffReadHandlerMetadata(operation);
      expect(metadata.cacheIntegrationPolicy).toEqual(
        expect.objectContaining({
          route: route.operation,
          defaultEnabled: false,
          piiSafe: true,
        }),
      );
    }
  });

  it("builds deterministic bounded PII-safe cache keys and rejects unsafe input", () => {
    const policy = getCachePolicy("marketplace.catalog.search");
    const safeKey = buildSafeCacheKey(policy, {
      companyId: "company-123",
      query: "cement",
      category: "materials",
      page: 1,
      pageSize: 50,
    });

    expect(safeKey.ok).toBe(true);
    if (safeKey.ok) {
      expect(assertCacheKeyIsBounded(safeKey.key)).toBe(true);
      expect(safeKey.key).toContain("marketplace.catalog.search");
      expect(safeKey.key).not.toContain("company-123");
      expect(safeKey.key).not.toContain("cement");
      expect(safeKey.key.length).toBeLessThanOrEqual(160);
      expect(buildSafeCacheKey(policy, {
        companyId: "company-123",
        query: "cement",
        category: "materials",
        page: 1,
        pageSize: 50,
      })).toEqual(safeKey);
    }

    expect(buildSafeCacheKey(policy, { email: "person@example.test" })).toEqual({
      ok: false,
      reason: "forbidden_field",
    });
    expect(buildSafeCacheKey(policy, { query: "call +996 555 123 456" })).toEqual({
      ok: false,
      reason: "sensitive_value",
    });
    expect(buildSafeCacheKey(policy, { query: "token=supersecretvalue" })).toEqual({
      ok: false,
      reason: "sensitive_value",
    });
  });

  it("maps mutation operations to disabled invalidation tags", () => {
    expect(CACHE_INVALIDATION_MAPPINGS).toHaveLength(6);
    expect(CACHE_INVALIDATION_MAPPINGS.every((mapping) => mapping.executionEnabledByDefault === false)).toBe(true);
    expect(getInvalidationTagsForOperation("proposal.submit")).toEqual(
      expect.arrayContaining(["proposal", "request", "director_pending"]),
    );
    expect(getInvalidationTagsForOperation("warehouse.receive.apply")).toEqual(
      expect.arrayContaining(["warehouse", "stock", "ledger"]),
    );
    expect(getInvalidationTagsForOperation("notification.fanout")).toEqual(
      expect.arrayContaining(["notification", "inbox"]),
    );
    expect(isCacheInvalidationExecutionEnabled({ enabled: true })).toBe(false);

    for (const route of BFF_STAGING_MUTATION_ROUTES) {
      const operation = route.operation as CacheInvalidationOperation;
      expect(route.invalidationTags).toEqual(getInvalidationTagsForOperation(operation));
      expect(route.enabledByDefault).toBe(false);
    }
  });

  it("does not replace app Supabase flows or touch forbidden platform files", () => {
    const roots = ["app", "src/screens", "src/components", "src/features", "src/lib/api"];
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
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (
          source.includes("shared/scale/cacheAdapters") ||
          source.includes("shared/scale/cachePolicies") ||
          source.includes("shared/scale/cacheKeySafety") ||
          source.includes("shared/scale/cacheInvalidation")
        ) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
    expect(changedFiles()).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(package\.json|package-lock\.json|app\.json|eas\.json)$/),
        expect.stringMatching(/^(android\/|ios\/|supabase\/migrations\/)/),
      ]),
    );
  });

  it("keeps artifacts valid JSON", () => {
    const matrix = JSON.parse(readProjectFile("artifacts/S_50K_CACHE_INTEGRATION_1_matrix.json"));
    expect(matrix.wave).toBe("S-50K-CACHE-INTEGRATION-1");
    expect(matrix.cacheBoundary.enabledByDefault).toBe(false);
    expect(matrix.policies.readRoutesCovered).toBe(5);
    expect(matrix.policies.hotspotsCovered).toBe(3);
    expect(matrix.safety.packageNativeChanged).toBe(false);

    const runtimeMatrix = JSON.parse(readProjectFile("artifacts/S_50K_CACHE_RUNTIME_ADAPTER_2_matrix.json"));
    expect(runtimeMatrix.wave).toBe("S-50K-CACHE-RUNTIME-ADAPTER-2");
    expect(runtimeMatrix.status).toBe("GREEN_CACHE_RUNTIME_GUARDRAIL_READY");
    expect(runtimeMatrix.runtimeGuardrails.enabledByDefault).toBe(false);
    expect(runtimeMatrix.runtimeGuardrails.externalNetworkEnabled).toBe(false);
    expect(runtimeMatrix.safety.productionTouched).toBe(false);
    expect(runtimeMatrix.safety.stagingTouched).toBe(false);
  });
});
