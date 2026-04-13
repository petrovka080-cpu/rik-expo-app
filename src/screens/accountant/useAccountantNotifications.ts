import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
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
}) {
  const { focusedRef } = params;
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
      if (__DEV__) console.error("[useAccountantNotifications] markAllRead failed", e);
    }
    setBellOpen(false);
  }, []);

  const handleRealtimeNotification = useCallback((notification: NotificationRow) => {
    if (!focusedRef.current) return;
    if (notification?.role && notification.role !== "accountant") return;
    setNotifs((prev) => [notification, ...prev].slice(0, 20));
    if (Platform.OS !== "web") {
      void playDing();
    }
  }, [focusedRef, playDing]);

  return {
    bellOpen,
    setBellOpen,
    notifs,
    unread,
    loadNotifs,
    markAllRead,
    handleRealtimeNotification,
  };
}
