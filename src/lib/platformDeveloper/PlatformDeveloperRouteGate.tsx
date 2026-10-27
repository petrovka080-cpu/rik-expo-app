import React from "react";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  isServerAuthorizedPlatformDeveloper,
  loadDeveloperOverrideContext,
  type DeveloperOverrideContext,
} from "../developerOverride";
import { getSessionSafe } from "../supabaseClient";

type PlatformDeveloperGateState =
  | { status: "loading"; context: null }
  | { status: "unauthenticated"; context: null }
  | { status: "forbidden"; context: DeveloperOverrideContext | null }
  | { status: "ready"; context: DeveloperOverrideContext };

export function PlatformDeveloperRouteGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<PlatformDeveloperGateState>({
    status: "loading",
    context: null,
  });

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const { session } = await getSessionSafe({
        caller: "platform_developer_route_gate",
      });
      if (!active) return;
      if (!session?.user?.id) {
        setState({ status: "unauthenticated", context: null });
        router.replace("/auth/login");
        return;
      }
      const context = await loadDeveloperOverrideContext();
      if (!active) return;
      setState(
        isServerAuthorizedPlatformDeveloper(context)
          ? { status: "ready", context }
          : { status: "forbidden", context },
      );
    })().catch(() => {
      if (active) setState({ status: "forbidden", context: null });
    });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "ready") {
    return (
      <View
        style={styles.ready}
        testID="platform-developer-route-ready"
        accessibilityLabel={`Actor platform_developer, effective role ${
          state.context.activeEffectiveRole ?? "none"
        }`}
      >
        {children}
      </View>
    );
  }

  if (state.status === "loading" || state.status === "unauthenticated") {
    return (
      <View style={styles.center} testID="platform-developer-route-loading">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.center} testID="platform-developer-route-forbidden">
      <Text style={styles.title}>Недостаточно прав</Text>
      <Text style={styles.body}>
        Этот раздел требует серверного права platform_developer.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ready: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
    backgroundColor: "#0B1220",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  body: {
    color: "#CBD5E1",
    fontSize: 13,
    textAlign: "center",
  },
});
