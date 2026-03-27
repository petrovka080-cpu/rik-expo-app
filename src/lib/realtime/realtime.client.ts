import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";

import { recordPlatformObservability } from "../observability/platformObservability";
import { supabase } from "../supabaseClient";
import type { RealtimeChannelBinding, RealtimeScope } from "./realtime.channels";

type SubscribeChannelParams = {
  client?: SupabaseClient;
  name: string;
  scope: RealtimeScope;
  route: string;
  surface?: string;
  bindings: readonly RealtimeChannelBinding[];
  onEvent: (params: {
    binding: RealtimeChannelBinding;
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>;
  }) => void;
};

type ActiveRealtimeChannel = {
  token: number;
  channel: RealtimeChannel;
};

const activeChannels = new Map<string, ActiveRealtimeChannel>();
let activeChannelSeq = 0;
let realtimeAuthPromise: Promise<void> | null = null;
let realtimeAuthToken = "";

const cleanupRealtimeChannel = (client: SupabaseClient, channel: RealtimeChannel) => {
  try {
    channel.unsubscribe();
  } catch {
    // no-op
  }
  try {
    client.removeChannel(channel);
  } catch {
    // no-op
  }
};

const observeChannelStatus = (params: {
  scope: RealtimeScope;
  route: string;
  surface: string;
  channelName: string;
  status: string;
}) => {
  const event =
    params.status === "SUBSCRIBED"
      ? "subscription_started"
      : params.status === "CLOSED"
        ? "subscription_stopped"
        : "realtime_channel_error";
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

const ensureRealtimeAuth = async (client: SupabaseClient, scope: RealtimeScope, route: string) => {
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
          event: "subscription_started",
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

export function subscribeChannel(params: SubscribeChannelParams) {
  const client = params.client ?? supabase;
  const surface = params.surface ?? "realtime_channel";
  const token = ++activeChannelSeq;
  let disposed = false;

  void (async () => {
    await ensureRealtimeAuth(client, params.scope, params.route);
    if (disposed) return;

    const previous = activeChannels.get(params.name);
    if (previous) {
      cleanupRealtimeChannel(client, previous.channel);
      activeChannels.delete(params.name);
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
          reason: "channel_replaced",
        },
      });
    }

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
          params.onEvent({
            binding,
            payload: payload as RealtimePostgresChangesPayload<Record<string, unknown>>,
          });
        },
      );
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

    if (disposed) {
      cleanupRealtimeChannel(client, channel);
      return;
    }

    activeChannels.set(params.name, {
      token,
      channel,
    });
  })();

  return () => {
    disposed = true;
    const current = activeChannels.get(params.name);
    if (!current || current.token !== token) return;
    activeChannels.delete(params.name);
    cleanupRealtimeChannel(client, current.channel);
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
      },
    });
  };
}
