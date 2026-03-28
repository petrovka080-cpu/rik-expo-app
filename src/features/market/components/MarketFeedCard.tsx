import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.config";
import type { MarketHomeListingCard } from "../marketHome.types";

type Props = {
  listing: MarketHomeListingCard;
  onOpen: () => void;
  onMapPress: () => void;
  onShowcasePress?: () => void;
  onAssistantPress?: () => void;
  onPhonePress?: () => void;
  onWhatsAppPress?: () => void;
  onContactSupplierPress?: () => void;
  onAddToRequestPress?: () => void;
  onCreateProposalPress?: () => void;
  contactBusy?: boolean;
  addToRequestBusy?: boolean;
  createProposalBusy?: boolean;
  actionsDisabled?: boolean;
};

export default function MarketFeedCard({
  listing,
  onOpen,
  onMapPress,
  onShowcasePress,
  onAssistantPress,
  onPhonePress,
  onWhatsAppPress,
  onContactSupplierPress,
  onAddToRequestPress,
  onCreateProposalPress,
  contactBusy = false,
  addToRequestBusy = false,
  createProposalBusy = false,
  actionsDisabled = false,
}: Props) {
  return (
    <View style={styles.shell}>
      <Pressable style={styles.cardPress} onPress={onOpen} disabled={actionsDisabled}>
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

          <Text style={styles.seller} numberOfLines={1}>
            {listing.sellerDisplayName}
          </Text>

          <Text style={styles.price} numberOfLines={1}>
            {listing.price != null
              ? `${listing.price.toLocaleString("ru-RU")} сом${listing.unit ? ` / ${listing.unit}` : ""}`
              : "Цена по запросу"}
          </Text>

          {listing.stockLabel ? (
            <Text style={styles.stockText} testID={`market_stock_${listing.id}`}>
              {listing.stockLabel}
            </Text>
          ) : null}

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
        <Pressable style={styles.mapAction} onPress={onMapPress} disabled={actionsDisabled}>
          <Text style={styles.mapActionText}>На карте</Text>
        </Pressable>
        {onShowcasePress ? (
          <Pressable style={styles.iconActionSoft} onPress={onShowcasePress} disabled={actionsDisabled}>
            <Ionicons name="storefront" size={16} color={MARKET_HOME_COLORS.accentStrong} />
          </Pressable>
        ) : null}
        {onAssistantPress ? (
          <Pressable style={styles.iconActionSoft} onPress={onAssistantPress} disabled={actionsDisabled}>
            <Ionicons name="sparkles" size={16} color={MARKET_HOME_COLORS.accentStrong} />
          </Pressable>
        ) : null}
        {onPhonePress ? (
          <Pressable style={styles.iconAction} onPress={onPhonePress} disabled={actionsDisabled}>
            <Ionicons name="call" size={16} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {onWhatsAppPress ? (
          <Pressable style={[styles.iconAction, styles.whatsAction]} onPress={onWhatsAppPress} disabled={actionsDisabled}>
            <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      {onContactSupplierPress || onAddToRequestPress || onCreateProposalPress ? (
        <View style={styles.erpActions}>
          {onContactSupplierPress ? (
            <Pressable
              style={[
                styles.erpButton,
                styles.erpButtonSecondary,
                (actionsDisabled || contactBusy) ? styles.buttonDisabled : null,
              ]}
              onPress={onContactSupplierPress}
              disabled={actionsDisabled || contactBusy}
              testID={`market_contact_supplier_${listing.id}`}
              accessibilityLabel={`market:contact-supplier:${listing.id}`}
            >
              {contactBusy ? (
                <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} size="small" />
              ) : (
                <Text style={styles.erpButtonSecondaryText}>Связаться</Text>
              )}
            </Pressable>
          ) : null}
          {onAddToRequestPress ? (
            <Pressable
              style={[
                styles.erpButton,
                styles.erpButtonPrimary,
                (actionsDisabled || addToRequestBusy) ? styles.buttonDisabled : null,
              ]}
              onPress={onAddToRequestPress}
              disabled={actionsDisabled || addToRequestBusy}
              testID={`market_add_to_request_${listing.id}`}
              accessibilityLabel={`market:add-to-request:${listing.id}`}
            >
              {addToRequestBusy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.erpButtonPrimaryText}>В заявку</Text>
              )}
            </Pressable>
          ) : null}
          {onCreateProposalPress ? (
            <Pressable
              style={[
                styles.erpButton,
                styles.erpButtonSecondary,
                (actionsDisabled || createProposalBusy) ? styles.buttonDisabled : null,
              ]}
              onPress={onCreateProposalPress}
              disabled={actionsDisabled || createProposalBusy}
              testID={`market_create_proposal_${listing.id}`}
              accessibilityLabel={`market:create-proposal:${listing.id}`}
            >
              {createProposalBusy ? (
                <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} size="small" />
              ) : (
                <Text style={styles.erpButtonSecondaryText}>Создать предложение</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  seller: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  price: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 18,
    fontWeight: "900",
  },
  stockText: {
    color: MARKET_HOME_COLORS.emerald,
    fontSize: 12,
    fontWeight: "800",
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
    paddingBottom: 12,
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
  erpActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  erpButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  erpButtonPrimary: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    borderColor: MARKET_HOME_COLORS.accentStrong,
  },
  erpButtonSecondary: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  erpButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  erpButtonSecondaryText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
