import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MARKET_HOME_COLORS } from "../marketHome.config";

type Props = {
  count: number;
  onPress: () => void;
};

export default function MarketTenderBanner({ count, onPress }: Props) {
  if (count <= 0) return null;

  return (
    <Pressable style={styles.banner} onPress={onPress}>
      <View style={styles.copy}>
        <Text style={styles.title}>{count} активных торгов</Text>
        <Text style={styles.subtitle}>Смотреть позиции и откликнуться</Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    borderRadius: 28,
    backgroundColor: MARKET_HOME_COLORS.orange,
    paddingHorizontal: 22,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: MARKET_HOME_COLORS.orangeDeep,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  copy: {
    gap: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    fontWeight: "600",
  },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
