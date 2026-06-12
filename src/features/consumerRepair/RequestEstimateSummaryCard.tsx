import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

export function RequestEstimateSummaryCard({ viewModel }: { viewModel: RequestEstimateViewModel }): React.ReactElement {
  return (
    <View style={styles.card} testID="request-estimate-summary-card">
      <Text style={styles.title}>{"\u0421\u043c\u0435\u0442\u0430"}</Text>
      <Text style={styles.summary}>{viewModel.summary}</Text>
      <Text style={styles.total}>{"\u0418\u0442\u043e\u0433\u043e \u043f\u043e \u043f\u043e\u0437\u0438\u0446\u0438\u044f\u043c"}: {viewModel.totalLabel}</Text>
      <Text style={styles.meta} testID="request-estimate-source-confidence">
        Источники: {viewModel.sourceLabels[0] ?? "требуют уточнения"} · уверенность: {viewModel.sourceConfidenceLabel}
      </Text>
      <Text style={styles.meta} testID="request-estimate-tax-warning">
        Налог: {viewModel.taxLabel}{viewModel.taxWarning ? ` · ${viewModel.taxWarning}` : ""}
      </Text>
      <View style={styles.visibleLines} testID="request-estimate-visible-lines">
        {viewModel.visibleLines.slice(0, 8).map((line) => (
          <Text key={line.id} style={styles.visibleLine}>
            {line.text}
          </Text>
        ))}
      </View>
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
  meta: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  visibleLines: {
    gap: 4,
  },
  visibleLine: {
    color: "#1E293B",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
});
