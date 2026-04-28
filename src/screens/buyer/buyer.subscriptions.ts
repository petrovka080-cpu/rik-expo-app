import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { claimRealtimeChannel } from "../../lib/realtime/realtime.channels";

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
  const notifBudget = claimRealtimeChannel({
    key: "notif-buyer-rt",
    source: "buyer.subscriptions",
    screen: "buyer",
    surface: "realtime_subscriptions",
    route: "/buyer",
    maxChannelsForSource: 2,
  });
  const proposalsBudget = claimRealtimeChannel({
    key: "buyer-proposals-rt",
    source: "buyer.subscriptions",
    screen: "buyer",
    surface: "realtime_subscriptions",
    route: "/buyer",
    maxChannelsForSource: 2,
  });

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

  const chNotif: RealtimeChannel | null =
    notifBudget.status === "duplicate"
      ? null
      : supabase
          .channel("notif-buyer-rt")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notifications", filter: "role=eq.buyer" },
            (payload: BuyerNotifInsertPayload) => {
              if (!focusedRef.current) return;
              const n = payload?.new || {};
              try {
                onNotif(String(n.title || "Уведомление"), String(n.body || ""));
              } catch (e) {
                recordBuyerSubscriptionCatch("soft_failure", "buyer_notif_callback_failed", e, {
                  channelName: "notif-buyer-rt",
                });
                log?.("[buyer.subscriptions] onNotif error:", e);
              }
              try {
                onProposalsChanged();
              } catch (e) {
                recordBuyerSubscriptionCatch("soft_failure", "buyer_notif_refresh_failed", e, {
                  channelName: "notif-buyer-rt",
                });
                log?.("[buyer.subscriptions] onProposalsChanged error:", e);
              }
            },
          )
          .subscribe();

  const chProps: RealtimeChannel | null =
    proposalsBudget.status === "duplicate"
      ? null
      : supabase
          .channel("buyer-proposals-rt")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "proposals" },
            () => {
              if (!focusedRef.current) return;
              try {
                onProposalsChanged();
              } catch (e) {
                recordBuyerSubscriptionCatch("soft_failure", "buyer_proposals_refresh_failed", e, {
                  channelName: "buyer-proposals-rt",
                });
                log?.("[buyer.subscriptions] onProposalsChanged error:", e);
              }
            },
          )
          .subscribe();

  return () => {
    notifBudget.release();
    proposalsBudget.release();
    if (chNotif) {
      try {
        supabase.removeChannel(chNotif);
      } catch (error) {
        recordBuyerSubscriptionCatch("cleanup_only", "buyer_notif_remove_channel_failed", error, {
          channelName: "notif-buyer-rt",
        });
        log?.("[buyer.subscriptions] removeChannel notif failed:", error);
      }
    }
    if (chProps) {
      try {
        supabase.removeChannel(chProps);
      } catch (error) {
        recordBuyerSubscriptionCatch("cleanup_only", "buyer_proposals_remove_channel_failed", error, {
          channelName: "buyer-proposals-rt",
        });
        log?.("[buyer.subscriptions] removeChannel proposals failed:", error);
      }
    }
  };
}
