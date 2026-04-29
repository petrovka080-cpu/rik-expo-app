import type { BffReadOperation } from "./bffReadHandlers";
import {
  CACHE_OBSERVABILITY_EVENT_MAP,
  type CacheObservabilityMetadata,
} from "./scaleObservabilityEvents";

export type CachePolicyRoute =
  | BffReadOperation
  | "warehouse.stock.page"
  | "buyer.summary.inbox"
  | "warehouse.issue.queue";

export type CachePayloadClass =
  | "public_catalog"
  | "tenant_business"
  | "finance_sensitive"
  | "stock_freshness_sensitive";

export type CachePolicy = {
  route: CachePolicyRoute;
  ttlMs: number;
  staleWhileRevalidateMs: number;
  tags: readonly string[];
  keyParts: readonly string[];
  maxPayloadBytes: number;
  piiSafe: boolean;
  payloadClass: CachePayloadClass;
  defaultEnabled: false;
  disabledReason: string;
  observability: CacheObservabilityMetadata;
};

const policy = (value: Omit<CachePolicy, "observability">): CachePolicy =>
  Object.freeze({
    ...value,
    observability: CACHE_OBSERVABILITY_EVENT_MAP[value.route],
  });

export const CACHE_POLICY_REGISTRY: readonly CachePolicy[] = Object.freeze([
  policy({
    route: "request.proposal.list",
    ttlMs: 60_000,
    staleWhileRevalidateMs: 120_000,
    tags: ["request", "proposal", "director_pending"],
    keyParts: ["companyId", "role", "page", "pageSize", "filtersHash"],
    maxPayloadBytes: 196_608,
    piiSafe: true,
    payloadClass: "tenant_business",
    defaultEnabled: false,
    disabledReason: "server cache boundary is not enabled for app traffic",
  }),
  policy({
    route: "marketplace.catalog.search",
    ttlMs: 120_000,
    staleWhileRevalidateMs: 300_000,
    tags: ["marketplace", "catalog", "supplier"],
    keyParts: ["companyId", "queryHash", "category", "page", "pageSize"],
    maxPayloadBytes: 262_144,
    piiSafe: true,
    payloadClass: "public_catalog",
    defaultEnabled: false,
    disabledReason: "server cache boundary is not enabled for app traffic",
  }),
  policy({
    route: "warehouse.ledger.list",
    ttlMs: 30_000,
    staleWhileRevalidateMs: 30_000,
    tags: ["warehouse", "ledger", "stock"],
    keyParts: ["companyId", "warehouseIdHash", "page", "pageSize", "filtersHash"],
    maxPayloadBytes: 196_608,
    piiSafe: true,
    payloadClass: "stock_freshness_sensitive",
    defaultEnabled: false,
    disabledReason: "warehouse ledger freshness requires explicit server invalidation proof",
  }),
  policy({
    route: "accountant.invoice.list",
    ttlMs: 15_000,
    staleWhileRevalidateMs: 15_000,
    tags: ["accountant", "invoice", "payment"],
    keyParts: ["companyId", "role", "page", "pageSize", "filtersHash"],
    maxPayloadBytes: 131_072,
    piiSafe: true,
    payloadClass: "finance_sensitive",
    defaultEnabled: false,
    disabledReason: "finance payloads require conservative TTL and explicit server enablement",
  }),
  policy({
    route: "director.pending.list",
    ttlMs: 45_000,
    staleWhileRevalidateMs: 60_000,
    tags: ["director", "approval", "proposal"],
    keyParts: ["companyId", "role", "page", "pageSize", "filtersHash"],
    maxPayloadBytes: 196_608,
    piiSafe: true,
    payloadClass: "tenant_business",
    defaultEnabled: false,
    disabledReason: "server cache boundary is not enabled for app traffic",
  }),
  policy({
    route: "warehouse.issue.queue",
    ttlMs: 20_000,
    staleWhileRevalidateMs: 20_000,
    tags: ["warehouse", "issue_queue", "stock"],
    keyParts: ["companyId", "warehouseIdHash", "page", "pageSize", "filtersHash"],
    maxPayloadBytes: 131_072,
    piiSafe: true,
    payloadClass: "stock_freshness_sensitive",
    defaultEnabled: false,
    disabledReason: "S-LOAD hotspot still needs DB/RPC wave before live cache enablement",
  }),
  policy({
    route: "buyer.summary.inbox",
    ttlMs: 30_000,
    staleWhileRevalidateMs: 30_000,
    tags: ["buyer", "summary", "inbox", "proposal"],
    keyParts: ["companyId", "buyerIdHash", "page", "pageSize", "filtersHash"],
    maxPayloadBytes: 131_072,
    piiSafe: true,
    payloadClass: "tenant_business",
    defaultEnabled: false,
    disabledReason: "S-LOAD hotspot still needs DB/RPC wave before live cache enablement",
  }),
  policy({
    route: "warehouse.stock.page",
    ttlMs: 5_000,
    staleWhileRevalidateMs: 0,
    tags: ["warehouse", "stock"],
    keyParts: ["companyId", "warehouseIdHash", "page", "pageSize", "filtersHash"],
    maxPayloadBytes: 196_608,
    piiSafe: true,
    payloadClass: "stock_freshness_sensitive",
    defaultEnabled: false,
    disabledReason: "S-LOAD watch target needs freshness proof before cache enablement",
  }),
] as const);

export const CACHE_READ_ROUTE_OPERATIONS: readonly BffReadOperation[] = Object.freeze([
  "request.proposal.list",
  "marketplace.catalog.search",
  "warehouse.ledger.list",
  "accountant.invoice.list",
  "director.pending.list",
]);

export const CACHE_HOTSPOT_ROUTES: readonly CachePolicyRoute[] = Object.freeze([
  "warehouse.issue.queue",
  "buyer.summary.inbox",
  "warehouse.stock.page",
]);

export function getCachePolicy(route: CachePolicyRoute): CachePolicy | null {
  return CACHE_POLICY_REGISTRY.find((policyEntry) => policyEntry.route === route) ?? null;
}

export function getReadRouteCachePolicies(): readonly CachePolicy[] {
  return CACHE_READ_ROUTE_OPERATIONS
    .map((route) => getCachePolicy(route))
    .filter((entry): entry is CachePolicy => entry !== null);
}

export function getHotspotCachePolicies(): readonly CachePolicy[] {
  return CACHE_HOTSPOT_ROUTES
    .map((route) => getCachePolicy(route))
    .filter((entry): entry is CachePolicy => entry !== null);
}
