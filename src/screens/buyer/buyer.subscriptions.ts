import type { SupabaseClient } from "@supabase/supabase-js";

import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { subscribeChannel } from "../../lib/realtime/realtime.client";
import {
  BUYER_REALTIME_BINDINGS,
  BUYER_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";

type Params = {
  supabase: SupabaseClient;
  focusedRef: { current: boolean };
  onNotif: (title: string, body: string) => void;
  onProposalsChanged: () => void;
  log?: (...args: unknown[]) => void;
};

type BuyerNotifInsertPayload = {
  new?: {
    title?: unknown;
    body?: unknown;
  };
};

export function attachBuyerSubscriptions(p: Params) {
  const { supabase, focusedRef, onNotif, onProposalsChanged, log } = p;

  const recordBuyerSubscriptionCatch = (
    kind: "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback",
    event: string,
    error: unknown,
    extra?: Record<string, unknown>,
  ) => {
    recordCatchDiscipline({
      screen: "buyer",
      surface: "realtime_subscriptions",
      event,
      kind,
      error,
      category: kind === "cleanup_only" ? "reload" : "ui",
      sourceKind: "supabase:realtime",
      errorStage: event,
      extra,
    });
  };

  const detach = subscribeChannel({
    client: supabase,
    name: BUYER_REALTIME_CHANNEL_NAME,
    scope: "buyer",
    route: "/buyer",
    surface: "realtime_subscriptions",
    bindings: BUYER_REALTIME_BINDINGS,
    onEvent: ({ binding, payload }) => {
      if (!focusedRef.current) return;

      if (binding.key === "buyer_notifications") {
        const n = (payload as BuyerNotifInsertPayload)?.new || {};
        try {
          onNotif(String(n.title || "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435"), String(n.body || ""));
        } catch (e) {
          recordBuyerSubscriptionCatch("soft_failure", "buyer_notif_callback_failed", e, {
            channelName: BUYER_REALTIME_CHANNEL_NAME,
          });
          log?.("[buyer.subscriptions] onNotif error:", e);
        }
        try {
          onProposalsChanged();
        } catch (e) {
          recordBuyerSubscriptionCatch("soft_failure", "buyer_notif_refresh_failed", e, {
            channelName: BUYER_REALTIME_CHANNEL_NAME,
          });
          log?.("[buyer.subscriptions] onProposalsChanged error:", e);
        }
        return;
      }

      if (binding.key !== "buyer_proposals_terminal") return;
      try {
        onProposalsChanged();
      } catch (e) {
        recordBuyerSubscriptionCatch("soft_failure", "buyer_proposals_refresh_failed", e, {
          channelName: BUYER_REALTIME_CHANNEL_NAME,
        });
        log?.("[buyer.subscriptions] onProposalsChanged error:", e);
      }
    },
  });

  return () => {
    try {
      detach();
    } catch (error) {
      recordBuyerSubscriptionCatch("cleanup_only", "buyer_realtime_detach_failed", error, {
        channelName: BUYER_REALTIME_CHANNEL_NAME,
      });
      log?.("[buyer.subscriptions] detach failed:", error);
    }
  };
}
