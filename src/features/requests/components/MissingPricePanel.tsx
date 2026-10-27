import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalCostLine } from "../../../lib/estimate/professionalCostingContract";

export function MissingPricePanel({ lines }: { lines: readonly ProfessionalCostLine[] }): React.ReactElement | null {
  const missing = lines.filter((line) => line.priceState === "missing_price");
  if (missing.length === 0) return null;
  return (
    <View style={styles.wrap} testID="missing-price-panel">
      <Text style={styles.title}>Missing prices: {missing.length}</Text>
      {missing.slice(0, 12).map((line) => (
        <Text key={line.rowId} style={styles.row} testID={`missing-price-row-${line.rowId}`}>
          {line.name}: {line.quantity} {line.unit}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFBEB",
    padding: 10,
  },
  title: {
    color: "#7F1D1D",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  row: {
    color: "#431407",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
