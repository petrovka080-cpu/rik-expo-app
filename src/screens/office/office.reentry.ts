import { OFFICE_FOCUS_REFRESH_TTL_MS } from "./officeHubBootstrapSnapshot";
import { isWarehouseOfficeReturnReceipt } from "./officeHub.helpers";

export type OfficeReturnReceipt = Record<string, unknown> | null | undefined;

export type OfficeHubFocusRefreshPlan =
  | {
      kind: "scope_inactive";
    }
  | {
      kind: "bootstrap_pending";
      reason: "bootstrap_inflight" | "bootstrap_pending";
    }
  | {
      kind: "joined_inflight";
      reason: "joined_inflight";
    }
  | {
      kind: "skip_refresh";
      reason: "ttl_fresh";
      ageMs: number;
      ttlMs: number;
      freshnessSource?: "warehouse_return_receipt";
      sourceRoute?: string;
      target?: string;
      receipt?: Record<string, unknown>;
    }
  | {
      kind: "refresh";
      reason: "stale_ttl";
      ageMs: number;
      ttlMs: number;
    };

export function resolveOfficeWarmReturnReceipt(params: {
  officeReturnReceipt: OfficeReturnReceipt;
  pendingOfficeReturnReceipt: OfficeReturnReceipt;
}): Record<string, unknown> | null {
  if (isWarehouseOfficeReturnReceipt(params.officeReturnReceipt)) {
    return params.officeReturnReceipt;
  }

  if (isWarehouseOfficeReturnReceipt(params.pendingOfficeReturnReceipt)) {
    return params.pendingOfficeReturnReceipt;
  }

  return null;
}

export function resolveOfficeHubFocusRefreshPlan(params: {
  routeScopeActive: boolean;
  ownerBootstrapCompleted: boolean;
  initialBootstrapInFlight: boolean;
  focusRefreshInFlight: boolean;
  officeReturnReceipt: OfficeReturnReceipt;
  pendingOfficeReturnReceipt: OfficeReturnReceipt;
  processedWarmOfficeReturnReceipt: OfficeReturnReceipt;
  lastSuccessfulLoadAt: number;
  now?: number;
  ttlMs?: number;
}): OfficeHubFocusRefreshPlan {
  if (!params.routeScopeActive) {
    return { kind: "scope_inactive" };
  }

  if (!params.ownerBootstrapCompleted) {
    return {
      kind: "bootstrap_pending",
      reason: params.initialBootstrapInFlight
        ? "bootstrap_inflight"
        : "bootstrap_pending",
    };
  }

  if (params.focusRefreshInFlight) {
    return {
      kind: "joined_inflight",
      reason: "joined_inflight",
    };
  }

  const ttlMs = params.ttlMs ?? OFFICE_FOCUS_REFRESH_TTL_MS;
  const now = params.now ?? Date.now();
  const ageMs = now - params.lastSuccessfulLoadAt;
  const warmReturnReceipt = resolveOfficeWarmReturnReceipt({
    officeReturnReceipt: params.officeReturnReceipt,
    pendingOfficeReturnReceipt: params.pendingOfficeReturnReceipt,
  });

  if (
    warmReturnReceipt &&
    params.processedWarmOfficeReturnReceipt !== warmReturnReceipt
  ) {
    return {
      kind: "skip_refresh",
      reason: "ttl_fresh",
      ageMs,
      ttlMs,
      freshnessSource: "warehouse_return_receipt",
      sourceRoute: String(warmReturnReceipt.sourceRoute ?? ""),
      target: String(warmReturnReceipt.target ?? ""),
      receipt: warmReturnReceipt,
    };
  }

  if (params.lastSuccessfulLoadAt > 0 && ageMs < ttlMs) {
    return {
      kind: "skip_refresh",
      reason: "ttl_fresh",
      ageMs,
      ttlMs,
    };
  }

  return {
    kind: "refresh",
    reason: "stale_ttl",
    ageMs,
    ttlMs,
  };
}
