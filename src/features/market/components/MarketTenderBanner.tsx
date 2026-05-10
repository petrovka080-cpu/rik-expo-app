import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.config";
import type { MarketplaceAuctionSummary } from "../marketplace.auctions.service";

type Props = {
  summary: MarketplaceAuctionSummary | null;
  loading?: boolean;
  onPress?: () => void;
};

const getVisualState = (summary: MarketplaceAuctionSummary | null, loading: boolean) => {
  if (loading || summary == null) {
    return {
      title: "Торги снабженца",
      subtitle: "Подключаем сводку торгов и актуальные переходы.",
      icon: "sync-outline" as const,
      tone: "loading" as const,
    };
  }

  if (summary.state === "ready") {
    return {
      title:
        summary.activeCount > 0
          ? `${summary.activeCount} активных торгов`
          : summary.pendingCount > 0
            ? `${summary.pendingCount} ждут публикации`
            : "Торги снабженца",
      subtitle: summary.message ?? "Откройте торги снабженца и перейдите к позициям.",
      icon: "arrow-forward" as const,
      tone: "ready" as const,
    };
  }

  if (summary.state === "empty") {
    return {
      title: "Торги снабженца",
      subtitle: summary.message ?? "Сейчас активных торгов нет.",
      icon: "layers-outline" as const,
      tone: "empty" as const,
    };
  }

  if (summary.state === "degraded") {
    return {
      title: "Торги снабженца",
      subtitle: summary.message ?? "Сводка торгов частично недоступна. Откройте раздел торгов.",
      icon: "warning-outline" as const,
      tone: "attention" as const,
    };
  }

  return {
    title: "Торги снабженца",
    subtitle: summary.message ?? "Сводка торгов временно недоступна. Откройте раздел торгов.",
    icon: "alert-circle-outline" as const,
    tone: "attention" as const,
  };
};

function MarketTenderBanner({ summary, loading = false, onPress }: Props) {
  const visual = getVisualState(summary, loading);

  return (
    <Pressable
      style={[
        styles.banner,
        visual.tone === "ready"
          ? styles.bannerReady
          : visual.tone === "loading"
            ? styles.bannerLoading
            : visual.tone === "empty"
              ? styles.bannerEmpty
              : styles.bannerAttention,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Market x Buyer Auctions</Text>
        <Text style={styles.title}>{visual.title}</Text>
        <Text style={styles.subtitle}>{visual.subtitle}</Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name={visual.icon} size={24} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

export default React.memo(MarketTenderBanner);

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  bannerReady: {
    backgroundColor: MARKET_HOME_COLORS.orange,
    shadowColor: MARKET_HOME_COLORS.orangeDeep,
  },
  bannerLoading: {
    backgroundColor: "#1E293B",
    shadowColor: "#0F172A",
  },
  bannerEmpty: {
    backgroundColor: "#0F172A",
    shadowColor: "#020617",
  },
  bannerAttention: {
    backgroundColor: "#7C2D12",
    shadowColor: "#431407",
  },
  copy: {
    gap: 6,
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
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
