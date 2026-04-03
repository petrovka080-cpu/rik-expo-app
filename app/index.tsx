import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { POST_AUTH_ENTRY_ROUTE } from "../src/lib/authRouting";
import { RequestTimeoutError } from "../src/lib/requestTimeoutPolicy";
import { getSessionSafe, supabase } from "../src/lib/supabaseClient";

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (!supabase) {
        router.replace("/auth/login");
        return;
      }

      try {
        const { session, degraded } = await getSessionSafe({ caller: "index_bootstrap" });

        if (degraded) {
          // If network is failing, we assume the user might have a cached session we can't verify 
          // right now. We route to the main app, where _layout.tsx will keep hasSession=null
          // and prevent an erroneous logout redirect.
          router.replace(POST_AUTH_ENTRY_ROUTE);
        } else {
          router.replace(session ? POST_AUTH_ENTRY_ROUTE : "/auth/login");
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(
            "[index] session bootstrap failed:",
            error instanceof Error ? error.message : error,
          );
        }
        // Fallback safely to entry route to avoid unintended logout
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
