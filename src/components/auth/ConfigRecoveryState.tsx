import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type ConfigRecoveryStateProps = {
  diagnostic: string;
  onRetry: () => void;
  onBack: () => void;
};

async function copyDiagnostic(value: string): Promise<void> {
  const Clipboard = require("expo-clipboard") as typeof import("expo-clipboard");
  await Clipboard.setStringAsync(value);
}

export function ConfigRecoveryState({
  diagnostic,
  onRetry,
  onBack,
}: ConfigRecoveryStateProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = useCallback(() => {
    void copyDiagnostic(diagnostic)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("failed"));
  }, [diagnostic]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="config-recovery-state"
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Настройка приложения</Text>
        <Text style={styles.title}>Сервис авторизации не настроен</Text>
        <Text style={styles.message}>
          Защищённые экраны временно закрыты. Запустите локальную Web-сборку канонической
          командой, затем повторите проверку. Пароли и токены сюда вводить не нужно.
        </Text>
        <Text style={styles.hint} testID="config-recovery-command">
          scripts/dev/startLocalDeveloperReview.ps1
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.primary}
            testID="config-recovery-retry"
          >
            <Text style={styles.primaryText}>Повторить</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={copy}
            style={styles.secondary}
            testID="config-recovery-copy"
          >
            <Text style={styles.secondaryText}>
              {copyState === "copied"
                ? "Диагностика скопирована"
                : copyState === "failed"
                  ? "Не удалось скопировать"
                  : "Скопировать диагностику"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={styles.secondary}
            testID="config-recovery-back"
          >
            <Text style={styles.secondaryText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    padding: 22,
  },
  eyebrow: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: { marginTop: 8, color: "#0F172A", fontSize: 23, fontWeight: "800" },
  message: { marginTop: 10, color: "#334155", fontSize: 15, lineHeight: 22 },
  hint: {
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    color: "#334155",
    fontSize: 12,
    padding: 10,
  },
  actions: { marginTop: 20, gap: 10 },
  primary: {
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
  },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondary: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#94A3B8",
    paddingVertical: 12,
  },
  secondaryText: { color: "#334155", fontSize: 14, fontWeight: "700" },
});
