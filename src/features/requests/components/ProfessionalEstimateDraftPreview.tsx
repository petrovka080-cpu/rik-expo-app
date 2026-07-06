import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairAiDraft } from "../../../lib/consumerRequests";

export type ProfessionalEstimateDraftPreviewProps = {
  draft: ConsumerRepairAiDraft | null | undefined;
};

export type ProfessionalEstimateDraftPreviewModel = {
  title: string;
  rowCount: number;
  materialRows: number;
  workRows: number;
  serviceRows: number;
  previewRows: string[];
};

export function buildProfessionalEstimateDraftPreviewModel(
  draft: ConsumerRepairAiDraft | null | undefined,
): ProfessionalEstimateDraftPreviewModel | null {
  if (!draft || draft.items.length === 0) return null;
  return {
    title: draft.titleRu,
    rowCount: draft.items.length,
    materialRows: draft.items.filter((item) => item.itemType === "material").length,
    workRows: draft.items.filter((item) => item.itemType === "work").length,
    serviceRows: draft.items.filter((item) => item.itemType === "service").length,
    previewRows: draft.items.slice(0, 6).map((item) => `${item.titleRu}: ${item.quantity} ${item.unitLabel ?? item.unit}`),
  };
}

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
      {model.previewRows.map((row) => (
        <Text key={row} style={styles.row} numberOfLines={2}>{row}</Text>
      ))}
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
