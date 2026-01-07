// app/_layout.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Platform, LogBox, View } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { supabase } from "../src/lib/supabaseClient";
import { ensureMyProfile, getMyRole } from "../src/lib/rik_api";

// Тихо глушим шумные web-предупреждения (только в браузере)
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

  const [roleLoaded, setRoleLoaded] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // ✅ единый lock от дублей
  const roleLoadingRef = useRef(false);

  // ✅ чтобы init не стартовал дважды в dev/fast-refresh
  const initStartedRef = useRef(false);

  // ✅ WEB: нормальный контейнер и скролл браузера
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

  // ✅ роль/профиль грузим В ФОНЕ, без блокировки входа
  const loadRoleForCurrentSession = useCallback(async () => {
    if (!supabase) return;

    if (roleLoadingRef.current) return;
    roleLoadingRef.current = true;

    try {
      setRoleLoaded(false);

      // ensure profile (таймаут)
      await Promise.race([
        ensureMyProfile(),
        new Promise((_, rej) =>
          setTimeout(
            () => rej(new Error("ensureMyProfile TIMEOUT (RLS/block)")),
            8000,
          ),
        ),
      ]);

      // get role (таймаут)
      const r = await Promise.race([
        getMyRole(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("getMyRole TIMEOUT")), 8000),
        ),
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

  // ✅ INIT: читаем session 1 раз, роль — НЕ await (чтобы не “висло”)
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

        // ✅ ВАЖНО: считаем, что сессию мы уже “загрузили”
        setSessionLoaded(true);

        // роль — фоном
        if (has) {
          loadRoleForCurrentSession();
        } else {
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

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const has = Boolean(session);
      setHasSession(has);

      // ✅ сессию считаем готовой сразу
      setSessionLoaded(true);

      if (!has) {
        setRole(null);
        setRoleLoaded(true);
        router.replace("/auth/login");
        return;
      }

      // роль — фоном (lock защищает от дублей)
      loadRoleForCurrentSession();
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadRoleForCurrentSession]);

  // ✅ РЕДИРЕКТ завязан ТОЛЬКО на sessionLoaded/hasSession
  useEffect(() => {
    if (!sessionLoaded) return;

    const inAuthStack = segments?.[0] === "auth";
    if (!hasSession && !inAuthStack) router.replace("/auth/login");
    else if (hasSession && inAuthStack) router.replace("/");
  }, [hasSession, sessionLoaded, segments]);

  return (
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  );
}

