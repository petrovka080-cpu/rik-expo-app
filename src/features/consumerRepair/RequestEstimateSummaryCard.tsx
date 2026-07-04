import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

export function RequestEstimateSummaryCard({ viewModel }: { viewModel: RequestEstimateViewModel }): React.ReactElement {
  const [detailsVisible, setDetailsVisible] = React.useState(false);
  const details = [
    ...viewModel.sourceLabels,
    viewModel.taxLabel,
    viewModel.taxWarning,
  ].filter((item): item is string => Boolean(item?.trim()));
  const visibleLines = viewModel.professionalPreview ? [] : viewModel.visibleLines.slice(0, 5);
  return (
    <View style={styles.card} testID="request-estimate-summary-card">
      <Text style={styles.title}>{"\u0421\u043c\u0435\u0442\u0430"}</Text>
      <Text style={styles.summary}>{viewModel.summary}</Text>
      <Text style={styles.total}>
        {"\u0418\u0442\u043e\u0433\u043e \u043f\u043e \u043f\u043e\u0437\u0438\u0446\u0438\u044f\u043c"}: {viewModel.totalLabel}
      </Text>
      <Text style={styles.meta} testID="request-estimate-price-status">
        {"\u0426\u0435\u043d\u044b"}: {viewModel.priceStatusLabel}
      </Text>
      {viewModel.assumptionRows.length > 0 ? (
        <View style={styles.assumptions} testID="request-estimate-assumptions">
          <View style={styles.assumptionHeader}>
            <Text style={styles.assumptionTitle}>{"\u0414\u043e\u043f\u0443\u0449\u0435\u043d\u0438\u044f \u0440\u0430\u0441\u0447\u0435\u0442\u0430"}</Text>
            <Text style={styles.assumptionHint}>{"\u043c\u043e\u0436\u043d\u043e \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c"}</Text>
          </View>
          <View style={styles.assumptionGrid}>
            {viewModel.assumptionRows.map((row) => (
              <View key={row.id} style={styles.assumptionPill} testID={`request-estimate-assumption-${row.id}`}>
                <Text style={styles.assumptionLabel}>{row.label}</Text>
                <Text style={styles.assumptionValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {visibleLines.length > 0 ? (
        <View style={styles.visibleLines} testID="request-estimate-visible-lines">
          {visibleLines.map((line) => (
            <Text key={line.id} style={styles.visibleLine} numberOfLines={2}>
              {line.text}
            </Text>
          ))}
        </View>
      ) : null}
      {viewModel.revisionVersionLabel ? (
        <Text style={styles.meta} testID="request-estimate-revision-version">
          {viewModel.revisionVersionLabel}
        </Text>
      ) : null}
      {viewModel.revisionAuditLabel ? (
        <Text style={styles.meta} testID="request-estimate-revision-audit">
          {viewModel.revisionAuditLabel}
        </Text>
      ) : null}
      {viewModel.revisionApprovedLabel ? (
        <Text style={styles.meta} testID="request-estimate-approved-revision">
          {viewModel.revisionApprovedLabel}
        </Text>
      ) : null}
      {details.length > 0 ? (
        <View style={styles.detailsWrap}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDetailsVisible((value) => !value)}
            style={styles.detailsToggle}
            testID="request-estimate-details-toggle"
          >
            <Text style={styles.detailsToggleText}>
              {detailsVisible
                ? "\u0421\u043a\u0440\u044b\u0442\u044c \u0434\u0435\u0442\u0430\u043b\u0438"
                : "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0434\u0435\u0442\u0430\u043b\u0438"}
            </Text>
          </Pressable>
          {detailsVisible ? (
            <View style={styles.detailsPanel} testID="request-estimate-details-panel">
              {details.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.detailsLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
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
  assumptions: {
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#F8FAFC",
    padding: 10,
  },
  assumptionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  assumptionTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  assumptionHint: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
  },
  assumptionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  assumptionPill: {
    minWidth: 126,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  assumptionLabel: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  assumptionValue: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  visibleLines: {
    gap: 4,
  },
  visibleLine: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  detailsWrap: {
    marginTop: 2,
    gap: 6,
  },
  detailsToggle: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
  },
  detailsToggleText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  detailsPanel: {
    gap: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#CBD5E1",
    paddingLeft: 8,
  },
  detailsLine: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
});
