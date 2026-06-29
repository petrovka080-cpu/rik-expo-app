import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { formatEstimateMoney } from "../../lib/ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests";

type Props = {
  item: ConsumerRepairRequestItem;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onOpenCatalog?: (itemId: string) => void;
  onOpenPhoto?: (itemId: string) => void;
  showPhotoButton?: boolean;
};

function itemTypeLabel(item: ConsumerRepairRequestItem): string {
  if (item.itemType === "work") return "\u0420\u0430\u0431\u043e\u0442\u0430";
  if (item.itemType === "material") return "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b";
  if (item.itemType === "service") return "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 / \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430";
  return "\u041f\u043e\u0437\u0438\u0446\u0438\u044f";
}

function bindingLabel(item: ConsumerRepairRequestItem): string | null {
  if (item.itemType !== "material") return null;
  if (item.selectedCatalogItemId || item.catalogItemId) return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u0432\u044b\u0431\u0440\u0430\u043d";
  if (item.catalogBindingStatus === "multiple_candidates") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u0435\u0441\u0442\u044c \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b";
  if (item.catalogBindingStatus === "matched") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u043d\u0430\u0439\u0434\u0435\u043d";
  if (item.catalogBindingStatus === "no_catalog_match") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u043f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c";
  return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433";
}

function formatInputNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function priceStatusLabel(item: ConsumerRepairRequestItem): string {
  if (item.priceStatus === "USER_PRICE_OVERRIDE") return "\u0446\u0435\u043d\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e";
  if (item.priceStatus === "USER_ENTERED_PRICE") return "\u0446\u0435\u043d\u0430 \u0432\u0432\u0435\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "USER_CONFIRMED_MARKET_PRICE") return "\u0446\u0435\u043d\u0430 \u043f\u043e \u0444\u043e\u0442\u043e, \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "CATALOG_PRICE_VERIFIED") return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430";
  if (item.priceStatus === "REFERENCE_PRICE_ESTIMATE" || item.priceStatus === "PRICEBOOK_VERIFIED") {
    return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u0440\u0430\u0441\u0447\u0435\u0442\u0430";
  }
  return "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430";
}

export function ConsumerRepairItemRow({
  item,
  onDecrease,
  onIncrease,
  onQuantityChange,
  onUnitPriceChange,
  onRemove,
  onOpenCatalog,
  onOpenPhoto,
  showPhotoButton,
}: Props): React.ReactElement {
  const unitLabel = formatEstimateUnitLabel(item.unitLabel || item.unit);
  const catalogBindingLabel = bindingLabel(item);
  const totalLabel = item.totalPrice != null
    ? formatEstimateMoney(item.totalPrice, item.currency)
    : "\u0438\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c";
  return (
    <View style={styles.row} testID={`consumer-repair-item-${item.id}`}>
      <View style={styles.main}>
        <Text style={styles.title}>{item.titleRu}</Text>
        <Text style={styles.meta}>{itemTypeLabel(item)}</Text>
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>{"\u041a\u043e\u043b-\u0432\u043e"}</Text>
            <View style={styles.quantityLine}>
              <Pressable
                testID={`consumer-repair-item-minus-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${"\u0423\u043c\u0435\u043d\u044c\u0448\u0438\u0442\u044c"} ${item.titleRu}`}
                onPress={() => onDecrease(item.id)}
                style={styles.stepper}
              >
                <Ionicons name="remove" size={15} color="#0F172A" />
              </Pressable>
              <TextInput
                value={formatInputNumber(item.quantity)}
                onChangeText={(value) => onQuantityChange(item.id, value)}
                keyboardType="decimal-pad"
                inputMode="decimal"
                selectTextOnFocus
                style={styles.input}
                testID={`consumer-repair-item-quantity-input-${item.id}`}
                accessibilityLabel={`${"\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e"} ${item.titleRu}`}
              />
              <Pressable
                testID={`consumer-repair-item-plus-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${"\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0442\u044c"} ${item.titleRu}`}
                onPress={() => onIncrease(item.id)}
                style={styles.stepper}
              >
                <Ionicons name="add" size={15} color="#0F172A" />
              </Pressable>
              <Text style={styles.unit} testID={`consumer-repair-item-unit-${item.id}`}>{unitLabel}</Text>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{"\u0426\u0435\u043d\u0430"}</Text>
            <TextInput
              value={formatInputNumber(item.unitPrice)}
              onChangeText={(value) => onUnitPriceChange(item.id, value)}
              keyboardType="decimal-pad"
              inputMode="decimal"
              selectTextOnFocus
              style={styles.priceInput}
              testID={`consumer-repair-item-unit-price-input-${item.id}`}
              accessibilityLabel={`${"\u0426\u0435\u043d\u0430"} ${item.titleRu}`}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{"\u0418\u0442\u043e\u0433"}</Text>
            <Text style={styles.total} testID={`consumer-repair-item-total-${item.id}`}>{totalLabel}</Text>
          </View>
        </View>
        <Text style={styles.priceStatus} testID={`consumer-repair-item-price-status-${item.id}`}>
          {priceStatusLabel(item)}
        </Text>
        {item.selectedProductBinding ? (
          <Text style={styles.selectedProduct} testID={`consumer-repair-item-selected-product-${item.id}`}>
            {`${"\u0412\u044b\u0431\u0440\u0430\u043d \u0442\u043e\u0432\u0430\u0440"}: ${item.selectedProductBinding.visibleName}${item.selectedProductBinding.packageLabel ? `, ${item.selectedProductBinding.packageLabel}` : ""}`}
          </Text>
        ) : null}
        {showPhotoButton && item.itemType === "material" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${"\u0424\u043e\u0442\u043e \u0442\u043e\u0432\u0430\u0440\u0430"} ${item.titleRu}`}
            onPress={() => onOpenPhoto?.(item.id)}
            style={styles.photoButton}
            testID={`estimate-material-row-photo-button-${item.id}`}
          >
            <Ionicons name="camera-outline" size={15} color="#166534" />
          </Pressable>
        ) : null}
        {catalogBindingLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${"\u041f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430 \u0434\u043b\u044f"} ${item.titleRu}`}
            onPress={() => onOpenCatalog?.(item.id)}
            style={styles.catalogBadge}
            testID={`consumer-repair-item-catalog-${item.id}`}
          >
            <Text style={styles.catalogBadgeText}>{catalogBindingLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        testID={`consumer-repair-item-remove-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${"\u0423\u0434\u0430\u043b\u0438\u0442\u044c"} ${item.titleRu}`}
        onPress={() => onRemove(item.id)}
        style={styles.remove}
      >
        <Ionicons name="trash-outline" size={16} color="#DC2626" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  meta: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  fields: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  field: {
    gap: 4,
  },
  label: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
  },
  quantityLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stepper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  input: {
    width: 70,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  priceInput: {
    width: 106,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  unit: {
    minWidth: 42,
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  total: {
    minHeight: 34,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingTop: 8,
  },
  priceStatus: {
    marginTop: 6,
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
  },
  selectedProduct: {
    marginTop: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  photoButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    width: 34,
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  catalogBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  catalogBadgeText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "900",
  },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
