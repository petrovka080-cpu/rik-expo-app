import type { ConsumerRepairAiDraft, ConsumerRepairItemType, ConsumerRepairSelectedWork } from "../../consumerRequests";
import { formatEstimateUnitLabel } from "../../ai/globalEstimate";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import { createAiEstimateRuntime } from "./createAiEstimateRuntime";
import type { AiEstimateCreateDraftInput } from "./AiEstimateRuntimeContract";

function itemTypeForRow(row: ProfessionalBoqRow): ConsumerRepairItemType {
  if (row.rowType === "material") return "material";
  if (row.rowType === "work" || row.rowType === "labor") return "work";
  if (row.rowType === "document") return "document";
  if (row.rowType === "other") return "other";
  return "service";
}

function selectedWorkFromRevision(revision: EstimateDraftRevision): ConsumerRepairSelectedWork | undefined {
  if (!revision.selectedTemplateId) return undefined;
  return {
    selectedWorkKey: revision.selectedTemplateId,
    selectedWorkTitleRu: revision.matchedFamily || revision.selectedTemplateId,
    selectedWorkCategoryKey: revision.matchedFamily || revision.selectedTemplateId,
    selectedWorkCategoryTitleRu: revision.matchedFamily || revision.selectedTemplateId,
    selectedWorkRawInput: revision.rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

export function buildConsumerRepairDraftFromAiEstimateRevision(
  revision: EstimateDraftRevision,
): ConsumerRepairAiDraft {
  return {
    titleRu: revision.matchedFamily || revision.selectedTemplateId || "AI estimate",
    summaryRu: `${revision.boq.rows.length} rows; revision=${revision.revisionId}`,
    repairType: revision.matchedFamily || revision.selectedTemplateId || "ai_estimate",
    selectedWork: selectedWorkFromRevision(revision),
    dangerousDiyBlocked: false,
    missingData: revision.missingInputs.map((input) => input.label),
    items: revision.boq.rows.map((row) => ({
      itemType: itemTypeForRow(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: row.unitLabel ?? formatEstimateUnitLabel(row.unit),
      unitPrice: row.unitPrice,
      currency: row.currency,
      source: "reference_price_book",
      category: row.category,
      sourceId: row.sourceId,
      sourceLabel: row.sourceLabel,
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: row.calculationTrace,
      sourceParameters: row.sourceParameters,
      templateId: row.templateId ?? revision.selectedTemplateId,
      templateVersion: row.templateVersion,
      normId: row.normId,
      normFamilyId: row.normFamilyId,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
      normVersion: row.normVersion,
      normReviewStatus: row.normReviewStatus,
      priceStatus: row.priceStatus as ConsumerRepairAiDraft["items"][number]["priceStatus"],
      priceSource: row.priceSource as ConsumerRepairAiDraft["items"][number]["priceSource"],
      priceSourceId: row.priceSourceId,
      priceSourceLabel: row.priceSourceLabel,
      materialKey: row.materialKey,
      rateKey: row.rateKey,
      confidence: "medium",
      addedBy: "ai",
    })),
  };
}

export function buildConsumerRepairDraftFromAiEstimateRuntime(
  input: AiEstimateCreateDraftInput,
): ConsumerRepairAiDraft | null {
  const runtime = createAiEstimateRuntime();
  const { revision } = runtime.createDraft(input);
  if (revision.boq.rows.length === 0) return null;
  return buildConsumerRepairDraftFromAiEstimateRevision(revision);
}
