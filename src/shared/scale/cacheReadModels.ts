import { BFF_MAX_PAGE_SIZE, type BffFlow } from "./bffContracts";
import { redactBffText } from "./bffSafety";

export type CacheReadModelStatus = "contract_only" | "shadow_ready" | "active";

export type CacheConsistencyClass = "eventual" | "read_after_write_sensitive" | "artifact_versioned";

export type CacheReadModelConfig = {
  enabled: boolean;
  shadowMode?: boolean | null;
  baseUrl?: string | null;
};

export type CacheReadModelContract = {
  flow: BffFlow;
  modelName: string;
  status: CacheReadModelStatus;
  consistency: CacheConsistencyClass;
  ttlSeconds: number;
  maxPageSize: 100;
  invalidationEvents: readonly string[];
  backgroundRefresh: boolean;
  staleWhileRevalidate: boolean;
  piiAllowedInCacheKey: false;
};

export type CacheReadModelEnvelope<T> =
  | {
      ok: true;
      data: T;
      cache: {
        modelName: string;
        hit: boolean;
        stale: boolean;
        ttlSeconds: number;
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export const CACHE_READ_MODEL_MAX_TTL_SECONDS = 300;
export const CACHE_READ_MODEL_DEFAULT_TTL_SECONDS = 60;

export const CACHE_READ_MODEL_CONTRACTS: readonly CacheReadModelContract[] = [
  {
    flow: "request.list",
    modelName: "request_list_v1",
    status: "contract_only",
    consistency: "eventual",
    ttlSeconds: 60,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["request.created", "request.updated", "proposal.submitted"],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "proposal.list",
    modelName: "proposal_list_v1",
    status: "contract_only",
    consistency: "eventual",
    ttlSeconds: 60,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["proposal.submitted", "proposal.status_changed"],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "buyer.request.list",
    modelName: "buyer_request_list_v1",
    status: "contract_only",
    consistency: "eventual",
    ttlSeconds: 60,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["request.created", "request.updated", "buyer.counterparty_changed"],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "proposal.detail",
    modelName: "proposal_detail_aggregate_v1",
    status: "contract_only",
    consistency: "read_after_write_sensitive",
    ttlSeconds: 30,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["proposal.updated", "proposal.item_updated", "approval.changed"],
    backgroundRefresh: false,
    staleWhileRevalidate: false,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "director.dashboard",
    modelName: "director_dashboard_v1",
    status: "contract_only",
    consistency: "eventual",
    ttlSeconds: 60,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["proposal.status_changed", "payment.status_changed", "warehouse.stock_changed"],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "warehouse.ledger",
    modelName: "warehouse_ledger_v1",
    status: "contract_only",
    consistency: "read_after_write_sensitive",
    ttlSeconds: 30,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["warehouse.receive_applied", "warehouse.issue_applied", "stock.adjusted"],
    backgroundRefresh: true,
    staleWhileRevalidate: false,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "accountant.invoice.list",
    modelName: "accountant_invoice_list_v1",
    status: "contract_only",
    consistency: "eventual",
    ttlSeconds: 60,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["invoice.created", "payment.applied", "payment.status_changed"],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "catalog.marketplace.list",
    modelName: "catalog_marketplace_list_v1",
    status: "contract_only",
    consistency: "eventual",
    ttlSeconds: 120,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["listing.created", "listing.updated", "supplier.changed"],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    piiAllowedInCacheKey: false,
  },
  {
    flow: "pdf.report.request",
    modelName: "pdf_report_artifact_v1",
    status: "contract_only",
    consistency: "artifact_versioned",
    ttlSeconds: 300,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    invalidationEvents: ["report.source_changed", "pdf.artifact_expired"],
    backgroundRefresh: false,
    staleWhileRevalidate: false,
    piiAllowedInCacheKey: false,
  },
] as const;

export function isCacheReadModelEnabled(config: CacheReadModelConfig): boolean {
  return config.enabled === true && config.shadowMode === true && typeof config.baseUrl === "string" && config.baseUrl.trim().length > 0;
}

export function clampCacheTtlSeconds(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return CACHE_READ_MODEL_DEFAULT_TTL_SECONDS;
  return Math.min(Math.max(Math.trunc(parsed), 1), CACHE_READ_MODEL_MAX_TTL_SECONDS);
}

export function buildCacheReadModelError(code: string, message: unknown): CacheReadModelEnvelope<never> {
  const safeCode = String(code || "CACHE_READ_MODEL_ERROR")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 64) || "CACHE_READ_MODEL_ERROR";

  return {
    ok: false,
    error: {
      code: safeCode,
      message: redactBffText(message).slice(0, 240) || "Cache read model is disabled",
    },
  };
}

export function callCacheReadModelDisabled<T>(): CacheReadModelEnvelope<T> {
  return buildCacheReadModelError("CACHE_READ_MODEL_DISABLED", "Cache read model boundary is disabled");
}
