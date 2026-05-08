import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerInboxRow } from "../../lib/catalog_api";
import {
  loadBuyerBucketsData,
  loadBuyerInboxData,
  type BuyerBucketsLoadResult,
  type BuyerInboxLoadResult,
} from "./buyer.fetchers";
import { mapWithConcurrencyLimit } from "../../lib/async/mapWithConcurrencyLimit";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { resolveBuyerSummaryAuthUserId } from "./buyer.summary.auth.transport";

type LogFn = (msg: unknown, ...rest: unknown[]) => void;

export type BuyerSummaryRefreshReason =
  | "initial"
  | "focus"
  | "manual"
  | "realtime"
  | "subscription"
  | "mutation";

export type BuyerSummaryScope = "inbox" | "buckets" | "subcontracts";

export type BuyerSubcontractsLoadResult = {
  count: number | null;
};

export type BuyerSummaryLoadResult = {
  inbox?: BuyerInboxLoadResult;
  buckets?: BuyerBucketsLoadResult;
  subcontracts?: BuyerSubcontractsLoadResult;
};

type BuyerSummaryServiceParams = {
  supabase: SupabaseClient;
  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  kickMsInbox: number;
  kickMsBuckets: number;
  log?: LogFn;
};

type BuyerSummaryLoadParams = {
  reason: BuyerSummaryRefreshReason;
  scopes?: BuyerSummaryScope[];
  force?: boolean;
};

type ScopeCache<T> = {
  hasValue: boolean;
  value: T | null;
  fetchedAt: number;
};

type RefreshState<T> = {
  inFlight: Promise<T> | null;
  rerunQueued: boolean;
  rerunWaiter: Promise<T> | null;
  resolveRerunWaiter: ((value: T) => void) | null;
  rejectRerunWaiter: ((error: unknown) => void) | null;
};

type ScopeSlot<T> = {
  surface: string;
  freshnessMs: number;
  cache: ScopeCache<T>;
  state: RefreshState<T>;
  load: () => Promise<T>;
};

const ALL_SCOPES: BuyerSummaryScope[] = ["inbox", "buckets", "subcontracts"];

const createScopeCache = <T,>(): ScopeCache<T> => ({
  hasValue: false,
  value: null,
  fetchedAt: 0,
});

const createRefreshState = <T,>(): RefreshState<T> => ({
  inFlight: null,
  rerunQueued: false,
  rerunWaiter: null,
  resolveRerunWaiter: null,
  rejectRerunWaiter: null,
});

const clearRerunWaiter = <T,>(state: RefreshState<T>) => {
  state.rerunWaiter = null;
  state.resolveRerunWaiter = null;
  state.rejectRerunWaiter = null;
};

const ensureRerunWaiter = <T,>(state: RefreshState<T>) => {
  if (!state.rerunWaiter) {
    state.rerunWaiter = new Promise<T>((resolve, reject) => {
      state.resolveRerunWaiter = resolve;
      state.rejectRerunWaiter = reject;
    });
  }
  return state.rerunWaiter;
};

const isForceRefresh = (params: BuyerSummaryLoadParams): boolean =>
  params.force ?? (params.reason === "manual" || params.reason === "mutation" || params.reason === "realtime");

const normalizeScopes = (scopes?: BuyerSummaryScope[]): BuyerSummaryScope[] => {
  const source = Array.isArray(scopes) && scopes.length ? scopes : ALL_SCOPES;
  return Array.from(new Set(source));
};

const isCacheFresh = <T,>(slot: ScopeSlot<T>) =>
  slot.cache.hasValue && Date.now() - slot.cache.fetchedAt < slot.freshnessMs;

const createScopeSlot = <T,>(surface: string, freshnessMs: number, load: () => Promise<T>): ScopeSlot<T> => ({
  surface,
  freshnessMs,
  cache: createScopeCache<T>(),
  state: createRefreshState<T>(),
  load,
});

const queueScopeRefresh = <T,>(slot: ScopeSlot<T>): Promise<T> => {
  const { state } = slot;
  if (state.inFlight) {
    recordPlatformObservability({
      screen: "buyer",
      surface: slot.surface,
      category: "reload",
      event: "load_scope",
      result: "queued_rerun",
    });
    state.rerunQueued = true;
    return ensureRerunWaiter(state);
  }

  const start = (): Promise<T> => {
    const task = (async () => {
      try {
        const value = await slot.load();
        slot.cache = {
          hasValue: true,
          value,
          fetchedAt: Date.now(),
        };
        if (!state.rerunQueued) {
          state.resolveRerunWaiter?.(value);
          clearRerunWaiter(state);
        }
        return value;
      } catch (error) {
        if (!state.rerunQueued) {
          state.rejectRerunWaiter?.(error);
          clearRerunWaiter(state);
        }
        throw error;
      } finally {
        state.inFlight = null;
        if (state.rerunQueued) {
          state.rerunQueued = false;
          const rerun = start();
          rerun.catch(() => {
            // no-op: joined callers observe the waiter rejection
          });
        }
      }
    })();

    state.inFlight = task;
    return task;
  };

  return start();
};

const readScope = async <T,>(slot: ScopeSlot<T>, params: BuyerSummaryLoadParams): Promise<T> => {
  if (slot.state.inFlight) {
    recordPlatformObservability({
      screen: "buyer",
      surface: slot.surface,
      category: "reload",
      event: "load_scope",
      result: "joined_inflight",
      trigger: params.reason,
    });
    return queueScopeRefresh(slot);
  }

  if (!isForceRefresh(params) && isCacheFresh(slot) && slot.cache.value !== null) {
    recordPlatformObservability({
      screen: "buyer",
      surface: slot.surface,
      category: "reload",
      event: "load_scope",
      result: "cache_hit",
      trigger: params.reason,
    });
    return slot.cache.value;
  }

  return queueScopeRefresh(slot);
};

export function createBuyerSummaryService(params: BuyerSummaryServiceParams) {
  const { supabase, kickMsInbox, kickMsBuckets, log } = params;
  let cachedUserId: string | null = null;

  const resolveUserId = async (): Promise<string | null> => {
    if (cachedUserId) return cachedUserId;

    try {
      const nextUserId = await resolveBuyerSummaryAuthUserId({ supabase });
      if (nextUserId) {
        cachedUserId = nextUserId;
        return nextUserId;
      }
    } catch (e: unknown) {
      log?.("[buyer.summary] auth.getUser failed:", e instanceof Error ? e.message : String(e));
    }

    return null;
  };

  const inboxSlot = createScopeSlot<BuyerInboxLoadResult>("summary_inbox", kickMsInbox, async () =>
    loadBuyerInboxData({
      supabase,
      log,
    })
  );

  const bucketsSlot = createScopeSlot<BuyerBucketsLoadResult>("summary_buckets", kickMsBuckets, async () =>
    loadBuyerBucketsData({
      supabase,
      log,
    })
  );

  const subcontractsSlot = createScopeSlot<BuyerSubcontractsLoadResult>("summary_subcontracts", kickMsBuckets, async () => {
    const userId = await resolveUserId();
    if (!userId) return { count: null };

    try {
      const { count, error } = await supabase
        .from("subcontracts")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId);

      if (error || count == null) return { count: null };
      return { count };
    } catch (e: unknown) {
      log?.("[buyer.summary] subcontracts.count failed:", e instanceof Error ? e.message : String(e));
      return { count: null };
    }
  });

  const load = async (loadParams: BuyerSummaryLoadParams): Promise<BuyerSummaryLoadResult> => {
    const scopes = normalizeScopes(loadParams.scopes);
    const result: BuyerSummaryLoadResult = {};

    await mapWithConcurrencyLimit(
      scopes,
      2,
      async (scope) => {
        switch (scope) {
          case "inbox":
            result.inbox = await readScope(inboxSlot, loadParams);
            return;
          case "buckets":
            result.buckets = await readScope(bucketsSlot, loadParams);
            return;
          case "subcontracts":
            result.subcontracts = await readScope(subcontractsSlot, loadParams);
            return;
          default:
            return;
        }
      },
    );

    return result;
  };

  const invalidate = (scopes?: BuyerSummaryScope[]) => {
    const normalized = normalizeScopes(scopes);
    for (const scope of normalized) {
      if (scope === "inbox") {
        inboxSlot.cache = createScopeCache<BuyerInboxLoadResult>();
      } else if (scope === "buckets") {
        bucketsSlot.cache = createScopeCache<BuyerBucketsLoadResult>();
      } else if (scope === "subcontracts") {
        subcontractsSlot.cache = createScopeCache<BuyerSubcontractsLoadResult>();
      }
    }
  };

  return {
    load,
    invalidate,
  };
}

export type BuyerSummaryService = ReturnType<typeof createBuyerSummaryService>;
