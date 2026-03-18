import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MARKET_HOME_COLORS } from "../marketHome.config";

type Props = {
  query: string;
  onChangeQuery: (value: string) => void;
  onMapPress: () => void;
  onProfilePress: () => void;
  avatarText?: string;
  avatarLabel?: string | null;
};

function LogoMark() {
  return (
    <View style={styles.logoShell}>
      <View style={styles.logoGrid}>
        <View style={[styles.logoCell, { backgroundColor: "#F97316" }]} />
        <View style={[styles.logoCell, { backgroundColor: "#2563EB" }]} />
        <View style={[styles.logoCell, { backgroundColor: "#22C55E" }]} />
        <View style={[styles.logoCell, { backgroundColor: "#7C3AED" }]} />
      </View>
    </View>
  );
}

export default function MarketHeaderBar({
  query,
  onChangeQuery,
  onMapPress,
  onProfilePress,
  avatarText = "G",
  avatarLabel,
}: Props) {
  return (
    <View style={styles.row}>
      <LogoMark />

      <View style={styles.searchShell}>
        <Ionicons name="search" size={18} color={MARKET_HOME_COLORS.textSoft} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Поиск..."
          placeholderTextColor={MARKET_HOME_COLORS.textSoft}
          style={styles.input}
          returnKeyType="search"
        />
      </View>

      <Pressable style={styles.iconButton} onPress={onMapPress}>
        <Ionicons name="globe-outline" size={22} color="#FFFFFF" />
      </Pressable>

      <Pressable
        style={styles.avatarButton}
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel={avatarLabel ? `Профиль: ${avatarLabel}` : "Профиль"}
      >
        <Text style={styles.avatarText}>{avatarText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  logoShell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logoGrid: {
    width: 22,
    height: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  logoCell: {
    width: 9,
    height: 9,
    borderRadius: 2.5,
  },
  searchShell: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  input: {
    flex: 1,
    color: MARKET_HOME_COLORS.text,
    fontSize: 17,
    paddingVertical: 0,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: MARKET_HOME_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D946EF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },
});
