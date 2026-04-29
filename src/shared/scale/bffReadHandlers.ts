import {
  BFF_MAX_PAGE_SIZE,
  BFF_FLOW_CONTRACTS,
  type BffFlow,
  type BffPage,
  type BffResponseEnvelope,
} from "./bffContracts";
import { buildBffError, normalizeBffPage, redactBffText } from "./bffSafety";
import { CACHE_READ_MODEL_CONTRACTS } from "./cacheReadModels";
import { getCachePolicy } from "./cachePolicies";
import {
  getRateLimitPolicy,
  type RateLimitBucket,
  type RateLimitedOperation,
} from "./rateLimits";
import {
  getRateEnforcementPolicyForBffReadOperation,
  type RateLimitEnforcementOperation,
  type RateLimitPolicyScope,
} from "./rateLimitPolicies";
import {
  BFF_READ_OBSERVABILITY_EVENT_MAP,
  type BffObservabilityMetadata,
} from "./scaleObservabilityEvents";
import type {
  BffReadContext,
  BffReadPorts,
  BffReadSafeFilters,
  BffReadSafeFilterValue,
} from "./bffReadPorts";

export type BffReadOperation =
  | "request.proposal.list"
  | "marketplace.catalog.search"
  | "warehouse.ledger.list"
  | "accountant.invoice.list"
  | "director.pending.list";

export type BffReadInput = {
  page?: number | null;
  pageSize?: number | null;
  query?: unknown;
  filters?: Record<string, unknown> | null;
  context?: BffReadContext;
};

export type BffReadHandlerMetadata = {
  operation: BffReadOperation;
  bffFlow: BffFlow;
  readOnly: true;
  requiresPagination: true;
  maxPageSize: 100;
  cacheCandidate: boolean;
  cachePolicy: {
    modelName: string;
    ttlSeconds: number;
    status: string;
  } | null;
  cacheIntegrationPolicy: {
    route: BffReadOperation;
    ttlMs: number;
    staleWhileRevalidateMs: number;
    tags: readonly string[];
    defaultEnabled: false;
    piiSafe: boolean;
  } | null;
  rateLimitBucket: RateLimitBucket;
  rateLimitPolicy: {
    operation: RateLimitedOperation | null;
    enforcement: "disabled_scaffold";
  };
  rateEnforcementPolicy: {
    operation: RateLimitEnforcementOperation;
    scope: RateLimitPolicyScope;
    windowMs: number;
    maxRequests: number;
    burst: number;
    defaultEnabled: false;
    enforcementEnabledByDefault: false;
  } | null;
  observability: BffObservabilityMetadata;
  enabledInAppRuntime: false;
  wiredToAppRuntime: false;
  callsSupabaseDirectly: false;
};

export type BffReadResponseEnvelope<T> =
  | (Extract<BffResponseEnvelope<T>, { ok: true }> & {
      page: BffPage;
      metadata: BffReadHandlerMetadata;
    })
  | (Extract<BffResponseEnvelope<T>, { ok: false }> & {
      metadata: BffReadHandlerMetadata;
    });

type HandlerDefinition = {
  operation: BffReadOperation;
  bffFlow: BffFlow;
  rateLimitOperation: RateLimitedOperation | null;
  rateEnforcementOperation: RateLimitEnforcementOperation;
  rateLimitBucket: RateLimitBucket;
  errorCode: string;
  errorMessage: string;
  allowedFilters: readonly string[];
};

const READ_HANDLER_DEFINITIONS: Record<BffReadOperation, HandlerDefinition> = {
  "request.proposal.list": {
    operation: "request.proposal.list",
    bffFlow: "proposal.list",
    rateLimitOperation: "proposal.list",
    rateEnforcementOperation: "request.proposal.list",
    rateLimitBucket: "read_heavy",
    errorCode: "BFF_REQUEST_PROPOSAL_LIST_ERROR",
    errorMessage: "Unable to load list",
    allowedFilters: ["status", "tab", "from", "to", "scope", "kind"],
  },
  "marketplace.catalog.search": {
    operation: "marketplace.catalog.search",
    bffFlow: "catalog.marketplace.list",
    rateLimitOperation: "catalog.search",
    rateEnforcementOperation: "marketplace.catalog.search",
    rateLimitBucket: "read_heavy",
    errorCode: "BFF_MARKETPLACE_CATALOG_SEARCH_ERROR",
    errorMessage: "Unable to search catalog",
    allowedFilters: ["category", "kind", "scope", "sort", "direction"],
  },
  "warehouse.ledger.list": {
    operation: "warehouse.ledger.list",
    bffFlow: "warehouse.ledger",
    rateLimitOperation: null,
    rateEnforcementOperation: "warehouse.ledger.list",
    rateLimitBucket: "read_heavy",
    errorCode: "BFF_WAREHOUSE_LEDGER_LIST_ERROR",
    errorMessage: "Unable to load warehouse ledger",
    allowedFilters: ["from", "to", "kind", "scope", "warehouseId"],
  },
  "accountant.invoice.list": {
    operation: "accountant.invoice.list",
    bffFlow: "accountant.invoice.list",
    rateLimitOperation: null,
    rateEnforcementOperation: "accountant.invoice.list",
    rateLimitBucket: "read_heavy",
    errorCode: "BFF_ACCOUNTANT_INVOICE_LIST_ERROR",
    errorMessage: "Unable to load accountant invoices",
    allowedFilters: ["status", "tab", "from", "to", "scope"],
  },
  "director.pending.list": {
    operation: "director.pending.list",
    bffFlow: "director.dashboard",
    rateLimitOperation: null,
    rateEnforcementOperation: "director.pending.list",
    rateLimitBucket: "read_heavy",
    errorCode: "BFF_DIRECTOR_PENDING_LIST_ERROR",
    errorMessage: "Unable to load director list",
    allowedFilters: ["status", "tab", "from", "to", "scope"],
  },
};

export const BFF_READ_HANDLER_OPERATIONS = Object.freeze(
  Object.keys(READ_HANDLER_DEFINITIONS) as BffReadOperation[],
);

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;

const normalizeSafeFilterValue = (value: unknown): BffReadSafeFilterValue | undefined => {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const safe = redactBffText(value).replace(CONTROL_CHAR_PATTERN, "").trim().slice(0, 120);
    return safe.length ? safe : undefined;
  }
  return undefined;
};

export function normalizeBffReadFilters(
  filters: Record<string, unknown> | null | undefined,
  allowedKeys: readonly string[],
): BffReadSafeFilters | undefined {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) return undefined;

  const allowed = new Set(allowedKeys);
  const safeFilters: BffReadSafeFilters = {};

  for (const [key, value] of Object.entries(filters)) {
    if (!allowed.has(key)) continue;
    const normalized = normalizeSafeFilterValue(value);
    if (normalized !== undefined) safeFilters[key] = normalized;
  }

  return Object.keys(safeFilters).length ? safeFilters : undefined;
}

export function sanitizeBffSearchQuery(value: unknown): string {
  return redactBffText(value)
    .replace(CONTROL_CHAR_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function getBffReadHandlerMetadata(operation: BffReadOperation): BffReadHandlerMetadata {
  const definition = READ_HANDLER_DEFINITIONS[operation];
  const bffContract = BFF_FLOW_CONTRACTS.find((contract) => contract.flow === definition.bffFlow);
  const cacheContract = CACHE_READ_MODEL_CONTRACTS.find((contract) => contract.flow === definition.bffFlow);
  const cachePolicy = getCachePolicy(operation);
  const rateLimitPolicy = definition.rateLimitOperation
    ? getRateLimitPolicy(definition.rateLimitOperation)
    : null;
  const rateEnforcementPolicy = getRateEnforcementPolicyForBffReadOperation(operation);

  return {
    operation,
    bffFlow: definition.bffFlow,
    readOnly: true,
    requiresPagination: true,
    maxPageSize: BFF_MAX_PAGE_SIZE,
    cacheCandidate: bffContract?.cacheCandidate ?? true,
    cachePolicy: cacheContract
      ? {
          modelName: cacheContract.modelName,
          ttlSeconds: cacheContract.ttlSeconds,
          status: cacheContract.status,
        }
      : null,
    cacheIntegrationPolicy: cachePolicy
      ? {
          route: operation,
          ttlMs: cachePolicy.ttlMs,
          staleWhileRevalidateMs: cachePolicy.staleWhileRevalidateMs,
          tags: cachePolicy.tags,
          defaultEnabled: cachePolicy.defaultEnabled,
          piiSafe: cachePolicy.piiSafe,
        }
      : null,
    rateLimitBucket: definition.rateLimitBucket,
    rateLimitPolicy: {
      operation: rateLimitPolicy?.operation ?? null,
      enforcement: "disabled_scaffold",
    },
    rateEnforcementPolicy: rateEnforcementPolicy
      ? {
          operation: rateEnforcementPolicy.operation,
          scope: rateEnforcementPolicy.scope,
          windowMs: rateEnforcementPolicy.windowMs,
          maxRequests: rateEnforcementPolicy.maxRequests,
          burst: rateEnforcementPolicy.burst,
          defaultEnabled: rateEnforcementPolicy.defaultEnabled,
          enforcementEnabledByDefault: rateEnforcementPolicy.enforcementEnabledByDefault,
        }
      : null,
    observability: BFF_READ_OBSERVABILITY_EVENT_MAP[operation],
    enabledInAppRuntime: false,
    wiredToAppRuntime: false,
    callsSupabaseDirectly: false,
  };
}

const buildSuccess = <T>(
  operation: BffReadOperation,
  data: T,
  page: BffPage,
): BffReadResponseEnvelope<T> => ({
  ok: true,
  data,
  page,
  serverTiming: {
    cacheHit: false,
  },
  metadata: getBffReadHandlerMetadata(operation),
});

const buildFailure = <T>(operation: BffReadOperation): BffReadResponseEnvelope<T> => {
  const definition = READ_HANDLER_DEFINITIONS[operation];
  return {
    ok: false,
    error: buildBffError(definition.errorCode, definition.errorMessage),
    metadata: getBffReadHandlerMetadata(operation),
  };
};

const executeReadListHandler = async (
  operation: BffReadOperation,
  input: BffReadInput,
  loader: (args: {
    page: number;
    pageSize: number;
    filters?: BffReadSafeFilters;
    context?: BffReadContext;
  }) => Promise<unknown[]>,
): Promise<BffReadResponseEnvelope<unknown[]>> => {
  const definition = READ_HANDLER_DEFINITIONS[operation];
  const page = normalizeBffPage(input);
  const filters = normalizeBffReadFilters(input.filters, definition.allowedFilters);

  try {
    const data = await loader({
      page: page.page,
      pageSize: page.pageSize,
      filters,
      context: input.context,
    });
    return buildSuccess(operation, data, page);
  } catch {
    return buildFailure(operation);
  }
};

export async function handleRequestProposalList(
  ports: BffReadPorts,
  input: BffReadInput = {},
): Promise<BffReadResponseEnvelope<unknown[]>> {
  return executeReadListHandler("request.proposal.list", input, (args) =>
    ports.requestProposal.listRequestProposals(args),
  );
}

export async function handleMarketplaceCatalogSearch(
  ports: BffReadPorts,
  input: BffReadInput = {},
): Promise<BffReadResponseEnvelope<unknown[]>> {
  const query = sanitizeBffSearchQuery(input.query);

  return executeReadListHandler("marketplace.catalog.search", input, (args) =>
    ports.marketplaceCatalog.searchCatalog({
      ...args,
      query,
    }),
  );
}

export async function handleWarehouseLedgerList(
  ports: BffReadPorts,
  input: BffReadInput = {},
): Promise<BffReadResponseEnvelope<unknown[]>> {
  return executeReadListHandler("warehouse.ledger.list", input, (args) =>
    ports.warehouseLedger.listWarehouseLedger(args),
  );
}

export async function handleAccountantInvoiceList(
  ports: BffReadPorts,
  input: BffReadInput = {},
): Promise<BffReadResponseEnvelope<unknown[]>> {
  return executeReadListHandler("accountant.invoice.list", input, (args) =>
    ports.accountantInvoice.listAccountantInvoices(args),
  );
}

export async function handleDirectorPendingList(
  ports: BffReadPorts,
  input: BffReadInput = {},
): Promise<BffReadResponseEnvelope<unknown[]>> {
  return executeReadListHandler("director.pending.list", input, (args) =>
    ports.directorPending.listDirectorPending(args),
  );
}
