import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  viewModel: RequestEstimateViewModel;
  missingParameterCount?: number;
};

export class RequestEstimateSummaryCard extends React.PureComponent<Props> {
  render(): React.ReactElement {
    const { viewModel, missingParameterCount } = this.props;
    const estimateUnitLabels = Array.from(new Set(
      viewModel.sections.flatMap((section) =>
        section.items
          .map((item) => formatEstimateUnitLabel(item.unitLabel || item.unit))
          .filter(Boolean)
      ),
    )).map((unit) => unit === "\u043c\u00b2" ? "\u043c\u00b2 (\u043c2)" : unit);
    const parameterLabel = typeof missingParameterCount === "number"
      ? `Нужно уточнить: ${missingParameterCount} ${pluralizeRu(missingParameterCount, "параметр", "параметра", "параметров")}`
      : "Для точности нужно уточнить параметры";
    return (
      <View style={styles.card} testID="request-estimate-summary-card">
        <Text style={styles.eyebrow}>Предварительная профессиональная смета</Text>
        <Text style={styles.title} testID="request-estimate-selected-work-title">{viewModel.title}</Text>
        <Text style={styles.summary} numberOfLines={2}>{viewModel.summary}</Text>
        <Text style={styles.meta} testID="request-estimate-row-count">
          {viewModel.rawItemCount} {pluralizeRu(viewModel.rawItemCount, "позиция", "позиции", "позиций")}
        </Text>
        {estimateUnitLabels.length > 0 ? (
          <Text style={styles.meta} testID="request-estimate-unit-semantics">
            {"\u0415\u0434\u0438\u043d\u0438\u0446\u044b \u0441\u043c\u0435\u0442\u044b"}: {estimateUnitLabels.join(", ")}
          </Text>
        ) : null}
        <Text style={styles.total}>
          Итого по позициям: {viewModel.totalLabel}
        </Text>
        <Text style={styles.meta} testID="request-estimate-price-status">
          Цены: {viewModel.priceStatusLabel}
        </Text>
        <Text style={styles.meta} testID="request-estimate-trust-level">
          {viewModel.trustLevelLabel}
        </Text>
        <Text style={styles.meta} testID="request-estimate-commercial-level">
          {viewModel.commercialEstimateLevelLabel}
        </Text>
        <Text style={styles.meta} testID="request-estimate-parameter-status">
          {parameterLabel}
        </Text>
        <Text style={styles.legal}>
          Предварительный расчёт. Для договорной сметы требуется проверка специалиста и цен.
        </Text>
      </View>
    );
  }
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
  legal: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
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
