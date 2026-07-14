import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalMaterialQuantityLine } from "../../../lib/estimate/professionalMaterialQuantityContract";

export function MaterialWasteAndPackagingPanel(input: {
  lines: readonly ProfessionalMaterialQuantityLine[];
}) {
  if (input.lines.length === 0) return null;
  const roundedRows = input.lines.filter((line) => line.procurementQuantity >= line.grossQuantity).length;
  return (
    <View style={styles.wrap} testID="material-waste-packaging-panel">
      <Text style={styles.title}>Waste and packaging</Text>
      <Text style={styles.meta}>{`rounded=${roundedRows}/${input.lines.length}`}</Text>
      {input.lines.slice(0, 8).map((line) => (
        <Text key={line.rowId} style={styles.row} numberOfLines={2}>
          {`${line.materialName}: waste=${line.wastePercent}%; loss=${line.lossPercent}%; package=${line.procurementPackageSize} ${line.procurementUnit}`}
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
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 10,
  },
  title: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  meta: {
    color: "#C2410C",
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
