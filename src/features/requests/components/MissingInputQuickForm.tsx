import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevision } from "../../../lib/estimate/estimateDraftRevisionContract";

export type MissingInputQuickFormProps = {
  revision: EstimateDraftRevision | null;
  onAddParam?: (paramKey: string) => void;
};

export function MissingInputQuickForm({
  revision,
  onAddParam,
}: MissingInputQuickFormProps): React.ReactElement | null {
  if (!revision || revision.missingInputs.length === 0) return null;
  return (
    <View style={styles.panel} testID="missing-input-quick-form">
      <Text style={styles.title}>Недостающие параметры</Text>
      {revision.missingInputs.slice(0, 8).map((input) => (
        <View key={input.key} style={styles.row} testID={`missing-input-${input.key}`}>
          <View style={styles.copy}>
            <Text style={styles.label}>{input.label}</Text>
            <Text style={styles.meta}>{input.requiredFor}</Text>
          </View>
          {onAddParam ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onAddParam(input.key)}
              style={styles.button}
              testID={`missing-input-add-${input.key}`}
            >
              <Text style={styles.buttonText}>Добавить</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 10,
    gap: 8,
  },
  title: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "900",
  },
  row: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  meta: {
    color: "#9A3412",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  button: {
    minHeight: 30,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDBA74",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  buttonText: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "900",
  },
});
