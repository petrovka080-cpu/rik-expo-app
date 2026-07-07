import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EstimateDraftRevisionDiff } from "../../../lib/estimate/estimateDraftRevisionContract";

export function EstimateRevisionDiff({
  diff,
}: {
  diff: EstimateDraftRevisionDiff | null;
}): React.ReactElement | null {
  if (!diff) return null;
  return (
    <View style={styles.panel} testID="estimate-revision-diff">
      <Text style={styles.title}>Изменения после пересчёта</Text>
      <Text style={styles.meta}>Изменились строки: {diff.changedRowsCount}</Text>
      {diff.changedParams.slice(0, 6).map((param) => (
        <Text key={param.key} style={styles.line} testID={`estimate-revision-diff-param-${param.key}`}>
          {param.key}: {String(param.before ?? "нет")} → {String(param.after ?? "нет")}
        </Text>
      ))}
      {diff.changedRows.slice(0, 6).map((row) => (
        <Text key={row.rowId} style={styles.line} testID={`estimate-revision-diff-row-${row.rowId}`}>
          {row.titleRu}: {row.beforeQuantity ?? "нет"} → {row.afterQuantity ?? "нет"} {row.unit}
        </Text>
      ))}
      <Text style={styles.meta} testID="estimate-revision-artifact-status">
        PDF и buyer handoff нужно пересоздать для текущей ревизии
      </Text>
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
