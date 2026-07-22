import type { ConsumerRepairAiDraft, ConsumerRepairItemType, ConsumerRepairSelectedWork } from "../../consumerRequests";
import { formatEstimateUnitLabel } from "../../ai/globalEstimate";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import { createAiEstimateRuntime } from "./createAiEstimateRuntime";
import type { AiEstimateCreateDraftInput } from "./AiEstimateRuntimeContract";
import {
  ASPHALT_PROFESSIONAL_NAME_RU_V4,
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
} from "../v4/asphalt";

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

function isAsphaltV4Revision(revision: EstimateDraftRevision): boolean {
  return revision.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    revision.matchedFamily === ASPHALT_WORK_ID_V4 ||
    revision.professionalWorkId === ASPHALT_WORK_ID_V4;
}

function revisionTitleRu(revision: EstimateDraftRevision): string {
  if (isCapitalRenovationRevision(revision)) return "Капитальный ремонт квартиры";
  if (isAsphaltV4Revision(revision)) return ASPHALT_PROFESSIONAL_NAME_RU_V4;
  return revision.matchedFamily || revision.selectedTemplateId || "AI estimate";
}

function revisionRepairType(revision: EstimateDraftRevision): string {
  if (isCapitalRenovationRevision(revision)) return CAPITAL_RENOVATION_WORK_KEY;
  if (isAsphaltV4Revision(revision)) return ASPHALT_WORK_ID_V4;
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
  if (isAsphaltV4Revision(revision)) {
    return {
      selectedWorkKey: ASPHALT_WORK_ID_V4,
      selectedWorkTitleRu: ASPHALT_PROFESSIONAL_NAME_RU_V4,
      selectedWorkCategoryKey: "road_construction",
      selectedWorkCategoryTitleRu: "Дорожные работы",
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
    summaryRu: isAsphaltV4Revision(revision)
      ? revision.boq.rows.length > 0
        ? `${titleRu}: ${revision.boq.rows.length} измеримых позиций. Стоимость не рассчитана: цены не заполнены.`
        : `${titleRu}: предварительный состав материалов и работ показан сразу; количества будут рассчитаны после уточнения конструкции слоёв.`
      : `${titleRu}: строк BOQ ${revision.boq.rows.length}.`,
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
  const isAsphaltV4 = revision.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    revision.matchedFamily === ASPHALT_WORK_ID_V4 ||
    revision.professionalWorkId === ASPHALT_WORK_ID_V4;
  if (revision.boq.rows.length === 0 && !isAsphaltV4) return null;
  return buildConsumerRepairDraftFromAiEstimateRevision(revision);
}
