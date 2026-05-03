// app/_layout.tsx  (PROD — Stack root for native iOS navigation support)
// AUTH-LIFECYCLE: Thin shell. Auth bootstrap + guard logic extracted to hooks.

import "../src/lib/runtime/installWeakRefPolyfill";
import React, { useEffect } from "react";
import { InteractionManager, Platform, LogBox } from "react-native";
import { Stack, usePathname, useSegments } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Host } from "react-native-portalize";

import { clearAppCache } from "../src/lib/cache/clearAppCache";
import { GlobalBusyProvider } from "../src/ui/GlobalBusy";
import PlatformOfflineStatusHost from "../src/components/PlatformOfflineStatusHost";
import { applyRootLayoutWebContainerStyle } from "../src/lib/entry/rootLayoutWebContainer";
import { AppQueryProvider } from "../src/lib/query/queryClient";
import { useAuthLifecycle } from "../src/lib/auth/useAuthLifecycle";
import { useAuthGuard } from "../src/lib/auth/useAuthGuard";
import { initializeSentry, wrapRootComponentWithSentry } from "../src/lib/observability/sentry";
import { recordPlatformObservability } from "../src/lib/observability/platformObservability";

initializeSentry();

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

type PdfViewerWarmupAuthStatus = "unknown" | "authenticated" | "unauthenticated";

function normalizeWarmupPathname(pathname: string | null | undefined) {
  return String(pathname ?? "").split("?")[0] || "/";
}

function shouldWarmPdfViewerAfterStartup(input: {
  platformOs: string;
  pathname: string | null | undefined;
  sessionLoaded: boolean;
  authSessionStatus: PdfViewerWarmupAuthStatus;
}) {
  if (input.platformOs === "web") return false;
  if (!input.sessionLoaded) return false;
  if (input.authSessionStatus !== "authenticated") return false;

  const pathname = normalizeWarmupPathname(input.pathname);
  if (pathname === "/" || pathname === "/index") return false;
  if (pathname === "/pdf-viewer") return false;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return false;

  return true;
}

function RootLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const isPdfViewerRoute = pathname === "/pdf-viewer";

  // AUTH-LIFECYCLE: Auth bootstrap + listener (stable, route-independent)
  const authState = useAuthLifecycle({
    pathname,
    isPdfViewerRoute,
    segments,
  });

  // AUTH-LIFECYCLE: Route-coupled auth guard / redirect decisions
  useAuthGuard({
    ...authState,
    segments,
    pathname,
  });

  // --- WEB: нормальный контейнер/скролл ---
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const result = applyRootLayoutWebContainerStyle(document);
    if (result.ok === false) {
      recordPlatformObservability({
        screen: "request",
        surface: "auth_session_gate",
        category: "ui",
        event: "web_root_container_style_failed",
        result: "error",
        extra: {
          caller: "root_layout",
          errorStage: "web_root_container_setup",
          errorClass: result.errorClass,
          errorMessage: result.errorMessage,
          fallbackUsed: true,
        },
      });
    }
  }, []);

  useEffect(() => {
    void clearAppCache();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return undefined;
    if (
      !shouldWarmPdfViewerAfterStartup({
        platformOs: Platform.OS,
        pathname,
        sessionLoaded: authState.sessionLoaded,
        authSessionStatus: authState.authSessionState.status,
      })
    ) {
      return undefined;
    }

    let warmupTimeout: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      warmupTimeout = setTimeout(() => {
        void import("./pdf-viewer");
      }, 4_000);
    });

    return () => {
      task.cancel?.();
      if (warmupTimeout) clearTimeout(warmupTimeout);
    };
  }, [authState.authSessionState.status, authState.sessionLoaded, pathname]);

  const APP_BG = "#0B0F14";
  const UI = {
    text: "#F8FAFC",
    cardBg: "#101826",
    border: "#1F2A37",
  };

  return (
    <AppQueryProvider>
      <SafeAreaProvider>
        <Host>
          <GlobalBusyProvider theme={UI} suppressOverlay={isPdfViewerRoute}>
            <SafeAreaView
              style={{ flex: 1, backgroundColor: APP_BG, paddingTop: 0 }}
              edges={Platform.OS === "web" ? [] : ["top"]}
            >
              <PlatformOfflineStatusHost />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="pdf-viewer"
                  options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                    animation: "fade",
                    gestureEnabled: false,
                  }}
                />
              </Stack>
            </SafeAreaView>
          </GlobalBusyProvider>
        </Host>
      </SafeAreaProvider>
    </AppQueryProvider>
  );
}

export default wrapRootComponentWithSentry(RootLayout);
