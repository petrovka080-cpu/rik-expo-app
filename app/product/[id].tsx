import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MarketContactSupplierModal from "../../src/features/market/components/MarketContactSupplierModal";
import { MARKET_HOME_COLORS } from "../../src/features/market/marketHome.config";
import { buildListingAssistantPrompt, buildMarketMapParams } from "../../src/features/market/marketHome.data";
import {
  addMarketplaceListingToRequest,
  contactMarketplaceSupplier,
  createMarketplaceProposal,
  loadMarketListingById,
  loadMarketRoleCapabilities,
} from "../../src/features/market/market.repository";
import {
  buildMarketSupplierMapRoute,
  buildMarketSupplierShowcaseRoute,
  MARKET_AI_ROUTE,
  MARKET_TAB_ROUTE,
} from "../../src/features/market/market.routes";
import type { MarketHomeListingCard, MarketRoleCapabilities } from "../../src/features/market/marketHome.types";
import { recordPlatformObservability } from "../../src/lib/observability/platformObservability";

const DEFAULT_CAPABILITIES: MarketRoleCapabilities = {
  role: null,
  canAddToRequest: false,
  canCreateProposal: false,
};

const MARKET_PRODUCT_SURFACE = "product_details";
const MARKET_ALERT_TITLE = "Маркет";

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [row, setRow] = useState<MarketHomeListingCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<MarketRoleCapabilities>(DEFAULT_CAPABILITIES);
  const [qtyMultiplier, setQtyMultiplier] = useState(1);
  const [actionBusy, setActionBusy] = useState<"request" | "proposal" | "contact" | null>(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactErrorText, setContactErrorText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const [nextRow, nextCapabilities] = await Promise.all([
          loadMarketListingById(id),
          loadMarketRoleCapabilities(),
        ]);
        if (!active) return;
        setRow(nextRow);
        setCapabilities(nextCapabilities);
        if (nextRow) {
          recordPlatformObservability({
            screen: "market",
            surface: MARKET_PRODUCT_SURFACE,
            category: "ui",
            event: "market_open_item",
            result: "success",
            extra: {
              listingId: nextRow.id,
              source: nextRow.source,
              directRoute: true,
            },
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Не удалось открыть объявление.";
        Alert.alert(MARKET_ALERT_TITLE, message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const openUrl = async (url: string, fallback: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(MARKET_ALERT_TITLE, fallback);
      return;
    }
    await Linking.openURL(url);
  };

  const changeQty = (next: number) => {
    setQtyMultiplier(Math.max(1, Math.min(999, Math.round(next))));
  };

  const handleOpenContact = () => {
    if (!row) return;
    setContactErrorText(null);
    setContactMessage(`Здравствуйте. Хочу уточнить условия по позиции "${row.title}".`);
    setContactVisible(true);
  };

  const handleCloseContact = () => {
    if (actionBusy === "contact") return;
    setContactVisible(false);
    setContactMessage("");
    setContactErrorText(null);
  };

  const handleAddToRequest = async () => {
    if (!row) return;
    setActionBusy("request");
    try {
      const result = await addMarketplaceListingToRequest(row, qtyMultiplier);
      Alert.alert(MARKET_ALERT_TITLE, `Добавлено в заявку: ${result.addedCount} поз. Черновик ${result.requestId}.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось добавить товар в заявку.";
      Alert.alert(MARKET_ALERT_TITLE, message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleCreateProposal = async () => {
    if (!row) return;
    setActionBusy("proposal");
    try {
      const result = await createMarketplaceProposal(row, qtyMultiplier);
      Alert.alert(
        MARKET_ALERT_TITLE,
        `Предложение создано${result.proposalNo ? `: ${result.proposalNo}` : ""}.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось создать предложение.";
      Alert.alert(MARKET_ALERT_TITLE, message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleSubmitContact = async () => {
    if (!row || actionBusy) return;
    setActionBusy("contact");
    setContactErrorText(null);
    try {
      await contactMarketplaceSupplier({
        listing: row,
        message: contactMessage,
      });
      Alert.alert(MARKET_ALERT_TITLE, "Сообщение поставщику отправлено.");
      setContactVisible(false);
      setContactMessage("");
    } catch (error: unknown) {
      setContactErrorText(
        error instanceof Error ? error.message : "Не удалось отправить сообщение поставщику.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={MARKET_HOME_COLORS.accent} />
        <Text style={styles.stateText}>Открываем объявление...</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>Объявление не найдено</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={MARKET_HOME_COLORS.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Объявление</Text>
          <Text style={styles.headerSub}>
            {row.kindLabel} • {row.sideLabel}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Image source={row.imageSource} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroMeta}>
            <View style={[styles.sideBadge, row.isDemand ? styles.sideBadgeDemand : styles.sideBadgeOffer]}>
              <Text style={styles.sideBadgeText}>{row.sideLabel}</Text>
            </View>
            <Text style={styles.heroStatus}>{row.statusLabel}</Text>
          </View>

          <Text style={styles.title}>{row.title}</Text>
          <Text style={styles.price}>
            {row.price != null
              ? `${row.price.toLocaleString("ru-RU")} сом${row.uom ? ` / ${row.uom}` : ""}`
              : "Цена по запросу"}
          </Text>
          <Text style={styles.meta}>{row.city || "Город не указан"}</Text>
          <Text style={styles.metaStrong}>{row.sellerDisplayName}</Text>
          {row.description ? <Text style={styles.description}>{row.description}</Text> : null}
          {row.stockLabel ? (
            <Text style={styles.stockText} testID="market_product_stock_label">
              {row.stockLabel}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Связаться с продавцом</Text>
          <View style={styles.actions}>
            {(row.supplierId || row.sellerUserId) ? (
              <Pressable
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={handleOpenContact}
                disabled={actionBusy != null}
                testID="market_product_contact_supplier"
                accessibilityLabel="market:product:contact-supplier"
              >
                {actionBusy === "contact" ? (
                  <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} size="small" />
                ) : (
                  <Text style={styles.secondaryActionText}>Связаться с поставщиком</Text>
                )}
              </Pressable>
            ) : null}
            {row.whatsapp ? (
              <Pressable
                style={[styles.actionBtn, styles.whatsBtn]}
                onPress={() =>
                  openUrl(`https://wa.me/${String(row.whatsapp).replace(/[^\d]/g, "")}`, "Не удалось открыть WhatsApp.")
                }
                disabled={actionBusy != null}
              >
                <Text style={styles.actionText}>Связаться (WhatsApp)</Text>
              </Pressable>
            ) : null}
            {row.phone ? (
              <Pressable
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() =>
                  openUrl(`tel:${String(row.phone).replace(/[^\d+]/g, "")}`, "Не удалось открыть звонок.")
                }
                disabled={actionBusy != null}
              >
                <Text style={styles.actionText}>Позвонить</Text>
              </Pressable>
            ) : null}
            {row.email ? (
              <Pressable
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => openUrl(`mailto:${row.email}`, "Не удалось открыть email.")}
                disabled={actionBusy != null}
              >
                <Text style={styles.secondaryActionText}>Email</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ещё в маркете</Text>
          <View style={styles.routeRow}>
            <Pressable style={styles.routeChip} onPress={() => router.push(MARKET_TAB_ROUTE)}>
              <Text style={styles.routeChipText}>Маркет</Text>
            </Pressable>
            <Pressable
              style={styles.routeChip}
              onPress={() => router.push(buildMarketSupplierShowcaseRoute(row.sellerUserId, row.sellerCompanyId))}
              disabled={actionBusy != null}
            >
              <Text style={styles.routeChipText}>Витрина</Text>
            </Pressable>
            <Pressable
              style={styles.routeChip}
              onPress={() =>
                router.push(buildMarketSupplierMapRoute(buildMarketMapParams({ side: "all", kind: "all" }, { row })))
              }
              disabled={actionBusy != null}
            >
              <Text style={styles.routeChipText}>Карта</Text>
            </Pressable>
            <Pressable
              style={styles.routeChip}
              onPress={() => router.push(MARKET_AI_ROUTE(buildListingAssistantPrompt(row)))}
              disabled={actionBusy != null}
            >
              <Text style={styles.routeChipText}>Спросить AI</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Для ERP и закупок</Text>
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Количество</Text>
            <View style={styles.qtyControls}>
              <Pressable style={styles.qtyButton} onPress={() => changeQty(qtyMultiplier - 1)}>
                <Text style={styles.qtyButtonText}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{qtyMultiplier}</Text>
              <Pressable style={styles.qtyButton} onPress={() => changeQty(qtyMultiplier + 1)}>
                <Text style={styles.qtyButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.erpHint}>
            {row.erpItems.length
              ? `ERP-позиций: ${row.erpItems.length}. Множитель применяется ко всем позициям объявления.`
              : "Это объявление пока не связано с каталогом ERP."}
          </Text>
          <View style={styles.erpActions}>
            {capabilities.canAddToRequest ? (
              <Pressable
                style={[styles.actionBtn, styles.callBtn, !row.erpItems.length ? styles.disabledBtn : null]}
                onPress={() => void handleAddToRequest()}
                disabled={!row.erpItems.length || actionBusy != null}
                nativeID="market-product-add-to-request"
                testID="market_product_add_to_request"
                accessibilityLabel="market:product:add-to-request"
              >
                <Text style={styles.actionText}>
                  {actionBusy === "request" ? "Добавляем..." : "Добавить в заявку"}
                </Text>
              </Pressable>
            ) : null}
            {capabilities.canCreateProposal ? (
              <Pressable
                style={[styles.actionBtn, styles.secondaryBtn, !row.erpItems.length ? styles.disabledBtn : null]}
                onPress={() => void handleCreateProposal()}
                disabled={!row.erpItems.length || actionBusy != null}
                nativeID="market-product-create-proposal"
                testID="market_product_create_proposal"
                accessibilityLabel="market:product:create-proposal"
              >
                <Text style={styles.secondaryActionText}>
                  {actionBusy === "proposal" ? "Создаем..." : "Создать предложение"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {row.items.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Позиции</Text>
            {row.items.map((item, index) => (
              <View key={`${row.id}:${index}`} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.name || item.rik_code || "Позиция"}</Text>
                  <Text style={styles.itemMeta}>
                    {item.kind || "—"}
                    {item.rik_code ? ` • ${item.rik_code}` : ""}
                  </Text>
                </View>
                <Text style={styles.itemQty}>
                  {item.qty != null ? item.qty : "—"} {item.uom || ""}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <MarketContactSupplierModal
        visible={contactVisible}
        supplierName={row.sellerDisplayName}
        message={contactMessage}
        busy={actionBusy === "contact"}
        errorText={contactErrorText}
        onChangeMessage={setContactMessage}
        onClose={handleCloseContact}
        onSubmit={() => void handleSubmitContact()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: MARKET_HOME_COLORS.border,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  headerCopy: {
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  headerSub: {
    color: MARKET_HOME_COLORS.textSoft,
    marginTop: 4,
    fontWeight: "600",
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 32,
  },
  routeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  routeChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  routeChipText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  card: {
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    padding: 18,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  heroMeta: {
    marginTop: -8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sideBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sideBadgeOffer: {
    backgroundColor: MARKET_HOME_COLORS.accentSoft,
  },
  sideBadgeDemand: {
    backgroundColor: "#FDE7E1",
  },
  sideBadgeText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  heroStatus: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 24,
    fontWeight: "900",
  },
  price: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 20,
    fontWeight: "900",
  },
  meta: {
    color: MARKET_HOME_COLORS.textSoft,
    fontWeight: "600",
  },
  metaStrong: {
    color: MARKET_HOME_COLORS.text,
    fontWeight: "800",
  },
  stockText: {
    color: MARKET_HOME_COLORS.emerald,
    fontWeight: "800",
  },
  description: {
    color: MARKET_HOME_COLORS.text,
    lineHeight: 22,
    fontSize: 15,
  },
  sectionTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  qtyLabel: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 20,
    fontWeight: "900",
  },
  qtyValue: {
    minWidth: 28,
    textAlign: "center",
    color: MARKET_HOME_COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  erpHint: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  erpActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  itemCopy: {
    flex: 1,
  },
  itemName: {
    color: MARKET_HOME_COLORS.text,
    fontWeight: "800",
  },
  itemMeta: {
    color: MARKET_HOME_COLORS.textSoft,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  itemQty: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  whatsBtn: {
    backgroundColor: MARKET_HOME_COLORS.emerald,
  },
  secondaryBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryActionText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  stateText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
