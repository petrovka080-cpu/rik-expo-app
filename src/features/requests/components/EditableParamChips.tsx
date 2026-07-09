import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevision } from "../../../lib/estimate/estimateDraftRevisionContract";
import { buildAiEstimateParameterCards } from "../../../lib/estimate/buildAiEstimateParameterCards";
import type { UserParamPatchOperation } from "../../../lib/estimate/validateUserParamPatch";

export type EditableParamChipsProps = {
  revision: EstimateDraftRevision | null;
  onEditParam?: (paramKey: string, operation?: UserParamPatchOperation) => void;
  onRemoveParam?: (paramKey: string) => void;
};

export function EditableParamChips({
  revision,
  onEditParam,
  onRemoveParam,
}: EditableParamChipsProps): React.ReactElement | null {
  if (!revision) return null;
  const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
  if (cards.length === 0) return null;

  return (
    <View style={styles.wrap} testID="editable-param-chips">
      <Text style={styles.title}>Параметры расчета</Text>
      <View style={styles.grid}>
        {cards.map((card) => (
          <View
            key={card.key}
            style={[styles.chip, card.missing ? styles.missingChip : null]}
            testID={`editable-param-chip-${card.key}`}
          >
            <Text style={styles.label}>{card.labelRu}</Text>
            <Text style={styles.value}>{card.displayValueRu}</Text>
            <Text style={styles.source}>{card.sourceLabelRu}</Text>
            <View style={styles.actions}>
              {onEditParam ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onEditParam(card.key, card.missing ? "add_param" : "update_param")}
                  style={styles.action}
                  testID={`editable-param-edit-${card.key}`}
                >
                  <Text style={styles.actionText}>{card.missing ? "Добавить" : "Изменить"}</Text>
                </Pressable>
              ) : null}
              {onRemoveParam && !card.missing && card.source !== "catalog_default" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onRemoveParam(card.key)}
                  style={styles.action}
                  testID={`editable-param-remove-${card.key}`}
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
  missingChip: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
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
