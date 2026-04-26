import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { normalizeRuText } from "../../../lib/text/encoding";

type MaterialItem = {
  id: string;
  name: string;
  uom: string;
  issuedQty: number;
  alreadyUsed: number;
  qtyMax: number;
  qty: number;
  price: number | null;
  include: boolean;
};

type Props = {
  item: MaterialItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleInclude: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onPriceChange: (txt: string) => void;
};

export default function ActBuilderMaterialRow(props: Props) {
  const it = props.item;
  const sum = it.price == null ? null : Number(it.qty || 0) * Number(it.price || 0);
  const remaining = Math.max(0, Number(it.qtyMax || 0) - Number(it.qty || 0));
  const itemName = normalizeRuText(it.name || "");
  const uom = normalizeRuText(it.uom || "");

  return (
    <View style={[styles.card, it.include ? styles.cardIncluded : styles.cardDefault]}>
      <View style={styles.headerRow}>
        <Pressable onPress={props.onToggleExpanded} style={styles.headerBody}>
          <Text style={styles.title} numberOfLines={2}>
            {itemName}
          </Text>
          <Text style={styles.meta}>
            Выдано: {Number(it.issuedQty || 0).toLocaleString("ru-RU")} {uom || ""} | Списано:{" "}
            {Number(it.alreadyUsed || 0).toLocaleString("ru-RU")} {uom || ""} | Доступно:{" "}
            {Number(it.qtyMax || 0).toLocaleString("ru-RU")} {uom || ""}
          </Text>
          <Text style={styles.summary}>
            Кол-во {Number(it.qty || 0).toLocaleString("ru-RU")} · Ед: {uom || "—"} · Цена{" "}
            {it.price == null ? "—" : Number(it.price).toLocaleString("ru-RU")} · Сумма{" "}
            {sum == null || sum === 0 ? "—" : Number(sum).toLocaleString("ru-RU")}
          </Text>
        </Pressable>

        <Pressable
          onPress={props.onToggleInclude}
          style={[styles.includeToggle, it.include ? styles.includeToggleOn : styles.includeToggleOff]}
        >
          <Text
            style={[
              styles.includeToggleText,
              it.include ? styles.includeToggleTextOn : styles.includeToggleTextOff,
            ]}
          >
            Вкл
          </Text>
        </Pressable>
      </View>

      {(props.expanded || it.include) && (
        <View style={styles.expandedSection}>
          <View style={styles.controlsRow}>
            <Text style={styles.controlLabel}>Кол-во</Text>

            <Pressable onPress={props.onDecrement} style={styles.stepperButton}>
              <Text style={styles.stepperButtonText}>-</Text>
            </Pressable>

            <Text style={styles.qtyValue}>{Number(it.qty || 0).toLocaleString("ru-RU")}</Text>

            <Pressable onPress={props.onIncrement} style={styles.stepperButton}>
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>

            <Text style={styles.priceLabel}>Цена</Text>
            <TextInput
              value={it.price == null ? "" : String(it.price)}
              onChangeText={props.onPriceChange}
              keyboardType="numeric"
              placeholder="—"
              style={styles.priceInput}
            />

            <Text style={styles.sumValue}>
              {sum == null || sum === 0 ? "—" : Number(sum).toLocaleString("ru-RU")}
            </Text>
          </View>

          <Text style={styles.remaining}>
            Остаток после акта: {remaining.toLocaleString("ru-RU")} {uom || ""}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 6,
  },
  cardDefault: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
  },
  cardIncluded: {
    backgroundColor: "#f0fdf4",
    borderColor: "#22c55e",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerBody: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontWeight: "700",
    color: "#0f172a",
    fontSize: 13,
  },
  meta: {
    fontSize: 11,
    color: "#64748b",
  },
  summary: {
    fontSize: 12,
    color: "#334155",
  },
  includeToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  includeToggleOff: {
    backgroundColor: "#e2e8f0",
  },
  includeToggleOn: {
    backgroundColor: "#16a34a",
  },
  includeToggleText: {
    fontWeight: "800",
    fontSize: 12,
  },
  includeToggleTextOff: {
    color: "#334155",
  },
  includeToggleTextOn: {
    color: "#fff",
  },
  expandedSection: {
    marginTop: 4,
    gap: 6,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlLabel: {
    color: "#64748b",
    fontSize: 11,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  qtyValue: {
    minWidth: 50,
    textAlign: "center",
    fontWeight: "800",
    color: "#0f172a",
    fontSize: 13,
  },
  priceLabel: {
    color: "#64748b",
    fontSize: 11,
    marginLeft: 4,
  },
  priceInput: {
    width: 84,
    height: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    backgroundColor: "#fff",
  },
  sumValue: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 72,
    textAlign: "right",
  },
  remaining: {
    color: "#64748b",
    fontSize: 11,
  },
});
