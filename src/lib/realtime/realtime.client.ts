import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";

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
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  bindingCount: number;
  bindingSignature: string;
  createdAt: number;
  client: SupabaseClient;
  subscribers: Map<number, RealtimeChannelSubscriber>;
};

type RealtimeChannelSubscriber = {
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  onEvent: SubscribeChannelParams["onEvent"];
};

export const REALTIME_ACTIVE_CHANNEL_WARN_AT = 5;
export const REALTIME_ACTIVE_CHANNEL_BUDGET = 8;

const activeChannels = new Map<string, ActiveRealtimeChannel>();
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
    warnAt: REALTIME_ACTIVE_CHANNEL_WARN_AT,
    budget: REALTIME_ACTIVE_CHANNEL_BUDGET,
  };
}

/**
 * Resets all module-level realtime state at session boundary (logout / session change).
 * Gracefully unsubscribes active channels before clearing state.
 */
export function clearRealtimeSessionState() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [name, entry] of activeChannels) {
    if (entry.channel) {
      try {
        entry.channel.unsubscribe();
      } catch (_) {
        // best-effort cleanup at session boundary
      }
      try {
        entry.client.removeChannel(entry.channel);
      } catch (_) {
        // best-effort cleanup at session boundary
      }
    }
  }
  activeChannels.clear();
  activeChannelSeq = 0;
  realtimeAuthPromise = null;
  realtimeAuthToken = "";
}

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
      route: params.route,
      channelName: params.channelName,
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

const observeChannelStatus = (params: {
  scope: RealtimeLifecycleScope;
  route: string;
  surface: string;
  channelName: string;
  status: string;
}) => {
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
      route: params.route,
      channelName: params.channelName,
      status: params.status,
      owner: "realtime_lifecycle",
    },
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
      route: params.route,
      channelName: params.channelName,
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
            route,
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
            route,
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
      if (current.channel) {
        cleanupRealtimeChannel({
          client: current.client,
          channel: current.channel,
          scope: current.scope,
          route: current.route,
          surface: current.surface,
          channelName: params.name,
        });
      }
      recordPlatformObservability({
        screen: params.scope,
        surface,
        category: "reload",
        event: "subscription_stopped",
        result: "success",
        trigger: "realtime",
        sourceKind: "supabase:realtime",
        extra: {
          route: params.route,
          channelName: params.name,
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
    if (existing.channel) {
      cleanupRealtimeChannel({
        client: existing.client,
        channel: existing.channel,
        scope: existing.scope,
        route: existing.route,
        surface: existing.surface,
        channelName: params.name,
      });
    }
  }

  const entry: ActiveRealtimeChannel = {
    channel: null,
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
    if (currentEntry !== entry || currentEntry.subscribers.size === 0) return;

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
        route: params.route,
        channelName: params.name,
        bindingCount: params.bindings.length,
        owner: "realtime_lifecycle",
      },
    });

    let channel = client.channel(params.name);
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
              route: params.route,
              channelName: params.name,
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

    recordPlatformObservability({
      screen: params.scope,
      surface,
      category: "reload",
      event: "subscription_started",
      result: "success",
      trigger: "realtime",
      sourceKind: "supabase:realtime",
      extra: {
        route: params.route,
        channelName: params.name,
        bindingCount: params.bindings.length,
        owner: "realtime_lifecycle",
      },
    });
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
      cleanupRealtimeChannel({
        client,
        channel,
        scope: params.scope,
        route: params.route,
        surface,
        channelName: params.name,
      });
      return;
    }

    liveEntry.channel = channel;
  })();

  return () => {
    const current = activeChannels.get(params.name);
    if (!current || !current.subscribers.delete(token)) return;
    if (current.subscribers.size > 0) return;
    activeChannels.delete(params.name);
    if (current.channel) {
      cleanupRealtimeChannel({
        client: current.client,
        channel: current.channel,
        scope: current.scope,
        route: current.route,
        surface: current.surface,
        channelName: params.name,
      });
    }
    recordPlatformObservability({
      screen: params.scope,
      surface,
      category: "reload",
      event: "subscription_stopped",
      result: "success",
      trigger: "realtime",
      sourceKind: "supabase:realtime",
      extra: {
        route: params.route,
        channelName: params.name,
        owner: "realtime_lifecycle",
        reason: "last_ref_released",
      },
    });
  };
}
