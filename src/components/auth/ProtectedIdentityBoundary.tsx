import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";

import { buildAuthLoginHref } from "../../lib/authRouting";
import { ConfigRecoveryState } from "./ConfigRecoveryState";
import {
  protectedIdentityMessageRu,
  type ProtectedIdentity,
  type ProtectedIdentityResolution,
} from "../../lib/auth/protectedIdentity";
import { loadProtectedIdentity } from "../../lib/auth/protectedIdentity.transport";
import { signOutSafely } from "../../lib/supabaseClient";
import {
  isLocalDeveloperReviewEnabled,
  switchLocalDeveloperConsumerPrincipal,
  switchLocalDeveloperPrincipal,
} from "../../lib/localDeveloperReview";

type ProtectedIdentityBoundaryProps = {
  children: React.ReactNode | ((identity: ProtectedIdentity) => React.ReactNode);
  returnTo: string;
  surface: "profile" | "request";
  targetOrganizationId?: string | null;
};

type IdentitySummaryProps = {
  identity: ProtectedIdentity;
  compact?: boolean;
};

export function VerifiedIdentitySummary({ identity, compact = false }: IdentitySummaryProps) {
  return (
    <View style={[styles.identityCard, compact && styles.identityCardCompact]} testID="verified-identity-summary">
      <Text style={styles.identityTitle}>Подтверждённая учётная запись</Text>
      <View style={styles.identityRow}>
        <Text style={styles.identityLabel}>Электронная почта</Text>
        <Text style={styles.identityValue}>{identity.email ?? "Не указана"}</Text>
      </View>
      <View style={styles.identityRow}>
        <Text style={styles.identityLabel}>Организация</Text>
        <Text style={styles.identityValue}>{identity.organizationId}</Text>
      </View>
      <View style={styles.identityRow}>
        <Text style={styles.identityLabel}>Членство</Text>
        <Text style={styles.identityValue}>Подтверждено</Text>
      </View>
      <View style={[styles.identityRow, styles.identityRowLast]}>
        <Text style={styles.identityLabel}>Роль</Text>
        <Text style={styles.identityValue}>{identity.role}</Text>
      </View>
    </View>
  );
}

export function ProtectedIdentityBoundary({
  children,
  returnTo,
  surface,
  targetOrganizationId,
}: ProtectedIdentityBoundaryProps) {
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<ProtectedIdentityResolution | null>(null);
  const [localLoginFailed, setLocalLoginFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setResolution(null);
    void loadProtectedIdentity(targetOrganizationId)
      .then((next) => {
        if (active) setResolution(next);
      })
      .catch(() => {
        if (active) setResolution({ status: "provider_unavailable" });
      });
    return () => {
      active = false;
    };
  }, [attempt, targetOrganizationId]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const goToLogin = useCallback(() => {
    router.replace(buildAuthLoginHref(returnTo) as Href);
  }, [returnTo]);
  const signOut = useCallback(async () => {
    const result = await signOutSafely("local");
    if (result.status === "signed_out") goToLogin();
  }, [goToLogin]);
  const enterLocalPrincipal = useCallback(() => {
    setLocalLoginFailed(false);
    const login = surface === "request"
      ? switchLocalDeveloperConsumerPrincipal()
      : switchLocalDeveloperPrincipal("director");
    void login
      .then(retry)
      .catch(() => setLocalLoginFailed(true));
  }, [retry, surface]);

  if (!resolution) {
    return (
      <View style={styles.loading} testID="protected-identity-loading">
        <ActivityIndicator color="#16A34A" />
        <Text style={styles.loadingText}>Проверяем профиль, организацию и роль…</Text>
      </View>
    );
  }

  if (resolution.status === "ready") {
    return <>{typeof children === "function" ? children(resolution.identity) : children}</>;
  }

  if (resolution.status === "configuration_unavailable") {
    return (
      <ConfigRecoveryState
        diagnostic={resolution.diagnostic}
        onBack={() => router.back()}
        onRetry={retry}
      />
    );
  }

  const copy = protectedIdentityMessageRu(resolution.status);
  const needsLogin = resolution.status === "no_session";
  const canEnterLocalPrincipal = isLocalDeveloperReviewEnabled();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      testID={`protected-identity-state-${resolution.status}`}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{surface === "request" ? "Защищённая смета" : "Профиль"}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.message}>{copy.message}</Text>
        <Text style={styles.failClosed}>Защищённые данные и форма скрыты до успешной проверки.</Text>
        <View style={styles.actions}>
          {canEnterLocalPrincipal ? (
            <Pressable
              accessibilityRole="button"
              onPress={enterLocalPrincipal}
              style={styles.primary}
              testID={surface === "request"
                ? "protected-identity-local-consumer-login"
                : "protected-identity-local-director-login"}
            >
              <Text style={styles.primaryText}>
                {surface === "request" ? "Войти как Заказчик" : "Войти как Директор"}
              </Text>
            </Pressable>
          ) : needsLogin ? (
            <Pressable accessibilityRole="button" onPress={goToLogin} style={styles.primary} testID="protected-identity-login">
              <Text style={styles.primaryText}>Войти</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={retry} style={styles.primary} testID="protected-identity-retry">
              <Text style={styles.primaryText}>Повторить</Text>
            </Pressable>
          )}
          {localLoginFailed ? (
            <Text style={styles.loginError} testID="protected-identity-local-login-error">
              Не удалось войти в локальный test tenant. Перезапустите среду и повторите.
            </Text>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.secondary} testID="protected-identity-sign-out">
            <Text style={styles.secondaryText}>Выйти</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  screenContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#F8FAFC" },
  loadingText: { color: "#475569", fontSize: 14 },
  card: { width: "100%", maxWidth: 520, borderRadius: 18, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", padding: 22 },
  eyebrow: { color: "#15803D", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  title: { marginTop: 8, color: "#0F172A", fontSize: 23, fontWeight: "800" },
  message: { marginTop: 10, color: "#334155", fontSize: 15, lineHeight: 22 },
  failClosed: { marginTop: 12, color: "#991B1B", fontSize: 13, lineHeight: 19 },
  actions: { marginTop: 20, gap: 10 },
  primary: { alignItems: "center", borderRadius: 10, backgroundColor: "#16A34A", paddingVertical: 12 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondary: { alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: "#94A3B8", paddingVertical: 12 },
  secondaryText: { color: "#334155", fontSize: 14, fontWeight: "700" },
  loginError: { color: "#991B1B", fontSize: 13, lineHeight: 19, textAlign: "center" },
  identityCard: { width: "100%", borderRadius: 16, borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F0FDF4", padding: 14 },
  identityCardCompact: { marginBottom: 16 },
  identityTitle: { color: "#166534", fontSize: 15, fontWeight: "800", marginBottom: 8 },
  identityRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#DCFCE7" },
  identityRowLast: { borderBottomWidth: 0 },
  identityLabel: { flex: 1, color: "#475569", fontSize: 12 },
  identityValue: { flex: 2, color: "#0F172A", fontSize: 12, fontWeight: "700", textAlign: "right" },
});
