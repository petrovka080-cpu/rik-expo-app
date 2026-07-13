import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalMaterialQuantityLine } from "../../../lib/estimate/professionalMaterialQuantityContract";

export function MaterialQuantityTracePanel(input: {
  lines: readonly ProfessionalMaterialQuantityLine[];
}) {
  if (input.lines.length === 0) return null;
  const blocked = input.lines.filter((line) => line.quantityState !== "calculated").length;
  return (
    <View style={styles.wrap} testID="material-quantity-trace-panel">
      <Text style={styles.title}>Material quantity trace</Text>
      <Text style={styles.meta}>{`rows=${input.lines.length}; blocked=${blocked}`}</Text>
      {input.lines.slice(0, 8).map((line) => (
        <Text key={line.rowId} style={styles.row} numberOfLines={2}>
          {`${line.materialName}: net=${line.netQuantity} ${line.unit}; gross=${line.grossQuantity}; buy=${line.procurementQuantity} ${line.procurementUnit}`}
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
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
    padding: 10,
  },
  title: {
    color: "#065F46",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  meta: {
    color: "#047857",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  row: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
