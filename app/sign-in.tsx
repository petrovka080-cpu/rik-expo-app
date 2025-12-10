// app/sign-in.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabaseClient";

const isWeb = Platform.OS === "web";

const UI = {
  bg: "#020617",
  card: "#0B1120",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#22C55E",
};

export default function SignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("123123a");
  const [loading, setLoading] = useState(false);

  // ===== АНИМАЦИЯ ЛОГО =====
  const titleTranslateY = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const subtitleTranslateY = useRef(new Animated.Value(40)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Сначала медленно GOX BUILD, потом подпись
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 900,           // медленно, не дёргано
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [titleTranslateY, titleOpacity, subtitleTranslateY, subtitleOpacity]);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Внимание", "Заполни email и пароль");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error("signIn error", error);
        Alert.alert("Ошибка входа", error.message);
        return;
      }

      if (!data.session) {
        Alert.alert("Ошибка входа", "Сессия не создана");
        return;
      }

      router.replace("/(tabs)");
    } catch (e: any) {
      console.error("signIn exception", e);
      Alert.alert("Ошибка", e.message ?? "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  const Container: React.ComponentType<any> = isWeb ? View : KeyboardAvoidingView;
  const containerProps = isWeb
    ? {}
    : {
        behavior: Platform.OS === "ios" ? "padding" : undefined,
      };

  return (
    <Container style={styles.root} {...containerProps}>
      <View style={styles.inner}>
        {/* Лого / текст GOX BUILD */}
        <View style={styles.logoBlock}>
          <Animated.Text
            style={[
              styles.logoText,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            GOX BUILD
          </Animated.Text>

          <Animated.Text
            style={[
              styles.subtitleText,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            CONSTRUCTION CONTROL SYSTEM
          </Animated.Text>
        </View>

        {/* Карточка логина */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Вход</Text>
          <Text style={styles.cardSub}>
            Войди в GOX BUILD, чтобы продолжить работу по объектам
          </Text>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.inputLabel}>Пароль</Text>
            <TextInput
              style={styles.input}
              placeholder="********"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Войти</Text>
            )}
          </Pressable>

          <Text style={styles.helperText}>
            Если забыл пароль — позже добавим восстановление через email.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            GOX BUILD · Beta · {new Date().getFullYear()}
          </Text>
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: "center",
  },
  logoBlock: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    color: UI.text,
  },
  subtitleText: {
    marginTop: 8,
    fontSize: 13,
    letterSpacing: 2,
    color: UI.sub,
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI.text,
  },
  cardSub: {
    fontSize: 13,
    color: UI.sub,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: UI.sub,
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: UI.text,
    backgroundColor: "#020617",
    fontSize: 14,
  },
  btn: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: UI.accent,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  helperText: {
    marginTop: 10,
    fontSize: 11,
    color: UI.sub,
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: UI.sub,
  },
});
