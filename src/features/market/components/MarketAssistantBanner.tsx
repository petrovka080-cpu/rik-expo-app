import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.config";

type Props = {
  onOpenAssistant: () => void;
  onOpenMap: () => void;
};

function MarketAssistantBanner({ onOpenAssistant, onOpenMap }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <View style={styles.iconShell}>
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>AI помощник по рынку</Text>
          <Text style={styles.subtitle}>
            Поможет сформулировать поиск, понять следующий шаг и быстро перейти к нужному экрану.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryAction} onPress={onOpenAssistant}>
          <Text style={styles.primaryActionText}>Спросить AI</Text>
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={onOpenMap}>
          <Text style={styles.secondaryActionText}>На карту</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default React.memo(MarketAssistantBanner);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 26,
    backgroundColor: "#0F172A",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    gap: 14,
  },
  copy: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: MARKET_HOME_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  primaryActionText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryAction: {
    minWidth: 96,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  secondaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
