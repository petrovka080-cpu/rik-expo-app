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
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
  ASPHALT_V4_RUNTIME_TITLE_RU,
  ASPHALT_WORK_ID_V4,
  compileAsphaltProfessionalEstimateV4,
  type AsphaltClarificationExperienceV4,
  type AsphaltCompiledBoqLineV4,
} from "./v4/asphalt";
import { buildRoadworksWaveAProductionDraft } from "./v4/roadworks";
import { buildMultiDomainReferenceProductionDraftV4 } from "./v4/multiDomainReferenceProductionBindingV4";

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
  v4ClarificationExperience?: AsphaltClarificationExperienceV4 | null;
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

function itemTypeForAsphaltV4Row(row: AsphaltCompiledBoqLineV4): ConsumerRepairItemType {
  if (row.definition.category === "material") return "material";
  if (row.definition.category === "work" || row.definition.category === "labor") return "work";
  if (row.definition.category === "documentation") return "document";
  return "service";
}

function asphaltV4ParameterLabel(key: string): string | null {
  const direct: Record<string, string> = {
    area_m2: "Площадь покрытия",
    length_m: "Длина участка",
    width_m: "Ширина покрытия",
    exclusions_m2: "Площадь исключений",
    milling_depth_mm: "Глубина фрезерования",
    sand_thickness_mm: "Толщина песчаного слоя",
    sand_compaction_factor: "Коэффициент к уплотнённому объёму песка",
    sand_waste_percent: "Технологический запас песка",
    geotextile_overlap_percent: "Коэффициент нахлёста геотекстиля",
    emulsion_rate_l_m2: "Норма розлива эмульсии, л/м²",
    emulsion_rate_kg_m2: "Норма розлива эмульсии, кг/м²",
    base_emulsion_rate_l_m2: "Норма розлива эмульсии по основанию",
    paver_working_width_m: "Рабочая ширина полосы укладки",
    paving_shift_length_m: "Длина технологической захватки",
    road_worker_productivity_m2_per_man_hour: "Производительность дорожных рабочих",
    milling_productivity_m3_per_machine_hour: "Производительность дорожной фрезы",
    grader_productivity_m2_per_machine_hour: "Производительность автогрейдера",
    roller_productivity_m2_per_machine_hour: "Производительность катка",
    paver_productivity_m2_per_machine_hour: "Производительность асфальтоукладчика",
    pneumatic_roller_productivity_m2_per_machine_hour: "Производительность пневмоколёсного катка",
    bitumen_distributor_productivity_m2_per_machine_hour: "Производительность автогудронатора",
    surface_cleaner_productivity_m2_per_machine_hour: "Производительность очистительной техники",
    asphalt_plant_distance_km: "Расстояние до асфальтобетонного завода",
    disposal_distance_km: "Расстояние вывоза снятого материала",
    truck_payload_t: "Полезная загрузка самосвала",
    laboratory_test_interval_m2_per_test: "Площадь на одно лабораторное испытание",
    curb_length_m: "Длина бордюров",
    drainage_length_m: "Длина элементов водоотвода",
    traffic_signs_count: "Количество дорожных знаков",
    guardrail_length_m: "Длина барьерного ограждения",
    asphalt_layer_count: "Количество асфальтобетонных слоёв",
    construction_mode: "Вид строительства или ремонта",
    scope_profile: "Профессиональный scope",
    purpose: "Тип объекта",
    region_city: "Регион или город",
    milling_required: "Необходимость фрезерования",
  };
  if (direct[key]) return direct[key];
  const asphaltLayer = key.match(/^asphalt_layer_(\d+)_(thickness_mm|density_t_m3|waste_percent)$/);
  if (asphaltLayer) {
    const suffix = asphaltLayer[2] === "thickness_mm" ? "толщина" : asphaltLayer[2] === "density_t_m3" ? "плотность смеси" : "технологический запас";
    return `Асфальтобетонный слой ${asphaltLayer[1]} — ${suffix}`;
  }
  const asphaltLayerText = key.match(/^asphalt_layer_(\d+)_mixture_type$/);
  if (asphaltLayerText) return `Асфальтобетонный слой ${asphaltLayerText[1]} — тип смеси`;
  const crushedLayer = key.match(/^crushed_layer_(\d+)_(thickness_mm|fraction|compaction_factor|waste_percent)$/);
  if (crushedLayer) {
    const suffix = crushedLayer[2] === "thickness_mm"
      ? "толщина"
      : crushedLayer[2] === "fraction"
        ? "фракция"
        : crushedLayer[2] === "compaction_factor"
          ? "коэффициент к уплотнённому объёму"
          : "технологический запас";
    return `Щебёночный слой ${crushedLayer[1]} — ${suffix}`;
  }
  return null;
}

function asphaltV4RuntimeFactValues(
  facts: readonly { parameter_id: string | null; value: unknown }[],
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const fact of facts) {
    const match = fact.parameter_id?.match(/^asphalt_concrete_pavement:parameter:([a-z0-9_]+):v4$/i);
    if (!match) continue;
    const key = match[1];
    if (typeof fact.value === "string" || typeof fact.value === "number" || typeof fact.value === "boolean") {
      result[key] = fact.value;
      continue;
    }
    if (!Array.isArray(fact.value) || (key !== "asphalt_layers" && key !== "crushed_layers")) continue;
    const prefix = key === "asphalt_layers" ? "asphalt_layer" : "crushed_layer";
    result[`${prefix}_count`] = fact.value.length;
    fact.value.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;
      for (const [fieldKey, fieldValue] of Object.entries(item)) {
        if (typeof fieldValue === "string" || typeof fieldValue === "number" || typeof fieldValue === "boolean") {
          result[`${prefix}_${index + 1}_${fieldKey}`] = fieldValue;
        }
      }
    });
  }
  return result;
}

function asphaltV4RuntimeParameterUnit(key: string): string | null {
  if (/_thickness_mm$/.test(key) || key === "milling_depth_mm" || key === "sand_thickness_mm") return "mm";
  if (/_density_t_m3$/.test(key)) return "t_m3";
  if (/_waste_percent$/.test(key) || key === "geotextile_overlap_percent") return "percent";
  if (key === "area_m2" || key === "exclusions_m2") return "m2";
  if (/_length_m$/.test(key) || key === "length_m" || key === "width_m") return "m";
  if (/_distance_km$/.test(key)) return "km";
  if (/_count$/.test(key)) return "pcs";
  return null;
}

function buildAsphaltV4Draft(input: {
  sourceInput: BuildEstimateFromInlineWorkPromptInput;
  parseResult: InlineWorkPromptParseResult;
  currency: string;
}): { draft: ConsumerRepairAiDraft; clarification: AsphaltClarificationExperienceV4 } | null {
  const selectedIds = [
    input.sourceInput.selectedTemplateId,
    input.sourceInput.selectedWorkKey,
    input.parseResult.matchedTemplate?.templateId,
    input.parseResult.matchedTemplate?.family,
  ].filter((value): value is string => Boolean(value));
  const promptMatches = /(?:асфальтирован|асфальтобетон[а-яё]*(?:\s+дорожн[а-яё]*)?\s+покрыти|asphalt\s+pav|нов[а-яё]*\s+парковк|парковк[а-яё]*.*(?:дорожн[а-яё]*\s+покрыти|двухслойн|нов[а-яё]*\s+основан))/iu.test(input.parseResult.rawInput);
  const fullRoadConstructionMatches = /(?:полное\s+строительств[оа]\s+(?:автомобильн[а-яё]*\s+)?дорог|строительств[оа]\s+автомобильн[а-яё]*\s+дорог|new\s+(?:full\s+)?road\s+construction)/iu
    .test(input.parseResult.rawInput);
  const selectedAsphaltAlias = selectedIds.some((value) =>
    value === "asphalt_paving" ||
    value === ASPHALT_WORK_ID_V4 ||
    value === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    value.startsWith(`${ASPHALT_WORK_ID_V4}_`)
  );
  if (!selectedAsphaltAlias && !promptMatches && !fullRoadConstructionMatches) return null;
  const compilation = compileAsphaltProfessionalEstimateV4({
    raw_text: input.parseResult.rawInput,
    parameter_overrides: input.sourceInput.paramOverrides,
  });
  const runtimeFactValues = asphaltV4RuntimeFactValues(compilation.extracted_facts);
  const runtimeKeys = new Set([
    ...Object.keys(runtimeFactValues),
    ...compilation.passport.formulas.flatMap((formula) => formula.input_parameter_ids),
  ]);
  for (const question of [
    ...compilation.clarification.critical_required,
    ...compilation.clarification.recommended,
    ...compilation.clarification.optional_or_assumption,
  ]) {
    if (!question.structured_group) continue;
    const groupKey = question.parameter_id.match(/:parameter:([a-z0-9_]+):v4$/i)?.[1];
    if (!groupKey) continue;
    const prefix = groupKey === "asphalt_layers" ? "asphalt_layer" : groupKey === "crushed_layers" ? "crushed_layer" : groupKey.replace(/s$/, "");
    const count = Math.max(
      question.structured_group.minimum_items,
      Array.isArray(question.prefilled_value) ? question.prefilled_value.length : 0,
    );
    for (let index = 1; index <= count; index += 1) {
      for (const field of question.structured_group.fields) runtimeKeys.add(`${prefix}_${index}_${field.canonical_key}`);
    }
  }
  const labels = Object.fromEntries([...runtimeKeys].flatMap((key) => {
      const label = asphaltV4ParameterLabel(key);
      return label ? [[key, label]] : [];
    }));
  const units = {
    ...Object.fromEntries([...runtimeKeys].flatMap((key) => {
      const unit = asphaltV4RuntimeParameterUnit(key);
      return unit ? [[key, unit]] : [];
    })),
    ...Object.assign({}, ...compilation.passport.formulas.map((formula) => formula.input_unit_ids)),
  };
  const understood = compilation.clarification.understood.map((item) => `${item.label_ru}: ${item.value_ru}`).join("; ");
  const missingQuestions = [
    ...compilation.clarification.critical_required,
    ...compilation.clarification.recommended,
    ...compilation.clarification.optional_or_assumption,
  ].map((item) => item.title_ru);
  const draft: ConsumerRepairAiDraft = {
    titleRu: `Расширенная предварительная профессиональная смета: ${compilation.preliminary_assembly_policy.profile_title_ru}`,
    summaryRu: [
      understood ? `Я понял: ${understood}.` : `Работа: ${ASPHALT_V4_RUNTIME_TITLE_RU}.`,
      compilation.quantity_basis.basis_type === "reference"
        ? `Предварительный расчёт приведён на ${compilation.quantity_basis.area_m2.toLocaleString("ru-RU")} м². Укажите площадь, длину и ширину, чтобы пересчитать под ваш объект.`
        : `Расчётная площадь: ${compilation.quantity_basis.area_m2.toLocaleString("ru-RU")} м².`,
      compilation.preliminary_assembly_policy.summary_ru,
      `Профессиональная V4-ведомость: ${compilation.compiled_rows.length} измеримых позиций.`,
      compilation.price_coverage.display_total_ru,
    ].join(" "),
    repairType: ASPHALT_WORK_ID_V4,
    selectedWork: {
      selectedWorkKey: ASPHALT_WORK_ID_V4,
      selectedWorkTitleRu: ASPHALT_V4_RUNTIME_TITLE_RU,
      selectedWorkCategoryKey: "road_construction",
      selectedWorkCategoryTitleRu: "Дорожные работы",
      selectedWorkRawInput: input.parseResult.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
    dangerousDiyBlocked: false,
    missingData: [...new Set([...missingQuestions, ...compilation.expert_questions_ru])],
    items: compilation.compiled_rows.map((row, rowIndex) => ({
      itemType: itemTypeForAsphaltV4Row(row),
      titleRu: row.definition.professional_name_ru,
      quantity: row.quantity,
      unit: row.definition.unit_id ?? "",
      unitLabel: formatEstimateUnitLabel(row.definition.unit_id ?? ""),
      unitPrice: null,
      currency: input.currency,
      source: "reference_price_book",
      category: row.definition.category,
      sourceId: row.definition.source_id ?? "kg_krer_2015_collection_27",
      sourceLabel: "Цена не заполнена",
      formulaId: row.definition.formula_id,
      quantityFormula: compilation.passport.formulas.find((formula) => formula.formula_id === row.definition.formula_id)?.expression ?? null,
      calculationTrace: row.definition.explanation_trace_ru,
      sourceParameters: {
        ...runtimeFactValues,
        ...row.formula_input_values,
        formulaContext: row.formula_input_values,
        asphaltV4: true,
        asphaltV4WorkId: ASPHALT_WORK_ID_V4,
        asphaltV4RevisionHash: compilation.passport.deterministic_hash,
        asphaltV4AssemblyId: compilation.preliminary_assembly_policy.assembly_id,
        asphaltV4AssemblyProfileId: compilation.preliminary_assembly_policy.profile_id,
        asphaltV4AssemblyPolicyId: compilation.preliminary_assembly_policy.policy_id,
        asphaltV4DeclaredAssumptions: compilation.preliminary_assembly_policy.assumptions,
        asphaltV4AssumptionKeys: compilation.preliminary_assembly_policy.assumptions.map((assumption) => assumption.canonical_key),
        asphaltV4AssumptionIds: row.assumption_ids,
        asphaltV4QuantityBasis: compilation.quantity_basis,
        asphaltV4DerivedParameterKeys: compilation.quantity_basis.formula_trace.includes("length_m * width_m") ? ["area_m2"] : [],
        area_m2: compilation.quantity_basis.area_m2,
        asphaltV4ParameterLabelsRu: labels,
        asphaltV4ParameterUnits: units,
        asphaltV4Applicability: row.definition.applicability,
        asphaltV4Category: row.definition.category,
        asphaltV4ProfessionalCategory: row.definition.professional_category,
        asphaltV4CostingMode: row.definition.costing_mode,
        asphaltV4CostOwnershipId: row.definition.cost_ownership_id,
        asphaltV4ParentWbsId: row.definition.parent_wbs_id,
        asphaltV4ComponentType: row.definition.component_type,
        asphaltV4Priced: row.definition.priced,
        asphaltV4InclusionReasonRu: row.definition.inclusion_reason_ru,
        asphaltV4ExclusionRule: row.definition.exclusion_rule,
        includedInProcurement: row.included_in_procurement,
        rowCode: row.definition.row_id,
        inlineWorkPrompt: true,
        inlineWorkPromptTemplateId: ASPHALT_V4_RUNTIME_TEMPLATE_ID,
        inlineWorkPromptFamilyId: ASPHALT_WORK_ID_V4,
        inlineWorkPromptRowIndex: rowIndex,
      },
      templateId: ASPHALT_V4_RUNTIME_TEMPLATE_ID,
      templateVersion: ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
      normId: `norm:asphalt-v4:${row.definition.row_id}`,
      normFamilyId: "norm_family:asphalt_pavement:v4",
      normSourceId: row.definition.source_id ?? "kg_krer_2015_collection_27",
      normSourceTitle: compilation.passport.normative_evidence.find((source) => source.source_id === row.definition.source_id)?.title ?? "Подтверждаемая формула Asphalt V4",
      normVersion: ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
      normReviewStatus: "road_engineer_review_required",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Цена не заполнена",
      costConfidence: "missing",
      confidence: compilation.passport.unresolved_requirements.length === 0 ? "high" : "medium",
      addedBy: "ai",
      materialKey: row.definition.category === "material" ? row.definition.price_key ?? row.definition.row_id : null,
      rateKey: `asphalt_v4_${row.definition.row_id}`,
    })),
  };
  return { draft, clarification: compilation.clarification };
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
  const roadworksWaveA = buildRoadworksWaveAProductionDraft(input);
  const asphaltV4 = buildAsphaltV4Draft({ sourceInput: input, parseResult, currency });
  const multiDomainReferenceV4 = buildMultiDomainReferenceProductionDraftV4({
    ...input,
    parseResult,
    currency,
  });

  // A recognised V4 work remains a valid runtime draft while its critical
  // work-specific inputs are being collected. Requiring a BOQ row here lost
  // the clarification experience and sent /request to the legacy fallback.
  if (!parseResult.canBuildPreliminaryEstimate && !fallbackDraft && !capitalRenovationDraft && !roadworksWaveA &&
    !asphaltV4 && !multiDomainReferenceV4) {
    return {
      parseResult,
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: parseResult.blockingReason,
      pdfMappingValid: false,
      buyerHandoffMappingValid: false,
      v4ClarificationExperience: null,
    };
  }

  const draft = multiDomainReferenceV4?.draft ?? roadworksWaveA?.draft ?? asphaltV4?.draft ?? (
    shouldPreferSpecificProfessionalFallback(fallbackDraft) && !passportBackedDraft
      ? fallbackDraft
      : capitalRenovationDraft ??
      passportBackedDraft ??
      exactProfessionalTemplateDraft ??
      buildExpandedDraft({ parseResult, currency }) ??
      buildProductionDraft({ parseResult, currency, countryCode: input.countryCode }) ??
      fallbackDraft
  );
  const contractedDraft = draft && draft.items.every((item) =>
    item.sourceParameters?.asphaltV4 === true || item.sourceParameters?.multiDomainReferenceV4 === true)
    ? draft
    : draft
    ? applyProfessionalBoqRuntimeContract(draft, { prompt: input.rawInput })
    : null;

  return {
    parseResult,
    draft: contractedDraft,
    canBuildPreliminaryEstimate: Boolean(contractedDraft && contractedDraft.items.length > 0),
    blockingReason: contractedDraft && contractedDraft.items.length > 0
      ? undefined
      : asphaltV4
        ? "v4_work_specific_inputs_required"
        : "draft_empty",
    pdfMappingValid: Boolean(contractedDraft && contractedDraft.items.length > 0),
    buyerHandoffMappingValid: Boolean(contractedDraft && contractedDraft.items.some((item) => item.itemType !== "work")),
    v4ClarificationExperience: asphaltV4?.clarification ?? null,
  };
}
