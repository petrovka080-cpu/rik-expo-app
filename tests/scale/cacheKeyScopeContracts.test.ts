import { buildSafeCacheKey } from "../../src/shared/scale/cacheKeySafety";
import { getCachePolicy, type CachePolicy, type CachePolicyRoute } from "../../src/shared/scale/cachePolicies";

const TOP_CACHE_SCOPE_ROUTES = Object.freeze([
  "marketplace.catalog.search",
  "request.proposal.list",
  "director.pending.list",
] satisfies readonly CachePolicyRoute[]);

const SENSITIVE_ROLE_SCOPED_ROUTES = Object.freeze([
  "request.proposal.list",
  "director.pending.list",
  "accountant.invoice.list",
] satisfies readonly CachePolicyRoute[]);

type CacheScopeInput = Record<string, unknown> & {
  filters: Record<string, unknown> | null | undefined;
};

const policyFor = (route: CachePolicyRoute): CachePolicy => {
  const policy = getCachePolicy(route);
  if (!policy) throw new Error(`Missing cache policy for ${route}`);
  return policy;
};

const keyFor = (route: CachePolicyRoute, input: Record<string, unknown>): string => {
  const result = buildSafeCacheKey(policyFor(route), input);
  if (!result.ok) throw new Error(`Cache key rejected for ${route}: ${result.reason}`);
  return result.key;
};

const sensitiveFilters = (): Record<string, unknown> => ({
  status: "pending",
  requestId: "request-cache-scope-opaque",
  projectId: "project-cache-scope-opaque",
  objectId: "object-cache-scope-opaque",
  sort: "submitted_at",
  direction: "desc",
});

const baseSensitiveInput = (): CacheScopeInput => ({
  companyId: "company-cache-scope-opaque",
  actorId: "actor-cache-scope-opaque-a",
  role: "director",
  page: 1,
  pageSize: 25,
  filters: sensitiveFilters(),
});

const marketplaceFilters = (): Record<string, unknown> => ({
  kind: "material",
  scope: "public",
  sort: "price",
  direction: "asc",
});

const baseMarketplaceInput = (): CacheScopeInput => ({
  companyId: "company-cache-scope-opaque",
  query: "cement",
  category: "materials",
  page: 1,
  pageSize: 25,
  locale: "ru-KG",
  filters: marketplaceFilters(),
});

describe("S-AUDIT-NIGHT-BATTLE-139 cache key and scope contracts", () => {
  it("locks key dimensions for top read-through candidates", () => {
    expect(policyFor("marketplace.catalog.search").keyParts).toEqual([
      "companyId",
      "queryHash",
      "category",
      "page",
      "pageSize",
      "filtersHash",
      "locale",
    ]);
    expect(policyFor("request.proposal.list").keyParts).toEqual([
      "companyId",
      "actorIdHash",
      "role",
      "page",
      "pageSize",
      "filtersHash",
    ]);
    expect(policyFor("director.pending.list").keyParts).toEqual([
      "companyId",
      "actorIdHash",
      "role",
      "page",
      "pageSize",
      "filtersHash",
    ]);
    expect(policyFor("accountant.invoice.list").keyParts).toEqual([
      "companyId",
      "actorIdHash",
      "role",
      "page",
      "pageSize",
      "filtersHash",
    ]);
  });

  it("keeps two users from sharing sensitive cache keys", () => {
    for (const route of SENSITIVE_ROLE_SCOPED_ROUTES) {
      const first = keyFor(route, baseSensitiveInput());
      const second = keyFor(route, {
        ...baseSensitiveInput(),
        actorId: "actor-cache-scope-opaque-b",
      });

      expect(second).not.toBe(first);
      expect(first).not.toContain("actor-cache-scope-opaque-a");
      expect(second).not.toContain("actor-cache-scope-opaque-b");
    }
  });

  it("keeps two roles from sharing sensitive cache keys", () => {
    for (const route of SENSITIVE_ROLE_SCOPED_ROUTES) {
      const directorKey = keyFor(route, baseSensitiveInput());
      const accountantKey = keyFor(route, {
        ...baseSensitiveInput(),
        role: "accountant",
      });

      expect(accountantKey).not.toBe(directorKey);
    }
  });

  it("separates object, project, request, pagination, and filter dimensions", () => {
    const dimensions: readonly [string, Record<string, unknown>][] = [
      ["requestId", { filters: { ...sensitiveFilters(), requestId: "request-cache-scope-other" } }],
      ["projectId", { filters: { ...sensitiveFilters(), projectId: "project-cache-scope-other" } }],
      ["objectId", { filters: { ...sensitiveFilters(), objectId: "object-cache-scope-other" } }],
      ["status", { filters: { ...sensitiveFilters(), status: "approved" } }],
      ["sort", { filters: { ...sensitiveFilters(), sort: "created_at" } }],
      ["page", { page: 2 }],
      ["pageSize", { pageSize: 50 }],
    ];

    for (const route of ["request.proposal.list", "director.pending.list"] satisfies readonly CachePolicyRoute[]) {
      const baseKey = keyFor(route, baseSensitiveInput());
      for (const [dimension, patch] of dimensions) {
        expect(keyFor(route, { ...baseSensitiveInput(), ...patch })).not.toBe(baseKey);
        expect(dimension).toBeTruthy();
      }
    }
  });

  it("separates marketplace query, filter, locale, and pagination dimensions", () => {
    const baseKey = keyFor("marketplace.catalog.search", baseMarketplaceInput());
    const changes: readonly Record<string, unknown>[] = [
      { query: "brick" },
      { category: "tools" },
      { page: 2 },
      { pageSize: 50 },
      { locale: "en-US" },
      { filters: { ...marketplaceFilters(), sort: "rating" } },
      { filters: { ...marketplaceFilters(), direction: "desc" } },
      { filters: { ...marketplaceFilters(), scope: "supplier" } },
    ];

    for (const patch of changes) {
      expect(keyFor("marketplace.catalog.search", { ...baseMarketplaceInput(), ...patch })).not.toBe(baseKey);
    }
  });

  it("keeps same semantic query stable and normalizes null and undefined consistently", () => {
    for (const route of TOP_CACHE_SCOPE_ROUTES) {
      const input = route === "marketplace.catalog.search" ? baseMarketplaceInput() : baseSensitiveInput();
      expect(keyFor(route, input)).toBe(keyFor(route, { ...input }));
      expect(keyFor(route, { ...input, filters: { b: 2, a: 1 } })).toBe(
        keyFor(route, { ...input, filters: { a: 1, b: 2 } }),
      );
      expect(keyFor(route, { ...input, locale: null, filters: null })).toBe(
        keyFor(route, { ...input, locale: undefined, filters: undefined }),
      );
    }
  });

  it("rejects auth/session secret material and keeps raw IDs out of keys", () => {
    expect(buildSafeCacheKey(policyFor("request.proposal.list"), {
      ...baseSensitiveInput(),
      sessionToken: "token=supersecretvalue",
    })).toEqual({
      ok: false,
      reason: "forbidden_field",
    });

    const key = keyFor("request.proposal.list", baseSensitiveInput());
    expect(key).not.toContain("request-cache-scope-opaque");
    expect(key).not.toContain("project-cache-scope-opaque");
    expect(key).not.toContain("object-cache-scope-opaque");
    expect(key).not.toContain("company-cache-scope-opaque");
  });
});
