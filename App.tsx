// C:\dev\rik-expo-app\App.tsx
import { ExpoRoot } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Updates from "expo-updates";

async function tryOtaUpdateOnLaunchSafe() {
  try {
    if (Platform.OS === "web") return;
    if (!Updates.isEnabled) return;

    const r = await Updates.checkForUpdateAsync();
    if (r.isAvailable) {
      await Updates.fetchUpdateAsync();
      // НЕ делаем reload автоматически (стабильно для iOS)
      console.log("[updates] downloaded; will apply on next launch");
    }
  } catch (e: any) {
    console.log("[updates] error:", e?.message || e);
  }
}

export default function App() {
  useEffect(() => {
    Promise.resolve().then(() => tryOtaUpdateOnLaunchSafe());
  }, []);

  const ctx = (require as any).context("./app");
  return <ExpoRoot context={ctx} />;
}
