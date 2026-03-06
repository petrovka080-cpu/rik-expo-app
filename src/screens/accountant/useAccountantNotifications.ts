import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { notifList, notifMarkRead } from "../../lib/catalog_api";
import type { NotificationRow } from "./types";
import { initDing, playDing as playDingSound, unloadDing } from "../../lib/notify";

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
    } catch {}
  }, [focusedRef]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;
    (async () => {
      try {
        await initDing();
      } catch {}
    })();
    return () => {
      if (!mounted) return;
      mounted = false;
      try {
        unloadDing();
      } catch {}
    };
  }, []);

  const playDing = useCallback(async () => {
    try {
      await playDingSound();
    } catch {}
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notifMarkRead("accountant");
      setNotifs([]);
    } catch {}
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
        } catch {}
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
