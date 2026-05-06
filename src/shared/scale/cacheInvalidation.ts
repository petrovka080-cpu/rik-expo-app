import type { BffMutationOperation } from "./bffMutationHandlers";

export type CacheInvalidationOperation =
  | BffMutationOperation
  | "notification.fanout";

export type CacheInvalidationMapping = {
  operation: CacheInvalidationOperation;
  tags: readonly string[];
  executionEnabledByDefault: false;
};

export const CACHE_INVALIDATION_MAPPINGS: readonly CacheInvalidationMapping[] = Object.freeze([
  {
    operation: "proposal.submit",
    tags: ["proposal", "request", "director_pending", "buyer", "summary", "inbox"],
    executionEnabledByDefault: false,
  },
  {
    operation: "warehouse.receive.apply",
    tags: ["warehouse", "stock", "ledger"],
    executionEnabledByDefault: false,
  },
  {
    operation: "accountant.payment.apply",
    tags: ["accountant", "invoice", "payment", "director"],
    executionEnabledByDefault: false,
  },
  {
    operation: "director.approval.apply",
    tags: ["director", "approval", "proposal", "request"],
    executionEnabledByDefault: false,
  },
  {
    operation: "request.item.update",
    tags: ["request", "proposal", "buyer", "summary"],
    executionEnabledByDefault: false,
  },
  {
    operation: "catalog.request.meta.update",
    tags: ["request", "proposal", "buyer", "summary"],
    executionEnabledByDefault: false,
  },
  {
    operation: "catalog.request.item.cancel",
    tags: ["request", "proposal", "buyer", "summary"],
    executionEnabledByDefault: false,
  },
  {
    operation: "notification.fanout",
    tags: ["notification", "inbox", "buyer", "director"],
    executionEnabledByDefault: false,
  },
] as const);

export function getInvalidationTagsForOperation(
  operation: CacheInvalidationOperation,
): readonly string[] {
  return CACHE_INVALIDATION_MAPPINGS.find((mapping) => mapping.operation === operation)?.tags ?? [];
}

export function isCacheInvalidationExecutionEnabled(config: {
  enabled?: boolean | null;
} = {}): false {
  void config;
  return false;
}
