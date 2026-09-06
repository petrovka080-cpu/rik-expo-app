import type {
  ConsumerRepairAiDraft,
  ConsumerRepairItemType,
  ConsumerRepairSelectedWork,
} from "../consumerRequests/consumerRequestTypes";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import type { ExpandedComplexBoqRow } from "../ai/expandedComplexWorks";
import type { ProductionCompiledExpandedRow } from "../ai/estimateTemplate10000/productionExpandedWorkCatalog10000";
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
import { evaluateAiEstimateQuantityFormula } from "./formula/evaluateAiEstimateQuantityFormula";
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
  ASPHALT_FAMILY_ID_V4,
  ASPHALT_WORK_ID_V4,
} from "./v4/asphalt/asphaltV4Constants";
import { professionalEstimatePassportId } from "./v4/professionalEstimatePassportV4";
import type { AsphaltCompiledBoqLineV4 } from "./v4/asphalt/compileAsphaltProfessionalEstimateV4";
import type { AsphaltClarificationExperienceV4 } from "./v4/asphalt/asphaltClarificationExperienceV4";
import {
  ROAD_SCOPE_RESOLVER_VERSION_V4,
  resolveRoadEstimateScopeV4,
  roadScopeIdForProfileV4,
  type RoadScopeResolutionV4,
} from "./v4/asphalt/roadScopeTruthV4";
import {
  isExactMultiDomainReferencePromptV4,
  routeMultiDomainReferencePromptV4,
} from "./v4/multiDomainReferenceNlpV4";

function loadExpandedComplexWorks() {
  return require(
    "../ai/expandedComplexWorks"
  ) as typeof import("../ai/expandedComplexWorks");
}

function loadProductionExpandedEstimate10000() {
  return require(
    "../ai/estimateTemplate10000/productionExpandedWorkCatalog10000"
  ) as typeof import("../ai/estimateTemplate10000/productionExpandedWorkCatalog10000");
}

function loadProfessionalWorkPassportBuilder() {
  return require(
    "./buildProfessionalWorkPassport"
  ) as typeof import("./buildProfessionalWorkPassport");
}

function loadAsphaltEstimateCompilers() {
  return {
    ...require(
      "./v4/asphalt/compileAsphaltProfessionalEstimateV4"
    ) as typeof import("./v4/asphalt/compileAsphaltProfessionalEstimateV4"),
    ...require(
      "./v4/asphalt/compileEstimateFromResolvedRoadIntentV4"
    ) as typeof import("./v4/asphalt/compileEstimateFromResolvedRoadIntentV4"),
  };
}

function loadRoadworksWaveAProductionDraftBuilder() {
  return require(
    "./v4/roadworks/roadworksWaveAProductionBinding"
  ) as typeof import("./v4/roadworks/roadworksWaveAProductionBinding");
}

function loadAsphaltRelatedExactProductionDraftBuilder() {
  return require(
    "./v4/asphalt/asphaltRelatedProductionBindingV4"
  ) as typeof import("./v4/asphalt/asphaltRelatedProductionBindingV4");
}

function loadAsphaltRelatedExactRoutingV4() {
  return require(
    "./v4/asphalt/asphaltRelatedExactRoutingV4"
  ) as typeof import("./v4/asphalt/asphaltRelatedExactRoutingV4");
}

function loadMultiDomainReferenceProductionDraftBuilder() {
  return require(
    "./v4/multiDomainReferenceProductionBindingV4"
  ) as typeof import("./v4/multiDomainReferenceProductionBindingV4");
}

function loadRegisteredProfessionalEstimateDomainDraftBuilder() {
  return require(
    "./v4/domains/registeredProfessionalEstimateDomainsV1"
  ) as typeof import("./v4/domains/registeredProfessionalEstimateDomainsV1");
}

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
  roadScopeResolution?: RoadScopeResolutionV4 | null;
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
  roadScopeResolution: RoadScopeResolutionV4;
  allowMultiDomainAsphaltFallback: boolean;
}): { draft: ConsumerRepairAiDraft; clarification: AsphaltClarificationExperienceV4 } | null {
  const selectedIds = [
    input.sourceInput.selectedTemplateId,
    input.sourceInput.selectedWorkKey,
    input.parseResult.matchedTemplate?.templateId,
    input.parseResult.matchedTemplate?.family,
  ].filter((value): value is string => Boolean(value));
  const promptMatches = /(?:асфальтирован|асфальтобетон[а-яё]*(?:\s+(?:дорожн[а-яё]*\s+)?покрыти|\s+дорог)|asphalt(?:\s+concrete)?\s+(?:pav|road)|нов[а-яё]*\s+парковк|парковк[а-яё]*.*(?:дорожн[а-яё]*\s+покрыти|двухслойн|нов[а-яё]*\s+основан))/iu.test(input.parseResult.rawInput);
  const fullRoadConstructionMatches = /(?:полное\s+строительств[оа]\s+(?:(?:автомобильн[а-яё]*\s+)?дорог|дорожн[а-яё]*\s+одежд)|строительств[оа]\s+(?:автомобильн[а-яё]*\s+)?дорог|new\s+(?:full\s+)?road\s+construction)/iu
    .test(input.parseResult.rawInput);
  const explicitlySelectedAsphaltPavement = [
    input.sourceInput.selectedTemplateId,
    input.sourceInput.selectedWorkKey,
  ].filter((value): value is string => Boolean(value)).some((value) =>
    value === ASPHALT_WORK_ID_V4 ||
    value === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    value.startsWith(`${ASPHALT_WORK_ID_V4}_`)
  );
  const selectedAsphaltAlias = selectedIds.some((value) =>
    value === "asphalt_paving" ||
    value === ASPHALT_FAMILY_ID_V4 ||
    value === "village_road_construction" ||
    value.startsWith(`${ASPHALT_FAMILY_ID_V4}_`) ||
    value.startsWith("village_road_construction_") ||
    value === ASPHALT_WORK_ID_V4 ||
    value === ASPHALT_V4_RUNTIME_TEMPLATE_ID ||
    value.startsWith(`${ASPHALT_WORK_ID_V4}_`)
  ) || (input.allowMultiDomainAsphaltFallback && (() => {
    const routed = routeMultiDomainReferencePromptV4(input.parseResult.rawInput);
    return routed.kind === "MATCH" && routed.catalogWorkId === "asphalt_pavement";
  })());
  const explicitlyDifferentPavementTechnology =
    /(?:цементобетон|бетонн[а-яё]*\s+дорог|cement(?:\s+concrete)?\s+pavement|concrete\s+road)/iu
      .test(input.parseResult.rawInput);
  if (!selectedAsphaltAlias && explicitlyDifferentPavementTechnology) return null;
  // A request for construction of the whole road owns earthworks, drainage,
  // subbase, base and pavement as one road-construction technology. The word
  // "асфальт" inside that scope must not collapse it to the narrower pavement
  // passport. An explicit user-selected pavement work still wins.
  if (fullRoadConstructionMatches && !explicitlySelectedAsphaltPavement) return null;
  if (!selectedAsphaltAlias && !promptMatches && !fullRoadConstructionMatches) return null;
  if (input.roadScopeResolution.resolverStatus !== "RESOLVED") return null;
  const {
    compileEstimateFromResolvedRoadIntentV4,
    createResolvedRoadEstimateIntentV4,
  } = loadAsphaltEstimateCompilers();
  const resolvedIntent = createResolvedRoadEstimateIntentV4({
    resolution: input.roadScopeResolution,
    requestId: input.sourceInput.selectedWorkKey ?? input.sourceInput.selectedTemplateId ?? "inline-road-request",
    resolutionOrigin: input.roadScopeResolution.evidence.includes("user_scope_selection") ? "USER_SELECTION" : "EXPLICIT_PROMPT",
    resolverVersion: ROAD_SCOPE_RESOLVER_VERSION_V4,
  });
  const compilation = compileEstimateFromResolvedRoadIntentV4({
    resolvedIntent,
    parameterOverrides: input.sourceInput.paramOverrides,
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
  const requestedCatalogWorkId = input.sourceInput.selectedTemplateId?.trim() ||
    input.sourceInput.selectedWorkKey?.trim() ||
    input.parseResult.matchedTemplate?.templateId ||
    ASPHALT_WORK_ID_V4;
  const catalogPassportId = professionalEstimatePassportId(requestedCatalogWorkId);
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
      selectedCatalogWorkId: requestedCatalogWorkId,
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
        ...(rowIndex === 0 ? runtimeFactValues : {}),
        ...row.formula_input_values,
        formulaContext: row.formula_input_values,
        asphaltV4: true,
        requestedCatalogWorkId,
        professionalEstimatePassportId: catalogPassportId,
        canonicalProfessionalEstimatePassportId: professionalEstimatePassportId(ASPHALT_WORK_ID_V4),
        boqBlueprintId: `${requestedCatalogWorkId}:boq-blueprint:v4`,
        parameterSchemaId: `${requestedCatalogWorkId}:parameter-schema:v4`,
        formulaBindingId: `${requestedCatalogWorkId}:formula-binding:v4`,
        normApplicabilityProfileId: `${requestedCatalogWorkId}:norm-applicability:v4`,
        deterministicFixtureId: `${requestedCatalogWorkId}:deterministic-fixture:v4`,
        asphaltV4AssumptionIds: row.assumption_ids,
        area_m2: compilation.quantity_basis.area_m2,
        ...(rowIndex === 0 ? {
          // Revision-wide metadata has a single canonical owner. Repeating these
          // large immutable maps on every BOQ row made a 702-row revision ~94 MB
          // and forced every snapshot fingerprint to hash the same data 702 times.
          asphaltV4DeclaredAssumptions: compilation.preliminary_assembly_policy.assumptions,
          asphaltV4AssumptionKeys: compilation.preliminary_assembly_policy.assumptions.map((assumption) => assumption.canonical_key),
          asphaltV4DerivedParameterKeys: compilation.quantity_basis.formula_trace.includes("length_m * width_m") ? ["area_m2"] : [],
          asphaltV4ParameterLabelsRu: labels,
          asphaltV4ParameterUnits: units,
          asphaltV4WorkId: ASPHALT_WORK_ID_V4,
          asphaltV4RevisionHash: compilation.passport.deterministic_hash,
          asphaltV4AssemblyId: compilation.preliminary_assembly_policy.assembly_id,
          asphaltV4AssemblyProfileId: compilation.preliminary_assembly_policy.profile_id,
          asphaltV4AssemblyPolicyId: compilation.preliminary_assembly_policy.policy_id,
          asphaltV4QuantityBasis: compilation.quantity_basis,
        } : {}),
        asphaltV4Category: row.definition.category,
        asphaltV4ProfessionalCategory: row.definition.professional_category,
        asphaltV4SemanticOwnerId: row.definition.semantic_owner_id,
        asphaltV4SemanticOwnerClass: row.definition.semantic_owner_class,
        asphaltV4ParentWbsId: row.definition.parent_wbs_id,
        stageId: row.definition.parent_wbs_id,
        semanticOwner: row.definition.semantic_owner_id,
        doubleCountGuardKey: row.definition.cost_ownership_id,
        normativeSourceIds: compilation.passport.formulas.find((formula) =>
          formula.formula_id === row.definition.formula_id
        )?.source_ids ?? (row.definition.source_id ? [row.definition.source_id] : []),
        normativeSources: row.normative_binding.sourceIds,
        normativeSourceRoles: row.normative_binding.sourceRoles,
        kgStatusSourceIds: row.normative_binding.kgStatusSourceIds,
        kgApplicabilitySourceIds: row.normative_binding.kgApplicabilitySourceIds,
        constructionNormLocatorIds: row.normative_binding.constructionNormLocatorIds,
        normativeLocatorReviewStatus: row.normative_binding.locatorReviewStatus,
        normativeReviewStatus: row.definition.specification_status === "SOURCE_CONFIRMED"
          ? "automated_source_verified_benchmark_fixture_inputs_confirmed"
          : "road_engineer_review_required",
        normativeApplicability: row.definition.applicability,
        formulaVersion: ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
        applicabilityPredicate: row.definition.applicability,
        wasteOrLossRule: row.definition.waste_coefficient === null
          ? "NOT_APPLICABLE_OR_INCLUDED_IN_EXACT_FORMULA"
          : `EXPLICIT_WASTE_COEFFICIENT:${row.definition.waste_coefficient}`,
        roundingRule: "ROUND_HALF_UP_BY_FORMULA_CONTRACT",
        asphaltV4CostingMode: compilation.costing_mode,
        asphaltV4CostTreatment: row.definition.costing_mode,
        asphaltV4CostOwnershipId: row.definition.cost_ownership_id,
        asphaltV4Payable:
          row.definition.costing_mode === "RESOURCE_BASED" ||
          row.definition.costing_mode === "COMPOSITE_RATE",
        includedInProcurement: row.included_in_procurement,
        rowCode: row.definition.row_id,
        inlineWorkPrompt: true,
        ...(rowIndex === 0 ? {
          inlineWorkPromptTemplateId: ASPHALT_V4_RUNTIME_TEMPLATE_ID,
          inlineWorkPromptFamilyId: ASPHALT_WORK_ID_V4,
        } : {}),
        inlineWorkPromptRowIndex: rowIndex,
      },
      templateId: ASPHALT_V4_RUNTIME_TEMPLATE_ID,
      templateVersion: ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
      normId: `norm:asphalt-v4:${row.definition.row_id}`,
      normFamilyId: "norm_family:asphalt_pavement:v4",
      normSourceId: row.definition.source_id ?? "kg_krer_2015_collection_27",
      normSourceTitle: compilation.passport.normative_evidence.find((source) => source.source_id === row.definition.source_id)?.title ?? "Подтверждаемая формула Asphalt V4",
      normVersion: ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
      normReviewStatus: row.definition.specification_status === "SOURCE_CONFIRMED"
        ? "automated_source_verified_benchmark_fixture_inputs_confirmed"
        : "road_engineer_review_required",
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

function selectedWorkForPassport(
  passport: ProfessionalWorkPassport,
  rawInput: string,
): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: passport.workKey,
    selectedWorkTitleRu: passport.localizedNameRu,
    selectedWorkCategoryKey: passport.category,
    selectedWorkCategoryTitleRu: passport.category.replace(/_/g, " "),
    selectedWorkRawInput: rawInput,
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
  const {
    buildExpandedComplexBuyerHandoff,
    buildExpandedComplexPdfModel,
    buildExpandedComplexSnapshot,
    calculateExpandedComplexEstimate,
    getExpandedComplexWorkFamily,
  } = loadExpandedComplexWorks();
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
  const canonicalBackendHandoffRequired =
    estimate.input_parameters.canonical_backend_handoff_required === true;
  const selectedWork = selectedWorkForInlineMatch(input.parseResult);

  return {
    titleRu: estimate.professionalNameRu,
    summaryRu: [
      `${estimate.professionalNameRu}. Предварительная профессиональная ведомость по управляемому калькулятору.`,
      `Строк: ${rows.length}; цены не придумываются.`,
      `PDF совпадает со снимком: ${pdf.rows_equal_snapshot ? "да" : "нет"}. Строк пакета закупки: ${buyerRows.length}.`,
    ].join(" "),
    repairType: estimate.work_family_id,
    selectedWork: canonicalBackendHandoffRequired && selectedWork
      ? {
        ...selectedWork,
        selectedCatalogWorkId: "canonical-work:expanded:strip_foundation",
      }
      : selectedWork,
    dangerousDiyBlocked: false,
    missingData: [
      ...estimate.missing_design_inputs,
      ...missingDataFromParse(input.parseResult),
    ],
    items: rows.length > 0 ? rows.map((row, rowIndex) => ({
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
    })) : canonicalBackendHandoffRequired ? [{
      itemType: "document",
      titleRu: `Параметры для расчёта: ${estimate.professionalNameRu}`,
      quantity: 1,
      unit: "item",
      unitLabel: "компл.",
      unitPrice: null,
      currency: input.currency,
      source: "ai_suggested",
      category: "documentation",
      sourceId: null,
      sourceLabel: "Ожидаются обязательные параметры canonical backend",
      formulaId: "CANONICAL_BACKEND_HANDOFF_REQUIRED",
      quantityFormula: "CANONICAL_BACKEND_HANDOFF_REQUIRED",
      calculationTrace: "compileMutation=0; pdfReady=false; procurementReady=false",
      sourceParameters: {
        ...estimate.input_parameters,
        canonicalBackendHandoffRequired: true,
        p0GateOnly: true,
        inlineWorkPrompt: true,
        inlineWorkPromptTemplateId: input.parseResult.matchedTemplate?.templateId ?? null,
        inlineWorkPromptFamilyId: estimate.work_family_id,
        extractedParams: input.parseResult.extractedParams,
      },
      templateId: input.parseResult.matchedTemplate?.templateId ?? `${estimate.work_family_id}_preliminary_boq_expanded_complex_v1`,
      templateVersion: "1.0.0",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Источник цен не выбран",
      costConfidence: "missing",
      confidence: "high",
      addedBy: "system",
      materialKey: null,
      rateKey: "canonical_backend_handoff_required",
    }] : [],
  };
}

type PrimaryQuantityBinding = {
  key: "area_m2" | "length_m" | "volume_m3" | "count";
  value: number;
};

function primaryQuantityBinding(parseResult: InlineWorkPromptParseResult): PrimaryQuantityBinding | undefined {
  const params = parseResult.extractedParams;
  const candidates = [
    { key: "area_m2", value: params.area_m2?.value },
    { key: "length_m", value: params.length_m?.value },
    { key: "volume_m3", value: params.volume_m3?.value },
    { key: "count", value: params.count?.value },
  ];
  return candidates.find((candidate): candidate is PrimaryQuantityBinding =>
    typeof candidate.value === "number" && Number.isFinite(candidate.value) && candidate.value > 0
  );
}

function primaryQuantity(parseResult: InlineWorkPromptParseResult): number | undefined {
  return primaryQuantityBinding(parseResult)?.value;
}

function buildProductionDraft(input: {
  parseResult: InlineWorkPromptParseResult;
  currency: string;
  countryCode?: string | null;
}): ConsumerRepairAiDraft | null {
  const templateId = input.parseResult.matchedTemplate?.templateId;
  if (!templateId) return null;
  const passport =
    loadProfessionalWorkPassportBuilder().buildProfessionalWorkPassport(templateId);
  if (!passport || passport.templateKind !== "base_10000") return null;
  const compiled =
    loadProductionExpandedEstimate10000().compileProductionExpandedEstimate10000({
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

function passportRuntimeQuantity(
  row: ProfessionalBoqRecipeRow,
  index: number,
  baseQuantity: number,
): { quantity: number; usesBaseQuantity: boolean } {
  const formulaEnvironment = { ...(row.formulaContext ?? {}), q: baseQuantity, baseQuantity };
  const calculated = evaluateAiEstimateQuantityFormula({
    formula: row.quantityFormula,
    env: formulaEnvironment,
  });
  if (calculated.ok && calculated.value != null && calculated.value >= 0) {
    return {
      quantity: calculated.value,
      usesBaseQuantity: /(^|[^a-zA-Z0-9_])(q|baseQuantity)($|[^a-zA-Z0-9_])/.test(row.quantityFormula),
    };
  }
  const rawUnit = row.sourceUnit.toLowerCase();
  const quantity = rawUnit === "trip" ? Math.max(1, Math.ceil(baseQuantity / 120))
    : rawUnit === "shift" ? Math.max(1, Math.ceil(baseQuantity / 80))
    : rawUnit === "set" ? Math.max(1, Math.ceil(baseQuantity / 10))
    : rawUnit === "pcs" || rawUnit === "piece" ? Math.max(1, Math.ceil(baseQuantity / 10))
    : rawUnit === "kg" ? Math.max(1, Math.round(baseQuantity * (4 + index % 5) * 100) / 100)
    : rawUnit === "ton" || rawUnit === "t" ? Math.max(1, Math.round(baseQuantity / 20 * 100) / 100)
    : Math.max(0.01, Math.round(baseQuantity * (1 + (index % 7) * 0.03) * 100) / 100);
  return { quantity, usesBaseQuantity: true };
}

function buildPassportBackedDraft(input: {
  parseResult: InlineWorkPromptParseResult;
  currency: string;
  selectedTemplateId?: string | null;
  professionalPassport?: ProfessionalWorkPassport | null;
}): ConsumerRepairAiDraft | null {
  const templateId = input.selectedTemplateId?.trim() || input.parseResult.matchedTemplate?.templateId;
  if (!templateId) return null;
  const passport: ProfessionalWorkPassport | null = input.professionalPassport?.templateId === templateId
    ? input.professionalPassport
    : loadProfessionalWorkPassportBuilder().buildProfessionalWorkPassport(templateId);
  if (!passport) return null;
  const baseQuantityBinding = primaryQuantityBinding(input.parseResult);
  const baseQuantity = baseQuantityBinding?.value ?? 1;
  const selectedWork = input.selectedTemplateId
    ? selectedWorkForPassport(passport, input.parseResult.rawInput)
    : selectedWorkForInlineMatch(input.parseResult);

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
      const runtimeQuantity = passportRuntimeQuantity(row, rowIndex, baseQuantity);
      const quantity = runtimeQuantity.quantity;
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
          formulaContext: row.formulaContext,
          affectedBy: runtimeQuantity.usesBaseQuantity && baseQuantityBinding
            ? [baseQuantityBinding.key]
            : [],
          passportBackedNaturalLanguageIngress: true,
          templateId: passport.templateId,
          workKey: passport.workKey,
          familyId: passport.familyId,
          normSourceId: row.normSourceId,
          normSourceTitle: row.normSourceTitle,
          normVersion: row.normVersion,
          normReviewStatus: row.normReviewStatus,
          sourceApplicabilityStatus: "natural_language_resolver_selected_exact_passport",
          includedInProcurement: row.includedInProcurement,
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

function buildExactRoadworksWaveAParseResult(input: {
  rawInput: string;
  registration: {
    templateId: string;
    professionalNameRu: string;
    workId: string;
  };
}): InlineWorkPromptParseResult {
  const { rawInput, registration } = input;
  return {
    rawInput,
    matchedTemplate: {
      templateId: registration.templateId,
      templateName: registration.professionalNameRu,
      family: registration.workId,
      confidence: 1,
      matchSource: "user_selected",
      matchedTextSpan: [0, rawInput.length],
    },
    candidateTemplates: [{
      templateId: registration.templateId,
      templateName: registration.professionalNameRu,
      family: registration.workId,
      workKey: registration.workId,
      confidence: 1,
      reason: "exact_roadworks_wave_a_binding",
    }],
    paramText: rawInput.trim(),
    // Exact Roadworks Wave A parameters and assumptions are attached by the
    // canonical production binding to the BOQ rows. The revision builder reads
    // that versioned snapshot, so re-running the global prompt parser here is
    // both redundant and a source of generic-catalog pre-emption.
    extractedParams: {},
    rawInputFacts: [],
    rawInputFactExtraction: {
      raw_input: rawInput,
      facts: [],
      metrics: {
        explicit_input_facts_ignored: 0,
        explicit_input_unit_mismatches: 0,
        explicit_input_facts_overwritten_by_default: 0,
      },
    },
    assumptions: [],
    missingInputs: [],
    canBuildPreliminaryEstimate: true,
    mustAskUserToSelectTemplate: false,
  };
}

function buildExactAsphaltRelatedParseResult(input: {
  rawInput: string;
  profile: {
    canonicalWorkKey: string;
    professionalNameRu: string;
  };
}): InlineWorkPromptParseResult {
  const { rawInput, profile } = input;
  const templateId = `${profile.canonicalWorkKey}:exact-professional-estimate:v1`;
  return {
    rawInput,
    matchedTemplate: {
      templateId,
      templateName: profile.professionalNameRu,
      family: profile.canonicalWorkKey,
      confidence: 1,
      matchSource: "user_selected",
      matchedTextSpan: [0, rawInput.length],
    },
    candidateTemplates: [{
      templateId,
      templateName: profile.professionalNameRu,
      family: profile.canonicalWorkKey,
      workKey: profile.canonicalWorkKey,
      confidence: 1,
      reason: "exact_asphalt_related_semantic_binding",
    }],
    paramText: rawInput.trim(),
    extractedParams: {},
    rawInputFacts: [],
    rawInputFactExtraction: {
      raw_input: rawInput,
      facts: [],
      metrics: {
        explicit_input_facts_ignored: 0,
        explicit_input_unit_mismatches: 0,
        explicit_input_facts_overwritten_by_default: 0,
      },
    },
    assumptions: [],
    missingInputs: [],
    canBuildPreliminaryEstimate: true,
    mustAskUserToSelectTemplate: false,
  };
}

function buildUnsupportedExactWorkParseResult(
  rawInput: string,
  requestedId: string,
): InlineWorkPromptParseResult {
  return {
    rawInput,
    matchedTemplate: null,
    candidateTemplates: [],
    paramText: rawInput.trim(),
    extractedParams: {},
    rawInputFacts: [],
    rawInputFactExtraction: {
      raw_input: rawInput,
      facts: [],
      metrics: {
        explicit_input_facts_ignored: 0,
        explicit_input_unit_mismatches: 0,
        explicit_input_facts_overwritten_by_default: 0,
      },
    },
    assumptions: [],
    missingInputs: [{
      param: requestedId,
      label: `UNSUPPORTED_EXACT_WORK_KEY:${requestedId}`,
      requiredFor: "contract_ready",
      blocksPreliminaryEstimate: false,
    }],
    canBuildPreliminaryEstimate: false,
    mustAskUserToSelectTemplate: false,
    blockingReason: "UNSUPPORTED_EXACT_WORK_KEY",
  };
}

function buildExactRegisteredProfessionalDomainParseResult(input: {
  rawInput: string;
  catalogId: string;
  workKey: string;
  templateId: string;
  titleRu: string;
  missingParameterIds: readonly string[];
}): InlineWorkPromptParseResult {
  return {
    rawInput: input.rawInput,
    matchedTemplate: {
      templateId: input.templateId,
      templateName: input.titleRu,
      family: input.workKey,
      confidence: 1,
      matchSource: "user_selected",
      matchedTextSpan: [0, input.rawInput.length],
    },
    candidateTemplates: [{
      templateId: input.templateId,
      templateName: input.titleRu,
      family: input.workKey,
      workKey: input.workKey,
      confidence: 1,
      reason: `exact_professional_domain_binding:${input.catalogId}`,
    }],
    paramText: input.rawInput.trim(),
    extractedParams: {},
    rawInputFacts: [],
    rawInputFactExtraction: {
      raw_input: input.rawInput,
      facts: [],
      metrics: {
        explicit_input_facts_ignored: 0,
        explicit_input_unit_mismatches: 0,
        explicit_input_facts_overwritten_by_default: 0,
      },
    },
    assumptions: [],
    missingInputs: input.missingParameterIds.map((parameterId) => ({
      param: parameterId,
      label: parameterId,
      requiredFor: "contract_ready" as const,
      blocksPreliminaryEstimate: false as const,
    })),
    canBuildPreliminaryEstimate: input.missingParameterIds.length === 0,
    mustAskUserToSelectTemplate: false,
    ...(input.missingParameterIds.length > 0 ? { blockingReason: "NEEDS_REQUIRED_INPUTS" } : {}),
  };
}

export function buildEstimateFromInlineWorkPrompt(
  input: BuildEstimateFromInlineWorkPromptInput,
): InlineWorkPromptEstimateBuildResult {
  const explicitExactId = input.selectedWorkKey?.trim() || input.selectedTemplateId?.trim() || "";
  const exactRouting = loadAsphaltRelatedExactRoutingV4()
    .resolveAsphaltRelatedExactRoutingV4(explicitExactId);
  if (exactRouting.status === "UNSUPPORTED_EXACT_WORK_KEY") {
    return {
      parseResult: buildUnsupportedExactWorkParseResult(input.rawInput, exactRouting.requestedId),
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "UNSUPPORTED_EXACT_WORK_KEY",
      pdfMappingValid: false,
      buyerHandoffMappingValid: false,
      v4ClarificationExperience: null,
      roadScopeResolution: null,
    };
  }
  // Exact Asphalt registrations have a single established owner. Do not let
  // the broader registered-domain inventory intercept the same catalog ID.
  const exactRegisteredDomain = exactRouting.status === "NOT_ASPHALT_RELATED"
    ? loadRegisteredProfessionalEstimateDomainDraftBuilder()
      .resolveRegisteredProfessionalEstimateSelectionV1(explicitExactId)
    : null;
  if (exactRegisteredDomain) {
    const parseResult = buildExactRegisteredProfessionalDomainParseResult({
      rawInput: input.rawInput,
      catalogId: exactRegisteredDomain.catalog_id,
      workKey: exactRegisteredDomain.work_key,
      templateId: exactRegisteredDomain.template_id,
      titleRu: exactRegisteredDomain.title_ru,
      missingParameterIds: exactRegisteredDomain.canonical_parameter_schema.definitions
        .filter((definition) => definition.requiredLevel === "BLOCKING_REQUIRED")
        .map((definition) => definition.parameterId),
    });
    return {
      parseResult,
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "CANONICAL_BACKEND_REQUIRED",
      pdfMappingValid: false,
      buyerHandoffMappingValid: false,
      v4ClarificationExperience: null,
      roadScopeResolution: null,
    };
  }
  // An explicit catalog identity is authoritative. Resolve every registered
  // asphalt-related operation before any word-based road/asphalt fallback so
  // demolition, milling, repair and installation cannot repaint each other.
  // Preserve the pre-resource-contract road-scope flow when an existing client
  // sends only selectedRoadScope. New resource-level requests explicitly send
  // estimate_scope_mode and enter the registered domain adapter, which delegates
  // the pavement body to the same core compiler and composes typed children.
  const legacySelectedCanonicalAsphaltScope = Boolean(
    exactRouting.status === "BOUND_EXTRA" &&
    exactRouting.canonicalWorkKey === ASPHALT_WORK_ID_V4 &&
    input.paramOverrides?.selectedRoadScope &&
    !input.paramOverrides?.estimate_scope_mode,
  );
  const exactAsphaltRelated = legacySelectedCanonicalAsphaltScope
    ? null
    : loadAsphaltRelatedExactProductionDraftBuilder().buildAsphaltRelatedExactProductionDraftV4(input);
  if (exactAsphaltRelated) {
    const parseResult = buildExactAsphaltRelatedParseResult({
      rawInput: input.rawInput,
      profile: exactAsphaltRelated.profile,
    });
    return {
      parseResult,
      draft: exactAsphaltRelated.draft,
      canBuildPreliminaryEstimate: exactAsphaltRelated.draft.items.length > 0,
      blockingReason: exactAsphaltRelated.readiness === "CALCULATION_READY"
        ? undefined
        : exactAsphaltRelated.readiness,
      pdfMappingValid: exactAsphaltRelated.draft.items.length > 0,
      buyerHandoffMappingValid: exactAsphaltRelated.draft.items.some((item) => item.itemType !== "work"),
      v4ClarificationExperience: null,
      roadScopeResolution: null,
    };
  }
  let roadworksWaveA: ReturnType<
    typeof import("./v4/roadworks/roadworksWaveAProductionBinding")["buildRoadworksWaveAProductionDraft"]
  > = loadRoadworksWaveAProductionDraftBuilder().buildRoadworksWaveAProductionDraft(input);
  const explicitRoadworksWaveASelection = Boolean(roadworksWaveA && [
    input.selectedWorkKey?.trim(),
    input.selectedTemplateId?.trim(),
  ].some((id) =>
    id === roadworksWaveA.registration.workId ||
    id === roadworksWaveA.registration.templateId
  ));
  const preferSpecificRoadworksWaveA = Boolean(
    roadworksWaveA &&
    input.rawInput.toLocaleLowerCase("ru-RU").includes(
      roadworksWaveA.registration.professionalNameRu.toLocaleLowerCase("ru-RU"),
    ),
  );
  if (roadworksWaveA && (explicitRoadworksWaveASelection || preferSpecificRoadworksWaveA)) {
    const parseResult = buildExactRoadworksWaveAParseResult({
      rawInput: input.rawInput,
      registration: roadworksWaveA.registration,
    });
    const contractedDraft = applyProfessionalBoqRuntimeContract(
      roadworksWaveA.draft,
      { prompt: input.rawInput },
    );
    const roadScopeResolution = resolveRoadEstimateScopeV4({
      originalText: input.rawInput,
      requestedCatalogWorkId: roadworksWaveA.registration.workId,
      selectedScopeId: roadScopeIdForProfileV4(
        input.paramOverrides?.selectedRoadScope?.value ?? input.paramOverrides?.scope_profile?.value,
      ),
      exactProfessionalWorkId: roadworksWaveA.registration.workId,
    });
    return {
      parseResult,
      draft: contractedDraft,
      canBuildPreliminaryEstimate: contractedDraft.items.length > 0,
      blockingReason: contractedDraft.items.length > 0 ? undefined : "draft_empty",
      pdfMappingValid: contractedDraft.items.length > 0,
      buyerHandoffMappingValid: contractedDraft.items.some((item) => item.itemType !== "work"),
      v4ClarificationExperience: null,
      roadScopeResolution,
    };
  }
  const parseResult = parseInlineWorkEstimatePrompt(input);
  const currency = input.currency ?? "KGS";
  const multiDomainRoute = routeMultiDomainReferencePromptV4(input.rawInput);
  const exactMultiDomainReferencePrompt =
    isExactMultiDomainReferencePromptV4(input.rawInput);
  const multiDomainAsphaltSelection =
    exactMultiDomainReferencePrompt &&
    multiDomainRoute.kind === "MATCH" &&
    multiDomainRoute.catalogWorkId === "asphalt_pavement";
  const exactProfessionalTemplateDraft = !input.selectedTemplateId && !input.selectedWorkKey
    ? buildProfessionalTemplateDraftFromPrompt({ prompt: input.rawInput, currency })
    : null;
  // The family can be intentionally broad (for example
  // `paving_roads_landscape` also owns non-road earthworks templates). Scope
  // selection must bind to the concrete catalog work/template, otherwise a
  // volume-only earthworks request is incorrectly blocked as an ambiguous road.
  const requestedCatalogWorkId = input.selectedWorkKey ??
    input.selectedTemplateId ??
    parseResult.matchedTemplate?.templateId ??
    "";
  const explicitlySelectedCatalogWorkId = (input.selectedWorkKey ?? input.selectedTemplateId)?.trim() ?? "";
  const explicitlySelectedProfessionalPassport =
    explicitlySelectedCatalogWorkId &&
    explicitlySelectedCatalogWorkId !== ASPHALT_WORK_ID_V4 &&
    explicitlySelectedCatalogWorkId !== ASPHALT_V4_RUNTIME_TEMPLATE_ID
      ? loadProfessionalWorkPassportBuilder().buildProfessionalWorkPassport(
        explicitlySelectedCatalogWorkId,
      )
      : null;
  const exactSelectedProfessionalWorkId =
    explicitlySelectedProfessionalPassport
      ? explicitlySelectedCatalogWorkId
      : null;
  const promptMatchedProfessionalWorkId =
    exactProfessionalTemplateDraft?.selectedWork?.selectedWorkKey?.trim() ?? "";
  // A typed professional-template match identifies one catalog operation even
  // when that operation has a road-related id (milling, compaction, demolition,
  // patch repair, and similar component work). The scope selector is reserved
  // for broad road intent where no exact professional operation was resolved.
  const exactPromptProfessionalWorkId = promptMatchedProfessionalWorkId || null;
  const explicitlySelectedScope = roadScopeIdForProfileV4(
    input.paramOverrides?.selectedRoadScope?.value ?? input.paramOverrides?.scope_profile?.value,
  );
  const textRoadScopeResolution = resolveRoadEstimateScopeV4({
    originalText: input.rawInput,
    requestedCatalogWorkId,
    selectedScopeId: explicitlySelectedScope,
    exactProfessionalWorkId: exactPromptProfessionalWorkId ?? exactSelectedProfessionalWorkId,
  });
  const roadScopeResolution =
    textRoadScopeResolution.resolverStatus !== "RESOLVED" &&
    multiDomainAsphaltSelection
      ? resolveRoadEstimateScopeV4({
        originalText: input.rawInput,
        requestedCatalogWorkId,
        selectedScopeId: "ROAD_SURFACING_ONLY",
      })
      : textRoadScopeResolution;
  if (roadScopeResolution.resolverStatus === "NEEDS_SCOPE_SELECTION" && !roadworksWaveA) {
    return {
      parseResult,
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "road_scope_selection_required",
      pdfMappingValid: false,
      buyerHandoffMappingValid: false,
      v4ClarificationExperience: null,
      roadScopeResolution,
    };
  }
  if (roadworksWaveA && (explicitRoadworksWaveASelection || preferSpecificRoadworksWaveA)) {
    const contractedDraft = applyProfessionalBoqRuntimeContract(
      roadworksWaveA.draft,
      { prompt: input.rawInput },
    );
    return {
      parseResult,
      draft: contractedDraft,
      canBuildPreliminaryEstimate: contractedDraft.items.length > 0,
      blockingReason: contractedDraft.items.length > 0 ? undefined : "draft_empty",
      pdfMappingValid: contractedDraft.items.length > 0,
      buyerHandoffMappingValid: contractedDraft.items.some((item) => item.itemType !== "work"),
      v4ClarificationExperience: null,
      roadScopeResolution,
    };
  }
  const fallbackDraft = shouldUseProfessionalBoqOpenWorldFallback(input.rawInput)
    ? buildDynamicProfessionalBoqDraftFromPrompt({ prompt: input.rawInput, currency })
    : null;
  const fastNonRoadOpenWorldDraft = Boolean(
    fallbackDraft &&
    !parseResult.matchedTemplate &&
    !exactProfessionalTemplateDraft &&
    !exactSelectedProfessionalWorkId &&
    !input.selectedTemplateId &&
    !input.selectedWorkKey &&
    !exactMultiDomainReferencePrompt &&
    roadScopeResolution.resolverStatus === "NOT_ROAD",
  );
  if (fastNonRoadOpenWorldDraft && fallbackDraft) {
    const contractedDraft = applyProfessionalBoqRuntimeContract(
      fallbackDraft,
      { prompt: input.rawInput },
    );
    return {
      parseResult,
      draft: contractedDraft,
      canBuildPreliminaryEstimate: contractedDraft.items.length > 0,
      blockingReason: contractedDraft.items.length > 0 ? undefined : "draft_empty",
      pdfMappingValid: contractedDraft.items.length > 0,
      buyerHandoffMappingValid: contractedDraft.items.some(
        (item) => item.itemType !== "work",
      ),
      v4ClarificationExperience: null,
      roadScopeResolution,
    };
  }
  // An exact user selection is authoritative and is selected before the broad
  // prompt-matched fallback below. Building both drafts duplicated a complete
  // passport/BOQ projection while the fallback could never be consumed.
  const passportBackedDraft = exactSelectedProfessionalWorkId
    ? null
    : buildPassportBackedDraft({
      parseResult,
      currency,
    });
  const explicitlySelectedPassportDraft = exactSelectedProfessionalWorkId
    ? buildPassportBackedDraft({
      parseResult,
      currency,
      selectedTemplateId: exactSelectedProfessionalWorkId,
      professionalPassport: explicitlySelectedProfessionalPassport,
    })
    : null;
  const expandedCalculatorDraft = buildExpandedDraft({ parseResult, currency });
  const preferExpandedCalculatorDraft =
    (
      parseResult.matchedTemplate?.family === "solar_power_plant" &&
      parseResult.rawInputFacts.some((fact) =>
        fact.canonical_parameter_key === "scale_class" &&
        fact.normalized_value === "utility_scale"
      )
    ) ||
    parseResult.matchedTemplate?.family === "village_water_supply" ||
    parseResult.matchedTemplate?.family === "earth_dam";
  const capitalRenovationDraft = buildCapitalRenovationDraft({
    sourceInput: input,
    parseResult,
    currency,
  });
  const asphaltV4 = buildAsphaltV4Draft({
    sourceInput: input,
    parseResult,
    currency,
    roadScopeResolution,
    allowMultiDomainAsphaltFallback: multiDomainAsphaltSelection,
  });
  const multiDomainReferenceV4 =
    loadMultiDomainReferenceProductionDraftBuilder()
      .buildMultiDomainReferenceProductionDraftV4({
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
      roadScopeResolution,
    };
  }

  const explicitLegacyTemplateDraft =
    (input.selectedTemplateId || input.selectedWorkKey) &&
    (
      parseResult.matchedTemplate?.templateId === input.selectedTemplateId ||
      parseResult.matchedTemplate?.family === input.selectedWorkKey
    )
      ? expandedCalculatorDraft
      : null;
  const explicitMultiDomainPassport =
    input.selectedTemplateId ===
    multiDomainReferenceV4?.passport.professionalEstimatePassportId;
  const canonicalStripFoundationHandoff = Boolean(
    parseResult.matchedTemplate?.family === "strip_foundation" &&
    expandedCalculatorDraft?.items.some((item) =>
      item.sourceParameters?.canonicalBackendHandoffRequired === true),
  );
  const allowMultiDomainReferenceDraft =
    !exactSelectedProfessionalWorkId &&
    !canonicalStripFoundationHandoff &&
    (exactMultiDomainReferencePrompt ||
      explicitMultiDomainPassport);
  // A resolved V4 scope is authoritative regardless of row count. Using an
  // arbitrary >50 threshold sent valid narrow scopes to the 200-row generic
  // legacy BOQ and lost their assembly/revision identity.
  const preferRichAsphaltV4 = Boolean(asphaltV4 && asphaltV4.draft.items.length > 0);
  const preferResolvedAsphaltV4OverLegacyRoadDraft = Boolean(
    preferRichAsphaltV4 &&
    (
      explicitlySelectedScope ||
      roadScopeResolution.selectedScopeId === "FULL_PAVEMENT_STRUCTURE" ||
      roadScopeResolution.selectedScopeId === "FULL_ROAD_INFRASTRUCTURE"
    ),
  );
  const draft =
    (preferResolvedAsphaltV4OverLegacyRoadDraft ? asphaltV4?.draft : null) ??
    (allowMultiDomainReferenceDraft ? multiDomainReferenceV4?.draft : null) ??
    (canonicalStripFoundationHandoff ? expandedCalculatorDraft : null) ??
    (explicitRoadworksWaveASelection || preferSpecificRoadworksWaveA
      ? roadworksWaveA?.draft
      : null) ??
    explicitlySelectedPassportDraft ??
    explicitLegacyTemplateDraft ??
    (preferRichAsphaltV4 ? asphaltV4?.draft : null) ??
    (shouldPreferSpecificProfessionalFallback(fallbackDraft) && !passportBackedDraft
      ? fallbackDraft
      : capitalRenovationDraft ??
      (preferExpandedCalculatorDraft ? expandedCalculatorDraft : null) ??
      exactProfessionalTemplateDraft ??
      passportBackedDraft ??
      expandedCalculatorDraft ??
      buildProductionDraft({ parseResult, currency, countryCode: input.countryCode }) ??
      fallbackDraft);
  const contractedDraft = draft && draft.items.every((item) =>
    item.sourceParameters?.asphaltV4 === true || item.sourceParameters?.multiDomainReferenceV4 === true)
    ? draft
    : draft
    ? applyProfessionalBoqRuntimeContract(draft, { prompt: input.rawInput })
    : null;
  const canonicalBackendHandoffPending = Boolean(
    contractedDraft?.items.length &&
    contractedDraft.items.every((item) =>
      item.sourceParameters?.canonicalBackendHandoffRequired === true),
  );

  return {
    parseResult,
    draft: contractedDraft,
    canBuildPreliminaryEstimate: Boolean(
      contractedDraft && contractedDraft.items.length > 0 && !canonicalBackendHandoffPending,
    ),
    blockingReason: canonicalBackendHandoffPending
      ? "canonical_backend_handoff_required"
      : contractedDraft && contractedDraft.items.length > 0
      ? undefined
      : asphaltV4
        ? "v4_work_specific_inputs_required"
        : "draft_empty",
    pdfMappingValid: Boolean(
      contractedDraft && contractedDraft.items.length > 0 && !canonicalBackendHandoffPending,
    ),
    buyerHandoffMappingValid: Boolean(
      contractedDraft &&
      !canonicalBackendHandoffPending &&
      contractedDraft.items.some((item) => item.itemType !== "work"),
    ),
    v4ClarificationExperience: asphaltV4?.clarification ?? null,
    roadScopeResolution,
  };
}
