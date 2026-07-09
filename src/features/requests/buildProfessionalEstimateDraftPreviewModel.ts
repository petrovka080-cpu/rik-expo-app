import type { ConsumerRepairAiDraft } from "../../lib/consumerRequests";
import { buildProfessionalBoqRowsFromRuntimeDraft } from "../../lib/estimate/runtime/buildProfessionalBoqRowsFromRuntimeDraft";
import { calculateProfessionalCostForDraftRows } from "../../lib/estimate/professionalCostCalculator";
import { attachProfessionalMaterialQuantityLines } from "../../lib/estimate/professionalMaterialQuantityCalculator";
import { materialQuantityLinesFromRows } from "../../lib/estimate/professionalMaterialQuantityTrace";
import { buildProfessionalBoqMaterialCompletenessValidationForRows } from "./components/ProfessionalBoqMaterialCompletenessPanel";

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
  const rows = buildProfessionalBoqRowsFromRuntimeDraft(draft).filter((row) =>
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
  const rawBoqRows = buildProfessionalBoqRowsFromRuntimeDraft(draft);
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
