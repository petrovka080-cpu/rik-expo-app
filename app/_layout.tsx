// app/_layout.tsx  (PROD, чистый)


import "../src/lib/runtime/installWeakRefPolyfill";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, LogBox } from "react-native";
import { Slot, router, usePathname, useSegments } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Host } from "react-native-portalize";

import { clearAppCache } from "../src/lib/cache/clearAppCache";
import { getSessionSafe, supabase } from "../src/lib/supabaseClient";
import { clearDocumentSessions } from "../src/lib/documents/pdfDocumentSessions";
import { clearCurrentSessionRoleCache, warmCurrentSessionProfile } from "../src/lib/sessionRole";
import { ensureQueueWorker, stopQueueWorker } from "../src/workers/queueBootstrap";
import { GlobalBusyProvider } from "../src/ui/GlobalBusy";
import PlatformOfflineStatusHost from "../src/components/PlatformOfflineStatusHost";
import { POST_AUTH_ENTRY_ROUTE } from "../src/lib/authRouting";
// --- WEB: тихо глушим шумные предупреждения (только в браузере) ---
if (Platform.OS === "web") {
  LogBox.ignoreLogs([
    "props.pointerEvents is deprecated. Use style.pointerEvents",
    '"shadow*" style props are deprecated. Use "boxShadow".',
  ]);

  const originalWarn = console.warn;
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
  const pathname = usePathname();
  const isPdfViewerRoute = pathname === "/pdf-viewer";

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // роль сейчас напрямую не используется в _layout, но оставляем фоновой прогрев
  const initStartedRef = useRef(false);
  // --- WEB: нормальный контейнер/скролл ---
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
    void clearAppCache();
  }, []);

  // --- роль/профиль грузим в фоне, НЕ блокируя вход ---
  const loadRoleForCurrentSession = useCallback(async () => {
    if (!supabase) return;
    try {
      await warmCurrentSessionProfile("root_layout");
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn("[RootLayout] role load failed:", e instanceof Error ? e.message : e);
      }
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
        const { session, degraded } = await getSessionSafe({
  caller: "root_layout",
});
if (!active) return;

if (degraded) {
  setHasSession(null);
  setSessionLoaded(true);
  return;
}

const has = Boolean(session);
setHasSession(has);
setSessionLoaded(true);

if (has) loadRoleForCurrentSession();
else {
  clearDocumentSessions();
  clearCurrentSessionRoleCache();
}
      } catch (e: unknown) {
        if (__DEV__) {
          console.warn("[RootLayout] session load failed:", e instanceof Error ? e.message : e);
        }
        if (!active) return;

// 🔥 НЕ считаем это logout
setHasSession(null);

// ❌ НЕ ЧИСТИМ состояние при timeout
// clearDocumentSessions();
// clearCurrentSessionRoleCache();

setSessionLoaded(true);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const has = Boolean(session);
      setHasSession(has);
      setSessionLoaded(true);

      if (!has) {
        clearDocumentSessions();
        clearCurrentSessionRoleCache();
        if (!isPdfViewerRoute) {
          router.replace("/auth/login");
        }
        return;
      }

      loadRoleForCurrentSession();
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [isPdfViewerRoute, loadRoleForCurrentSession]);

  useEffect(() => {
  if (!sessionLoaded) return;

  const inAuthStack = segments?.[0] === "auth";

  if (hasSession === false && !inAuthStack && !isPdfViewerRoute) {
    router.replace("/auth/login");
    return;
  }

  if (hasSession === true && inAuthStack) {
    router.replace(POST_AUTH_ENTRY_ROUTE);
  }
}, [hasSession, isPdfViewerRoute, sessionLoaded, segments]);

  useEffect(() => {
  if (!sessionLoaded) return;

  if (hasSession === true) {
    ensureQueueWorker();
    return;
  }

  if (hasSession === false) {
    stopQueueWorker();
  }
}, [hasSession, sessionLoaded]);

  const APP_BG = "#0B0F14";
  const UI = {
    text: "#F8FAFC",
    cardBg: "#101826",
    border: "#1F2A37",
  };

  return (
    <SafeAreaProvider>
      <Host>
        <GlobalBusyProvider theme={UI}>
          <SafeAreaView
            style={{ flex: 1, backgroundColor: APP_BG, paddingTop: 0 }}
            edges={Platform.OS === "web" ? [] : ["top"]}
          >
            <PlatformOfflineStatusHost />
            <Slot />
          </SafeAreaView>
        </GlobalBusyProvider>
      </Host>
    </SafeAreaProvider>
  );

}
