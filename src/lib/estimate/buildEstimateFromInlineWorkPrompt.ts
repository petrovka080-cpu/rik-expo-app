import type { ConsumerRepairAiDraft, ConsumerRepairItemType, ConsumerRepairSelectedWork } from "../consumerRequests";
import { formatEstimateUnitLabel } from "../ai/globalEstimate";
import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
  getExpandedComplexWorkFamily,
  type ExpandedComplexBoqRow,
} from "../ai/expandedComplexWorks";
import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedRow,
} from "../ai/estimateTemplate10000/productionExpandedWorkCatalog10000";
import { parseInlineWorkEstimatePrompt, type InlineWorkPromptParseResult } from "../ai/parseInlineWorkEstimatePrompt";
import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";
import {
  buildDynamicProfessionalBoqDraftFromPrompt,
  shouldUseProfessionalBoqOpenWorldFallback,
} from "./buildProfessionalBoqDraft";

export type BuildEstimateFromInlineWorkPromptInput = {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedWorkKey?: string | null;
  selectedTemplateName?: string | null;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
};

export type InlineWorkPromptEstimateBuildResult = {
  parseResult: InlineWorkPromptParseResult;
  draft: ConsumerRepairAiDraft | null;
  canBuildPreliminaryEstimate: boolean;
  blockingReason?: string;
  pdfMappingValid: boolean;
  buyerHandoffMappingValid: boolean;
};

function itemTypeForExpandedRow(row: ExpandedComplexBoqRow): ConsumerRepairItemType {
  if (row.lineType === "material") return "material";
  if (row.lineType === "work") return "work";
  return "service";
}

function itemTypeForProductionRow(row: ProductionCompiledExpandedRow): ConsumerRepairItemType {
  if (row.lineType === "material") return "material";
  if (row.lineType === "work") return "work";
  return "service";
}

function selectedWorkForInlineMatch(parseResult: InlineWorkPromptParseResult): ConsumerRepairSelectedWork | undefined {
  const matched = parseResult.matchedTemplate;
  if (!matched) return undefined;
  return {
    selectedWorkKey: matched.family,
    selectedWorkTitleRu: matched.templateName,
    selectedWorkCategoryKey: matched.family,
    selectedWorkCategoryTitleRu: matched.family.replace(/_/g, " "),
    selectedWorkRawInput: parseResult.rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

function missingDataFromParse(parseResult: InlineWorkPromptParseResult): string[] {
  return [
    ...parseResult.missingInputs.map((input) => input.label),
    ...parseResult.assumptions.map((assumption) => assumption.reason),
  ].filter(Boolean);
}

function buildExpandedDraft(input: {
  parseResult: InlineWorkPromptParseResult;
  currency: string;
}): ConsumerRepairAiDraft | null {
  const familyId = input.parseResult.matchedTemplate?.family ?? null;
  if (!familyId || !getExpandedComplexWorkFamily(familyId)) return null;
  const estimate = calculateExpandedComplexEstimate({
    prompt: input.parseResult.rawInput,
    familyId,
  });
  if (!estimate) return null;
  const rows = [
    ...estimate.material_rows,
    ...estimate.work_rows,
    ...estimate.equipment_rows,
    ...estimate.service_rows,
  ];
  const snapshot = buildExpandedComplexSnapshot(estimate);
  const pdf = buildExpandedComplexPdfModel(snapshot);
  const buyer = buildExpandedComplexBuyerHandoff(snapshot);
  const buyerRows = [
    ...buyer.procurement_materials,
    ...buyer.equipment_to_purchase,
    ...buyer.delivery_procurement_services,
  ];

  return {
    titleRu: estimate.professionalNameRu,
    summaryRu: [
      `${estimate.professionalNameRu}. Предварительная профессиональная ведомость по управляемому калькулятору.`,
      `Строк: ${rows.length}; цены не придумываются.`,
      `PDF совпадает со снимком: ${pdf.rows_equal_snapshot ? "да" : "нет"}. Строк пакета закупки: ${buyerRows.length}.`,
    ].join(" "),
    repairType: estimate.work_family_id,
    selectedWork: selectedWorkForInlineMatch(input.parseResult),
    dangerousDiyBlocked: false,
    missingData: [
      ...estimate.missing_design_inputs,
      ...missingDataFromParse(input.parseResult),
    ],
    items: rows.map((row, rowIndex) => ({
      itemType: itemTypeForExpandedRow(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency: input.currency,
      source: "reference_price_book",
      category: row.group,
      sourceId: row.normSourceId,
      sourceLabel: "Источник цен не выбран",
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: `${row.code}: formula=${row.quantityFormula}; result=${row.quantity}; normSource=${row.normSourceId}`,
      sourceParameters: {
        ...estimate.input_parameters,
        ...row.sourceParameters,
        inlineWorkPrompt: true,
        inlineWorkPromptTemplateId: input.parseResult.matchedTemplate?.templateId ?? null,
        inlineWorkPromptFamilyId: estimate.work_family_id,
        inlineWorkPromptRowIndex: rowIndex,
        extractedParams: input.parseResult.extractedParams,
        expandedComplexCalculator: true,
        expandedComplexWorkFamilyId: estimate.work_family_id,
        expandedComplexProfessionalNameRu: estimate.professionalNameRu,
        expandedComplexLineType: row.lineType,
        includedInProcurement: row.includedInProcurement,
      },
      templateId: input.parseResult.matchedTemplate?.templateId ?? `${estimate.work_family_id}_preliminary_boq_expanded_complex_v1`,
      templateVersion: "1.0.0",
      normId: row.normId,
      normFamilyId: row.normFamilyId,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
      normVersion: row.normVersion,
      normReviewStatus: row.normReviewStatus,
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цен не выбран",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.materialKey ?? null,
      rateKey: `inline_expanded_${row.code}`,
    })),
  };
}

function primaryQuantity(parseResult: InlineWorkPromptParseResult): number | undefined {
  const params = parseResult.extractedParams;
  const candidates = [
    params.area_m2?.value,
    params.length_m?.value,
    params.volume_m3?.value,
    params.count?.value,
  ];
  const value = candidates.find((candidate): candidate is number => typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0);
  return value;
}

function buildProductionDraft(input: {
  parseResult: InlineWorkPromptParseResult;
  currency: string;
  countryCode?: string | null;
}): ConsumerRepairAiDraft | null {
  const templateId = input.parseResult.matchedTemplate?.templateId;
  if (!templateId) return null;
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport || passport.templateKind !== "base_10000") return null;
  const compiled = compileProductionExpandedEstimate10000({
    workKey: passport.workKey,
    quantity: primaryQuantity(input.parseResult),
    countryCode: input.countryCode ?? "KG",
  });

  return {
    titleRu: compiled.visibleNameRu,
    summaryRu: [
      `${compiled.visibleNameRu}. Предварительная профессиональная ведомость по каталогу 10000.`,
      `Строк: ${compiled.rows.length}; цены не придумываются.`,
    ].join(" "),
    repairType: compiled.workKey,
    selectedWork: selectedWorkForInlineMatch(input.parseResult),
    dangerousDiyBlocked: false,
    missingData: missingDataFromParse(input.parseResult),
    items: compiled.rows.map((row, rowIndex) => ({
      itemType: itemTypeForProductionRow(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.displayUnit || row.unit,
      unitLabel: formatEstimateUnitLabel(row.displayUnit || row.unit),
      unitPrice: null,
      currency: input.currency,
      source: "reference_price_book",
      category: row.section,
      sourceId: row.normSourceId,
      sourceLabel: "Источник цен не выбран",
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: row.calculationTrace,
      sourceParameters: {
        ...row.sourceParameters,
        inlineWorkPrompt: true,
        inlineWorkPromptTemplateId: templateId,
        inlineWorkPromptFamilyId: passport.familyId,
        inlineWorkPromptRowIndex: rowIndex,
        extractedParams: input.parseResult.extractedParams,
      },
      templateId,
      templateVersion: row.templateVersion,
      normId: row.normId,
      normFamilyId: row.normFamilyId,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
      normVersion: row.normVersion,
      normReviewStatus: row.normReviewStatus,
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цен не выбран",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: null,
      rateKey: `inline_10000_${row.rowCode}`,
    })),
  };
}

export function buildEstimateFromInlineWorkPrompt(
  input: BuildEstimateFromInlineWorkPromptInput,
): InlineWorkPromptEstimateBuildResult {
  const parseResult = parseInlineWorkEstimatePrompt(input);
  const currency = input.currency ?? "KGS";
  const fallbackDraft = shouldUseProfessionalBoqOpenWorldFallback(input.rawInput)
    ? buildDynamicProfessionalBoqDraftFromPrompt({ prompt: input.rawInput, currency })
    : null;

  if (!parseResult.canBuildPreliminaryEstimate && !fallbackDraft) {
    return {
      parseResult,
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: parseResult.blockingReason,
      pdfMappingValid: false,
      buyerHandoffMappingValid: false,
    };
  }

  const draft =
    buildExpandedDraft({ parseResult, currency }) ??
    buildProductionDraft({ parseResult, currency, countryCode: input.countryCode }) ??
    fallbackDraft;

  return {
    parseResult,
    draft,
    canBuildPreliminaryEstimate: Boolean(draft && draft.items.length > 0),
    blockingReason: draft && draft.items.length > 0 ? undefined : "draft_empty",
    pdfMappingValid: Boolean(draft && draft.items.length > 0),
    buyerHandoffMappingValid: Boolean(draft && draft.items.some((item) => item.itemType !== "work")),
  };
}
