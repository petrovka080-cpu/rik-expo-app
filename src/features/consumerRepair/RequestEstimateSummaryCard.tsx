import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

export function RequestEstimateSummaryCard({ viewModel }: { viewModel: RequestEstimateViewModel }): React.ReactElement {
  return (
    <View style={styles.card} testID="request-estimate-summary-card">
      <Text style={styles.title}>Черновик сметы</Text>
      <Text style={styles.summary}>{viewModel.summary}</Text>
      <Text style={styles.total}>Итого по позициям: {viewModel.totalLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  summary: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  total: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
});
