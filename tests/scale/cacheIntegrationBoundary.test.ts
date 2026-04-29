import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { NoopCacheAdapter, InMemoryCacheAdapter } from "../../src/shared/scale/cacheAdapters";
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
      expect(memory.getStatus()).toEqual({
        kind: "in_memory",
        enabled: true,
        externalNetworkEnabled: false,
      });
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
  });
});
