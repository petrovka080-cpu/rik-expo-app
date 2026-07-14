import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ProfessionalCostLine } from "../../../lib/estimate/professionalCostingContract";
import { PriceStateBadge } from "./PriceStateBadge";

function money(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "missing_price";
  return `${value.toFixed(2)} ${currency}`;
}

export function professionalCostLineItemText(line: ProfessionalCostLine): string {
  return [
    line.name,
    `${line.quantity} ${line.unit}`,
    line.priceState,
    money(line.unitPrice, line.currency),
    money(line.lineSubtotal, line.currency),
    line.priceSourceLabel ?? "price source missing",
  ].join("; ");
}

export function ProfessionalCostLineItem({ line }: { line: ProfessionalCostLine }): React.ReactElement {
  return (
    <View style={styles.wrap} testID={`professional-cost-line-${line.rowId}`}>
      <View style={styles.header}>
        <Text style={styles.name}>{line.name}</Text>
        <PriceStateBadge state={line.priceState} />
      </View>
      <Text style={styles.meta}>
        {line.quantity} {line.unit} В· unit {money(line.unitPrice, line.currency)} В· subtotal {money(line.lineSubtotal, line.currency)}
      </Text>
      <Text style={styles.source}>
        {line.priceSourceLabel ?? "Price source missing"} В· {line.priceRegion ?? "region missing"} В· {line.priceRetrievedAt ?? "retrieved date missing"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    minWidth: 160,
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  meta: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  source: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
});
