import type { ConsumerRepairAiDraft, ConsumerRepairItemType, ConsumerRepairSelectedWork } from "../../consumerRequests";
import { formatEstimateUnitLabel } from "../../ai/globalEstimate";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import { createAiEstimateRuntime } from "./createAiEstimateRuntime";
import type { AiEstimateCreateDraftInput } from "./AiEstimateRuntimeContract";

const CAPITAL_RENOVATION_WORK_KEY = "apartment_capital_renovation";
const CAPITAL_RENOVATION_TEMPLATE_ID = "capital_renovation_professional_calculator_v1";

function itemTypeForRow(row: ProfessionalBoqRow): ConsumerRepairItemType {
  if (row.rowType === "material") return "material";
  if (row.rowType === "work" || row.rowType === "labor") return "work";
  if (row.rowType === "document") return "document";
  if (row.rowType === "other") return "other";
  return "service";
}

function isCapitalRenovationRevision(revision: EstimateDraftRevision): boolean {
  return revision.matchedFamily === CAPITAL_RENOVATION_WORK_KEY ||
    revision.selectedTemplateId === CAPITAL_RENOVATION_TEMPLATE_ID;
}

function revisionTitleRu(revision: EstimateDraftRevision): string {
  if (isCapitalRenovationRevision(revision)) return "Капитальный ремонт квартиры";
  return revision.matchedFamily || revision.selectedTemplateId || "AI estimate";
}

function revisionRepairType(revision: EstimateDraftRevision): string {
  if (isCapitalRenovationRevision(revision)) return CAPITAL_RENOVATION_WORK_KEY;
  return revision.matchedFamily || revision.selectedTemplateId || "ai_estimate";
}

function selectedWorkFromRevision(revision: EstimateDraftRevision): ConsumerRepairSelectedWork | undefined {
  if (isCapitalRenovationRevision(revision)) {
    return {
      selectedWorkKey: CAPITAL_RENOVATION_WORK_KEY,
      selectedWorkTitleRu: "Капитальный ремонт квартиры",
      selectedWorkCategoryKey: "special_repair",
      selectedWorkCategoryTitleRu: "Ремонт",
      selectedWorkRawInput: revision.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    };
  }
  if (!revision.selectedTemplateId) return undefined;
  const selectedWorkKey = revision.selectedTemplateId.endsWith("_professional_estimate_template_v1") && revision.matchedFamily
    ? revision.matchedFamily
    : revision.selectedTemplateId;
  return {
    selectedWorkKey,
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
  const titleRu = revisionTitleRu(revision);
  return {
    titleRu,
    summaryRu: `${titleRu}: строк BOQ ${revision.boq.rows.length}; revision=${revision.revisionId}`,
    repairType: revisionRepairType(revision),
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
