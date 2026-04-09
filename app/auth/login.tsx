import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";

import { POST_AUTH_ENTRY_ROUTE } from "../../src/lib/authRouting";
import {
  LOGIN_FALLBACK_ERROR_MESSAGE,
  signInSafe,
} from "../../src/lib/auth/signInSafe";
import { isSupabaseEnvValid } from "../../src/lib/supabaseClient";
import { recordPlatformObservability } from "../../src/lib/observability/platformObservability";

const UI_COPY = {
  title: "Войти в GOX",
  passwordPlaceholder: "Пароль",
  submit: "Войти",
  noSession:
    "Нет активной сессии. Проверьте почту и пароль, затем попробуйте ещё раз.",
  fallbackError: LOGIN_FALLBACK_ERROR_MESSAGE,
  configError:
    "Supabase не настроен: проверьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  register: "Зарегистрироваться",
  reset: "Забыли пароль?",
} as const;

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      if (!isSupabaseEnvValid) {
        throw new Error(UI_COPY.configError);
      }

      const result = await signInSafe({
        email,
        password,
      });

      if (result.degraded) {
        setError(result.userMessage ?? UI_COPY.fallbackError);
        return;
      }

      if (result.error) {
        setError(result.userMessage ?? result.error.message);
        return;
      }

      if (!result.data?.session) {
        setError(UI_COPY.noSession);
        return;
      }

      recordPlatformObservability({
        screen: "request",
        surface: "auth_login",
        category: "ui",
        event: "login_session_present_after_signin",
        result: "success",
        extra: {
          owner: "login_submit",
          hasSession: true,
          target: POST_AUTH_ENTRY_ROUTE,
        },
      });

      router.replace(POST_AUTH_ENTRY_ROUTE);
    } catch (error: unknown) {
      setError(
        error instanceof Error && error.message.trim()
          ? error.message
          : UI_COPY.fallbackError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{UI_COPY.title}</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder={UI_COPY.passwordPlaceholder}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{UI_COPY.submit}</Text>
          )}
        </Pressable>

        <View style={styles.linksRow}>
          <Link href="/auth/register" style={styles.link}>
            {UI_COPY.register}
          </Link>
          <Link href="/auth/reset" style={styles.link}>
            {UI_COPY.reset}
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.08)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#DC2626",
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  link: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
});
