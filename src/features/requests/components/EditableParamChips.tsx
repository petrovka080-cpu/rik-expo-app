import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevision } from "../../../lib/estimate/estimateDraftRevisionContract";
import { buildAiEstimateRuntimeViewModel } from "../../../lib/estimate/runtime/buildAiEstimateRuntimeViewModel";
import type { UserParamPatchOperation } from "../../../lib/estimate/validateUserParamPatch";

export type EditableParamChipsProps = {
  revision: EstimateDraftRevision | null;
  onEditParam?: (paramKey: string, operation?: UserParamPatchOperation) => void;
  onRemoveParam?: (paramKey: string) => void;
};

export function EditableParamChips({
  revision,
  onEditParam,
  onRemoveParam,
}: EditableParamChipsProps): React.ReactElement | null {
  if (!revision) return null;
  const { cards, completeness, questions, quantityTrace } = buildAiEstimateRuntimeViewModel({
    revision,
    includeMissing: true,
    maxTraceRows: 3,
  });
  if (cards.length === 0) return null;

  return (
    <View style={styles.wrap} testID="editable-param-chips">
      {completeness ? (
        <View style={styles.passport} testID="normative-parameter-passport">
          <Text style={styles.title}>Паспорт параметров</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell} testID="normative-parameter-filled">
              <Text style={styles.summaryLabel}>Заполнено</Text>
              <Text style={styles.summaryValue}>{completeness.filledRequirements.length}</Text>
            </View>
            <View style={styles.summaryCell} testID="normative-parameter-missing">
              <Text style={styles.summaryLabel}>Нужно уточнить</Text>
              <Text style={styles.summaryValue}>{completeness.missingRequirements.length}</Text>
            </View>
            <View style={styles.summaryCell} testID="normative-parameter-derived">
              <Text style={styles.summaryLabel}>Рассчитано</Text>
              <Text style={styles.summaryValue}>{completeness.derivedRequirements.length}</Text>
            </View>
            <View style={styles.summaryCell} testID="normative-parameter-defaults">
              <Text style={styles.summaryLabel}>По нормативу</Text>
              <Text style={styles.summaryValue}>{completeness.catalogDefaultRequirements.length}</Text>
            </View>
          </View>
          {questions?.questions.length ? (
            <View style={styles.missingList} testID="ai-estimate-missing-input-questions">
              {questions.questions.map((question) => (
                <View key={question.key} style={styles.missingRow} testID={`ai-estimate-missing-input-${question.key}`}>
                  <View style={styles.missingText}>
                    <Text style={styles.priority}>{question.priority}</Text>
                    <Text style={styles.questionText}>{question.questionRu}</Text>
                    <Text style={styles.reasonText}>{question.reasonRu}</Text>
                  </View>
                  {onEditParam ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onEditParam(question.key, "add_param")}
                      style={styles.action}
                      testID={`ai-estimate-missing-input-add-${question.key}`}
                    >
                      <Text style={styles.actionText}>Добавить</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          {quantityTrace?.rows.length ? (
            <View style={styles.traceBox} testID="ai-estimate-quantity-trace">
              <Text style={styles.traceTitle}>Трасса количества</Text>
              {quantityTrace.rows.map((row) => (
                <View key={row.rowId} style={styles.traceRow}>
                  <Text style={styles.traceRowTitle}>{row.titleRu}</Text>
                  <Text style={styles.traceText}>{row.explanationRu}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.title}>Параметры расчета</Text>
      <View style={styles.grid}>
        {cards.map((card) => (
          <View
            key={card.key}
            style={[styles.chip, card.missing ? styles.missingChip : null]}
            testID={`editable-param-chip-${card.key}`}
          >
            <Text style={styles.label}>{card.labelRu}</Text>
            <Text style={styles.value}>{card.displayValueRu}</Text>
            <Text style={styles.source}>{card.sourceLabelRu}</Text>
            <View style={styles.actions}>
              {onEditParam ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onEditParam(card.key, card.missing ? "add_param" : "update_param")}
                  style={styles.action}
                  testID={`editable-param-edit-${card.key}`}
                >
                  <Text style={styles.actionText}>{card.missing ? "Добавить" : "Изменить"}</Text>
                </Pressable>
              ) : null}
              {onRemoveParam && !card.missing && card.source !== "catalog_default" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onRemoveParam(card.key)}
                  style={styles.action}
                  testID={`editable-param-remove-${card.key}`}
                >
                  <Text style={styles.actionText}>Убрать</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  passport: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    padding: 8,
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryCell: {
    minWidth: 112,
    flexGrow: 1,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 8,
    gap: 2,
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  missingList: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 8,
    gap: 6,
  },
  missingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  missingText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  priority: {
    color: "#C2410C",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
  },
  questionText: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  reasonText: {
    color: "#9A3412",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  traceBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    padding: 8,
    gap: 6,
  },
  traceTitle: {
    color: "#166534",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  traceRow: {
    gap: 2,
  },
  traceRowTitle: {
    color: "#14532D",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  traceText: {
    color: "#334155",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minWidth: 132,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    padding: 8,
    gap: 4,
  },
  missingChip: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
  },
  label: {
    color: "#3730A3",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  value: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  source: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  action: {
    minHeight: 28,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  actionText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
  },
});
