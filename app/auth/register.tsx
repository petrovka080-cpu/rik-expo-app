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
import { supabase } from "../../src/lib/supabaseClient";

const UI_COPY = {
  title: "Создать аккаунт",
  passwordPlaceholder: "Пароль",
  submit: "Создать",
  configError:
    "Supabase не настроен: проверьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  confirmEmail:
    "Проверьте почту для подтверждения аккаунта. После входа вы попадёте в экран доступов и следующих шагов.",
  fallbackError: "Не удалось создать аккаунт.",
  hasAccount: "Уже есть аккаунт?",
  login: "Войти",
} as const;

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error(UI_COPY.configError);
      }

      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signError) throw signError;

      if (data.session) {
        router.replace(POST_AUTH_ENTRY_ROUTE);
        return;
      }

      setMessage(UI_COPY.confirmEmail);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : UI_COPY.fallbackError);
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
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Pressable
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
          <Text>{UI_COPY.hasAccount}</Text>
          <Link
            href="/auth/login"
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel={UI_COPY.login}
          >
            {UI_COPY.login}
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
  message: {
    color: "#15803D",
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    alignItems: "center",
  },
  link: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
});
