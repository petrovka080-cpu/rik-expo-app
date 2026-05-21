import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests";

type Props = {
  item: ConsumerRepairRequestItem;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
};

export function ConsumerRepairItemRow({ item, onDecrease, onIncrease, onRemove }: Props): React.ReactElement {
  return (
    <View style={styles.row} testID={`consumer-repair-item-${item.id}`}>
      <View style={styles.main}>
        <Text style={styles.title}>{item.titleRu}</Text>
        <Text style={styles.meta}>{item.itemType === "work" ? "Работа" : item.itemType === "material" ? "Материал" : "Позиция"}</Text>
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
        <Text style={styles.qtyText}>{item.quantity ?? 0} {item.unit ?? ""}</Text>
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
