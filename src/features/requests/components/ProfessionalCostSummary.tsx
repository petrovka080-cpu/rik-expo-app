import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type {
  ProfessionalCostLine,
  ProfessionalCostSummary as ProfessionalCostSummaryModel,
} from "../../../lib/estimate/professionalCostingContract";
import { MissingPricePanel } from "./MissingPricePanel";
import { ProfessionalCostBreakdown } from "./ProfessionalCostBreakdown";

function money(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return "not available";
  return `${value.toFixed(2)} ${currency}`;
}

export function ProfessionalCostSummary({
  summary,
  lines,
}: {
  summary: ProfessionalCostSummaryModel;
  lines: readonly ProfessionalCostLine[];
}): React.ReactElement {
  return (
    <View style={styles.wrap} testID="professional-cost-summary">
      <View style={styles.header}>
        <Text style={styles.title}>Professional cost breakdown</Text>
        <Text style={styles.coverage} testID="professional-cost-coverage">
          {summary.pricedRequiredRowsPercent}% priced
        </Text>
      </View>
      <Text style={styles.total} testID="professional-preliminary-total">
        Preliminary total: {summary.preliminaryTotalAllowed ? money(summary.preliminaryTotal, summary.currency) : "not available"}
      </Text>
      <Text style={styles.meta} testID="professional-missing-price-count">
        Missing prices: {summary.missingPriceRowsCount}
      </Text>
      <Text style={styles.meta} testID="professional-contract-total-status">
        Contract total: {summary.contractTotalAllowed ? "available" : "not available"}
      </Text>
      <MissingPricePanel lines={lines} />
      <ProfessionalCostBreakdown summary={summary} lines={lines} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  coverage: {
    color: "#0369A1",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  total: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  meta: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
});
