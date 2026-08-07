import type {
  ConsumerRepairAiDraft,
  ConsumerRepairItemType,
  ConsumerRepairSelectedWork,
} from "../../consumerRequests/consumerRequestTypes";
import { formatEstimateUnitLabel } from "../../ai/globalEstimate/formatEstimateUnitLabel";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import { createEstimateDraftRevision } from "../createEstimateDraftRevision";
import type { AiEstimateCreateDraftInput } from "./AiEstimateRuntimeContract";
import {
  ASPHALT_PROFESSIONAL_NAME_RU_V4,
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
} from "../v4/asphalt/asphaltV4Constants";
import { buildCanonicalElectricalConsumerRepairAiDraft } from "../v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft";
import { ELECTRICAL_CANONICAL_WORK_KEY } from "../v4/electrical/electricalCanonicalV1";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../v4/multiDomainReferencePassportsV4";
import { getRoadworksWaveAProductionRegistration } from "../v4/roadworks/roadworksWaveAProductionBinding";

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

function roadworksWaveARegistration(revision: EstimateDraftRevision) {
  return getRoadworksWaveAProductionRegistration(revision.matchedFamily)
    ?? getRoadworksWaveAProductionRegistration(revision.selectedTemplateId)
    ?? getRoadworksWaveAProductionRegistration(
      revision.boq.rows.find((row) => typeof row.sourceParameters?.requestedCatalogWorkId === "string")
        ?.sourceParameters?.requestedCatalogWorkId as string | undefined,
    );
}

function revisionTitleRu(revision: EstimateDraftRevision): string {
  if (isCapitalRenovationRevision(revision)) return "Капитальный ремонт квартиры";
  if (isAsphaltV4Revision(revision)) return ASPHALT_PROFESSIONAL_NAME_RU_V4;
  const roadworksRegistration = roadworksWaveARegistration(revision);
  if (roadworksRegistration) return roadworksRegistration.professionalNameRu;
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
  const roadworksRegistration = roadworksWaveARegistration(revision);
  if (roadworksRegistration) {
    return {
      selectedWorkKey: roadworksRegistration.workId,
      selectedWorkTitleRu: roadworksRegistration.professionalNameRu,
      selectedWorkCategoryKey: "roadworks",
      selectedWorkCategoryTitleRu: "Дорожные работы",
      selectedWorkRawInput: revision.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    };
  }
  const multiDomainPassport = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.find((passport) =>
    passport.professionalEstimatePassportId === revision.selectedTemplateId ||
    passport.catalogWorkId === revision.matchedFamily ||
    revision.boq.rows.some((row) =>
      row.sourceParameters?.professionalEstimatePassportId === passport.professionalEstimatePassportId
    )
  );
  if (multiDomainPassport) {
    return {
      selectedWorkKey: multiDomainPassport.catalogWorkId,
      selectedWorkTitleRu: multiDomainPassport.professionalNameRu,
      selectedWorkCategoryKey: multiDomainPassport.group,
      selectedWorkCategoryTitleRu: multiDomainPassport.group,
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
  const asphaltBasisSummary = revision.quantityBasis?.basisType === "reference"
    ? `Предварительный расчёт приведён на ${revision.quantityBasis.area_m2.toLocaleString("ru-RU")} м²; укажите площадь либо длину и ширину для пересчёта под объект.`
    : revision.quantityBasis
      ? `Расчётная площадь ${revision.quantityBasis.area_m2.toLocaleString("ru-RU")} м².`
      : "";
  return {
    titleRu,
    summaryRu: isAsphaltV4Revision(revision)
      ? revision.boq.rows.length > 0
        ? `${titleRu}: ${revision.boq.rows.length} измеримых позиций. ${asphaltBasisSummary} Стоимость не рассчитана: цены не заполнены.`
        : `${titleRu}: расчётная ведомость не сформирована.`
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
  const revision = createEstimateDraftRevision({
    estimateDraftId: input.estimateDraftId,
    rawInput: input.rawInput,
    selectedTemplateId: input.selectedTemplateId,
    selectedTemplateName: input.selectedTemplateName,
    selectedWorkKey: input.selectedWorkKey,
    city: input.city,
    currency: input.currency,
    countryCode: input.countryCode,
    paramOverrides: input.selectedRoadScope
      ? {
        selectedRoadScope: {
          value: input.selectedRoadScope,
          source: "user_input",
          sourceText: "Explicit road scope selection",
          lastChangedAt: input.createdAt ?? new Date().toISOString(),
        },
      }
      : undefined,
    createdAt: input.createdAt,
    source: "initial_prompt",
    revisionIndex: 1,
  });
  const isAsphaltV4 = revision.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    revision.matchedFamily === ASPHALT_WORK_ID_V4 ||
    revision.professionalWorkId === ASPHALT_WORK_ID_V4;
  if (
    revision.matchedFamily === ELECTRICAL_CANONICAL_WORK_KEY ||
    revision.professionalWorkId === ELECTRICAL_CANONICAL_WORK_KEY ||
    input.selectedWorkKey === ELECTRICAL_CANONICAL_WORK_KEY
  ) {
    return buildCanonicalElectricalConsumerRepairAiDraft({
      text: input.rawInput,
      countryCode: input.countryCode ?? "KG",
      city: input.city ?? "Bishkek",
      currency: input.currency ?? "KGS",
    });
  }
  if (revision.boq.rows.length === 0 && !isAsphaltV4) return null;
  return buildConsumerRepairDraftFromAiEstimateRevision(revision);
}
