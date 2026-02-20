// src/screens/buyer/buyer.subscriptions.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type Params = {
  supabase: SupabaseClient;
  focusedRef: { current: boolean };

  // actions
  onNotif: (title: string, body: string) => void;
  onProposalsChanged: () => void;

  // optional logger
  log?: (...args: any[]) => void;
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

  const chNotif = supabase
    .channel("notif-buyer-rt")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: "role=eq.buyer" },
      (payload: any) => {
        if (!focusedRef.current) return;
        const n = payload?.new || {};
        try {
          onNotif(String(n.title || "Уведомление"), String(n.body || ""));
        } catch (e) {
          log?.("[buyer.subscriptions] onNotif error:", e);
        }
        try {
          onProposalsChanged();
        } catch {}
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
          log?.("[buyer.subscriptions] onProposalsChanged error:", e);
        }
      }
    )
    .subscribe();

  return () => {
    try { supabase.removeChannel(chNotif); } catch {}
    try { supabase.removeChannel(chProps); } catch {}
  };
}
