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
import {
  calculateCapitalRenovationGeometry,
  defaultCapitalRenovationInput,
} from "../../features/estimates/calculator/families/capitalRenovationGeometry";
import {
  CAPITAL_RENOVATION_REQUIRED_MISSING_PARAMETERS,
  capitalRenovationFormulaTrace,
  capitalRenovationQuantitySummary,
} from "../../features/estimates/calculator/families/capitalRenovationCalculator";
import {
  buildCapitalRenovationRows,
  type CapitalRenovationEstimateRow,
} from "../../features/estimates/calculator/families/capitalRenovationRecipes";
import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport } from "./workPassportContract";
import {
  applyProfessionalBoqRuntimeContract,
  buildDynamicProfessionalBoqDraftFromPrompt,
  buildProfessionalTemplateDraftFromPrompt,
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
  paramOverrides?: Record<string, { value: unknown; source?: string | null }>;
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

function itemTypeForPassportRow(row: ProfessionalBoqRecipeRow): ConsumerRepairItemType {
  if (row.rowType === "material") return "material";
  if (row.rowType === "work" || row.rowType === "labor") return "work";
  return "service";
}

function itemTypeForCapitalRenovationRow(row: CapitalRenovationEstimateRow): ConsumerRepairItemType {
  if (row.lineType === "material") return "material";
  if (row.lineType === "work") return "work";
  return "service";
}

const CAPITAL_RENOVATION_WORK_KEY = "apartment_capital_renovation";
const CAPITAL_RENOVATION_TEMPLATE_ID = "capital_renovation_professional_calculator_v1";
const CAPITAL_RENOVATION_TEMPLATE_GROUP_ID = "apartment_capital_renovation_project_template_group_v1";
const CAPITAL_RENOVATION_SELECTED_IDS = new Set([
  CAPITAL_RENOVATION_WORK_KEY,
  CAPITAL_RENOVATION_TEMPLATE_ID,
  CAPITAL_RENOVATION_TEMPLATE_GROUP_ID,
]);
const CAPITAL_RENOVATION_PROMPT_PATTERN =
  /(?:кап(?:итальн[\p{L}\p{N}_-]*)?\s*ремонт[\p{L}\p{N}_-]*\s+квартир[\p{L}\p{N}_-]*|капремонт[\p{L}\p{N}_-]*\s+квартир[\p{L}\p{N}_-]*|ремонт[\p{L}\p{N}_-]*\s+квартир[\p{L}\p{N}_-]*|apartment\s+capital\s+renovation)/iu;

function extractedNumber(parseResult: InlineWorkPromptParseResult, key: string): number | null {
  const value = parseResult.extractedParams[key]?.value;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function overrideNumber(input: BuildEstimateFromInlineWorkPromptInput, key: string): number | null {
  const override = input.paramOverrides?.[key];
  if (!override || override.source === "derived") return null;
  const value = typeof override.value === "number"
    ? override.value
    : typeof override.value === "string"
      ? Number(override.value.replace(",", "."))
      : null;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function calculatorNumber(
  input: BuildEstimateFromInlineWorkPromptInput,
  parseResult: InlineWorkPromptParseResult,
  key: string,
): number | null {
  return overrideNumber(input, key) ?? extractedNumber(parseResult, key);
}

function shouldBuildCapitalRenovationDraft(
  input: BuildEstimateFromInlineWorkPromptInput,
  parseResult: InlineWorkPromptParseResult,
): boolean {
  const selectedIds = [
    input.selectedTemplateId?.trim(),
    input.selectedWorkKey?.trim(),
    parseResult.matchedTemplate?.templateId,
    parseResult.matchedTemplate?.family,
  ].filter((value): value is string => Boolean(value));
  return selectedIds.some((value) => CAPITAL_RENOVATION_SELECTED_IDS.has(value)) ||
    CAPITAL_RENOVATION_PROMPT_PATTERN.test(parseResult.rawInput);
}

function capitalRenovationSelectedWork(rawInput: string): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: CAPITAL_RENOVATION_WORK_KEY,
    selectedWorkTitleRu: "Капитальный ремонт квартиры",
    selectedWorkCategoryKey: "special_repair",
    selectedWorkCategoryTitleRu: "Ремонт",
    selectedWorkRawInput: rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
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

function buildCapitalRenovationDraft(input: {
  sourceInput: BuildEstimateFromInlineWorkPromptInput;
  parseResult: InlineWorkPromptParseResult;
  currency: string;
}): ConsumerRepairAiDraft | null {
  if (!shouldBuildCapitalRenovationDraft(input.sourceInput, input.parseResult)) return null;
  const calculatorInput = defaultCapitalRenovationInput({
    matched: true,
    areaM2: calculatorNumber(input.sourceInput, input.parseResult, "area_m2"),
    ceilingHeightM: calculatorNumber(input.sourceInput, input.parseResult, "ceiling_height_m"),
    bathroomsCount: calculatorNumber(input.sourceInput, input.parseResult, "bathrooms_count"),
  });
  Object.assign(calculatorInput, {
    ceilingAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "ceiling_area_m2"),
    bathroomTotalFloorAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "bathroom_floor_area_m2"),
    dryFloorAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "dry_floor_area_m2"),
    grossWallAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "gross_wall_area_m2"),
    netWallAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "net_wall_area_m2"),
    bathroomWallTileAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "bathroom_wall_tile_area_m2"),
    paintWallAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "paint_wall_area_m2"),
    paintTotalAreaM2: calculatorNumber(input.sourceInput, input.parseResult, "paint_total_area_m2"),
    baseboardLm: calculatorNumber(input.sourceInput, input.parseResult, "baseboard_lm"),
    doorsCount: calculatorNumber(input.sourceInput, input.parseResult, "doors_count"),
    electricalPoints: calculatorNumber(input.sourceInput, input.parseResult, "electrical_points"),
    waterPoints: calculatorNumber(input.sourceInput, input.parseResult, "water_points"),
    sewerPoints: calculatorNumber(input.sourceInput, input.parseResult, "sewer_points"),
    wasteVolumeM3: calculatorNumber(input.sourceInput, input.parseResult, "waste_volume_m3"),
  });
  const geometry = calculateCapitalRenovationGeometry(calculatorInput);
  const rows = buildCapitalRenovationRows(geometry);
  const derived = capitalRenovationQuantitySummary(geometry);
  const selectedWork = capitalRenovationSelectedWork(input.parseResult.rawInput);

  return {
    titleRu: "Капитальный ремонт квартиры",
    summaryRu: [
      "Предварительный расчет по допущениям. Требуется уточнение.",
      `Площадь: ${geometry.areaM2} м2; потолок: ${geometry.ceilingHeightM} м; санузлы: ${geometry.bathroomsCount}.`,
      "Полный итог не рассчитан: цены не заполнены, источник цен не выбран.",
    ].join(" "),
    repairType: CAPITAL_RENOVATION_WORK_KEY,
    selectedWork,
    dangerousDiyBlocked: false,
    missingData: [...CAPITAL_RENOVATION_REQUIRED_MISSING_PARAMETERS],
    items: rows.map((row, rowIndex) => ({
      itemType: itemTypeForCapitalRenovationRow(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency: input.currency,
      source: "reference_price_book",
      category: row.groupId,
      sourceId: "src_professional_norm_pack_capital_renovation_calculator_v1",
      sourceLabel: "Источник цены не выбран",
      formulaId: `capital_renovation_${row.code}_formula_v1`,
      quantityFormula: row.formula,
      calculationTrace: capitalRenovationFormulaTrace(row, geometry),
      sourceParameters: {
        rowCode: row.code,
        capitalRenovationCalculator: true,
        capitalRenovationGroupId: row.groupId,
        capitalRenovationGroupTitle: row.groupTitle,
        capitalRenovationLineType: row.lineType,
        capitalRenovationRowIndex: rowIndex,
        includedInProcurement: row.includedInProcurement,
        inlineWorkPrompt: true,
        inlineWorkPromptTemplateId: CAPITAL_RENOVATION_TEMPLATE_ID,
        inlineWorkPromptFamilyId: CAPITAL_RENOVATION_WORK_KEY,
        inlineWorkPromptRowIndex: rowIndex,
        extractedParams: input.parseResult.extractedParams,
        ...derived,
      },
      templateId: CAPITAL_RENOVATION_TEMPLATE_ID,
      templateVersion: "1.0.0",
      normId: `norm:capital_renovation:${row.code}:v1`,
      normFamilyId: `norm_family:capital_renovation:${row.groupId}`,
      normSourceId: "src_professional_norm_pack_capital_renovation_calculator_v1",
      normSourceTitle: "Профессиональные нормы капитального ремонта квартиры: предварительный расчет по допущениям",
      normVersion: "2026.07.03",
      normReviewStatus: "quantity_engineering_reviewed",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цены не выбран",
      costConfidence: "missing",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.materialKey ?? null,
      rateKey: row.materialKey ? `capital_renovation_${row.materialKey}` : null,
    })),
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
      unit: row.unit,
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

function passportRuntimeQuantity(row: ProfessionalBoqRecipeRow, index: number, baseQuantity: number): number {
  const rawUnit = row.sourceUnit.toLowerCase();
  if (rawUnit === "trip") return Math.max(1, Math.ceil(baseQuantity / 120));
  if (rawUnit === "shift") return Math.max(1, Math.ceil(baseQuantity / 80));
  if (rawUnit === "set") return Math.max(1, Math.ceil(baseQuantity / 10));
  if (rawUnit === "pcs" || rawUnit === "piece") return Math.max(1, Math.ceil(baseQuantity / 10));
  if (rawUnit === "kg") return Math.max(1, Math.round(baseQuantity * (4 + index % 5) * 100) / 100);
  if (rawUnit === "ton" || rawUnit === "t") return Math.max(1, Math.round(baseQuantity / 20 * 100) / 100);
  return Math.max(0.01, Math.round(baseQuantity * (1 + (index % 7) * 0.03) * 100) / 100);
}

function buildPassportBackedDraft(input: {
  parseResult: InlineWorkPromptParseResult;
  currency: string;
}): ConsumerRepairAiDraft | null {
  const templateId = input.parseResult.matchedTemplate?.templateId;
  if (!templateId) return null;
  const passport: ProfessionalWorkPassport | null = buildProfessionalWorkPassport(templateId);
  if (!passport) return null;
  const baseQuantity = primaryQuantity(input.parseResult) ?? 1;
  const selectedWork = selectedWorkForInlineMatch(input.parseResult);

  return {
    titleRu: passport.localizedNameRu,
    summaryRu: [
      `${passport.localizedNameRu}. Предварительная профессиональная ведомость из распознанного паспорта работ.`,
      `Строк: ${passport.boqRecipe.allRows.length}; цены не придумываются.`,
    ].join(" "),
    repairType: passport.workKey,
    selectedWork,
    dangerousDiyBlocked: false,
    missingData: missingDataFromParse(input.parseResult),
    items: passport.boqRecipe.allRows.map((row, rowIndex) => {
      const quantity = passportRuntimeQuantity(row, rowIndex, baseQuantity);
      return {
        itemType: itemTypeForPassportRow(row),
        titleRu: row.titleRu,
        quantity,
        unit: row.sourceUnit,
        unitLabel: formatEstimateUnitLabel(row.sourceUnit),
        unitPrice: null,
        currency: input.currency,
        source: "reference_price_book",
        category: row.rowType,
        sourceId: row.normSourceId,
        sourceLabel: "Источник цен не выбран",
        formulaId: row.formulaId,
        quantityFormula: row.quantityFormula,
        calculationTrace: `${row.calculationTraceTemplate}; naturalLanguageTemplate=${templateId}; preliminaryQuantity=${quantity} ${row.sourceUnit}`,
        sourceParameters: {
          inlineWorkPrompt: true,
          inlineWorkPromptTemplateId: templateId,
          inlineWorkPromptFamilyId: passport.familyId,
          inlineWorkPromptRowIndex: rowIndex,
          extractedParams: input.parseResult.extractedParams,
          passportBackedNaturalLanguageIngress: true,
          templateId: passport.templateId,
          workKey: passport.workKey,
          familyId: passport.familyId,
          normSourceId: row.normSourceId,
          normSourceTitle: row.normSourceTitle,
          normVersion: row.normVersion,
          normReviewStatus: row.normReviewStatus,
          sourceApplicabilityStatus: "natural_language_resolver_selected_exact_passport",
        },
        templateId,
        templateVersion: passport.sources.normVersion,
        normId: row.normId,
        normFamilyId: row.normFamilyId,
        normSourceId: row.normSourceId,
        normSourceTitle: row.normSourceTitle,
        normVersion: row.normVersion,
        normReviewStatus: row.normReviewStatus,
        priceStatus: row.priceStatus,
        priceSource: "missing",
        priceSourceId: null,
        priceSourceLabel: "Источник цен не выбран",
        costConfidence: "missing",
        confidence: "medium",
        addedBy: "ai",
        materialKey: row.rowType === "material" ? row.rowId : null,
        rateKey: `passport_${row.rowId}`,
      };
    }),
  };
}

function shouldPreferSpecificProfessionalFallback(draft: ConsumerRepairAiDraft | null): boolean {
  const selectedWorkKey = draft?.selectedWork?.selectedWorkKey;
  return selectedWorkKey === "diamond_core_drilling_concrete" ||
    selectedWorkKey === "dynamic_fencing_estimate";
}

export function buildEstimateFromInlineWorkPrompt(
  input: BuildEstimateFromInlineWorkPromptInput,
): InlineWorkPromptEstimateBuildResult {
  const parseResult = parseInlineWorkEstimatePrompt(input);
  const currency = input.currency ?? "KGS";
  const fallbackDraft = shouldUseProfessionalBoqOpenWorldFallback(input.rawInput)
    ? buildDynamicProfessionalBoqDraftFromPrompt({ prompt: input.rawInput, currency })
    : null;
  const exactProfessionalTemplateDraft = !input.selectedTemplateId && !input.selectedWorkKey
    ? buildProfessionalTemplateDraftFromPrompt({ prompt: input.rawInput, currency })
    : null;
  const passportBackedDraft = buildPassportBackedDraft({
    parseResult,
    currency,
  });
  const capitalRenovationDraft = buildCapitalRenovationDraft({
    sourceInput: input,
    parseResult,
    currency,
  });

  if (!parseResult.canBuildPreliminaryEstimate && !fallbackDraft && !capitalRenovationDraft) {
    return {
      parseResult,
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: parseResult.blockingReason,
      pdfMappingValid: false,
      buyerHandoffMappingValid: false,
    };
  }

  const draft = shouldPreferSpecificProfessionalFallback(fallbackDraft) && !passportBackedDraft
    ? fallbackDraft
    : capitalRenovationDraft ??
      passportBackedDraft ??
      exactProfessionalTemplateDraft ??
      buildExpandedDraft({ parseResult, currency }) ??
      buildProductionDraft({ parseResult, currency, countryCode: input.countryCode }) ??
      fallbackDraft;
  const contractedDraft = draft
    ? applyProfessionalBoqRuntimeContract(draft, { prompt: input.rawInput })
    : null;

  return {
    parseResult,
    draft: contractedDraft,
    canBuildPreliminaryEstimate: Boolean(contractedDraft && contractedDraft.items.length > 0),
    blockingReason: contractedDraft && contractedDraft.items.length > 0 ? undefined : "draft_empty",
    pdfMappingValid: Boolean(contractedDraft && contractedDraft.items.length > 0),
    buyerHandoffMappingValid: Boolean(contractedDraft && contractedDraft.items.some((item) => item.itemType !== "work")),
  };
}
