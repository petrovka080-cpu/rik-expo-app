import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.config";
import type { MarketHomeListingCard } from "../marketHome.types";

type Props = {
  listing: MarketHomeListingCard;
  onOpen: () => void;
  onMapPress: () => void;
  onShowcasePress?: () => void;
  onChatPress?: () => void;
  onAssistantPress?: () => void;
  onPhonePress?: () => void;
  onWhatsAppPress?: () => void;
};

export default function MarketFeedCard({
  listing,
  onOpen,
  onMapPress,
  onShowcasePress,
  onChatPress,
  onAssistantPress,
  onPhonePress,
  onWhatsAppPress,
}: Props) {
  return (
    <View style={styles.shell}>
      <Pressable style={styles.cardPress} onPress={onOpen}>
        <Image source={listing.imageSource} style={styles.image} resizeMode="cover" />

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, listing.isDemand ? styles.badgeDemand : styles.badgeOffer]}>
              <Text style={styles.badgeText}>{listing.sideLabel}</Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {listing.statusLabel}
            </Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>

          <Text style={styles.subline} numberOfLines={1}>
            {listing.kindLabel}
            {listing.city ? ` • ${listing.city}` : ""}
          </Text>

          <Text style={styles.price} numberOfLines={1}>
            {listing.price != null
              ? `${listing.price.toLocaleString("ru-RU")} сом${listing.uom ? ` / ${listing.uom}` : ""}`
              : "Цена по запросу"}
          </Text>

          {listing.itemsPreview.length ? (
            <View style={styles.itemsBox}>
              {listing.itemsPreview.slice(0, 2).map((item) => (
                <Text key={`${listing.id}:${item}`} style={styles.itemLine} numberOfLines={1}>
                  • {item}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable style={styles.mapAction} onPress={onMapPress}>
          <Text style={styles.mapActionText}>На карте</Text>
        </Pressable>
        {onShowcasePress ? (
          <Pressable style={styles.iconActionSoft} onPress={onShowcasePress}>
            <Ionicons name="storefront" size={16} color={MARKET_HOME_COLORS.accentStrong} />
          </Pressable>
        ) : null}
        {onChatPress ? (
          <Pressable style={styles.iconActionSoft} onPress={onChatPress}>
            <Ionicons name="chatbubble-ellipses" size={16} color={MARKET_HOME_COLORS.accentStrong} />
          </Pressable>
        ) : null}
        {onAssistantPress ? (
          <Pressable style={styles.iconActionSoft} onPress={onAssistantPress}>
            <Ionicons name="sparkles" size={16} color={MARKET_HOME_COLORS.accentStrong} />
          </Pressable>
        ) : null}
        {onPhonePress ? (
          <Pressable style={styles.iconAction} onPress={onPhonePress}>
            <Ionicons name="call" size={16} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {onWhatsAppPress ? (
          <Pressable style={[styles.iconAction, styles.whatsAction]} onPress={onWhatsAppPress}>
            <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 26,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardPress: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: 168,
    backgroundColor: "#E2E8F0",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeOffer: {
    backgroundColor: MARKET_HOME_COLORS.accentSoft,
  },
  badgeDemand: {
    backgroundColor: "#FDE7E1",
  },
  badgeText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  meta: {
    flex: 1,
    textAlign: "right",
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  subline: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  price: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 18,
    fontWeight: "900",
  },
  itemsBox: {
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  itemLine: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  mapActionText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 13,
    fontWeight: "800",
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  iconActionSoft: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  whatsAction: {
    backgroundColor: MARKET_HOME_COLORS.emerald,
  },
});
