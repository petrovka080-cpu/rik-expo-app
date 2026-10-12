import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevisionDiff } from "../../../lib/estimate/estimateDraftRevisionContract";
import { formatEstimateUnitLabel } from "../../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import { canonicalEstimateParameterChoiceLabelRu } from "../../../lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import { compareFormulaGraphDecimals } from "../../../lib/estimate/backendPlatform/formulaGraph";
import {
  aiEstimateRuLabelForParameter,
  aiEstimateRuUnitForParameter,
} from "../../../lib/estimate/aiEstimateRuParameterDictionary";

const rowStateLabel = (state: NonNullable<EstimateDraftRevisionDiff["changedRows"][number]["beforeState"]>): string =>
  state === "NEEDS_CLARIFICATION" ? "требует уточнения" : state === "CALCULATED" ? "рассчитано" : "нет позиции";

export function EstimateRevisionDiff({
  diff,
  parameters,
  scopeRowIds,
}: {
  diff: EstimateDraftRevisionDiff | null;
  parameters?: readonly {
    parameterId: string;
    label: string;
    unit: string | null;
    valueType?: string;
  }[];
  /** Verified semantic requirements from the current estimate presentation.
   * They describe stages, and have no physical quantity or measurement unit. */
  scopeRowIds?: readonly string[];
}): React.ReactElement | null {
  if (!diff) return null;
  const parameterPresentation = new Map(
    (parameters ?? []).map((parameter) => [parameter.parameterId, parameter] as const),
  );
  const scopeIds=new Set(scopeRowIds??[]);
  const visibleChanges = diff.changedParams.filter(param => {
    const presentation = parameterPresentation.get(param.key);
    if (parameters != null && !presentation) return false;
    if (!aiEstimateRuLabelForParameter(param.key, presentation?.label).trim()) return false;
    if (String(param.before) === String(param.after)) return false;
    if (presentation?.valueType === 'number' && param.before != null && param.after != null) {
      try { return compareFormulaGraphDecimals(String(param.before), String(param.after)) !== 0; }
      catch { return true; }
    }
    return true;
  });
  return (
    <View style={styles.panel} testID="estimate-revision-diff">
      <Text style={styles.title}>Изменения после пересчета</Text>
      <Text style={styles.meta}>Изменились строки: {diff.changedRowsCount}</Text>
      {visibleChanges.slice(0, 6).map((param) => {
        const presentation = parameterPresentation.get(param.key);
        return (
          <Text key={param.key} style={styles.line} testID={`estimate-revision-diff-param-${param.key}`}>
            {aiEstimateRuLabelForParameter(param.key, presentation?.label)}: {param.before == null ? "нет" : canonicalEstimateParameterChoiceLabelRu(param.key, param.before)} {"->"} {param.after == null ? "нет" : canonicalEstimateParameterChoiceLabelRu(param.key, param.after)} {aiEstimateRuUnitForParameter(param.key, presentation?.unit)}
          </Text>
        );
      })}
      {diff.changedRows.slice(0, 6).map((row) => (
        <Text key={row.rowId} style={styles.line} testID={`estimate-revision-diff-row-${row.rowId}`}>
          {row.beforeTitleRu ? `${row.beforeTitleRu} → ${row.titleRu}` : row.titleRu}: {scopeIds.has(row.rowId)
            ? row.beforeState==='ABSENT'?'этап добавлен в состав сметы':row.afterState==='ABSENT'?'этап убран из состава сметы':'состав этапа изменён'
            : <>{row.beforeQuantity ?? (row.beforeState === "NEEDS_CLARIFICATION" ? "не рассчитано" : "нет")} {"->"} {row.afterQuantity ?? (row.afterState === "NEEDS_CLARIFICATION" ? "не рассчитано" : "нет")} {formatEstimateUnitLabel(row.unit)}
              {row.beforeState && row.afterState ? ` (${rowStateLabel(row.beforeState)} → ${rowStateLabel(row.afterState)})` : ""}</>}
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
