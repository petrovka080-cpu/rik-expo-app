import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

export function RequestEstimateSummaryCard({
  viewModel,
  missingParameterCount,
}: {
  viewModel: RequestEstimateViewModel;
  missingParameterCount?: number;
}): React.ReactElement {
  const [detailsVisible, setDetailsVisible] = React.useState(false);
  const details = [
    viewModel.trustLevelLabel,
    viewModel.commercialEstimateLevelLabel,
    viewModel.sourceQualityLabel,
    viewModel.expertReviewStatusLabel,
    viewModel.fullTotalStatusLabel,
    ...viewModel.sourceLabels,
    viewModel.taxLabel,
    viewModel.taxWarning,
    ...viewModel.calculationPreviewLines,
    ...viewModel.normSourcePreviewLines,
    viewModel.revisionVersionLabel,
    viewModel.revisionAuditLabel,
    viewModel.revisionApprovedLabel,
  ].filter((item): item is string => Boolean(item?.trim()));
  const parameterLabel = typeof missingParameterCount === "number"
    ? `Нужно уточнить: ${missingParameterCount} ${pluralizeRu(missingParameterCount, "параметр", "параметра", "параметров")}`
    : "Для точности нужно уточнить параметры";
  return (
    <View style={styles.card} testID="request-estimate-summary-card">
      <Text style={styles.eyebrow}>Выбрана работа</Text>
      <Text style={styles.title} testID="request-estimate-selected-work-title">{viewModel.title}</Text>
      <Text style={styles.summary} numberOfLines={3}>{viewModel.summary}</Text>
      <Text style={styles.meta} testID="request-estimate-row-count">
        {viewModel.rawItemCount} {pluralizeRu(viewModel.rawItemCount, "позиция", "позиции", "позиций")}
      </Text>
      <Text style={styles.total}>
        {"\u0418\u0442\u043e\u0433\u043e \u043f\u043e \u043f\u043e\u0437\u0438\u0446\u0438\u044f\u043c"}: {viewModel.totalLabel}
      </Text>
      <Text style={styles.meta} testID="request-estimate-price-status">
        {"\u0426\u0435\u043d\u044b"}: {viewModel.priceStatusLabel}
      </Text>
      <Text style={styles.meta} testID="request-estimate-parameter-status">
        {parameterLabel}
      </Text>
      <Text style={styles.hiddenContractLine} testID="request-estimate-trust-level">
        {viewModel.trustLevelLabel}
      </Text>
      <Text style={styles.hiddenContractLine} testID="request-estimate-commercial-level">
        {viewModel.commercialEstimateLevelLabel}
      </Text>
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
                ? "Скрыть технические детали"
                : "Показать технические детали расчёта"}
            </Text>
          </Pressable>
          {detailsVisible ? (
            <View style={styles.detailsPanel} testID="request-estimate-details-panel">
              {viewModel.assumptionRows.length > 0 ? (
                <View style={styles.assumptions} testID="request-estimate-assumptions">
                  <Text style={styles.assumptionTitle}>Допущения расчёта</Text>
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
              {viewModel.visibleLines.length > 0 ? (
                <View style={styles.visibleLines} testID="request-estimate-visible-lines">
                  {viewModel.visibleLines.slice(0, 8).map((line) => (
                    <Text key={line.id} style={styles.visibleLine} numberOfLines={2}>
                      {line.text}
                    </Text>
                  ))}
                </View>
              ) : null}
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

function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const value = Math.abs(count);
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  eyebrow: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 23,
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
  hiddenContractLine: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
  },
  assumptions: {
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#F8FAFC",
    padding: 10,
  },
  assumptionTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
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
