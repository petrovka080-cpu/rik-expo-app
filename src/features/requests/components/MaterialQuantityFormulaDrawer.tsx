import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalMaterialQuantityLine } from "../../../lib/estimate/professionalMaterialQuantityContract";

export function MaterialQuantityFormulaDrawer(input: {
  lines: readonly ProfessionalMaterialQuantityLine[];
}) {
  if (input.lines.length === 0) return null;
  return (
    <View style={styles.wrap} testID="material-quantity-formula-drawer">
      <Text style={styles.title}>Material formulas</Text>
      {input.lines.slice(0, 8).map((line) => (
        <Text key={line.rowId} style={styles.row} numberOfLines={2}>
          {`${line.materialName}: ${line.formula}; params=${line.quantityDependsOnParams.join(",") || "static-approved"}`}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    padding: 10,
  },
  title: {
    color: "#1D4ED8",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  row: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
