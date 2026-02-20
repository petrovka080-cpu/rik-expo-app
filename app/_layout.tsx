// app/_layout.tsx  (PROD, чистый)
// ✅ без boot-test, без лишнего, стабильный init/redirect, web-фиксы сохранены

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, LogBox } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../src/lib/supabaseClient";
import { ensureMyProfile, getMyRole } from "../src/lib/rik_api";
import { GlobalBusyProvider } from "../src/ui/GlobalBusy";

// --- WEB: тихо глушим шумные предупреждения (только в браузере) ---
if (Platform.OS === "web") {
  LogBox.ignoreLogs([
    "props.pointerEvents is deprecated. Use style.pointerEvents",
    '"shadow*" style props are deprecated. Use "boxShadow".',
  ]);

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

  // роль сейчас напрямую не используется в _layout, но оставляем фоновой прогрев
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const roleLoadingRef = useRef(false);
  const initStartedRef = useRef(false);

  // --- WEB: нормальный контейнер/скролл + leaflet css (если нужен) ---
  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      const id = "leaflet-css-cdn";
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

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

  // --- роль/профиль грузим в фоне, НЕ блокируя вход ---
  const loadRoleForCurrentSession = useCallback(async () => {
    if (!supabase) return;
    if (roleLoadingRef.current) return;
    roleLoadingRef.current = true;

    try {
      setRoleLoaded(false);

      await Promise.race([
        ensureMyProfile(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("ensureMyProfile TIMEOUT")), 8000),
        ),
      ]);

      const r = await Promise.race([
        getMyRole(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("getMyRole TIMEOUT")), 8000)),
      ]);

      setRole(r ?? null);
    } catch (e: any) {
      console.warn("[RootLayout] role load failed:", e?.message ?? e);
      setRole(null);
    } finally {
      roleLoadingRef.current = false;
      setRoleLoaded(true);
    }
  }, []);

  // --- INIT: читаем session один раз, роль — фоном ---
  useEffect(() => {
    if (!supabase) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let active = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;

        const has = Boolean(data?.session);
        setHasSession(has);
        setSessionLoaded(true);

        if (has) loadRoleForCurrentSession();
        else {
          setRole(null);
          setRoleLoaded(true);
        }
      } catch (e: any) {
        console.warn("[RootLayout] session load failed:", e?.message ?? e);
        if (!active) return;
        setHasSession(false);
        setRole(null);
        setRoleLoaded(true);
        setSessionLoaded(true);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const has = Boolean(session);
      setHasSession(has);
      setSessionLoaded(true);

      if (!has) {
        setRole(null);
        setRoleLoaded(true);
        router.replace("/auth/login");
        return;
      }

      loadRoleForCurrentSession();
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadRoleForCurrentSession]);

  // --- redirect только по sessionLoaded/hasSession ---
  useEffect(() => {
    if (!sessionLoaded) return;
    const inAuthStack = segments?.[0] === "auth";

    if (!hasSession && !inAuthStack) router.replace("/auth/login");
    else if (hasSession && inAuthStack) router.replace("/");
  }, [hasSession, sessionLoaded, segments]);

  const APP_BG = "#0B0F14";
  const UI = {
    text: "#F8FAFC",
    cardBg: "#101826",
    border: "#1F2A37",
  };

  return (
      <SafeAreaProvider>
      <GlobalBusyProvider theme={UI}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: APP_BG, paddingTop: 0 }}
          edges={Platform.OS === "web" ? [] : ["top"]}
        >
          <Slot />
        </SafeAreaView>
      </GlobalBusyProvider>
    </SafeAreaProvider>
  );

}

