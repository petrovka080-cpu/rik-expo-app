import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { notifList, notifMarkRead } from "../../lib/catalog_api";
import type { NotificationRow } from "./types";
import { initDing, playDing as playDingSound, unloadDing } from "../../lib/notify";

const logAccountantNotificationsDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

export function useAccountantNotifications(params: {
  focusedRef: React.MutableRefObject<boolean>;
  freezeWhileOpen: boolean;
  onNotifReloadList?: () => void;
}) {
  const { focusedRef, freezeWhileOpen, onNotifReloadList } = params;
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationRow[]>([]);
  const unread = notifs.length;

  const loadNotifs = useCallback(async () => {
    if (!focusedRef.current) return;
    try {
      const list = await notifList("accountant", 20);
      setNotifs(Array.isArray(list) ? list : []);
    } catch (e) {
      logAccountantNotificationsDebug("[useAccountantNotifications] loadNotifs failed", e);
    }
  }, [focusedRef]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;
    (async () => {
      try {
        await initDing();
      } catch (e) {
        logAccountantNotificationsDebug("[useAccountantNotifications] initDing failed", e);
      }
    })();
    return () => {
      if (!mounted) return;
      mounted = false;
      try {
        unloadDing();
      } catch (e) {
        logAccountantNotificationsDebug("[useAccountantNotifications] unloadDing failed", e);
      }
    };
  }, []);

  const playDing = useCallback(async () => {
    try {
      await playDingSound();
    } catch (e) {
      logAccountantNotificationsDebug("[useAccountantNotifications] playDingSound failed", e);
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      logAccountantNotificationsDebug("[useAccountantNotifications] Haptics failed", e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notifMarkRead("accountant");
      setNotifs([]);
    } catch (e) {
      console.error("[useAccountantNotifications] markAllRead failed", e);
    }
    setBellOpen(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const ch = supabase
        .channel("notif-accountant-rt")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: "role=eq.accountant" },
          (payload: { new?: unknown }) => {
            if (!focusedRef.current) return;
            const n = (payload?.new ?? {}) as NotificationRow;
            if (n?.role !== "accountant") return;

            setNotifs((prev) => [n, ...prev].slice(0, 20));
            void playDing();

            if (Platform.OS !== "web" && !freezeWhileOpen) {
              onNotifReloadList?.();
            }
          },
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(ch);
        } catch (e) {
          logAccountantNotificationsDebug("[useAccountantNotifications] removeChannel failed", e);
        }
      };
    }, [focusedRef, freezeWhileOpen, onNotifReloadList, playDing]),
  );

  return {
    bellOpen,
    setBellOpen,
    notifs,
    unread,
    loadNotifs,
    markAllRead,
  };
}
