import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { normalizeRuText } from "../../../lib/text/encoding";

type WorkItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number | null;
  approvedQty?: number | null;
  approvedUnit?: string | null;
  approvedPrice?: number | null;
  include: boolean;
};

type Props = {
  item: WorkItem;
  expanded: boolean;
  resolvedObjectName: string;
  onToggleExpanded: () => void;
  onToggleInclude: () => void;
  onQtyChange: (txt: string) => void;
  onUnitChange: (txt: string) => void;
  onPriceChange: (txt: string) => void;
};

export default function ActBuilderWorkRow(props: Props) {
  const w = props.item;
  const sum = Number(w.qty || 0) * Number(w.price || 0);
  const workName = normalizeRuText(w.name || "");
  const unit = normalizeRuText(w.unit || "");
  const objectName = normalizeRuText(props.resolvedObjectName || "");
  const approvedUnit = normalizeRuText(w.approvedUnit || "");

  return (
    <View style={[styles.card, w.include ? styles.cardIncluded : styles.cardDefault]}>
      <View style={styles.headerRow}>
        <Pressable onPress={props.onToggleExpanded} style={styles.headerBody}>
          <Text style={styles.title} numberOfLines={2}>
            {workName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {objectName || "Объект не указан"}
          </Text>
          <Text style={styles.summary}>
            Кол-во: {Number(w.qty || 0).toLocaleString("ru-RU")} • Ед: {unit || "—"} • Цена:{" "}
            {w.price == null ? "—" : Number(w.price).toLocaleString("ru-RU")} • Сумма:{" "}
            {sum > 0 ? sum.toLocaleString("ru-RU") : "0"}
          </Text>
          {(w.approvedQty != null || w.approvedPrice != null || w.approvedUnit) && (
            <Text style={styles.approvedMeta}>
              Утверждено:{" "}
              {w.approvedQty == null ? "—" : Number(w.approvedQty).toLocaleString("ru-RU")}{" "}
              {approvedUnit || unit || "—"} • Цена:{" "}
              {w.approvedPrice == null ? "—" : Number(w.approvedPrice).toLocaleString("ru-RU")}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={props.onToggleInclude}
          style={[styles.includeToggle, w.include ? styles.includeToggleOn : styles.includeToggleOff]}
        >
          <Text
            style={[
              styles.includeToggleText,
              w.include ? styles.includeToggleTextOn : styles.includeToggleTextOff,
            ]}
          >
            Вкл
          </Text>
        </Pressable>
      </View>

      {(props.expanded || w.include) && (
        <View style={styles.expandedSection}>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Кол-во</Text>
            <TextInput
              value={String(w.qty ?? 0)}
              keyboardType="numeric"
              onChangeText={props.onQtyChange}
              style={styles.flexInput}
            />

            <Text style={styles.controlLabel}>Ед</Text>
            <TextInput value={unit || ""} onChangeText={props.onUnitChange} style={styles.unitInput} />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Цена</Text>
            <TextInput
              value={w.price == null ? "" : String(w.price)}
              keyboardType="numeric"
              onChangeText={props.onPriceChange}
              style={styles.flexInput}
            />

            <Text style={styles.sumValue}>{sum > 0 ? sum.toLocaleString("ru-RU") : "0"}</Text>
          </View>
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
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  cardIncluded: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
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
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
  },
  meta: {
    fontSize: 11,
    color: "#64748b",
  },
  summary: {
    fontSize: 12,
    color: "#334155",
  },
  approvedMeta: {
    fontSize: 11,
    color: "#64748b",
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
    gap: 8,
    paddingTop: 4,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlLabel: {
    color: "#64748b",
    fontSize: 11,
  },
  flexInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: "#334155",
    backgroundColor: "#fff",
  },
  unitInput: {
    width: 76,
    height: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: "#334155",
    backgroundColor: "#fff",
  },
  sumValue: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 88,
    textAlign: "right",
  },
});
