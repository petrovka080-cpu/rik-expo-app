import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.config";

type Props = {
  count: number;
  onPress?: () => void;
  comingSoon?: boolean;
};

export default function MarketTenderBanner({ count, onPress, comingSoon = false }: Props) {
  if (count <= 0) return null;

  const title = comingSoon ? "Торги ERP скоро" : `${count} активных торгов`;
  const subtitle = comingSoon
    ? "Интеграция с торгами готовится, текущий маркет уже работает через ERP-действия."
    : "Смотреть позиции и откликнуться";

  return (
    <Pressable style={[styles.banner, comingSoon ? styles.bannerSoon : null]} onPress={onPress} disabled={!onPress}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name={comingSoon ? "time-outline" : "arrow-forward"} size={24} color="#FFFFFF" />
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
  bannerSoon: {
    backgroundColor: MARKET_HOME_COLORS.text,
  },
  copy: {
    gap: 6,
    flex: 1,
    paddingRight: 12,
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
