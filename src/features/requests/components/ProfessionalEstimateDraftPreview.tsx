import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ConsumerRepairAiDraft } from "../../../lib/consumerRequests";
import { buildProfessionalBoqRowsFromConsumerDraft } from "../../../lib/estimate/createEstimateDraftRevision";
import { calculateProfessionalCostForDraftRows } from "../../../lib/estimate/professionalCostCalculator";
import { attachProfessionalMaterialQuantityLines } from "../../../lib/estimate/professionalMaterialQuantityCalculator";
import { materialQuantityLinesFromRows } from "../../../lib/estimate/professionalMaterialQuantityTrace";
import { ProfessionalCostSummary } from "./ProfessionalCostSummary";
import {
  buildProfessionalBoqMaterialCompletenessValidationForRows,
  ProfessionalBoqMaterialCompletenessPanel,
} from "./ProfessionalBoqMaterialCompletenessPanel";
import { MaterialQuantityTracePanel } from "./MaterialQuantityTracePanel";
import { MaterialWasteAndPackagingPanel } from "./MaterialWasteAndPackagingPanel";
import { MaterialQuantityFormulaDrawer } from "./MaterialQuantityFormulaDrawer";

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
  costing: ReturnType<typeof calculateProfessionalCostForDraftRows> | null;
  materialCompleteness: ReturnType<typeof buildProfessionalBoqMaterialCompletenessValidationForRows> | null;
  materialQuantityLines: ReturnType<typeof materialQuantityLinesFromRows>;
};

function buildDraftCosting(draft: ConsumerRepairAiDraft): ReturnType<typeof calculateProfessionalCostForDraftRows> | null {
  const rows = buildProfessionalBoqRowsFromConsumerDraft(draft).filter((row) =>
    row.quantity > 0 && row.rowType !== "document" && row.rowType !== "other"
  );
  if (rows.length === 0) return null;
  const firstTemplateId = rows.find((row) => row.templateId?.trim())?.templateId?.trim();
  const firstFamily = rows.find((row) => row.normFamilyId?.trim())?.normFamilyId?.trim();
  return calculateProfessionalCostForDraftRows({
    templateId: firstTemplateId ?? draft.selectedWork?.selectedWorkKey ?? "consumer_repair_draft",
    family: firstFamily ?? draft.selectedWork?.selectedWorkKey ?? draft.repairType,
    rows,
  });
}

export function buildProfessionalEstimateDraftPreviewModel(
  draft: ConsumerRepairAiDraft | null | undefined,
): ProfessionalEstimateDraftPreviewModel | null {
  if (!draft || draft.items.length === 0) return null;
  const costing = buildDraftCosting(draft);
  const rawBoqRows = buildProfessionalBoqRowsFromConsumerDraft(draft);
  const boqRows = attachProfessionalMaterialQuantityLines({
    rows: rawBoqRows,
    templateId: rawBoqRows.find((row) => row.templateId?.trim())?.templateId?.trim() ?? draft.selectedWork?.selectedWorkKey ?? draft.repairType,
    family: draft.selectedWork?.selectedWorkKey ?? draft.repairType,
  });
  const templateId = boqRows.find((row) => row.templateId?.trim())?.templateId?.trim() ?? draft.selectedWork?.selectedWorkKey ?? draft.repairType;
  const family = draft.selectedWork?.selectedWorkKey ?? draft.repairType;
  const materialCompleteness = boqRows.length > 0
    ? buildProfessionalBoqMaterialCompletenessValidationForRows({
      templateId,
      family,
      prompt: draft.selectedWork?.selectedWorkRawInput ?? draft.titleRu,
      rows: boqRows,
    })
    : null;
  return {
    title: draft.titleRu,
    rowCount: draft.items.length,
    materialRows: draft.items.filter((item) => item.itemType === "material").length,
    workRows: draft.items.filter((item) => item.itemType === "work").length,
    serviceRows: draft.items.filter((item) => item.itemType === "service").length,
    previewRows: draft.items.slice(0, 6).map((item) => `${item.titleRu}: ${item.quantity} ${item.unitLabel ?? item.unit}`),
    costing,
    materialCompleteness,
    materialQuantityLines: materialQuantityLinesFromRows({ rows: boqRows, templateId, family }),
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
