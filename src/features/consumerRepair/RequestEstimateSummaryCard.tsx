import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RequestEstimateViewModel } from "./requestEstimateViewModel";

type Props = {
  viewModel: RequestEstimateViewModel;
  missingParameterCount?: number;
  contentWithdrawalReasonRu?: string | null;
};

export class RequestEstimateSummaryCard extends React.PureComponent<Props> {
  render(): React.ReactElement {
    const { viewModel, missingParameterCount } = this.props;
    if (this.props.contentWithdrawalReasonRu) {
      return <View style={styles.card} testID="request-estimate-summary-card">
        <Text style={styles.eyebrow}>Сохранённый расчёт требует исправления</Text>
        <Text style={styles.title} testID="request-estimate-selected-work-title">{viewModel.title}</Text>
        <Text style={styles.legal} testID="request-estimate-content-withdrawal">{this.props.contentWithdrawalReasonRu}</Text>
        <Text style={styles.meta}>Исходные позиции сохранены для просмотра. Их количества и стоимость не подтверждены.</Text>
      </View>;
    }
    const sourceGateCount = viewModel.sourceGates?.length ?? 0;
    const consumerInputCount = viewModel.consumerQuestionCount ?? (typeof missingParameterCount === "number"
      ? Math.max(0, missingParameterCount - sourceGateCount)
      : null);
    const parameterLabel = sourceGateCount > 0
      ? (consumerInputCount === 0 ? 'Данные объекта заполнены'
        : `Нужно указать данные объекта: ${consumerInputCount ?? missingParameterCount ?? 'неизвестны'}`)
      : missingParameterCount === 0
        ? "Данные для рассчитанных этапов заполнены"
      : typeof missingParameterCount === "number"
      ? `Нужно уточнить: ${missingParameterCount} ${pluralizeRu(missingParameterCount, "параметр", "параметра", "параметров")}`
      : "Для точности нужно уточнить параметры";
    return (
      <View style={styles.card} testID="request-estimate-summary-card">
        <Text style={styles.eyebrow}>
          {viewModel.preliminaryNeedCount ? "Черновик расчёта" : "Смета по выбранной работе"}
        </Text>
        <Text style={styles.title} testID="request-estimate-selected-work-title">{viewModel.title}</Text>
        <Text style={styles.summary} numberOfLines={2}>{viewModel.summary}</Text>
        {viewModel.visibleLines.length > 0 ? (
          <View style={styles.visibleLines} testID="request-estimate-visible-lines">
            <Text style={styles.meta}>Основные материалы и работы:</Text>
            {viewModel.visibleLines.slice(0, 4).map((line) => (
              <Text key={line.id} style={styles.visibleLine}>{line.text}</Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.meta} testID="request-estimate-row-count">
          {viewModel.preliminaryNeedCount
            ? `С количеством: ${viewModel.calculatedItemCount ?? 0} ${pluralizeRu(viewModel.calculatedItemCount ?? 0, "строка", "строки", "строк")}`
            : `${viewModel.rawItemCount} ${pluralizeRu(viewModel.rawItemCount, "позиция", "позиции", "позиций")}`}
        </Text>
        {viewModel.preliminaryNeedCount ? (
          <Text style={styles.meta} testID="request-estimate-preliminary-need-count">
            {`Пока не рассчитано: ${viewModel.preliminaryNeedCount} ${pluralizeRu(viewModel.preliminaryNeedCount, "позиция", "позиции", "позиций")}`}
          </Text>
        ) : null}
        {viewModel.preliminaryNeedCount ? <Text style={styles.meta}>
          Нерассчитанные позиции не входят в стоимость и закупку. Уже введённые данные сохранены.
        </Text> : null}
        <Text style={styles.total}>
          Стоимость: {viewModel.totalLabel}
        </Text>
        <Text style={styles.meta} testID="request-estimate-price-status">
          Цены: {viewModel.priceStatusLabel}
        </Text>
        <Text style={styles.meta} testID="request-estimate-trust-level">
          {sourceGateCount > 0 && consumerInputCount === 0 && viewModel.preliminaryNeedCount
            ? 'Готовность: приложение ещё не завершило расчёт'
            : viewModel.trustLevelLabel}
        </Text>
        <Text style={styles.meta} testID="request-estimate-commercial-level">
          {viewModel.commercialEstimateLevelLabel}
        </Text>
        {viewModel.procurementApplicabilityLabel ? (
          <Text style={styles.meta} testID="request-estimate-procurement-applicability">
            {viewModel.procurementApplicabilityLabel}
          </Text>
        ) : null}
        <Text style={styles.meta} testID="request-estimate-parameter-status">
          {parameterLabel}
        </Text>
        <Text style={styles.legal} testID="request-estimate-readiness-notice">
          {sourceGateCount > 0 && (consumerInputCount ?? 0) > 0
            ? `Нужно указать недостающие данные объекта (${consumerInputCount}). Приложение также ещё не рассчитало часть состава.`
            : typeof missingParameterCount === "number" && missingParameterCount > 0
            ? sourceGateCount > 0 && consumerInputCount === 0
              ? "Приложение ещё не завершило расчёт состава. Нормы и коэффициенты вводить не требуется."
              : `Неполный расчёт: нужны ещё ${missingParameterCount} ${pluralizeRu(missingParameterCount, "параметр", "параметра", "параметров")}. Подтверждение договорной версии пока недоступно.`
            : (viewModel.preliminaryNeedCount ?? 0) > 0
              ? "Приложение ещё не рассчитало часть состава. Эти позиции не включены в общую стоимость."
              : "Это черновик сметы. Проверьте материалы, работы и цены перед заказом."}
        </Text>
        {viewModel.scopeRequirementGroups?.some(group => group.statuses.some(status =>
          ['PROJECT_SCOPE_OPEN','PARTLY_INCLUDED','SCOPE_UNVERIFIED','LEGACY_SOURCE_REQUIRED'].includes(status)))
          ? <Text style={styles.legal} testID="request-estimate-composition-incomplete">
            Состав всей работы ещё не рассчитан. Незавершённые подработы показаны внутри сметы; нормы и ресурсы должно дополнить приложение.
          </Text> : null}
        {viewModel.scopeRequirementGroups?.some(group=>group.statuses.includes('USER_EXCLUDED'))
          ? <Text style={styles.legal}>Состав изменён пользователем. Подтверждение оставшихся позиций не означает полноту исходной технологии.</Text> : null}
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
