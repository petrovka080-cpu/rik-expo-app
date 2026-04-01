import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { POST_AUTH_ENTRY_ROUTE } from "../src/lib/authRouting";
import { supabase } from "../src/lib/supabaseClient";

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
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        router.replace(session ? POST_AUTH_ENTRY_ROUTE : "/auth/login");
      } catch (error) {
        if (__DEV__) {
          console.warn(
            "[index] session bootstrap failed:",
            error instanceof Error ? error.message : error,
          );
        }
        router.replace("/auth/login");
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
        {checking ? "Собираем ваш стартовый экран..." : "Открываем GOX..."}
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
