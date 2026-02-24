// C:\dev\rik-expo-app\App.tsx
import { ExpoRoot } from "expo-router";
import * as Notifications from "expo-notifications";
// @ts-ignore
import * as Device from "expo-device";
import { useEffect } from "react";

import { Platform } from "react-native";
import * as Updates from "expo-updates";

// Показывать баннер даже когда вкладка активна
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --- ЖЁСТКИЙ ФОЛБЭК ДЛЯ WEB, если expo-notifications не показал баннер ---
async function fireBrowserNotificationFallback() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  let perm = Notification.permission;
  if (perm !== "granted") {
    perm = await Notification.requestPermission();
  }

  if (perm === "granted") {
    new Notification("Тест (web)", {
      body: "Браузерные уведомления работают ✅",
    });
    return true;
  }

  console.log("[web notif] not granted:", perm);
  return false;
}

/**
 * Безопасная OTA проверка:
 * - проверяем и скачиваем обновление
 * - НЕ делаем reload сразу (это может крашить iOS)
 * - обновление применится при следующем запуске приложения
 */
async function tryOtaUpdateOnLaunchSafe() {
  try {
    if (Platform.OS === "web") return;

    if (!Updates.isEnabled) {
      console.log("[updates] isEnabled=false (dev/ExpoGo?)");
      return;
    }

    const r = await Updates.checkForUpdateAsync();
    if (r.isAvailable) {
      console.log("[updates] update available -> fetching...");
      await Updates.fetchUpdateAsync();
      console.log("[updates] update downloaded; will apply on next launch");
      // ВАЖНО: НЕ вызываем Updates.reloadAsync() автоматически
    } else {
      console.log("[updates] no update");
    }
  } catch (e: any) {
    console.log("[updates] error:", e?.message || e);
  }
}

export default function App() {
  useEffect(() => {
    // 0) OTA проверка при старте (в билде TestFlight/APK/AAB)
    // Делаем через microtask, чтобы не стрелять "слишком рано" на iOS
    Promise.resolve().then(() => tryOtaUpdateOnLaunchSafe());

    // 1) Права на уведомления
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      let granted = status === "granted";
      if (!granted) {
        const ask = await Notifications.requestPermissionsAsync();
        granted = ask.status === "granted";
      }

      // 2) Android канал
      if (Device.osName === "Android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
        });
      }

      // 3) Сначала пробуем expo-локалку через 2 сек
      if (granted) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Тест уведомлений",
              body: "Если видишь это — всё работает ✅",
              sound: "default",
            },
            trigger: { seconds: 2, channelId: "default" },
          });
        } catch (e: any) {
          console.log("[expo-notifications] schedule error:", e?.message || e);
        }
      }

      // 4) Через 3.5 сек — браузерный фолбэк (web)
      setTimeout(() => {
        fireBrowserNotificationFallback();
      }, 3500);
    })();
  }, []);

  // обычный expo-router
  const ctx = (require as any).context("./app");
  return <ExpoRoot context={ctx} />;
}
