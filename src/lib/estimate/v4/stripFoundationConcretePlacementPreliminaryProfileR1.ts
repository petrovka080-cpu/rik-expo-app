import sourcePack from "../../../../data/estimate-benchmarks/source-packs/strip-foundation-concrete-placement-preliminary-profile-r1.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;
type CostTreatment =
  | "OWN_COST"
  | "INCLUDED_IN_RESOURCE_ROWS"
  | "CONTROL_OR_DOCUMENT";
type RuntimeClassification = "NORMATIVE" | "ASSUMPTION" | "DERIVED";

export const STRIP_POUR_PROFILE_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_large_area";
export const STRIP_POUR_PROFILE_SOURCE_ID =
  "strip_foundation_concrete_placement_preliminary_profile_r1";
export const STRIP_POUR_PROFILE_NORM_ID =
  "profile:strip-foundation-concrete-placement:large-area:r1";
export const STRIP_POUR_SOURCE_PACK_SHA256 =
  "48b74862d1cff07636658b28abe48f4e6acf74e592489914fda4162d191d14f2";

export const STRIP_POUR_PROFILE_SOURCE_METADATA = Object.freeze({
  source_title: "Полный предварительный профиль отдельного бетонирования ленточного фундамента",
  source_authority: "Минстрой Кыргызской Республики; NRMCA; ACI; ASTM; Putzmeister",
  source_document_version: "STRIP_FOUNDATION_CONCRETE_PLACEMENT_PRELIMINARY_PROFILE_R1_2026-09-23",
  definition_hash: STRIP_POUR_SOURCE_PACK_SHA256,
  source_kind: "COMPOSITE_TECHNOLOGY_PROFILE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/422/show",
  artifact_sha256: STRIP_POUR_SOURCE_PACK_SHA256,
  effective_from: "2026-09-23",
  exact_locator: [
    "КРЕР № 6, 06-01-001-09, PDF page 18",
    "NRMCA CIP 31, p. 2",
    "ACI PRC-309-05 public preview",
    "ACI SPEC-308.1-23 public preview",
    "Putzmeister M33-4 official technical data",
    "ASTM official concrete standards index: C172, C143, C1064, C31 and C39",
    "data/estimate-benchmarks/source-packs/strip-foundation-concrete-placement-preliminary-profile-r1.json",
  ].join("; "),
  use_restriction: "Только отдельно заказанное бетонирование подготовленной ленточной конструкции. Земляные работы, арматура и опалубка не входят. Значения предварительного профиля видимы и заменяются проектной геометрией, ППР, графиком поставки, паспортом выбранной техники и планом контроля; они не объявляются универсальными нормами.",
});

const PROFILE = sourcePack.selectedPreliminaryProfile;

export const STRIP_POUR_PROFILE_SHORT_INPUT = Object.freeze({
  plan_dimension_concrete_volume_m3: 240,
});

export const STRIP_POUR_PROFILE_RUNTIME_INPUT = Object.freeze({
  product_profile_id: PROFILE.productProfileId,
  mixture_designation: PROFILE.mixtureDesignation,
  placement_method: PROFILE.placementMethod,
  selected_contingency_percent: PROFILE.selectedContingencyPercent,
  curing_method: PROFILE.curingMethod,
  curing_sheet_specification: PROFILE.curingSheetSpecification,
  exposed_curing_surface_ratio_m2_m3: PROFILE.exposedCuringSurfaceRatioM2M3,
  curing_sheet_overlap_factor: PROFILE.curingSheetOverlapFactor,
  pump_rated_output_m3_h: PROFILE.pumpRatedOutputM3H,
  pump_site_utilization_factor: PROFILE.pumpSiteUtilizationFactor,
  vibrator_machine_h_per_m3: PROFILE.vibratorMachineHPerM3,
  mixer_capacity_m3: PROFILE.mixerCapacityM3,
  qa_lot_volume_m3: PROFILE.qaLotVolumeM3,
  delivery_pricing_mode: PROFILE.deliveryPricingMode,
  construction_joint_mode: PROFILE.constructionJointMode,
});

export const STRIP_POUR_PROFILE_ACCEPTANCE_INPUT = Object.freeze({
  ...STRIP_POUR_PROFILE_SHORT_INPUT,
  ...STRIP_POUR_PROFILE_RUNTIME_INPUT,
  plan_volume_calculation_reference: "SF-POUR-LARGE-AREA-VOLUME-REV-A",
  mix_design_or_project_specification_reference: "SF-POUR-LARGE-AREA-MIX-B25-REV-A",
  placement_location: "Ленточный фундамент, захватка отдельного бетонирования 150 м",
  contingency_selection_justification: "Предварительный резерв 8%; заменить подтверждённым расчётом заказа",
  delivery_schedule_and_truck_capacity: "Предварительно автобетоносмесители 8 м³; заменить графиком поставщика",
  producer_order_confirmation: "PRELIMINARY_NOT_ORDERED",
  estimator_approval_reference: "PRELIMINARY_ESTIMATE",
});

const NORMATIVE_RUNTIME_IDS = new Set([
  "product_profile_id",
  "pump_rated_output_m3_h",
  "vibrator_machine_h_per_m3",
]);
const DERIVED_RUNTIME_IDS = new Set<string>();

export const STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(STRIP_POUR_PROFILE_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    NORMATIVE_RUNTIME_IDS.has(parameterId)
      ? "NORMATIVE"
      : DERIVED_RUNTIME_IDS.has(parameterId)
        ? "DERIVED"
        : "ASSUMPTION",
  ])),
) as Readonly<Record<string, RuntimeClassification>>;

export const STRIP_POUR_PROFILE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(STRIP_POUR_PROFILE_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    [STRIP_POUR_PROFILE_SOURCE_ID],
  ])),
);

const SOURCE_ID_BY_PARAMETER: Readonly<Record<string, string>> = Object.freeze({
  product_profile_id: "nrmca_cip31_ready_mix_order",
  mixture_designation: "selected_preliminary_strip_pour_profile_r1",
  placement_method: "selected_preliminary_strip_pour_profile_r1",
  selected_contingency_percent: "nrmca_cip31_ready_mix_order",
  curing_method: "aci_308_1_23_external_curing",
  curing_sheet_specification: "aci_308_1_23_external_curing",
  exposed_curing_surface_ratio_m2_m3: "selected_preliminary_strip_pour_profile_r1",
  curing_sheet_overlap_factor: "selected_preliminary_strip_pour_profile_r1",
  pump_rated_output_m3_h: "putzmeister_m33_4_technical_data",
  pump_site_utilization_factor: "selected_preliminary_strip_pour_profile_r1",
  vibrator_machine_h_per_m3: "krer_06_2015_06_01_001_09",
  mixer_capacity_m3: "selected_preliminary_strip_pour_profile_r1",
  qa_lot_volume_m3: "astm_fresh_and_hardened_concrete_control",
  delivery_pricing_mode: "selected_preliminary_strip_pour_profile_r1",
  construction_joint_mode: "selected_preliminary_strip_pour_profile_r1",
});

type ParameterSpec = Readonly<{
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "text" | "enum";
  unitId: string | null;
  required: boolean;
  values?: readonly string[];
  min?: number;
  max?: number;
  requiredWhen?: Json;
  forbiddenWhen?: Json;
}>;

const jointWaterstop = Object.freeze({
  kind: "equals",
  parameterId: "construction_joint_mode",
  value: "WATERSTOP",
});
const noJoint = Object.freeze({
  kind: "equals",
  parameterId: "construction_joint_mode",
  value: "NONE",
});

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { parameterId: "plan_dimension_concrete_volume_m3", titleRu: "Проектный объём бетона", valueType: "decimal", unitId: "m3", required: true, min: 0.001 },
  { parameterId: "product_profile_id", titleRu: "Правило заказа товарного бетона", valueType: "enum", unitId: null, required: true, values: [PROFILE.productProfileId] },
  { parameterId: "plan_volume_calculation_reference", titleRu: "Основание проектного объёма", valueType: "text", unitId: null, required: false },
  { parameterId: "mix_design_or_project_specification_reference", titleRu: "Спецификация бетонной смеси", valueType: "text", unitId: null, required: false },
  { parameterId: "mixture_designation", titleRu: "Обозначение бетонной смеси", valueType: "text", unitId: null, required: true },
  { parameterId: "placement_location", titleRu: "Участок бетонирования", valueType: "text", unitId: null, required: false },
  { parameterId: "placement_method", titleRu: "Способ подачи бетона", valueType: "enum", unitId: null, required: true, values: ["pump"] },
  { parameterId: "selected_contingency_percent", titleRu: "Резерв заказа бетона", valueType: "decimal", unitId: "percent", required: true, min: 4, max: 10 },
  { parameterId: "contingency_selection_justification", titleRu: "Обоснование резерва", valueType: "text", unitId: null, required: false },
  { parameterId: "delivery_schedule_and_truck_capacity", titleRu: "График поставки и вместимость миксеров", valueType: "text", unitId: null, required: false },
  { parameterId: "producer_order_confirmation", titleRu: "Подтверждение заказа производителем", valueType: "text", unitId: null, required: false },
  { parameterId: "estimator_approval_reference", titleRu: "Подтверждение расчёта сметчиком", valueType: "text", unitId: null, required: false },
  { parameterId: "curing_method", titleRu: "Способ внешнего ухода за бетоном", valueType: "enum", unitId: null, required: true, values: ["IMPERVIOUS_SHEET"] },
  { parameterId: "curing_sheet_specification", titleRu: "Плёнка для ухода за бетоном", valueType: "text", unitId: null, required: true },
  { parameterId: "exposed_curing_surface_ratio_m2_m3", titleRu: "Открытая поверхность ухода на 1 м³ бетона", valueType: "decimal", unitId: "m2_per_m3", required: true, min: 0.01, max: 20 },
  { parameterId: "curing_sheet_overlap_factor", titleRu: "Коэффициент нахлёстов плёнки", valueType: "decimal", unitId: "ratio", required: true, min: 1, max: 2 },
  { parameterId: "pump_rated_output_m3_h", titleRu: "Паспортная подача выбранного бетононасоса", valueType: "decimal", unitId: "m3_per_hour", required: true, min: 1, max: 300 },
  { parameterId: "pump_site_utilization_factor", titleRu: "Коэффициент использования подачи насоса на объекте", valueType: "decimal", unitId: "ratio", required: true, min: 0.05, max: 1 },
  { parameterId: "vibrator_machine_h_per_m3", titleRu: "Машино-часы глубинного вибратора на 1 м³", valueType: "decimal", unitId: "machine_hour_per_m3", required: true, min: 0.001, max: 10 },
  { parameterId: "mixer_capacity_m3", titleRu: "Вместимость автобетоносмесителя", valueType: "decimal", unitId: "m3", required: true, min: 1, max: 20 },
  { parameterId: "qa_lot_volume_m3", titleRu: "Предварительный объём партии контроля", valueType: "decimal", unitId: "m3", required: true, min: 1, max: 1_000 },
  { parameterId: "delivery_pricing_mode", titleRu: "Учёт доставки товарного бетона", valueType: "enum", unitId: null, required: true, values: ["SEPARATE", "INCLUDED_IN_SUPPLY"] },
  { parameterId: "construction_joint_mode", titleRu: "Рабочий шов в границе заказа", valueType: "enum", unitId: null, required: true, values: ["NONE", "WATERSTOP"] },
  { parameterId: "construction_joint_waterstop_specification", titleRu: "Гидрошпонка рабочего шва", valueType: "text", unitId: null, required: false, requiredWhen: jointWaterstop, forbiddenWhen: noJoint },
  { parameterId: "construction_joint_waterstop_length_m", titleRu: "Длина гидрошпонки рабочего шва", valueType: "decimal", unitId: "m", required: false, min: 0.001, requiredWhen: jointWaterstop, forbiddenWhen: noJoint },
]);

function parameterGuide(parameterId: string, titleRu: string): Readonly<{
  visibilityRole: "USER_INPUT";
  valueSourceRole: string;
  guideKind: string;
  guideShortRu: string;
}> {
  if (parameterId === "plan_dimension_concrete_volume_m3") return {
    visibilityRole: "USER_INPUT",
    valueSourceRole: "USER_MEASURED",
    guideKind: "MEASUREMENT_RULE",
    guideShortRu: "Введите объём по проектной геометрии или ведомости объёмов; предварительно принято 240 м³ для сценария 150 м.",
  };
  if (parameterId === "construction_joint_waterstop_specification"
    || parameterId === "construction_joint_waterstop_length_m") return {
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_CONDITIONAL_INPUT",
    guideKind: "PROJECT_DEFINED",
    guideShortRu: `${titleRu}: заполняется только если рабочий шов с гидрошпонкой входит в выбранную границу заказа.`,
  };
  if (!Object.hasOwn(STRIP_POUR_PROFILE_RUNTIME_INPUT, parameterId)) return {
    visibilityRole: "USER_INPUT",
    valueSourceRole: "OPTIONAL_PROJECT_DOCUMENTATION",
    guideKind: "PROJECT_DEFINED",
    guideShortRu: `${titleRu}: необязательная ссылка для уточнения уже рассчитанной первой сметы.`,
  };
  const classification = STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION[parameterId];
  return {
    visibilityRole: "USER_INPUT",
    valueSourceRole: "USER_REPLACEABLE_PRELIMINARY_PROFILE",
    guideKind: classification === "NORMATIVE" ? "MANDATORY_NORM_VALUE" : "PRACTICE_REFERENCE",
    guideShortRu: classification === "NORMATIVE"
      ? `${titleRu}: в поле применено подтверждённое значение указанного источника; замените при выборе другой техники или правила.`
      : `${titleRu}: в поле применено явное предварительное значение; замените данными проекта, ППР, поставщика или плана контроля.`,
  };
}

export type StripPourProfileParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

const SOURCE_RECORDS = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));

export const STRIP_POUR_PROFILE_PARAMETERS:
readonly StripPourProfileParameter[] = Object.freeze(PARAMETER_SPECS.map((spec, ordinal) => {
  const guide = parameterGuide(spec.parameterId, spec.titleRu);
  const sourceId = SOURCE_ID_BY_PARAMETER[spec.parameterId]
    ?? "selected_preliminary_strip_pour_profile_r1";
  const source = SOURCE_RECORDS.get(sourceId);
  return {
    parameter_id: spec.parameterId,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.titleRu,
    required: spec.required,
    default_value: null,
    constraints_json: {
      ...(spec.values ? { values: [...spec.values] } : {}),
      ...(spec.min == null ? {} : { min: spec.min }),
      ...(spec.max == null ? {} : { max: spec.max }),
      ...(spec.valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...(spec.requiredWhen ? { requiredWhen: spec.requiredWhen } : {}),
      ...(spec.forbiddenWhen ? { forbiddenWhen: spec.forbiddenWhen } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.strip-foundation-concrete-placement-preliminary-profile-r1",
      semantic_parameter_key: `strip-foundation-concrete-placement-profile:${spec.parameterId}`,
      visibility_role: guide.visibilityRole,
      value_source_role: guide.valueSourceRole,
      input_origin_class: spec.parameterId === "plan_dimension_concrete_volume_m3"
        ? "KNOWN_WORK_SCOPE"
        : Object.hasOwn(STRIP_POUR_PROFILE_RUNTIME_INPUT, spec.parameterId)
          ? "SELECTED_VISIBLE_PRELIMINARY_PROFILE"
          : "OPTIONAL_PROJECT_DOCUMENTATION",
      preliminary_compilation_allowed: spec.parameterId !== "plan_dimension_concrete_volume_m3",
      source_confirmation_required: false,
      guide: {
        guide_kind: guide.guideKind,
        guide_short_ru: guide.guideShortRu,
        source_role: STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION[spec.parameterId] === "NORMATIVE"
          ? "PRIMARY_NORM_OR_SELECTED_EQUIPMENT_PASSPORT"
          : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
        source_document: sourceId,
        source_locator: source?.exactLocator ?? STRIP_POUR_PROFILE_SOURCE_METADATA.exact_locator,
        guide_version: "strip-foundation-concrete-placement-preliminary-profile-r1",
        source_snapshot_hash: STRIP_POUR_SOURCE_PACK_SHA256,
        applicability: "Отдельно заказанное бетонирование подготовленного ленточного фундамента на большой захватке.",
        verified_at: "2026-09-23T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_PROFILE_VALUES_WITH_PROJECT_DATA",
      },
      hidden_default_forbidden: spec.parameterId === "plan_dimension_concrete_volume_m3",
      runtime_profile_value: Object.hasOwn(STRIP_POUR_PROFILE_RUNTIME_INPUT, spec.parameterId),
      runtime_profile_classification: STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION[spec.parameterId] ?? null,
      synthetic: false,
    },
  };
}));

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const ORDER_EXPRESSION =
  "plan_dimension_concrete_volume_m3*(1+selected_contingency_percent/100)";
const MIXER_TRIPS_EXPRESSION = `ceil(${ORDER_EXPRESSION}/mixer_capacity_m3)`;
const QA_LOTS_EXPRESSION = "ceil(plan_dimension_concrete_volume_m3/qa_lot_volume_m3)";

export const STRIP_POUR_PROFILE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("strip_pour_net_volume_v1", "m3", "plan_dimension_concrete_volume_m3"),
  formula("strip_pour_concrete_order_v1", "m3", ORDER_EXPRESSION),
  formula("strip_pour_curing_area_v1", "m2", "plan_dimension_concrete_volume_m3*exposed_curing_surface_ratio_m2_m3"),
  formula("strip_pour_curing_sheet_v1", "m2", "plan_dimension_concrete_volume_m3*exposed_curing_surface_ratio_m2_m3*curing_sheet_overlap_factor"),
  formula("strip_pour_pump_machine_h_v1", "machine_hour", "plan_dimension_concrete_volume_m3/(pump_rated_output_m3_h*pump_site_utilization_factor)"),
  formula("strip_pour_vibrator_machine_h_v1", "machine_hour", "plan_dimension_concrete_volume_m3*vibrator_machine_h_per_m3"),
  formula("strip_pour_mixer_trips_v1", "service", MIXER_TRIPS_EXPRESSION),
  formula("strip_pour_mixer_trips_pcs_v1", "pcs", MIXER_TRIPS_EXPRESSION),
  formula("strip_pour_mixer_trips_document_v1", "document", MIXER_TRIPS_EXPRESSION),
  formula("strip_pour_qa_lots_v1", "pcs", QA_LOTS_EXPRESSION),
  formula("strip_pour_qa_lots_document_v1", "document", QA_LOTS_EXPRESSION),
  formula("strip_pour_one_service_v1", "service", "1"),
  formula("strip_pour_one_set_v1", "set", "1"),
  formula("strip_pour_one_pcs_v1", "pcs", "1"),
  formula("strip_pour_one_document_v1", "document", "1"),
  formula("strip_pour_joint_length_v1", "m", "construction_joint_waterstop_length_m"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: string) => ({ kind: "equals", parameterId, value });

type IndependentComponent = Readonly<{
  semanticKey: string;
  sourceId: string;
  formulaId: string | null;
  condition: string;
  resolution: Readonly<{ kind: string; rowId?: string; parentRowId?: string }>;
}>;
const INDEPENDENT_REQUIRED_COMPONENTS = sourcePack.independentRequiredComponents as
  readonly IndependentComponent[];
const SOURCE_ID_BY_ROW_ID = new Map(INDEPENDENT_REQUIRED_COMPONENTS.flatMap((component) =>
  component.resolution.rowId ? [[component.resolution.rowId, component.sourceId] as const] : []));

type RowSpec = Readonly<{
  rowId: string;
  section: string;
  category: "material" | "equipment" | "service" | "construction_work";
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: CostTreatment;
  procurementEligible?: boolean;
  inclusionAst?: Json;
  parentRowId?: string;
  titleParameterIds?: readonly string[];
  inputParameterIds?: readonly string[];
}>;

function resource(input: RowSpec & Readonly<{ ordinal: number }>): CanonicalEstimateResourceDefinition {
  const sourceId = SOURCE_ID_BY_ROW_ID.get(input.rowId)
    ?? "selected_preliminary_strip_pour_profile_r1";
  const source = SOURCE_RECORDS.get(sourceId);
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `strip-foundation-concrete-placement-profile:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
    preliminaryProfileId: STRIP_POUR_PROFILE_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: [...input.titleParameterIds],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    ...(input.inputParameterIds ? { inputParameterIds: [...input.inputParameterIds] } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "TECHNOLOGY_QUANTITY_AND_QA_CROSSCHECK",
    sourcePackSha256: STRIP_POUR_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId,
      source_id: sourceId,
      normId: STRIP_POUR_PROFILE_NORM_ID,
      norm_id: STRIP_POUR_PROFILE_NORM_ID,
      normVersion: STRIP_POUR_PROFILE_SOURCE_METADATA.source_document_version,
      source_document_version: STRIP_POUR_PROFILE_SOURCE_METADATA.source_document_version,
      source_title: source?.authority ?? STRIP_POUR_PROFILE_SOURCE_METADATA.source_title,
      source_url: source?.officialUrl ?? null,
      exact_locator: source?.exactLocator ?? STRIP_POUR_PROFILE_SOURCE_METADATA.exact_locator,
      source_definition_hash: STRIP_POUR_SOURCE_PACK_SHA256,
    }],
    excludedAdjacentScope: [
      "excavation and soil disposal",
      "reinforcement supply, fabrication and installation",
      "formwork supply, installation and removal",
      "invented prices",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible ?? input.costTreatment === "OWN_COST",
    cost_owner_id: input.costTreatment === "OWN_COST" ? input.rowId : null,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const pump = equals("placement_method", "pump");
const sheetCuring = equals("curing_method", "IMPERVIOUS_SHEET");
const separateDelivery = equals("delivery_pricing_mode", "SEPARATE");
const waterstop = equals("construction_joint_mode", "WATERSTOP");

const rows: readonly RowSpec[] = [
  { rowId: "strip-pour:material:ready-mix", section: "Материалы", category: "material", titleRu: "Товарный бетон", unitId: "m3", formulaId: "strip_pour_concrete_order_v1", costTreatment: "OWN_COST", titleParameterIds: ["mixture_designation"], inputParameterIds: ["product_profile_id", "plan_volume_calculation_reference", "mix_design_or_project_specification_reference", "placement_location", "contingency_selection_justification", "delivery_schedule_and_truck_capacity", "producer_order_confirmation", "estimator_approval_reference"] },
  { rowId: "strip-pour:material:curing-sheet", section: "Материалы", category: "material", titleRu: "Плёнка для ухода за свежеуложенным бетоном", unitId: "m2", formulaId: "strip_pour_curing_sheet_v1", costTreatment: "OWN_COST", inclusionAst: sheetCuring, titleParameterIds: ["curing_sheet_specification"] },

  { rowId: "strip-pour:work:receive", section: "Работы", category: "construction_work", titleRu: "Приём и направление бетонной смеси в захватку", unitId: "m3", formulaId: "strip_pour_net_volume_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:work:place", section: "Работы", category: "construction_work", titleRu: "Подача, укладка и распределение бетонной смеси", unitId: "m3", formulaId: "strip_pour_net_volume_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:work:consolidate", section: "Работы", category: "construction_work", titleRu: "Послойное виброуплотнение бетонной смеси", unitId: "m3", formulaId: "strip_pour_net_volume_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:work:finish-surface", section: "Работы", category: "construction_work", titleRu: "Выравнивание и отделка открытой поверхности бетона", unitId: "m2", formulaId: "strip_pour_curing_area_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:work:install-curing", section: "Работы", category: "construction_work", titleRu: "Укрытие поверхности плёнкой для ухода за бетоном", unitId: "m2", formulaId: "strip_pour_curing_area_v1", costTreatment: "OWN_COST", inclusionAst: sheetCuring },
  { rowId: "strip-pour:work:maintain-curing", section: "Работы", category: "construction_work", titleRu: "Контроль и поддержание защиты бетона в период ухода", unitId: "m2", formulaId: "strip_pour_curing_area_v1", costTreatment: "OWN_COST", inclusionAst: sheetCuring },
  { rowId: "strip-pour:work:remove-curing", section: "Работы", category: "construction_work", titleRu: "Снятие плёнки после завершения периода ухода", unitId: "m2", formulaId: "strip_pour_curing_area_v1", costTreatment: "OWN_COST", inclusionAst: sheetCuring },

  { rowId: "strip-pour:equipment:pump", section: "Механизмы", category: "equipment", titleRu: "Автобетононасос Putzmeister M33-4 выбранного предварительного профиля", unitId: "machine_hour", formulaId: "strip_pour_pump_machine_h_v1", costTreatment: "OWN_COST", inclusionAst: pump },
  { rowId: "strip-pour:included:pump-operator", section: "Состав механизма", category: "construction_work", titleRu: "Оператор автобетононасоса — в составе машино-часа", unitId: "machine_hour", formulaId: "strip_pour_pump_machine_h_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusionAst: pump, parentRowId: "strip-pour:equipment:pump" },
  { rowId: "strip-pour:included:pump-pipeline", section: "Состав механизма", category: "equipment", titleRu: "Бетоновод, рукава и соединения — в составе бетононасоса", unitId: "machine_hour", formulaId: "strip_pour_pump_machine_h_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusionAst: pump, parentRowId: "strip-pour:equipment:pump" },
  { rowId: "strip-pour:included:pump-consumables", section: "Состав механизма", category: "service", titleRu: "Эксплуатационные жидкости и штатные расходники насоса — в составе машино-часа", unitId: "machine_hour", formulaId: "strip_pour_pump_machine_h_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusionAst: pump, parentRowId: "strip-pour:equipment:pump" },
  { rowId: "strip-pour:equipment:vibrator", section: "Механизмы", category: "equipment", titleRu: "Глубинный вибратор для уплотнения бетонной смеси", unitId: "machine_hour", formulaId: "strip_pour_vibrator_machine_h_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:included:vibrator-operator", section: "Состав механизма", category: "construction_work", titleRu: "Оператор глубинного вибратора — в составе операции уплотнения", unitId: "machine_hour", formulaId: "strip_pour_vibrator_machine_h_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "strip-pour:equipment:vibrator" },
  { rowId: "strip-pour:included:vibrator-consumables", section: "Состав механизма", category: "service", titleRu: "Штатные эксплуатационные расходники вибратора — в составе машино-часа", unitId: "machine_hour", formulaId: "strip_pour_vibrator_machine_h_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "strip-pour:equipment:vibrator" },
  { rowId: "strip-pour:equipment:reserve-vibrator", section: "Механизмы", category: "equipment", titleRu: "Резервный глубинный вибратор на непрерывную захватку", unitId: "service", formulaId: "strip_pour_one_service_v1", costTreatment: "OWN_COST" },

  { rowId: "strip-pour:delivery:mixer-trips", section: "Доставка", category: "service", titleRu: "Доставка товарного бетона автобетоносмесителями", unitId: "service", formulaId: "strip_pour_mixer_trips_v1", costTreatment: "OWN_COST", inclusionAst: separateDelivery },
  { rowId: "strip-pour:logistics:pump-mobilization", section: "Доставка и мобилизация", category: "service", titleRu: "Подача на объект и возврат автобетононасоса", unitId: "service", formulaId: "strip_pour_one_service_v1", costTreatment: "OWN_COST", inclusionAst: pump },
  { rowId: "strip-pour:logistics:pump-setup", section: "Организация бетонирования", category: "service", titleRu: "Развёртывание насоса, сборка и праймирование бетоновода, контролируемая промывка", unitId: "set", formulaId: "strip_pour_one_set_v1", costTreatment: "OWN_COST", inclusionAst: pump },
  { rowId: "strip-pour:logistics:vibrator-mobilization", section: "Доставка и мобилизация", category: "service", titleRu: "Доставка и возврат основного и резервного вибраторов", unitId: "service", formulaId: "strip_pour_one_service_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:organization:work-zone", section: "Организация бетонирования", category: "service", titleRu: "Безопасная рабочая зона насоса и миксеров, координация непрерывной подачи", unitId: "set", formulaId: "strip_pour_one_set_v1", costTreatment: "OWN_COST" },

  { rowId: "strip-pour:quality:pre-pour", section: "Контроль качества", category: "service", titleRu: "Проверка готовности захватки, подъезда, подачи, уплотнения и ухода до начала бетонирования", unitId: "pcs", formulaId: "strip_pour_one_pcs_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "strip-pour:quality:delivery-acceptance", section: "Контроль качества", category: "service", titleRu: "Входной контроль каждого миксера и сопроводительного талона", unitId: "pcs", formulaId: "strip_pour_mixer_trips_pcs_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "strip-pour:quality:sampling", section: "Лабораторный контроль", category: "service", titleRu: "Отбор проб свежеуложенной бетонной смеси", unitId: "pcs", formulaId: "strip_pour_qa_lots_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:quality:slump", section: "Лабораторный контроль", category: "service", titleRu: "Контроль подвижности бетонной смеси методом осадки конуса", unitId: "pcs", formulaId: "strip_pour_qa_lots_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:quality:temperature", section: "Лабораторный контроль", category: "service", titleRu: "Измерение температуры бетонной смеси", unitId: "pcs", formulaId: "strip_pour_qa_lots_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:quality:specimens", section: "Лабораторный контроль", category: "service", titleRu: "Изготовление комплекта контрольных образцов бетона", unitId: "pcs", formulaId: "strip_pour_qa_lots_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:quality:specimen-care", section: "Лабораторный контроль", category: "service", titleRu: "Начальный уход, перевозка и лабораторное хранение контрольных образцов", unitId: "pcs", formulaId: "strip_pour_qa_lots_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:quality:compression", section: "Лабораторный контроль", category: "service", titleRu: "Испытание контрольных образцов на прочность при сжатии", unitId: "pcs", formulaId: "strip_pour_qa_lots_v1", costTreatment: "OWN_COST" },
  { rowId: "strip-pour:quality:consolidation", section: "Контроль качества", category: "service", titleRu: "Операционный контроль послойной укладки и виброуплотнения", unitId: "pcs", formulaId: "strip_pour_qa_lots_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "strip-pour:quality:geometry", section: "Контроль качества", category: "service", titleRu: "Приёмочный контроль отметки, открытой поверхности и видимых дефектов", unitId: "pcs", formulaId: "strip_pour_one_pcs_v1", costTreatment: "CONTROL_OR_DOCUMENT" },

  { rowId: "strip-pour:document:pour-log", section: "Исполнительная документация", category: "service", titleRu: "Журнал бетонирования и ухода за бетоном", unitId: "document", formulaId: "strip_pour_one_document_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "strip-pour:document:delivery-tickets", section: "Исполнительная документация", category: "service", titleRu: "Комплект талонов поставки товарного бетона по каждому миксеру", unitId: "document", formulaId: "strip_pour_mixer_trips_document_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "strip-pour:document:lab-protocols", section: "Исполнительная документация", category: "service", titleRu: "Протоколы отбора проб и лабораторных испытаний", unitId: "document", formulaId: "strip_pour_qa_lots_document_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "strip-pour:document:execution-set", section: "Исполнительная документация", category: "service", titleRu: "Комплект исполнительной документации отдельного бетонирования", unitId: "document", formulaId: "strip_pour_one_document_v1", costTreatment: "CONTROL_OR_DOCUMENT" },

  { rowId: "strip-pour:joint:waterstop", section: "Рабочий шов по условию", category: "material", titleRu: "Гидрошпонка рабочего шва бетонирования", unitId: "m", formulaId: "strip_pour_joint_length_v1", costTreatment: "OWN_COST", inclusionAst: waterstop, titleParameterIds: ["construction_joint_waterstop_specification"] },
  { rowId: "strip-pour:joint:install-waterstop", section: "Рабочий шов по условию", category: "construction_work", titleRu: "Монтаж гидрошпонки рабочего шва бетонирования", unitId: "m", formulaId: "strip_pour_joint_length_v1", costTreatment: "OWN_COST", inclusionAst: waterstop },
];

export const STRIP_POUR_PROFILE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  rows.map((row, ordinal) => resource({ ...row, ordinal })),
);

const completenessEntries = sourcePack.independentRequiredComponents.map((component) => ({
  operationId: component.operationId,
  expectedResourceId: `required-component:${component.semanticKey}`,
  category: component.category,
  specification: component.specification,
  condition: component.condition,
  sourceId: component.sourceId,
  unitId: component.unitId,
  quantityRule: component.quantityRule,
  detailPrinciple: component.detailPrinciple,
  priceRelation: component.priceRelation,
  formulaId: component.formulaId,
  resolution: component.resolution,
}));

export const STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: STRIP_POUR_SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/strip-foundation-concrete-placement-preliminary-profile-r1.json",
  entries: completenessEntries,
});

export const STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS = Object.freeze(
  INDEPENDENT_REQUIRED_COMPONENTS.flatMap((component) =>
    component.resolution.kind !== "NOT_APPLICABLE"
      && component.condition !== "construction_joint_mode_waterstop"
      && component.resolution.rowId
      ? [component.resolution.rowId]
      : []),
);

export function stripPourMissingRequiredRows(
  actualRowIds: ReadonlySet<string>,
  options: Readonly<{ constructionJointMode?: "NONE" | "WATERSTOP" }> = {},
): readonly string[] {
  const expected = options.constructionJointMode === "WATERSTOP"
    ? INDEPENDENT_REQUIRED_COMPONENTS.flatMap((component) =>
      component.resolution.kind !== "NOT_APPLICABLE" && component.resolution.rowId
        ? [component.resolution.rowId]
        : [])
    : STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS;
  return expected.filter((rowId) => !actualRowIds.has(rowId));
}

export async function compileStripFoundationConcretePlacementPreliminaryProfileR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STRIP_POUR_PROFILE_CATALOG_ID;
  if (catalogId !== STRIP_POUR_PROFILE_CATALOG_ID) {
    throw new Error(`STRIP_POUR_PROFILE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileConcretePlacementPreliminaryProfileForCatalogR1(submittedParameters, {
    catalogId,
    compilerVersion:
      "canonical-estimate-compiler.strip-foundation-concrete-placement-preliminary-profile-r1",
  });
}

export async function compileConcretePlacementPreliminaryProfileForCatalogR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{
    catalogId: string;
    compilerVersion: string;
    parameterDefinitions?: readonly CanonicalEstimateParameterDefinition[];
    formulaDefinitions?: readonly CanonicalEstimateFormulaDefinition[];
    resourceDefinitions?: readonly CanonicalEstimateResourceDefinition[];
    confirmedParameters?: Readonly<Record<string, unknown>>;
  }>,
): Promise<CanonicalEstimateCompileCoreResult> {
  const resourceDefinitions = options.resourceDefinitions ?? STRIP_POUR_PROFILE_RESOURCES;
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: options.compilerVersion,
    catalogId: options.catalogId,
    primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
    parameterDefinitions: [...(options.parameterDefinitions ?? STRIP_POUR_PROFILE_PARAMETERS)],
    formulaDefinitions: [...(options.formulaDefinitions ?? STRIP_POUR_PROFILE_FORMULAS)],
    resourceDefinitions: [...resourceDefinitions],
    submittedParameters,
    confirmedParameters: options.confirmedParameters ?? STRIP_POUR_PROFILE_RUNTIME_INPUT,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: resourceDefinitions.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}

export const STRIP_POUR_PROFILE_SOURCE_SUMMARY = Object.freeze({
  sourceId: STRIP_POUR_PROFILE_SOURCE_ID,
  normId: STRIP_POUR_PROFILE_NORM_ID,
  sourcePackSha256: STRIP_POUR_SOURCE_PACK_SHA256,
  quantityModel: sourcePack.quantityModel,
  assumptionPolicy: PROFILE.assumptionPolicy,
});
