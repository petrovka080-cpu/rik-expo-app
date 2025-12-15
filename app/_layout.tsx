// app/_layout.tsx

// ❌ ВАЖНО: webStyleGuard ОТКЛЮЧЁН — он ломал скролл и оставлял хвосты
// import "../src/dev/_webStyleGuard";

import React, { useEffect, useState } from "react";
import { Platform, LogBox, View } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { supabase } from "../src/lib/supabaseClient";

// Тихо глушим шумные web-предупреждения (только в браузере)
if (Platform.OS === "web") {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated. Use style.pointerEvents',
    '"shadow*" style props are deprecated. Use "boxShadow".',
  ]);

  // fallback, если LogBox не перехватил
  const originalWarn = console.warn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.warn = (...args: any[]) => {
    const msg = String(args?.[0] ?? "");
    if (
      msg.includes("props.pointerEvents is deprecated") ||
      msg.includes('"shadow*" style props are deprecated')
    ) {
      return;
    }
    originalWarn.apply(console, args as unknown as []);
  };
}

export default function RootLayout() {
  const segments = useSegments();
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // ✅ WEB: гарантируем нормальный контейнер и скролл браузера
  useEffect(() => {
    if (Platform.OS !== "web") return;

    try {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
      document.body.style.overflow = "auto";

      const root = document.getElementById("root");
      if (root) {
        (root as any).style.height = "100%";
        (root as any).style.overflow = "auto";
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const syncSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setHasSession(Boolean(data?.session));
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[RootLayout] session load failed", (e as any)?.message ?? e);
        }
        if (active) setHasSession(false);
      } finally {
        if (active) setSessionLoaded(true);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      if (!session) router.replace("/auth/login");
    });

    syncSession();
    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;
    const inAuthStack = segments?.[0] === "auth";

    if (!hasSession && !inAuthStack) {
      router.replace("/auth/login");
    } else if (hasSession && inAuthStack) {
      router.replace("/");
    }
  }, [hasSession, sessionLoaded, segments]);

  // ✅ КРИТИЧНО: Slot ОБЁРНУТ в View с flex:1
  return (
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  );
}
