import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatEstimateMoney } from "../../lib/ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests";

type Props = {
  item: ConsumerRepairRequestItem;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onOpenCatalog?: (itemId: string) => void;
};

function itemTypeLabel(item: ConsumerRepairRequestItem): string {
  if (item.itemType === "work") return "\u0420\u0430\u0431\u043e\u0442\u0430";
  if (item.itemType === "material") return "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b";
  if (item.itemType === "service") return "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 / \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430";
  return "\u041f\u043e\u0437\u0438\u0446\u0438\u044f";
}

function bindingLabel(item: ConsumerRepairRequestItem): string | null {
  if (item.itemType !== "material") return null;
  if (item.selectedCatalogItemId || item.catalogItemId) return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432: \u0432\u044b\u0431\u0440\u0430\u043d";
  if (item.catalogBindingStatus === "multiple_candidates") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432: \u0435\u0441\u0442\u044c \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b";
  if (item.catalogBindingStatus === "matched") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432: \u043d\u0430\u0439\u0434\u0435\u043d \u0432\u0430\u0440\u0438\u0430\u043d\u0442";
  if (item.catalogBindingStatus === "no_catalog_match") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432: \u043d\u0443\u0436\u043d\u043e \u043f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c";
  return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432: \u043d\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043e";
}

export function ConsumerRepairItemRow({ item, onDecrease, onIncrease, onRemove, onOpenCatalog }: Props): React.ReactElement {
  const unitLabel = item.unitLabel || formatEstimateUnitLabel(item.unit);
  const catalogBindingLabel = bindingLabel(item);
  return (
    <View style={styles.row} testID={`consumer-repair-item-${item.id}`}>
      <View style={styles.main}>
        <Text style={styles.title}>{item.titleRu}</Text>
        <Text style={styles.meta}>
          {itemTypeLabel(item)}
          {item.sourceLabel ? ` \u00b7 ${item.sourceLabel}` : ""}
        </Text>
        {item.totalPrice != null ? <Text style={styles.price}>{formatEstimateMoney(item.totalPrice, item.currency)}</Text> : null}
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
      <View style={styles.qty}>
        <Pressable
          testID={`consumer-repair-item-minus-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${"\u0423\u043c\u0435\u043d\u044c\u0448\u0438\u0442\u044c"} ${item.titleRu}`}
          onPress={() => onDecrease(item.id)}
          style={styles.stepper}
        >
          <Ionicons name="remove" size={16} color="#0F172A" />
        </Pressable>
        <Text style={styles.qtyText}>{item.quantity ?? 0} {unitLabel}</Text>
        <Pressable
          testID={`consumer-repair-item-plus-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${"\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0442\u044c"} ${item.titleRu}`}
          onPress={() => onIncrease(item.id)}
          style={styles.stepper}
        >
          <Ionicons name="add" size={16} color="#0F172A" />
        </Pressable>
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
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
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
  price: {
    marginTop: 2,
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900",
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
  qty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  qtyText: {
    minWidth: 68,
    textAlign: "center",
    color: "#0F172A",
    fontSize: 13,
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
