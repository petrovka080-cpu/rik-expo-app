import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { POST_AUTH_ENTRY_ROUTE } from "../src/lib/authRouting";
import { recordPlatformObservability } from "../src/lib/observability/platformObservability";
import { getSessionSafe, supabase } from "../src/lib/supabaseClient";

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
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
        router.replace("/auth/login");
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
          // If network is failing, we assume the user might have a cached session we can't verify 
          // right now. We route to the main app, where _layout.tsx will keep hasSession=null
          // and prevent an erroneous logout redirect.
          recordPlatformObservability({
            screen: "request",
            surface: "startup_bootstrap",
            category: "ui",
            event: "route_resolution_result",
            result: "success",
            extra: {
              owner: "index",
              target: POST_AUTH_ENTRY_ROUTE,
              reason: "degraded_session",
            },
          });
          router.replace(POST_AUTH_ENTRY_ROUTE);
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
          router.replace(target);
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
        // Fallback safely to entry route to avoid unintended logout
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "route_resolution_result",
          result: "success",
          extra: {
            owner: "index",
            target: POST_AUTH_ENTRY_ROUTE,
            reason: "bootstrap_error_fallback",
          },
        });
        router.replace(POST_AUTH_ENTRY_ROUTE);
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
