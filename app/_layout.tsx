// app/_layout.tsx

// ❌ ВАЖНО: webStyleGuard ОТКЛЮЧЁН — он ломал скролл и оставлял хвосты
// import "../src/dev/_webStyleGuard";

import React, { useEffect, useState } from "react";
import { Platform, LogBox, View } from "react-native";
import { Slot, router, useSegments } from "expo-router";
import { supabase } from "../src/lib/supabaseClient";
import { ensureMyProfile, getMyRole } from "../src/lib/rik_api";

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
const [roleLoaded, setRoleLoaded] = useState(false);
const [role, setRole] = useState<string | null>(null);
const roleLoadingRef = React.useRef(false);

  // ✅ WEB: гарантируем нормальный контейнер и скролл браузера
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

 useEffect(() => {
  if (!supabase) return;
  let active = true;

const loadRoleForSession = async () => {
  // ⛔️ защита от повторного запуска (ГЛАВНОЕ)
  if (roleLoadingRef.current) {
    console.log("⏭ role load skipped (already loading)");
    return;
  }

  roleLoadingRef.current = true;

  try {
    console.log("A: got session");

     console.log("A: got session (before ensureMyProfile)");

await Promise.race([
  ensureMyProfile(),
  new Promise((_, rej) => setTimeout(() => rej(new Error("ensureMyProfile TIMEOUT (RLS/block)")), 8000)),
]);

console.log("B: ensured profile");

const r = await Promise.race([
  getMyRole(),
  new Promise((_, rej) => setTimeout(() => rej(new Error("getMyRole TIMEOUT")), 8000)),
]);

console.log("✅ ROLE =", r);

console.log("✅ ROLE =", r);

      if (active) setRole(r);
    } catch (e: any) {
      console.warn("[RootLayout] role load failed", e?.message ?? e);
      if (active) setRole(null);
    } finally {
      if (active) setRoleLoaded(true);
    }
  };

  const syncSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const has = Boolean(data?.session);
      setHasSession(has);

      if (has) {
        await loadRoleForSession();
      } else {
        setRole(null);
        setRoleLoaded(true);
      }
    } catch (e: any) {
      console.warn("[RootLayout] session load failed", e?.message ?? e);
      if (active) {
        setHasSession(false);
        setRole(null);
        setRoleLoaded(true);
      }
    } finally {
  roleLoadingRef.current = false;
  if (active) setRoleLoaded(true);
}

  };

  const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const has = Boolean(session);
    setHasSession(has);

    // сбрасываем флаг, чтобы редирект не сработал раньше времени
    setRoleLoaded(false);

    if (!has) {
      setRole(null);
      setRoleLoaded(true);
      router.replace("/auth/login");
      return;
    }

    await loadRoleForSession();
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

  if (!hasSession && !inAuthStack) router.replace("/auth/login");
  else if (hasSession && inAuthStack) router.replace("/");
}, [hasSession, sessionLoaded, roleLoaded, segments]);


  return (
  <>
    
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  </>
);

}
