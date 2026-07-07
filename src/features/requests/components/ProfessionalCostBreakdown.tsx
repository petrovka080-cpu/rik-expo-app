import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type {
  ProfessionalCostLine,
  ProfessionalCostSummary as ProfessionalCostSummaryModel,
} from "../../../lib/estimate/professionalCostingContract";
import { ProfessionalCostLineItem } from "./ProfessionalCostLineItem";

function money(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "not available";
  return `${value.toFixed(2)} ${currency}`;
}

export function ProfessionalCostBreakdown({
  summary,
  lines,
}: {
  summary: ProfessionalCostSummaryModel;
  lines: readonly ProfessionalCostLine[];
}): React.ReactElement {
  const rows = [
    ["Materials", summary.materialsSubtotal],
    ["Labor", summary.laborSubtotal],
    ["Services", summary.servicesSubtotal],
    ["Equipment", summary.equipmentSubtotal],
    ["Transport", summary.transportSubtotal],
    ["Overhead / mobilization", summary.overheadMobilizationSubtotal],
  ];
  return (
    <View style={styles.wrap} testID="professional-cost-breakdown">
      <View style={styles.totals}>
        {rows.map(([label, value]) => (
          <View key={label as string} style={styles.totalRow}>
            <Text style={styles.totalLabel}>{label}</Text>
            <Text style={styles.totalValue}>{money(value as number, summary.currency)}</Text>
          </View>
        ))}
      </View>
      <View testID="professional-cost-lines">
        {lines.map((line) => (
          <ProfessionalCostLineItem key={line.rowId} line={line} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  totals: {
    gap: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  totalValue: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
});
