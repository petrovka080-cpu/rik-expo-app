import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ExpoLinking from "expo-linking";
import { router, type Href } from "expo-router";

import { POST_AUTH_ENTRY_ROUTE } from "../src/lib/authRouting";
import { getLatestNativeViewUrl } from "../src/lib/navigation/nativeIntentEvents";
import {
  resolvePublicRequestDeepLinkTarget,
  type PublicRequestDeepLinkTarget,
} from "../src/lib/navigation/coreRoutes";
import { recordPlatformObservability } from "../src/lib/observability/platformObservability";
import {
  getSessionSafe,
  hasPersistedAuthSessionHint,
  supabase,
} from "../src/lib/supabaseClient";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

async function resolveInitialPublicRequestTarget(): Promise<PublicRequestDeepLinkTarget | null> {
  if (Platform.OS === "web") return null;
  try {
    const nativeViewUrl = await getLatestNativeViewUrl();
    const nativeViewTarget = resolvePublicRequestDeepLinkTarget(nativeViewUrl);
    if (nativeViewTarget) return nativeViewTarget;

    const expoLinkingUrl = ExpoLinking.getLinkingURL();
    const expoLinkingTarget = resolvePublicRequestDeepLinkTarget(expoLinkingUrl);
    if (expoLinkingTarget) return expoLinkingTarget;

    const url = await Linking.getInitialURL();
    return resolvePublicRequestDeepLinkTarget(url);
  } catch (error) {
    recordPlatformObservability({
      screen: "request",
      surface: "startup_bootstrap",
      category: "ui",
      event: "public_request_initial_url_read_failed",
      result: "error",
      errorStage: "linking_get_initial_url",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage:
        error instanceof Error
          ? error.message
          : String(error ?? "linking_get_initial_url_failed"),
      fallbackUsed: true,
      extra: {
        owner: "index",
      },
    });
    return null;
  }
}

function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const replaceIfActive = (target: Href) => {
      if (!active) return;
      router.replace(target);
    };
    recordPlatformObservability({
      screen: "request",
      surface: "startup_bootstrap",
      category: "ui",
      event: "bootstrap_enter",
      result: "success",
      extra: {
        owner: "index",
      },
    });

    const bootstrap = async () => {
      const publicRequestTarget = await resolveInitialPublicRequestTarget();
      if (publicRequestTarget) {
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "route_resolution_result",
          result: "success",
          extra: {
            owner: "index",
            target: publicRequestTarget.href,
            reason: "public_request_initial_url",
          },
        });
        replaceIfActive({
          pathname: publicRequestTarget.navigationPathname,
          params: publicRequestTarget.params,
        } as Href);
        return;
      }

      if (!supabase) {
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "route_resolution_result",
          result: "success",
          extra: {
            owner: "index",
            target: "/auth/login",
            reason: "supabase_missing",
          },
        });
        replaceIfActive("/auth/login");
        return;
      }

      try {
        const { session, degraded } = await getSessionSafe({ caller: "index_bootstrap" });
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "fetch",
          event: "auth_restore_result",
          result: "success",
          fallbackUsed: degraded,
          extra: {
            owner: "index",
            degraded,
            hasSession: Boolean(session),
          },
        });

        if (degraded) {
          const persistedHint = await hasPersistedAuthSessionHint({
            caller: "index_bootstrap",
          });
          const target =
            persistedHint.hasStoredSession || persistedHint.degraded
              ? POST_AUTH_ENTRY_ROUTE
              : "/auth/login";
          recordPlatformObservability({
            screen: "request",
            surface: "startup_bootstrap",
            category: "ui",
            event: "route_resolution_result",
            result: "success",
            fallbackUsed: persistedHint.degraded || undefined,
            extra: {
              owner: "index",
              target,
              reason: persistedHint.hasStoredSession
                ? "degraded_session_with_persisted_auth_hint"
                : persistedHint.degraded
                  ? "degraded_session_auth_hint_unavailable"
                  : "degraded_session_without_persisted_auth",
              hasPersistedAuthSessionHint: persistedHint.hasStoredSession,
            },
          });
          replaceIfActive(target);
        } else {
          const target = session ? POST_AUTH_ENTRY_ROUTE : "/auth/login";
          recordPlatformObservability({
            screen: "request",
            surface: "startup_bootstrap",
            category: "ui",
            event: "route_resolution_result",
            result: "success",
            extra: {
              owner: "index",
              target,
              reason: session ? "session_present" : "session_absent",
            },
          });
          replaceIfActive(target);
        }
      } catch (error) {
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "fetch",
          event: "auth_restore_result",
          result: "error",
          errorStage: "get_session_safe",
          errorClass: error instanceof Error ? error.name : undefined,
          errorMessage: error instanceof Error ? error.message : String(error ?? "index_bootstrap_failed"),
          fallbackUsed: true,
          extra: {
            owner: "index",
          },
        });
        if (__DEV__) {
          console.warn(
            "[index] session bootstrap failed:",
            error instanceof Error ? error.message : error,
          );
        }
        const persistedHint = await hasPersistedAuthSessionHint({
          caller: "index_bootstrap_error",
        });
        const target =
          persistedHint.hasStoredSession || persistedHint.degraded
            ? POST_AUTH_ENTRY_ROUTE
            : "/auth/login";
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "route_resolution_result",
          result: "success",
          fallbackUsed: true,
          extra: {
            owner: "index",
            target,
            reason: persistedHint.hasStoredSession
              ? "bootstrap_error_with_persisted_auth_hint"
              : persistedHint.degraded
                ? "bootstrap_error_auth_hint_unavailable"
                : "bootstrap_error_without_persisted_auth",
            hasPersistedAuthSessionHint: persistedHint.hasStoredSession,
          },
        });
        replaceIfActive(target);
      } finally {
        if (active) setChecking(false);
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#111827" />
      <Text style={styles.text}>
        {checking
          ? "Собираем ваш стартовый экран..."
          : "Открываем GOX..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  text: {
    marginTop: 12,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default withScreenErrorBoundary(Index, {
  screen: "startup",
  route: "/",
});
