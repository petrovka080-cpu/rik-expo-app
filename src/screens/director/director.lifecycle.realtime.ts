import type { MutableRefObject } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { reportAndSwallow } from "../../lib/observability/catchDiscipline";
import { ensureSignedIn, supabase } from "../../lib/supabaseClient";
import {
  DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
  DIRECTOR_HANDOFF_BROADCAST_EVENT,
  DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";

import type { DirectorLifecycleRefreshHandler } from "./director.lifecycle.contract";
import {
  DIRECTOR_REQUEST_TAB_BUYER,
  DIRECTOR_TAB_REQUESTS,
  getOptionalRecordString,
  getRecordValue,
  shouldRefreshDirectorPropsForProposalChange,
  shouldRefreshDirectorRowsForItemChange,
  shouldRefreshDirectorRowsForRequestChange,
} from "./director.lifecycle.scope";

const logDirectorLive = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[director.live]", payload);
};

type DirectorRealtimeRefs = {
  dirTabRef: MutableRefObject<string>;
  requestTabRef: MutableRefObject<string>;
  showRtToastRef: MutableRefObject<(title?: string, body?: string) => void>;
  refreshCurrentVisibleScopeRef: MutableRefObject<DirectorLifecycleRefreshHandler>;
  refreshRowsHandlerRef: MutableRefObject<DirectorLifecycleRefreshHandler>;
  refreshPropsHandlerRef: MutableRefObject<DirectorLifecycleRefreshHandler>;
  rtChannelRef: MutableRefObject<RealtimeChannel | null>;
  handoffChannelRef: MutableRefObject<RealtimeChannel | null>;
};

const cleanupRealtimeChannel = (params: {
  channel: RealtimeChannel | null;
  ref: MutableRefObject<RealtimeChannel | null>;
  unsubscribeEvent: string;
  removeEvent: string;
}) => {
  if (!params.channel) return;

  try {
    params.channel.unsubscribe();
  } catch (error) {
    reportAndSwallow({
      screen: "director",
      surface: "realtime_cleanup",
      event: params.unsubscribeEvent,
      error,
      kind: "cleanup_only",
      category: "reload",
      errorStage: "realtime_cleanup",
    });
  }

  try {
    supabase.removeChannel(params.channel);
  } catch (error) {
    reportAndSwallow({
      screen: "director",
      surface: "realtime_cleanup",
      event: params.removeEvent,
      error,
      kind: "cleanup_only",
      category: "reload",
      errorStage: "realtime_cleanup",
    });
  }

  if (params.ref.current === params.channel) {
    params.ref.current = null;
  }
};

const clearPreviousRealtimeChannels = (refs: Pick<DirectorRealtimeRefs, "rtChannelRef" | "handoffChannelRef">) => {
  try {
    if (refs.rtChannelRef.current) {
      supabase.removeChannel(refs.rtChannelRef.current);
      refs.rtChannelRef.current = null;
    }
    if (refs.handoffChannelRef.current) {
      supabase.removeChannel(refs.handoffChannelRef.current);
      refs.handoffChannelRef.current = null;
    }
  } catch (error) {
    reportAndSwallow({
      screen: "director",
      surface: "realtime_cleanup",
      event: "teardown_previous_channels_failed",
      error,
      kind: "cleanup_only",
      category: "reload",
      errorStage: "realtime_setup",
    });
  }
};

const authorizeRealtime = async () => {
  try {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token ?? null;
    if (accessToken) {
      await supabase.realtime.setAuth(accessToken);
      logDirectorLive({
        sourcePath: "director.lifecycle.realtime_auth",
        hasAccessToken: true,
      });
    }
  } catch (error) {
    logDirectorLive({
      sourcePath: "director.lifecycle.realtime_auth",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
};

const createDirectorScreenChannel = (refs: DirectorRealtimeRefs) =>
  supabase
    .channel(DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: "role=eq.director",
      },
      (payload) => {
        const title = getOptionalRecordString(payload.new, "title");
        const body = getOptionalRecordString(payload.new, "body");
        refs.showRtToastRef.current(title, body);
        // P6.6: Only refresh Requests data - finance/reports have their own realtime channels.
        // Notification INSERT has no semantic connection to finance/report data.
        if (refs.dirTabRef.current === DIRECTOR_TAB_REQUESTS) {
          refs.refreshCurrentVisibleScopeRef.current("realtime:notifications", true);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "proposals",
      },
      (payload) => {
        if (
          refs.dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
          refs.requestTabRef.current !== DIRECTOR_REQUEST_TAB_BUYER
        ) {
          return;
        }
        if (!shouldRefreshDirectorPropsForProposalChange(payload)) return;
        logDirectorLive({
          sourcePath: "director.lifecycle.proposals",
          eventType: payload.eventType,
          proposalId:
            String(getRecordValue(payload.new, "id") ?? getRecordValue(payload.old, "id") ?? "").trim() || null,
          nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
          prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
        });
        void refs.refreshPropsHandlerRef.current("realtime:proposals", true);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "requests",
      },
      (payload) => {
        if (
          refs.dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
          refs.requestTabRef.current === DIRECTOR_REQUEST_TAB_BUYER
        ) {
          return;
        }
        if (!shouldRefreshDirectorRowsForRequestChange(payload)) return;
        logDirectorLive({
          sourcePath: "director.lifecycle.requests",
          eventType: payload.eventType,
          requestId:
            String(getRecordValue(payload.new, "id") ?? getRecordValue(payload.old, "id") ?? "").trim() || null,
          nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
          prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
        });
        void refs.refreshRowsHandlerRef.current("realtime:requests", true);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "request_items",
      },
      (payload) => {
        if (
          refs.dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
          refs.requestTabRef.current === DIRECTOR_REQUEST_TAB_BUYER
        ) {
          return;
        }
        if (!shouldRefreshDirectorRowsForItemChange(payload)) return;
        logDirectorLive({
          sourcePath: "director.lifecycle.request_items",
          eventType: payload.eventType,
          requestId:
            String(getRecordValue(payload.new, "request_id") ?? getRecordValue(payload.old, "request_id") ?? "").trim() ||
            null,
          nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
          prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
        });
        void refs.refreshRowsHandlerRef.current("realtime:request_items", true);
      },
    )
    .subscribe((status) => {
      logDirectorLive({
        sourcePath: "director.lifecycle.channel",
        status,
      });
    });

const createDirectorHandoffChannel = (refs: DirectorRealtimeRefs) =>
  supabase
    .channel(DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME, {
      config: {
        broadcast: {
          ack: false,
          self: false,
        },
      },
    })
    .on("broadcast", { event: DIRECTOR_HANDOFF_BROADCAST_EVENT }, (payload) => {
      if (
        refs.dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
        refs.requestTabRef.current === DIRECTOR_REQUEST_TAB_BUYER
      ) {
        return;
      }
      logDirectorLive({
        sourcePath: "director.lifecycle.broadcast_handoff",
        requestId: String(getRecordValue(payload.payload, "request_id") ?? "").trim() || null,
        displayNo: String(getRecordValue(payload.payload, "display_no") ?? "").trim() || null,
      });
      void refs.refreshRowsHandlerRef.current("broadcast:foreman_submit", true);
    })
    .subscribe((status) => {
      logDirectorLive({
        sourcePath: "director.lifecycle.broadcast_channel",
        status,
      });
    });

export const setupDirectorRealtimeLifecycle = (params: {
  isScreenFocused: boolean;
  refs: DirectorRealtimeRefs;
}) => {
  clearPreviousRealtimeChannels(params.refs);

  if (!params.isScreenFocused) {
    return undefined;
  }

  let cancelled = false;
  let screenChannel: RealtimeChannel | null = null;
  let handoffChannel: RealtimeChannel | null = null;

  void (async () => {
    const signedIn = await ensureSignedIn();
    if (!signedIn || cancelled) {
      return;
    }

    await authorizeRealtime();
    if (cancelled) return;

    screenChannel = createDirectorScreenChannel(params.refs);
    params.refs.rtChannelRef.current = screenChannel;

    handoffChannel = createDirectorHandoffChannel(params.refs);
    params.refs.handoffChannelRef.current = handoffChannel;
  })();

  return () => {
    cancelled = true;
    cleanupRealtimeChannel({
      channel: screenChannel,
      ref: params.refs.rtChannelRef,
      unsubscribeEvent: "screen_channel_unsubscribe_failed",
      removeEvent: "screen_channel_remove_failed",
    });
    cleanupRealtimeChannel({
      channel: handoffChannel,
      ref: params.refs.handoffChannelRef,
      unsubscribeEvent: "handoff_channel_unsubscribe_failed",
      removeEvent: "handoff_channel_remove_failed",
    });
  };
};
