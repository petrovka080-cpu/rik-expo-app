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
import { getSessionSafe, isSupabaseEnvValid } from "../../src/lib/supabaseClient";
import { recordPlatformObservability } from "../../src/lib/observability/platformObservability";

const POST_AUTH_SESSION_SETTLE_WINDOW_MS = 2500;
const POST_AUTH_SESSION_POLL_INTERVAL_MS = 200;

const UI_COPY = {
  title: "Войти в GOX",
  passwordPlaceholder: "Пароль",
  submit: "Войти",
  noSession:
    "Нет активной сессии. Проверьте почту и пароль, затем попробуйте ещё раз.",
  sessionSettling:
    "Сессия ещё закрепляется. Попробуйте ещё раз.",
  fallbackError: LOGIN_FALLBACK_ERROR_MESSAGE,
  configError:
    "Supabase не настроен: проверьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  register: "Зарегистрироваться",
  reset: "Забыли пароль?",
} as const;

type ReadableSessionResult = {
  sessionVisible: boolean;
  degraded: boolean;
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waitForReadableSession = async (): Promise<ReadableSessionResult> => {
    const startedAt = Date.now();

    recordPlatformObservability({
      screen: "request",
      surface: "auth_login",
      category: "fetch",
      event: "login_post_auth_session_settle_start",
      result: "skipped",
      extra: {
        owner: "login_submit",
        target: POST_AUTH_ENTRY_ROUTE,
      },
    });

    while (Date.now() - startedAt <= POST_AUTH_SESSION_SETTLE_WINDOW_MS) {
      const sessionResult = await getSessionSafe({
        caller: "login_post_signin",
      });

      if (sessionResult.session?.user) {
        recordPlatformObservability({
          screen: "request",
          surface: "auth_login",
          category: "fetch",
          event: "login_post_auth_session_settle_result",
          result: "success",
          extra: {
            owner: "login_submit",
            target: POST_AUTH_ENTRY_ROUTE,
            reason: "session_visible_before_auth_exit",
          },
        });
        return {
          sessionVisible: true,
          degraded: false,
        };
      }

      if (sessionResult.degraded) {
        recordPlatformObservability({
          screen: "request",
          surface: "auth_login",
          category: "fetch",
          event: "login_post_auth_session_settle_result",
          result: "skipped",
          extra: {
            owner: "login_submit",
            target: POST_AUTH_ENTRY_ROUTE,
            reason: "session_read_degraded",
          },
        });
        return {
          sessionVisible: false,
          degraded: true,
        };
      }

      await new Promise((resolve) =>
        setTimeout(resolve, POST_AUTH_SESSION_POLL_INTERVAL_MS),
      );
    }

    recordPlatformObservability({
      screen: "request",
      surface: "auth_login",
      category: "fetch",
      event: "login_post_auth_session_settle_result",
      result: "error",
      extra: {
        owner: "login_submit",
        target: POST_AUTH_ENTRY_ROUTE,
        reason: "session_absent_after_settle",
      },
    });

    return {
      sessionVisible: false,
      degraded: false,
    };
  };

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

      const settledSession = await waitForReadableSession();

      if (!settledSession.sessionVisible) {
        setError(
          settledSession.degraded
            ? result.userMessage ?? UI_COPY.fallbackError
            : UI_COPY.sessionSettling,
        );
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

      recordPlatformObservability({
        screen: "request",
        surface: "auth_login",
        category: "ui",
        event: "login_post_auth_route_decision",
        result: "success",
        extra: {
          owner: "login_submit",
          target: POST_AUTH_ENTRY_ROUTE,
          reason: "session_settled",
        },
      });

      router.replace(POST_AUTH_ENTRY_ROUTE);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error && submitError.message.trim()
          ? submitError.message
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
        <Text style={styles.title} accessibilityRole="header">
          {UI_COPY.title}
        </Text>
        <TextInput
          testID="auth.login.email"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="auth.login.password"
          style={styles.input}
          secureTextEntry
          placeholder={UI_COPY.passwordPlaceholder}
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <Text testID="auth.error.message" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          testID="auth.login.submit"
          style={styles.button}
          onPress={onSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={UI_COPY.submit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{UI_COPY.submit}</Text>
          )}
        </Pressable>

        <View style={styles.linksRow}>
          <Link
            href="/auth/register"
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel={UI_COPY.register}
          >
            {UI_COPY.register}
          </Link>
          <Link
            href="/auth/reset"
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel={UI_COPY.reset}
          >
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
