import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevisionDiff } from "../../../lib/estimate/estimateDraftRevisionContract";
import { formatEstimateUnitLabel } from "../../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import {
  aiEstimateRuLabelForParameter,
  aiEstimateRuUnitForParameter,
} from "../../../lib/estimate/aiEstimateRuParameterDictionary";

export function EstimateRevisionDiff({
  diff,
  parameters,
}: {
  diff: EstimateDraftRevisionDiff | null;
  parameters?: readonly {
    parameterId: string;
    label: string;
    unit: string | null;
  }[];
}): React.ReactElement | null {
  if (!diff) return null;
  const parameterPresentation = new Map(
    (parameters ?? []).map((parameter) => [parameter.parameterId, parameter] as const),
  );
  return (
    <View style={styles.panel} testID="estimate-revision-diff">
      <Text style={styles.title}>Изменения после пересчета</Text>
      <Text style={styles.meta}>Изменились строки: {diff.changedRowsCount}</Text>
      {diff.changedParams.slice(0, 6).map((param) => {
        const presentation = parameterPresentation.get(param.key);
        return (
          <Text key={param.key} style={styles.line} testID={`estimate-revision-diff-param-${param.key}`}>
            {aiEstimateRuLabelForParameter(param.key, presentation?.label)}: {String(param.before ?? "нет")} {"->"} {String(param.after ?? "нет")} {aiEstimateRuUnitForParameter(param.key, presentation?.unit)}
          </Text>
        );
      })}
      {diff.changedRows.slice(0, 6).map((row) => (
        <Text key={row.rowId} style={styles.line} testID={`estimate-revision-diff-row-${row.rowId}`}>
          {row.titleRu}: {row.beforeQuantity ?? "нет"} {"->"} {row.afterQuantity ?? "нет"} {formatEstimateUnitLabel(row.unit)}
        </Text>
      ))}
      {diff.changedRows.filter((row) =>
        row.beforeUnitPrice !== undefined || row.afterUnitPrice !== undefined
      ).slice(0, 6).map((row) => (
        <Text key={`${row.rowId}:price`} style={styles.line} testID={`estimate-revision-diff-price-${row.rowId}`}>
          Цена — {row.titleRu}: {row.beforeUnitPrice ?? "нет"} {"->"} {row.afterUnitPrice ?? "нет"} {row.currency ?? ""}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
    padding: 10,
    gap: 5,
  },
  title: {
    color: "#0C4A6E",
    fontSize: 13,
    fontWeight: "900",
  },
  meta: {
    color: "#0369A1",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  line: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
});
