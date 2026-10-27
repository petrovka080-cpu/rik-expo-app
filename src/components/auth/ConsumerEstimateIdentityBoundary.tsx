import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";

import { buildAuthLoginHref } from "../../lib/authRouting";
import {
  ensureConsumerEstimatePrincipal,
  type ConsumerEstimatePrincipalResolution,
} from "../../lib/supabaseClient";
import {
  isLocalDeveloperConsumerReviewEnabled,
  switchLocalDeveloperConsumerPrincipal,
} from "../../lib/localDeveloperReview";
import { ConfigRecoveryState } from "./ConfigRecoveryState";

type ConsumerEstimateIdentityBoundaryProps = {
  children: React.ReactNode;
  returnTo: string;
};

export function ConsumerEstimateIdentityBoundary({
  children,
  returnTo,
}: ConsumerEstimateIdentityBoundaryProps): React.ReactElement {
  const [attempt, setAttempt] = React.useState(0);
  const [resolution, setResolution] = React.useState<ConsumerEstimatePrincipalResolution | null>(null);
  const [localLoginFailed, setLocalLoginFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setResolution(null);
    void ensureConsumerEstimatePrincipal().then((next) => {
      if (active) setResolution(next);
    });
    return () => { active = false; };
  }, [attempt]);

  const retry = React.useCallback(() => setAttempt((current) => current + 1), []);
  const login = React.useCallback(() => {
    router.replace(buildAuthLoginHref(returnTo) as Href);
  }, [returnTo]);
  const localLogin = React.useCallback(() => {
    setLocalLoginFailed(false);
    void switchLocalDeveloperConsumerPrincipal()
      .then(retry)
      .catch(() => setLocalLoginFailed(true));
  }, [retry]);

  if (!resolution) {
    return (
      <View style={styles.center} testID="consumer-estimate-identity-loading">
        <ActivityIndicator color="#16A34A" />
        <Text style={styles.message}>Открываем персональную смету…</Text>
      </View>
    );
  }
  if (resolution.status === "ready") return <>{children}</>;
  if (resolution.status === "configuration_unavailable") {
    return (
      <ConfigRecoveryState
        diagnostic={resolution.diagnostic}
        onBack={() => router.back()}
        onRetry={retry}
      />
    );
  }

  return (
    <View style={styles.center} testID={`consumer-estimate-identity-${resolution.status}`}>
      <View style={styles.card}>
        <Text style={styles.title}>Не удалось открыть смету</Text>
        <Text style={styles.message}>{resolution.message}</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.primary} testID="consumer-estimate-identity-retry">
          <Text style={styles.primaryText}>Повторить</Text>
        </Pressable>
        {isLocalDeveloperConsumerReviewEnabled() ? (
          <Pressable accessibilityRole="button" onPress={localLogin} style={styles.secondary} testID="protected-identity-local-consumer-login">
            <Text style={styles.secondaryText}>Войти как Заказчик</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={login} style={styles.secondary} testID="consumer-estimate-identity-login">
            <Text style={styles.secondaryText}>Войти</Text>
          </Pressable>
        )}
        {localLoginFailed ? (
          <Text style={styles.error}>Не удалось открыть локальную сессию заказчика.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F8FAFC" },
  card: { width: "100%", maxWidth: 520, gap: 12, padding: 22, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 18, backgroundColor: "#FFFFFF" },
  title: { color: "#0F172A", fontSize: 21, fontWeight: "800" },
  message: { color: "#475569", fontSize: 14, lineHeight: 20, textAlign: "center" },
  primary: { alignItems: "center", borderRadius: 10, paddingVertical: 12, backgroundColor: "#16A34A" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondary: { alignItems: "center", borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: "#94A3B8" },
  secondaryText: { color: "#334155", fontSize: 14, fontWeight: "700" },
  error: { color: "#991B1B", fontSize: 13, textAlign: "center" },
});
