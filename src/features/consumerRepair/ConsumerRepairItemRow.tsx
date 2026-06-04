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
  if (item.itemType === "work") return "Работа";
  if (item.itemType === "material") return "Материал";
  if (item.itemType === "service") return "Оборудование / доставка";
  return "Позиция";
}

function bindingLabel(item: ConsumerRepairRequestItem): string | null {
  if (item.itemType !== "material") return null;
  if (item.selectedCatalogItemId || item.catalogItemId) return "Каталог материалов: выбран";
  if (item.catalogBindingStatus === "multiple_candidates") return "Каталог материалов: есть варианты";
  if (item.catalogBindingStatus === "matched") return "Каталог материалов: найден вариант";
  if (item.catalogBindingStatus === "no_catalog_match") return "Каталог материалов: нужно подобрать";
  return "Каталог материалов: не проверено";
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
          {item.sourceLabel ? ` · ${item.sourceLabel}` : ""}
        </Text>
        {item.totalPrice != null ? <Text style={styles.price}>{formatEstimateMoney(item.totalPrice, item.currency)}</Text> : null}
        {catalogBindingLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Подобрать материал из каталога для ${item.titleRu}`}
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
          accessibilityLabel={`Уменьшить ${item.titleRu}`}
          onPress={() => onDecrease(item.id)}
          style={styles.stepper}
        >
          <Ionicons name="remove" size={16} color="#0F172A" />
        </Pressable>
        <Text style={styles.qtyText}>{item.quantity ?? 0} {unitLabel}</Text>
        <Pressable
          testID={`consumer-repair-item-plus-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Увеличить ${item.titleRu}`}
          onPress={() => onIncrease(item.id)}
          style={styles.stepper}
        >
          <Ionicons name="add" size={16} color="#0F172A" />
        </Pressable>
      </View>
      <Pressable
        testID={`consumer-repair-item-remove-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Удалить ${item.titleRu}`}
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
