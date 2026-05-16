import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";

import { createCancellableDelay, type CancellableDelay } from "../async/mapWithConcurrencyLimit";
import { recordPlatformObservability } from "../observability/platformObservability";
import { supabase } from "../supabaseClient";
import type { RealtimeChannelBinding, RealtimeScope } from "./realtime.channels";

type RealtimeLifecycleScope = RealtimeScope | "market";

type SubscribeChannelParams = {
  client?: SupabaseClient;
  name: string;
  scope: RealtimeLifecycleScope;
  route: string;
  surface?: string;
  bindings: readonly RealtimeChannelBinding[];
  onEvent: (params: {
    binding: RealtimeChannelBinding;
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>;
  }) => void;
};

type ActiveRealtimeChannel = {
  channel: RealtimeChannel | null;
  pendingChannel: RealtimeChannel | null;
  pendingJoinDelay: CancellableDelay | null;
  disposed: boolean;
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  bindingCount: number;
  bindingSignature: string;
  createdAt: number;
  client: SupabaseClient;
  subscribers: Map<number, RealtimeChannelSubscriber>;
};

type RealtimeReconnectBackoffReason = "initial_join" | "timed_out" | "channel_error";

type RealtimeReconnectBackoffPlan = {
  attempt: number;
  delayMs: number;
  baseDelayMs: number;
  jitterMs: number;
  activeChannelSpreadMs: number;
  maxDelayMs: number;
  reason: RealtimeReconnectBackoffReason;
  channelName: string;
  redactedChannelName: string;
};

type RealtimeChannelSubscriber = {
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  onEvent: SubscribeChannelParams["onEvent"];
};

export const REALTIME_ACTIVE_CHANNEL_WARN_AT = 5;
export const REALTIME_ACTIVE_CHANNEL_BUDGET = 8;
export const REALTIME_RECONNECT_BACKOFF_BASE_MS = 750;
export const REALTIME_RECONNECT_BACKOFF_MAX_MS = 30_000;
export const REALTIME_RECONNECT_BACKOFF_JITTER_MS = 900;
export const REALTIME_INITIAL_JOIN_STAGGER_MAX_MS = 1_200;
export const REALTIME_ACTIVE_CHANNEL_SPREAD_MS = 125;
export const REALTIME_ACTIVE_CHANNEL_SPREAD_MAX_MS = 2_000;

const activeChannels = new Map<string, ActiveRealtimeChannel>();
const reconnectBackoffAttempts = new Map<string, number>();
let activeChannelSeq = 0;
let realtimeAuthPromise: Promise<void> | null = null;
let realtimeAuthToken = "";

export function getRealtimeDebugState() {
  return {
    activeChannelCount: activeChannels.size,
    activeChannelNames: [...activeChannels.keys()].sort(),
    activeBindingCount: [...activeChannels.values()].reduce(
      (total, entry) => total + entry.bindingCount,
      0,
    ),
    activeSubscriberCount: [...activeChannels.values()].reduce(
      (total, entry) => total + entry.subscribers.size,
      0,
    ),
    reconnectBackoffAttemptCount: reconnectBackoffAttempts.size,
    warnAt: REALTIME_ACTIVE_CHANNEL_WARN_AT,
    budget: REALTIME_ACTIVE_CHANNEL_BUDGET,
  };
}

/**
 * Resets all module-level realtime state at session boundary (logout / session change).
 * Gracefully unsubscribes active channels before clearing state.
 */
export function clearRealtimeSessionState() {
  for (const [name, entry] of activeChannels) {
    disposeRealtimeEntry(entry, name);
  }
  activeChannels.clear();
  reconnectBackoffAttempts.clear();
  activeChannelSeq = 0;
  realtimeAuthPromise = null;
  realtimeAuthToken = "";
}

export function redactRealtimeChannelNameForTelemetry(channelName: string) {
  return String(channelName ?? "")
    .replace(/\b(chat:listing:)[^:\s]+/gi, "$1<redacted>")
    .replace(/\b((?:company|user|request|object|supplier|listing):)[^:\s]+/gi, "$1<redacted>");
}

const redactRealtimeRouteForTelemetry = (route: string) =>
  String(route ?? "")
    .replace(/(\/chat\/)[^/?#\s]+/gi, "$1<redacted>")
    .replace(/([?&](?:listingId|supplierId|requestId|userId|objectId)=)[^&#\s]+/gi, "$1<redacted>");

const hashRealtimeBackoffKey = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function buildRealtimeReconnectBackoffPlan(params: {
  activeChannelCount?: number;
  attempt?: number;
  channelName: string;
  reason: RealtimeReconnectBackoffReason;
  route: string;
  scope: RealtimeLifecycleScope;
}): RealtimeReconnectBackoffPlan {
  const attempt = Math.max(1, Math.min(8, Math.floor(params.attempt ?? 1)));
  const key = `${params.scope}:${params.route}:${params.channelName}:${params.reason}`;
  const jitterMs = hashRealtimeBackoffKey(key) % REALTIME_RECONNECT_BACKOFF_JITTER_MS;
  const activeChannelSpreadMs = Math.min(
    Math.max(0, Math.floor(params.activeChannelCount ?? 0)) * REALTIME_ACTIVE_CHANNEL_SPREAD_MS,
    REALTIME_ACTIVE_CHANNEL_SPREAD_MAX_MS,
  );
  const baseDelayMs =
    params.reason === "initial_join"
      ? 0
      : Math.min(
          REALTIME_RECONNECT_BACKOFF_BASE_MS * 2 ** (attempt - 1),
          REALTIME_RECONNECT_BACKOFF_MAX_MS,
        );
  const maxDelayMs =
    params.reason === "initial_join"
      ? REALTIME_INITIAL_JOIN_STAGGER_MAX_MS
      : REALTIME_RECONNECT_BACKOFF_MAX_MS;
  const delayMs = Math.min(baseDelayMs + jitterMs + activeChannelSpreadMs, maxDelayMs);

  return {
    attempt,
    delayMs,
    baseDelayMs,
    jitterMs,
    activeChannelSpreadMs,
    maxDelayMs,
    reason: params.reason,
    channelName: params.channelName,
    redactedChannelName: redactRealtimeChannelNameForTelemetry(params.channelName),
  };
}

const shouldBypassRealtimeDelayForTests = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";

const observeRealtimeReconnectBackoff = (params: {
  plan: RealtimeReconnectBackoffPlan;
  route: string;
  scope: RealtimeLifecycleScope;
  status?: string;
  surface: string;
}) => {
  recordPlatformObservability({
    screen: params.scope,
    surface: params.surface,
    category: "reload",
    event: "realtime_reconnect_backoff_scheduled",
    result: "success",
    trigger: "realtime",
    sourceKind: "supabase:realtime",
    extra: {
      route: redactRealtimeRouteForTelemetry(params.route),
      channelName: params.plan.redactedChannelName,
      status: params.status ?? null,
      reason: params.plan.reason,
      attempt: params.plan.attempt,
      delayMs: params.plan.delayMs,
      baseDelayMs: params.plan.baseDelayMs,
      jitterMs: params.plan.jitterMs,
      activeChannelSpreadMs: params.plan.activeChannelSpreadMs,
      maxDelayMs: params.plan.maxDelayMs,
      owner: "realtime_reconnect_backoff",
    },
  });
};

const recordCleanupError = (params: {
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  channelName: string;
  stage: "unsubscribe" | "remove_channel";
  error: unknown;
}) => {
  recordPlatformObservability({
    screen: params.scope,
    surface: params.surface,
    category: "reload",
    event: "realtime_channel_error",
    result: "error",
    trigger: "realtime",
    sourceKind: "supabase:realtime",
    errorStage: params.stage,
    extra: {
      route: redactRealtimeRouteForTelemetry(params.route),
      channelName: redactRealtimeChannelNameForTelemetry(params.channelName),
      owner: "realtime_lifecycle",
      errorMessage: params.error instanceof Error ? params.error.message : String(params.error),
    },
  });
};

const cleanupRealtimeChannel = (params: {
  client: SupabaseClient;
  channel: RealtimeChannel;
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  channelName: string;
}) => {
  try {
    params.channel.unsubscribe();
  } catch (error) {
    recordCleanupError({
      scope: params.scope,
      route: params.route,
      surface: params.surface,
      channelName: params.channelName,
      stage: "unsubscribe",
      error,
    });
  }
  try {
    params.client.removeChannel(params.channel);
  } catch (error) {
    recordCleanupError({
      scope: params.scope,
      route: params.route,
      surface: params.surface,
      channelName: params.channelName,
      stage: "remove_channel",
      error,
    });
  }
};

const disposeRealtimeEntry = (entry: ActiveRealtimeChannel, channelName: string) => {
  if (entry.disposed) return;
  entry.disposed = true;
  entry.pendingJoinDelay?.cancel();
  entry.pendingJoinDelay = null;

  const channel = entry.channel ?? entry.pendingChannel;
  entry.channel = null;
  entry.pendingChannel = null;
  if (!channel) return;

  cleanupRealtimeChannel({
    client: entry.client,
    channel,
    scope: entry.scope,
    route: entry.route,
    surface: entry.surface,
    channelName,
  });
};

const observeChannelStatus = (params: {
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  channelName: string;
  status: string;
}) => {
  if (params.status === "SUBSCRIBED" || params.status === "CLOSED") {
    reconnectBackoffAttempts.delete(params.channelName);
  }

  const event =
    params.status === "SUBSCRIBED"
      ? "subscription_connected"
      : params.status === "CLOSED"
        ? "channel_closed"
        : params.status === "TIMED_OUT"
          ? "subscription_timed_out"
          : "subscription_error";
  const ok = params.status === "SUBSCRIBED" || params.status === "CLOSED";
  recordPlatformObservability({
    screen: params.scope,
    surface: params.surface,
    category: "reload",
    event,
    result: ok ? "success" : "error",
    trigger: "realtime",
    sourceKind: "supabase:realtime",
    extra: {
      route: redactRealtimeRouteForTelemetry(params.route),
      channelName: redactRealtimeChannelNameForTelemetry(params.channelName),
      status: params.status,
      owner: "realtime_lifecycle",
    },
  });

  if (params.status !== "TIMED_OUT" && params.status !== "CHANNEL_ERROR") return;

  const attempt = (reconnectBackoffAttempts.get(params.channelName) ?? 0) + 1;
  reconnectBackoffAttempts.set(params.channelName, attempt);
  const plan = buildRealtimeReconnectBackoffPlan({
    activeChannelCount: activeChannels.size,
    attempt,
    channelName: params.channelName,
    reason: params.status === "TIMED_OUT" ? "timed_out" : "channel_error",
    route: params.route,
    scope: params.scope,
  });
  observeRealtimeReconnectBackoff({
    plan,
    route: params.route,
    scope: params.scope,
    status: params.status,
    surface: params.surface,
  });
};

const observeRealtimeBudget = (params: {
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  channelName: string;
  event: "realtime_channel_duplicate_detected" | "realtime_channel_budget_warning";
  result: "success" | "skipped" | "error";
  reason: string;
  activeChannelCount: number;
  bindingCount: number;
}) => {
  recordPlatformObservability({
    screen: params.scope,
    surface: params.surface,
    category: "reload",
    event: params.event,
    result: params.result,
    trigger: "realtime",
    sourceKind: "supabase:realtime",
    extra: {
      route: redactRealtimeRouteForTelemetry(params.route),
      channelName: redactRealtimeChannelNameForTelemetry(params.channelName),
      activeChannelCount: params.activeChannelCount,
      bindingCount: params.bindingCount,
      warnAt: REALTIME_ACTIVE_CHANNEL_WARN_AT,
      budget: REALTIME_ACTIVE_CHANNEL_BUDGET,
      reason: params.reason,
      owner: "realtime_lifecycle",
    },
  });
};

const ensureRealtimeAuth = async (
  client: SupabaseClient,
  scope: RealtimeLifecycleScope,
  route: string,
) => {
  if (!realtimeAuthPromise) {
    realtimeAuthPromise = (async () => {
      try {
        const session = await client.auth.getSession();
        const accessToken = String(session.data.session?.access_token ?? "").trim();
        if (!accessToken || accessToken === realtimeAuthToken) return;
        await client.realtime.setAuth(accessToken);
        realtimeAuthToken = accessToken;
        recordPlatformObservability({
          screen: scope,
          surface: "realtime_channel",
          category: "reload",
          event: "realtime_auth_ready",
          result: "success",
          trigger: "realtime",
          sourceKind: "supabase:realtime",
          extra: {
            route: redactRealtimeRouteForTelemetry(route),
            hasAccessToken: true,
            owner: "realtime_lifecycle",
            stage: "auth_ready",
          },
        });
      } catch (error) {
        recordPlatformObservability({
          screen: scope,
          surface: "realtime_channel",
          category: "reload",
          event: "realtime_channel_error",
          result: "error",
          trigger: "realtime",
          sourceKind: "supabase:realtime",
          errorStage: "realtime_set_auth",
          extra: {
            route: redactRealtimeRouteForTelemetry(route),
            errorMessage: error instanceof Error ? error.message : String(error),
            owner: "realtime_lifecycle",
          },
        });
      } finally {
        realtimeAuthPromise = null;
      }
    })();
  }

  await realtimeAuthPromise;
};

const buildBindingSignature = (bindings: readonly RealtimeChannelBinding[]) =>
  JSON.stringify(
    bindings.map((binding) => ({
      event: binding.event,
      filter: binding.filter ?? null,
      key: binding.key,
      owner: binding.owner,
      schema: binding.schema ?? "public",
      table: binding.table,
    })),
  );

export function subscribeChannel(params: SubscribeChannelParams) {
  const client = params.client ?? supabase;
  const surface = params.surface ?? "realtime_channel";
  const token = ++activeChannelSeq;
  const bindingSignature = buildBindingSignature(params.bindings);

  const existing = activeChannels.get(params.name);
  if (existing && existing.bindingSignature === bindingSignature) {
    existing.subscribers.set(token, {
      scope: params.scope,
      route: params.route,
      surface,
      onEvent: params.onEvent,
    });
    observeRealtimeBudget({
      scope: params.scope,
      route: params.route,
      surface,
      channelName: params.name,
      event: "realtime_channel_duplicate_detected",
      result: "success",
      reason: "channel_name_shared_ref_counted",
      activeChannelCount: activeChannels.size,
      bindingCount: params.bindings.length,
    });

    return () => {
      const current = activeChannels.get(params.name);
      if (!current || !current.subscribers.delete(token)) return;
      if (current.subscribers.size > 0) return;
      activeChannels.delete(params.name);
      disposeRealtimeEntry(current, params.name);
      recordPlatformObservability({
        screen: params.scope,
        surface,
        category: "reload",
        event: "subscription_stopped",
        result: "success",
        trigger: "realtime",
        sourceKind: "supabase:realtime",
        extra: {
          route: redactRealtimeRouteForTelemetry(params.route),
          channelName: redactRealtimeChannelNameForTelemetry(params.name),
          owner: "realtime_lifecycle",
          reason: "last_ref_released",
        },
      });
    };
  }

  if (existing) {
    observeRealtimeBudget({
      scope: params.scope,
      route: params.route,
      surface,
      channelName: params.name,
      event: "realtime_channel_duplicate_detected",
      result: "error",
      reason: "channel_name_binding_signature_mismatch",
      activeChannelCount: activeChannels.size,
      bindingCount: params.bindings.length,
    });
    activeChannels.delete(params.name);
    disposeRealtimeEntry(existing, params.name);
  }

  const entry: ActiveRealtimeChannel = {
    channel: null,
    pendingChannel: null,
    pendingJoinDelay: null,
    disposed: false,
    scope: params.scope,
    route: params.route,
    surface,
    bindingCount: params.bindings.length,
    bindingSignature,
    createdAt: Date.now(),
    client,
    subscribers: new Map([
      [
        token,
        {
          scope: params.scope,
          route: params.route,
          surface,
          onEvent: params.onEvent,
        },
      ],
    ]),
  };
  activeChannels.set(params.name, entry);

  void (async () => {
    await ensureRealtimeAuth(client, params.scope, params.route);
    const currentEntry = activeChannels.get(params.name);
    if (entry.disposed || currentEntry !== entry || currentEntry.subscribers.size === 0) return;

    const projectedActiveCount = activeChannels.size;
    if (projectedActiveCount >= REALTIME_ACTIVE_CHANNEL_WARN_AT) {
      observeRealtimeBudget({
        scope: params.scope,
        route: params.route,
        surface,
        channelName: params.name,
        event: "realtime_channel_budget_warning",
        result: projectedActiveCount > REALTIME_ACTIVE_CHANNEL_BUDGET ? "error" : "success",
        reason:
          projectedActiveCount > REALTIME_ACTIVE_CHANNEL_BUDGET
            ? "active_channel_budget_exceeded"
            : "active_channel_warning_threshold",
        activeChannelCount: projectedActiveCount,
        bindingCount: params.bindings.length,
      });
    }

    recordPlatformObservability({
      screen: params.scope,
      surface,
      category: "reload",
      event: "channel_created",
      result: "success",
      trigger: "realtime",
      sourceKind: "supabase:realtime",
      extra: {
        route: redactRealtimeRouteForTelemetry(params.route),
        channelName: redactRealtimeChannelNameForTelemetry(params.name),
        bindingCount: params.bindings.length,
        owner: "realtime_lifecycle",
      },
    });

    let channel = client.channel(params.name);
    entry.pendingChannel = channel;
    for (const binding of params.bindings) {
      channel = channel.on(
          "postgres_changes",
        {
          event: binding.event,
          schema: binding.schema ?? "public",
          table: binding.table,
          filter: binding.filter,
        },
        (payload) => {
          const liveEntry = activeChannels.get(params.name);
          if (!liveEntry) return;
          recordPlatformObservability({
            screen: params.scope,
            surface,
            category: "reload",
            event: "realtime_event_received",
            result: "success",
            trigger: "realtime",
            sourceKind: "supabase:postgres_changes",
            extra: {
              route: redactRealtimeRouteForTelemetry(params.route),
              channelName: redactRealtimeChannelNameForTelemetry(params.name),
              bindingKey: binding.key,
              table: binding.table,
              eventType: payload.eventType,
              owner: "realtime_lifecycle",
            },
          });
          const typedPayload = payload as RealtimePostgresChangesPayload<Record<string, unknown>>;
          for (const subscriber of liveEntry.subscribers.values()) {
            subscriber.onEvent({
              binding,
              payload: typedPayload,
            });
          }
        },
      );
    }
    entry.pendingChannel = channel;

    recordPlatformObservability({
      screen: params.scope,
      surface,
      category: "reload",
      event: "subscription_started",
      result: "success",
      trigger: "realtime",
      sourceKind: "supabase:realtime",
      extra: {
        route: redactRealtimeRouteForTelemetry(params.route),
        channelName: redactRealtimeChannelNameForTelemetry(params.name),
        bindingCount: params.bindings.length,
        owner: "realtime_lifecycle",
      },
    });

    const initialJoinPlan = buildRealtimeReconnectBackoffPlan({
      activeChannelCount: activeChannels.size,
      attempt: 1,
      channelName: params.name,
      reason: "initial_join",
      route: params.route,
      scope: params.scope,
    });
    observeRealtimeReconnectBackoff({
      plan: initialJoinPlan,
      route: params.route,
      scope: params.scope,
      surface,
    });
    const joinDelay = createCancellableDelay(
      shouldBypassRealtimeDelayForTests() ? 0 : initialJoinPlan.delayMs,
    );
    entry.pendingJoinDelay = joinDelay;
    const joinDelayStatus = await joinDelay.promise;
    if (entry.pendingJoinDelay === joinDelay) {
      entry.pendingJoinDelay = null;
    }
    if (joinDelayStatus === "cancelled" || entry.disposed) return;

    const entryBeforeSubscribe = activeChannels.get(params.name);
    if (entryBeforeSubscribe !== entry || entryBeforeSubscribe.subscribers.size === 0) {
      if (entryBeforeSubscribe === entry) {
        activeChannels.delete(params.name);
      }
      disposeRealtimeEntry(entry, params.name);
      return;
    }

    channel.subscribe((status) => {
      observeChannelStatus({
        scope: params.scope,
        route: params.route,
        surface,
        channelName: params.name,
        status,
      });
    });

    const liveEntry = activeChannels.get(params.name);
    if (liveEntry !== entry || liveEntry.subscribers.size === 0) {
      if (liveEntry === entry) {
        activeChannels.delete(params.name);
      }
      disposeRealtimeEntry(entry, params.name);
      return;
    }

    liveEntry.pendingChannel = null;
    liveEntry.channel = channel;
  })();

  return () => {
    const current = activeChannels.get(params.name);
    if (!current || !current.subscribers.delete(token)) return;
    if (current.subscribers.size > 0) return;
    activeChannels.delete(params.name);
    disposeRealtimeEntry(current, params.name);
    recordPlatformObservability({
      screen: params.scope,
      surface,
      category: "reload",
      event: "subscription_stopped",
      result: "success",
      trigger: "realtime",
      sourceKind: "supabase:realtime",
      extra: {
        route: redactRealtimeRouteForTelemetry(params.route),
        channelName: redactRealtimeChannelNameForTelemetry(params.name),
        owner: "realtime_lifecycle",
        reason: "last_ref_released",
      },
    });
  };
}
