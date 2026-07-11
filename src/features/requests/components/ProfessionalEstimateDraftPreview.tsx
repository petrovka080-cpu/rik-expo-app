import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairAiDraft } from "../../../lib/consumerRequests";
import { buildProfessionalEstimateDraftPreviewModel } from "../buildProfessionalEstimateDraftPreviewModel";
import { ProfessionalCostSummary } from "./ProfessionalCostSummary";
import { ProfessionalBoqMaterialCompletenessPanel } from "./ProfessionalBoqMaterialCompletenessPanel";
import { MaterialQuantityTracePanel } from "./MaterialQuantityTracePanel";
import { MaterialWasteAndPackagingPanel } from "./MaterialWasteAndPackagingPanel";
import { MaterialQuantityFormulaDrawer } from "./MaterialQuantityFormulaDrawer";

export type ProfessionalEstimateDraftPreviewProps = {
  draft: ConsumerRepairAiDraft | null | undefined;
};

export function ProfessionalEstimateDraftPreview({
  draft,
}: ProfessionalEstimateDraftPreviewProps): React.ReactElement | null {
  const model = buildProfessionalEstimateDraftPreviewModel(draft);
  if (!model) return null;
  return (
    <View style={styles.wrap} testID="inline-work-prompt-draft-preview">
      <Text style={styles.title}>{model.title}</Text>
      <Text style={styles.meta}>
        Rows: {model.rowCount} · materials: {model.materialRows} · works: {model.workRows} · services: {model.serviceRows}
      </Text>
      {model.previewRows.map((row, index) => (
        <Text key={`${row}-${index}`} style={styles.row} numberOfLines={2}>{row}</Text>
      ))}
      {model.costing ? (
        <ProfessionalCostSummary summary={model.costing.summary} lines={model.costing.lines.slice(0, 12)} />
      ) : null}
      {model.materialCompleteness ? (
        <ProfessionalBoqMaterialCompletenessPanel validation={model.materialCompleteness} />
      ) : null}
      <MaterialQuantityTracePanel lines={model.materialQuantityLines} />
      <MaterialWasteAndPackagingPanel lines={model.materialQuantityLines} />
      <MaterialQuantityFormulaDrawer lines={model.materialQuantityLines} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
    padding: 10,
  },
  title: {
    color: "#0C4A6E",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  meta: {
    color: "#0369A1",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  row: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
