import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevision } from "../../../lib/estimate/estimateDraftRevisionContract";

export type EditableParamChipsProps = {
  revision: EstimateDraftRevision | null;
  onEditParam?: (paramKey: string) => void;
  onRemoveParam?: (paramKey: string) => void;
};

function unitLabel(unit: string | undefined): string {
  if (unit === "m2") return "м²";
  if (unit === "m3") return "м³";
  if (unit === "m") return "м";
  if (unit === "mm") return "мм";
  if (unit === "pcs") return "шт";
  return unit ?? "";
}

function paramLabel(key: string): string {
  if (key === "area_m2") return "Площадь";
  if (key === "length_m") return "Длина";
  if (key === "line_length_m") return "Длина линии";
  if (key === "width_m") return "Ширина";
  if (key === "height_m") return "Высота";
  if (key === "thickness_m") return "Толщина";
  if (key === "depth_mm") return "Глубина";
  if (key === "diameter_mm") return "Диаметр";
  if (key === "volume_m3") return "Объём";
  if (key === "count") return "Количество";
  if (key === "package_mode") return "Формат";
  return key.replace(/_/g, " ");
}

export function EditableParamChips({
  revision,
  onEditParam,
  onRemoveParam,
}: EditableParamChipsProps): React.ReactElement | null {
  if (!revision) return null;
  const params = Object.entries(revision.params)
    .filter(([key]) => key !== "estimate_level" && key !== "prices")
    .sort(([a], [b]) => a.localeCompare(b));
  if (params.length === 0) return null;

  return (
    <View style={styles.wrap} testID="editable-param-chips">
      <Text style={styles.title}>Параметры</Text>
      <View style={styles.grid}>
        {params.map(([key, param]) => (
          <View key={key} style={styles.chip} testID={`editable-param-chip-${key}`}>
            <Text style={styles.label}>{paramLabel(key)}</Text>
            <Text style={styles.value}>
              {String(param.value)} {unitLabel(param.canonicalUnit)}
            </Text>
            <Text style={styles.source}>{param.source === "edited_by_user" ? "изменено" : param.source}</Text>
            <View style={styles.actions}>
              {onEditParam ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onEditParam(key)}
                  style={styles.action}
                  testID={`editable-param-edit-${key}`}
                >
                  <Text style={styles.actionText}>Изменить</Text>
                </Pressable>
              ) : null}
              {onRemoveParam && param.source !== "default_assumption" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onRemoveParam(key)}
                  style={styles.action}
                  testID={`editable-param-remove-${key}`}
                >
                  <Text style={styles.actionText}>Убрать</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minWidth: 132,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    padding: 8,
    gap: 4,
  },
  label: {
    color: "#3730A3",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  value: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  source: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  action: {
    minHeight: 28,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  actionText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
  },
});
