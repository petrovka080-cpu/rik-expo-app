// src/screens/buyer/buyer.subscriptions.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";

type Params = {
  supabase: SupabaseClient;
  focusedRef: { current: boolean };

  // actions
  onNotif: (title: string, body: string) => void;
  onProposalsChanged: () => void;

  // optional logger
  log?: (...args: unknown[]) => void;
};
type BuyerNotifInsertPayload = {
  new?: {
    title?: unknown;
    body?: unknown;
  };
};

/**
 * Подписки buyer:
 * - notifications INSERT role=buyer
 * - proposals любые изменения (чтобы табы обновлялись)
 *
 * Возвращает detach() для cleanup.
 */
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

  const chNotif = supabase
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
      }
    )
    .subscribe();

  const chProps = supabase
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
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(chNotif);
    } catch (error) {
      recordBuyerSubscriptionCatch("cleanup_only", "buyer_notif_remove_channel_failed", error, {
        channelName: "notif-buyer-rt",
      });
      log?.("[buyer.subscriptions] removeChannel notif failed:", error);
    }
    try {
      supabase.removeChannel(chProps);
    } catch (error) {
      recordBuyerSubscriptionCatch("cleanup_only", "buyer_proposals_remove_channel_failed", error, {
        channelName: "buyer-proposals-rt",
      });
      log?.("[buyer.subscriptions] removeChannel proposals failed:", error);
    }
  };
}
