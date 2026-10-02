import sourcePack from "../../../../data/estimate-benchmarks/source-packs/slab-foundation-local-repair-s27-16.json";

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
type RuntimeClass = "NORMATIVE" | "ASSUMPTION" | "DERIVED";
type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE" | "CONTROL_OR_DOCUMENT";

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair";
export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_ID =
  "s27_17_slab_foundation_local_repair_source_pack";
export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID =
  "SLAB-FOUNDATION-LOCAL-REPAIR-S27-17-R2";
export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256 =
  "36ec6d235818e467678569e0b02fa67202faeebe62f520ff6eaf5990ec166578";

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_METADATA = Object.freeze({
  source_title:
    "NRMCA CIP 31/CIP 11 + Sika MonoTop-4012 и Sika Antisol A: профиль плиты с локальным ремонтом",
  source_authority: "NRMCA; Sika",
  source_document_version: "S27_17_REVIEWED_2026_09_30",
  definition_hash: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256,
  source_kind: "COMPOSITE_PRODUCT_AND_TECHNOLOGY_PROFILE",
  official_url: "https://www.nrmca.org/wp-content/uploads/2021/01/31pr.pdf",
  effective_from: "2026-09-30",
  exact_locator: sourcePack.sources.map((source) => `${source.sourceId}: ${source.exactLocator}`).join(" | "),
  use_restriction:
    "Плита бетонируется по принятому основанию; ремонт относится только к измеренным локальным дефектам глубиной 6–120 мм. Армирование и опалубка всей плиты не входят. Свойства бетонной смеси, толщина плиты и геометрия ремонта — факты объекта.",
});

const PROFILE = sourcePack.selectedPreliminaryProfile;

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT = Object.freeze({
  concrete_order_allowance_percent: PROFILE.concreteOrderAllowancePercent,
  placement_method: PROFILE.placementMethod,
  concrete_delivery_distance_km: PROFILE.concreteDeliveryDistanceKm,
  delivery_pricing_mode: "SEPARATE",
  curing_method: PROFILE.curingMethod,
  liquid_curing_coverage_m2_per_l: PROFILE.liquidCuringCoverageM2PerL,
  liquid_curing_package_l: PROFILE.liquidCuringPackageL,
  repair_mortar_kg_per_m2_mm: PROFILE.repairMortarKgPerM2Mm,
  repair_bag_kg: PROFILE.repairBagKg,
  repair_mixing_water_l_per_bag: PROFILE.repairMixingWaterLPerBag,
  winter_mode: PROFILE.winterMode,
  construction_joint_mode: PROFILE.constructionJointMode,
  quality_document_count: PROFILE.qualityDocumentCount,
});

const NORMATIVE_RUNTIME_IDS = new Set([
  "concrete_order_allowance_percent",
  "liquid_curing_coverage_m2_per_l",
  "liquid_curing_package_l",
  "repair_mortar_kg_per_m2_mm",
  "repair_bag_kg",
  "repair_mixing_water_l_per_bag",
]);
const DERIVED_RUNTIME_IDS = new Set(["quality_document_count"]);

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    NORMATIVE_RUNTIME_IDS.has(parameterId)
      ? "NORMATIVE"
      : DERIVED_RUNTIME_IDS.has(parameterId) ? "DERIVED" : "ASSUMPTION",
  ])),
) as Readonly<Record<string, RuntimeClass>>;

const SOURCE_IDS_BY_PARAMETER: Readonly<Record<string, readonly string[]>> = Object.freeze({
  concrete_order_allowance_percent: ["nrmca_cip31_ordering_ready_mixed_concrete"],
  placement_method: [],
  concrete_delivery_distance_km: [],
  delivery_pricing_mode: [],
  curing_method: ["nrmca_cip11_curing_in_place_concrete", "sika_antisol_a_pds"],
  liquid_curing_coverage_m2_per_l: ["sika_antisol_a_pds"],
  liquid_curing_package_l: ["sika_antisol_a_pds"],
  repair_mortar_kg_per_m2_mm: ["sika_monotop_4012_pds_2026_03"],
  repair_bag_kg: ["sika_monotop_4012_pds_2026_03"],
  repair_mixing_water_l_per_bag: ["sika_monotop_4012_pds_2026_03"],
  winter_mode: [],
  construction_joint_mode: [],
  quality_document_count: [],
});

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_CLASSIFICATION[parameterId] === "NORMATIVE"
      ? [SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_ID]
      : [],
  ])),
);

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SHORT_INPUT = Object.freeze({
  slab_area_m2: 150,
});

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT = Object.freeze({
  ...SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT,
  slab_area_m2: 150,
  slab_thickness_mm: 200,
  concrete_mixture_designation: "B25 W6 F150 P4 по проекту",
  local_repair_area_m2: 6,
  local_repair_depth_mm: 20,
});

type ParameterSpec = Readonly<{
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "integer" | "text" | "enum" | "boolean";
  unitId?: string | null;
  required: boolean;
  constraints?: Json;
  guideRu: string;
  requiredWhen?: Json;
  forbiddenWhen?: Json;
}>;

const equals = (parameterId: string, value: unknown): Json => ({
  kind: "equals",
  parameterId,
  value,
});

const sheetSelected = equals("curing_method", "SHEET");
const waterSelected = equals("curing_method", "WATER");
const jointSelected = equals("construction_joint_mode", "WATERSTOP");
const noJoint = equals("construction_joint_mode", "NONE");
const winterSelected = equals("winter_mode", true);
const summerSelected = equals("winter_mode", false);

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { parameterId: "slab_area_m2", titleRu: "Площадь плитного фундамента", valueType: "decimal", unitId: "m2", required: true, constraints: { min: 0.001 }, guideRu: "Введите чистую площадь плиты по чертежу или обмеру, м²." },
  { parameterId: "slab_thickness_mm", titleRu: "Проектная толщина плитного фундамента", valueType: "decimal", unitId: "mm", required: true, constraints: { min: 1 }, guideRu: "Введите толщину плиты по проекту, мм; объём рассчитывается автоматически как площадь × толщина / 1000." },
  { parameterId: "concrete_mixture_designation", titleRu: "Полное обозначение товарной бетонной смеси", valueType: "text", required: true, constraints: { minLength: 3, maxLength: 300 }, guideRu: "Укажите обозначение из проекта/заказа, например класс, W, F и подвижность. Система не подменяет эти свойства числом-заглушкой." },
  { parameterId: "local_repair_area_m2", titleRu: "Фактическая площадь локального ремонта основания", valueType: "decimal", unitId: "m2", required: true, constraints: { min: 0.001 }, guideRu: "Введите только измеренную площадь дефектных карт, м²; площадь всей плиты здесь не используется." },
  { parameterId: "local_repair_depth_mm", titleRu: "Средняя глубина локального ремонта", valueType: "decimal", unitId: "mm", required: true, constraints: { min: 6, max: 120 }, guideRu: "Введите измеренную глубину 6–120 мм — диапазон выбранного Sika MonoTop-4012 для горизонтального нанесения." },
  { parameterId: "concrete_order_allowance_percent", titleRu: "Резерв заказа товарного бетона", valueType: "decimal", unitId: "percent", required: true, constraints: { min: 4, max: 10 }, guideRu: "4% — выбранная нижняя граница диапазона 4–10% NRMCA CIP 31; значение видно и заменяется подтверждённым расчётом." },
  { parameterId: "placement_method", titleRu: "Способ подачи товарного бетона", valueType: "enum", required: true, constraints: { values: ["DIRECT_CHUTE", "PUMP", "CRANE_BUCKET"] }, guideRu: "Предварительно выбран прямой слив; при выборе насоса или крана соответствующая услуга появляется автоматически." },
  { parameterId: "delivery_pricing_mode", titleRu: "Учёт доставки товарного бетона", valueType: "enum", required: true, constraints: { values: ["SEPARATE", "INCLUDED_IN_SUPPLY"] }, guideRu: "Предварительно доставка показана отдельно; если она включена в цену смеси, переключите режим." },
  { parameterId: "concrete_delivery_distance_km", titleRu: "Расстояние доставки товарного бетона", valueType: "decimal", unitId: "km", required: true, constraints: { min: 0.001 }, guideRu: "15 км — серый ориентир профиля, а не норма. Замените фактическим маршрутом поставщика." },
  { parameterId: "curing_method", titleRu: "Способ ухода за свежеуложенным бетоном", valueType: "enum", required: true, constraints: { values: ["LIQUID_COMPOUND", "SHEET", "WATER"] }, guideRu: "Ветки различны: готовый жидкий состав без разбавления, плёнка не менее 0,10 мм или водный уход." },
  { parameterId: "liquid_curing_coverage_m2_per_l", titleRu: "Покрытие Sika Antisol A одним литром", valueType: "decimal", unitId: "m2_per_l", required: true, constraints: { min: 5, max: 6.5 }, guideRu: "5 м²/л — консервативная граница опубликованного диапазона 5–6,5 м²/л." },
  { parameterId: "liquid_curing_package_l", titleRu: "Выбранная тара Sika Antisol A", valueType: "decimal", unitId: "l", required: true, constraints: { values: [5, 20, 200] }, guideRu: "Предварительно выбрана заводская тара 20 л; доступны 5, 20 и 200 л." },
  { parameterId: "curing_sheet_layout_factor", titleRu: "Коэффициент раскладки плёнки с нахлёстами", valueType: "decimal", unitId: "ratio", required: false, constraints: { min: 1, max: 2, requiredWhen: sheetSelected, forbiddenWhen: equals("curing_method", "LIQUID_COMPOUND") }, guideRu: "1,10 — видимый заменяемый ориентир раскладки, не скрытая норма расхода. Уточните по ширине рулона и схеме нахлёстов." },
  { parameterId: "curing_water_l_per_m2", titleRu: "Расход воды по принятому плану водного ухода", valueType: "decimal", unitId: "l_per_m2", required: false, constraints: { min: 0.001, requiredWhen: waterSelected }, guideRu: "Введите норму из ППР/плана ухода: CIP 11 не задаёт универсальный расход л/м², поэтому система его не выдумывает.", requiredWhen: waterSelected },
  { parameterId: "repair_mortar_kg_per_m2_mm", titleRu: "Расход Sika MonoTop-4012", valueType: "decimal", unitId: "kg_per_m2_mm", required: true, constraints: { min: 1.9, max: 1.9 }, guideRu: "1,9 кг/м² на каждый мм толщины по PDS Sika MonoTop-4012." },
  { parameterId: "repair_bag_kg", titleRu: "Масса заводского мешка Sika MonoTop-4012", valueType: "decimal", unitId: "kg", required: true, constraints: { min: 25, max: 25 }, guideRu: "25 кг — заводская упаковка выбранного продукта." },
  { parameterId: "repair_mixing_water_l_per_bag", titleRu: "Вода затворения на 25 кг Sika MonoTop-4012", valueType: "decimal", unitId: "l_per_item", required: true, constraints: { min: 3.75, max: 3.9 }, guideRu: "3,9 л на 25 кг фактически замешиваемой сухой смеси — выбранная верхняя граница диапазона PDS 3,75–3,9 л; сухой остаток закупочного мешка не затворяется." },
  { parameterId: "winter_mode", titleRu: "Зимнее бетонирование требуется", valueType: "boolean", required: true, constraints: {}, guideRu: "По умолчанию нет. Включайте только при фактических зимних условиях и утверждённом ППР." },
  { parameterId: "winter_heating_system_length_m", titleRu: "Длина выбранной системы прогрева", valueType: "decimal", unitId: "m", required: false, constraints: { min: 0.001, requiredWhen: winterSelected, forbiddenWhen: summerSelected }, guideRu: "Введите длину из зимнего ППР; автоматической универсальной нормы нет.", requiredWhen: winterSelected, forbiddenWhen: summerSelected },
  { parameterId: "construction_joint_mode", titleRu: "Гидрошпонка рабочего шва требуется", valueType: "enum", required: true, constraints: { values: ["NONE", "WATERSTOP"] }, guideRu: "По умолчанию отсутствует; включайте только для фактического рабочего шва по проекту." },
  { parameterId: "waterstop_product_profile", titleRu: "Типоразмер гидрошпонки рабочего шва", valueType: "enum", required: false, constraints: { values: ["Внутренняя ПВХ-П, ширина 150 мм", "Внутренняя ПВХ-П, ширина 200 мм", "Наружная ПВХ-П, ширина 150 мм", "Наружная ПВХ-П, ширина 200 мм"], requiredWhen: jointSelected, forbiddenWhen: noJoint }, guideRu: "Выберите однозначный тип и ширину; одиночное число «150» не является спецификацией.", requiredWhen: jointSelected, forbiddenWhen: noJoint },
  { parameterId: "waterstop_length_m", titleRu: "Проектная длина гидрошпонки", valueType: "decimal", unitId: "m", required: false, constraints: { min: 0.001, requiredWhen: jointSelected, forbiddenWhen: noJoint }, guideRu: "Введите длину рабочего шва по проекту, м.", requiredWhen: jointSelected, forbiddenWhen: noJoint },
  { parameterId: "quality_document_count", titleRu: "Комплект паспортов и записей контроля", valueType: "integer", unitId: "document", required: true, constraints: { min: 1 }, guideRu: "Один комплект записей показывается как обязательство контроля, но не оплачивается отдельной строкой без основания." },
]);

const USER_FACT_IDS = new Set([
  "slab_area_m2",
  "slab_thickness_mm",
  "concrete_mixture_designation",
  "local_repair_area_m2",
  "local_repair_depth_mm",
  "curing_water_l_per_m2",
  "winter_heating_system_length_m",
  "waterstop_product_profile",
  "waterstop_length_m",
]);

function parameterSourceId(parameterId: string): string | null {
  return (SOURCE_IDS_BY_PARAMETER[parameterId] ?? [])[0] ?? null;
}

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze(PARAMETER_SPECS.map((spec, ordinal) => {
  const runtime = Object.hasOwn(SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT, spec.parameterId);
  const runtimeClass = SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_CLASSIFICATION[spec.parameterId] ?? null;
  const sourceId = parameterSourceId(spec.parameterId);
  return {
    parameter_id: spec.parameterId,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId ?? null,
    title_ru: spec.titleRu,
    required: spec.required,
    default_value: null,
    constraints_json: {
      ...(spec.constraints ?? {}),
      ...(spec.requiredWhen ? { requiredWhen: spec.requiredWhen } : {}),
      ...(spec.forbiddenWhen ? { forbiddenWhen: spec.forbiddenWhen } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.s27-17.slab-foundation-local-repair.v2",
      semantic_parameter_key: `slab-foundation-local-repair-s27-17:${spec.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: USER_FACT_IDS.has(spec.parameterId)
        ? "PROJECT_OR_MEASURED_FACT"
        : runtimeClass === "NORMATIVE" ? "PRIMARY_SOURCE_NORM" : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
      input_origin_class: USER_FACT_IDS.has(spec.parameterId)
        ? "KNOWN_OBJECT_FACT"
        : runtime ? "SELECTED_VISIBLE_PRELIMINARY_PROFILE" : "CONDITIONAL_PROJECT_FACT",
      preliminary_compilation_allowed: true,
      source_confirmation_required: false,
      ...(spec.requiredWhen ? { required_when: spec.requiredWhen, visible_when: spec.requiredWhen } : {}),
      guide: {
        guide_kind: USER_FACT_IDS.has(spec.parameterId)
          ? "MEASUREMENT_RULE"
          : runtimeClass === "NORMATIVE" ? "MANDATORY_NORM_VALUE" : "PRACTICE_REFERENCE",
        guide_short_ru: spec.guideRu,
        source_role: sourceId ? "PRIMARY_PUBLIC_SOURCE" : "VISIBLE_PRELIMINARY_PROFILE_OR_PROJECT_FACT",
        source_document: sourceId,
        source_locator: sourceId == null
          ? "selectedPreliminaryProfile; replace with project/PPR/site data"
          : sourcePack.sources.find((source) => source.sourceId === sourceId)?.exactLocator ?? null,
        guide_version: "slab-foundation-local-repair-s27-17",
        source_snapshot_hash: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256,
        applicability: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_METADATA.use_restriction,
        verified_at: "2026-09-30T00:00:00+06:00",
        guide_validation_policy: "FIRST_USEFUL_ESTIMATE_NOW_REPLACE_VISIBLE_ASSUMPTIONS_WITH_PROJECT_DATA",
      },
      hidden_default_forbidden: !runtime,
      runtime_profile_value: runtime,
      runtime_profile_classification: runtimeClass,
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

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("slab_repair_area_s2716", "m2", "slab_area_m2"),
  formula("slab_repair_concrete_volume_s2716", "m3", "slab_area_m2*slab_thickness_mm/1000"),
  formula("slab_repair_concrete_order_s2716", "m3", "slab_area_m2*slab_thickness_mm/1000*(1+concrete_order_allowance_percent/100)"),
  formula("slab_repair_concrete_delivery_s2716", "m3_km", "slab_area_m2*slab_thickness_mm/1000*(1+concrete_order_allowance_percent/100)*concrete_delivery_distance_km"),
  formula("slab_repair_local_area_s2716", "m2", "local_repair_area_m2"),
  formula("slab_repair_removed_volume_s2716", "m3", "local_repair_area_m2*local_repair_depth_mm/1000"),
  formula("slab_repair_mortar_net_kg_s2716", "kg", "local_repair_area_m2*local_repair_depth_mm*repair_mortar_kg_per_m2_mm"),
  formula("slab_repair_mortar_bags_s2716", "item", "ceil(local_repair_area_m2*local_repair_depth_mm*repair_mortar_kg_per_m2_mm/repair_bag_kg)"),
  formula("slab_repair_mortar_dry_remainder_s2716", "kg", "ceil(local_repair_area_m2*local_repair_depth_mm*repair_mortar_kg_per_m2_mm/repair_bag_kg)*repair_bag_kg-local_repair_area_m2*local_repair_depth_mm*repair_mortar_kg_per_m2_mm"),
  formula("slab_repair_mixing_water_s2716", "l", "local_repair_area_m2*local_repair_depth_mm*repair_mortar_kg_per_m2_mm/repair_bag_kg*repair_mixing_water_l_per_bag"),
  formula("slab_repair_liquid_curing_net_l_s2716", "l", "slab_area_m2/liquid_curing_coverage_m2_per_l"),
  formula("slab_repair_liquid_curing_packages_s2716", "item", "ceil(slab_area_m2/liquid_curing_coverage_m2_per_l/liquid_curing_package_l)"),
  formula("slab_repair_curing_sheet_s2716", "m2", "slab_area_m2*curing_sheet_layout_factor"),
  formula("slab_repair_curing_water_s2716", "l", "slab_area_m2*curing_water_l_per_m2"),
  formula("slab_repair_winter_heating_s2716", "m", "winter_heating_system_length_m"),
  formula("slab_repair_waterstop_s2716", "m", "waterstop_length_m"),
  formula("slab_repair_quality_documents_s2716", "document", "quality_document_count"),
  formula("slab_repair_single_service_s2716", "service", "1"),
]);

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));
const literalTrue = Object.freeze({ kind: "literal", value: true });

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  sourceId: string;
  costTreatment: CostTreatment;
  procurementEligible?: boolean;
  inclusionAst?: Json;
  parentRowId?: string;
  titleParameterIds?: readonly string[];
}>): CanonicalEstimateResourceDefinition {
  const source = SOURCE_BY_ID.get(input.sourceId);
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `slab-foundation-local-repair-s27-17:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "slab_area_m2",
    preliminaryProfileId: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: [...input.titleParameterIds],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "PRIMARY_PRODUCT_OR_TECHNOLOGY_SOURCE",
    sourcePackSha256: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId: input.sourceId,
      source_id: input.sourceId,
      normId: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID,
      norm_id: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_NORM_ID,
      normVersion: "S27.17",
      source_title: source?.authority ?? input.sourceId,
      source_url: source?.url ?? null,
      exact_locator: source?.exactLocator ?? "selected source-pack applicability record",
      source_definition_hash: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256,
    }],
    excludedAdjacentScope: [...sourcePack.explicitExclusions],
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
    procurement_eligible: input.procurementEligible ?? false,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const R = (input: Omit<Parameters<typeof resource>[0], "ordinal">, ordinal: number) =>
  resource({ ...input, ordinal });

const resourceSpecs: readonly Omit<Parameters<typeof resource>[0], "ordinal">[] = [
  { rowId: "slab-repair:material:ready-mix", section: "Материалы", category: "material", titleRu: "Товарный бетон", unitId: "m3", formulaId: "slab_repair_concrete_order_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["concrete_mixture_designation"] },
  { rowId: "slab-repair:work:place-compact", section: "Работы", category: "construction_work", titleRu: "Укладка и виброуплотнение товарного бетона", unitId: "m3", formulaId: "slab_repair_concrete_volume_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST" },
  { rowId: "slab-repair:included:deep-vibrator", section: "Состав работы", category: "equipment", titleRu: "Глубинный вибратор с оператором — в составе укладки и уплотнения", unitId: "m3", formulaId: "slab_repair_concrete_volume_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "slab-repair:work:place-compact" },
  { rowId: "slab-repair:service:concrete-pump", section: "Подача бетона", category: "service", titleRu: "Подача товарного бетона автобетононасосом", unitId: "m3", formulaId: "slab_repair_concrete_order_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST", inclusionAst: equals("placement_method", "PUMP") },
  { rowId: "slab-repair:service:crane-bucket", section: "Подача бетона", category: "service", titleRu: "Подача товарного бетона краном с бадьёй", unitId: "m3", formulaId: "slab_repair_concrete_order_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST", inclusionAst: equals("placement_method", "CRANE_BUCKET") },
  { rowId: "slab-repair:operation:direct-chute", section: "Подача бетона", category: "service", titleRu: "Подача товарного бетона прямым сливом без отдельного насоса/крана", unitId: "m3", formulaId: "slab_repair_concrete_order_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "INFORMATIONAL_SCOPE", inclusionAst: equals("placement_method", "DIRECT_CHUTE") },
  { rowId: "slab-repair:work:finish-surface", section: "Работы", category: "construction_work", titleRu: "Отделка верхней поверхности плитного фундамента", unitId: "m2", formulaId: "slab_repair_area_s2716", sourceId: "nrmca_cip11_curing_in_place_concrete", costTreatment: "OWN_COST" },

  { rowId: "slab-repair:work:remove-unsound-base", section: "Локальный ремонт основания", category: "construction_work", titleRu: "Удаление непрочного материала в границах локального ремонта", unitId: "m3", formulaId: "slab_repair_removed_volume_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "OWN_COST" },
  { rowId: "slab-repair:work:prepare-substrate", section: "Локальный ремонт основания", category: "construction_work", titleRu: "Механическая подготовка и увлажнение основания до SSD-состояния", unitId: "m2", formulaId: "slab_repair_local_area_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "OWN_COST" },
  { rowId: "slab-repair:included:repair-preparation-equipment", section: "Состав работы", category: "equipment", titleRu: "Инструмент удаления, щётка и пылеудаление — в составе подготовки основания", unitId: "m2", formulaId: "slab_repair_local_area_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "slab-repair:work:prepare-substrate" },
  { rowId: "slab-repair:material:repair-mortar-bags", section: "Материалы локального ремонта", category: "material", titleRu: "Sika MonoTop-4012, класс R4, фиброармированный цементный ремонтный раствор, мешок 25 кг", unitId: "item", formulaId: "slab_repair_mortar_bags_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "slab-repair:control:repair-mortar-net-mass", section: "Материалы локального ремонта", category: "material", titleRu: "Расчётная нетто-масса Sika MonoTop-4012 до округления до мешков", unitId: "kg", formulaId: "slab_repair_mortar_net_kg_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "slab-repair:control:repair-mortar-dry-remainder", section: "Материалы локального ремонта", category: "material", titleRu: "Сухой остаток Sika MonoTop-4012 после округления заказа до целых мешков", unitId: "kg", formulaId: "slab_repair_mortar_dry_remainder_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "slab-repair:material:mixing-water", section: "Материалы локального ремонта", category: "material", titleRu: "Чистая вода затворения Sika MonoTop-4012 по фактически замешиваемой нетто-массе", unitId: "l", formulaId: "slab_repair_mixing_water_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "slab-repair:work:place-repair-mortar", section: "Локальный ремонт основания", category: "construction_work", titleRu: "Замешивание, укладка, уплотнение и отделка ремонтного раствора", unitId: "m2", formulaId: "slab_repair_local_area_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "OWN_COST" },
  { rowId: "slab-repair:included:repair-mixer-tools", section: "Состав работы", category: "equipment", titleRu: "Низкооборотный миксер и ручной инструмент — в составе укладки ремонтного раствора", unitId: "m2", formulaId: "slab_repair_local_area_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "slab-repair:work:place-repair-mortar" },
  { rowId: "slab-repair:waste:removed-base", section: "Отходы", category: "waste", titleRu: "Сбор, погрузка и вывоз удалённого материала локального ремонта; коэффициент разрыхления и полигон уточняются подрядчиком", unitId: "m3", formulaId: "slab_repair_removed_volume_s2716", sourceId: "sika_monotop_4012_pds_2026_03", costTreatment: "OWN_COST" },

  { rowId: "slab-repair:material:liquid-curing-packages", section: "Уход за бетоном", category: "material", titleRu: "Sika Antisol A, готовый жидкий плёнкообразующий состав без разбавления, канистра 20 л", unitId: "item", formulaId: "slab_repair_liquid_curing_packages_s2716", sourceId: "sika_antisol_a_pds", costTreatment: "OWN_COST", procurementEligible: true, inclusionAst: equals("curing_method", "LIQUID_COMPOUND") },
  { rowId: "slab-repair:control:liquid-curing-net-volume", section: "Уход за бетоном", category: "material", titleRu: "Расчётный объём Sika Antisol A до округления до заводской тары", unitId: "l", formulaId: "slab_repair_liquid_curing_net_l_s2716", sourceId: "sika_antisol_a_pds", costTreatment: "INFORMATIONAL_SCOPE", inclusionAst: equals("curing_method", "LIQUID_COMPOUND") },
  { rowId: "slab-repair:material:curing-sheet", section: "Уход за бетоном", category: "material", titleRu: "Полиэтиленовая плёнка для ухода по ASTM C171, толщина не менее 0,10 мм", unitId: "m2", formulaId: "slab_repair_curing_sheet_s2716", sourceId: "nrmca_cip11_curing_in_place_concrete", costTreatment: "OWN_COST", procurementEligible: true, inclusionAst: sheetSelected },
  { rowId: "slab-repair:material:curing-water", section: "Уход за бетоном", category: "material", titleRu: "Вода для непрерывного влажностного ухода по утверждённому плану", unitId: "l", formulaId: "slab_repair_curing_water_s2716", sourceId: "nrmca_cip11_curing_in_place_concrete", costTreatment: "OWN_COST", procurementEligible: true, inclusionAst: waterSelected },
  { rowId: "slab-repair:work:cure", section: "Работы", category: "construction_work", titleRu: "Нанесение и поддержание выбранной системы ухода за бетоном", unitId: "m2", formulaId: "slab_repair_area_s2716", sourceId: "nrmca_cip11_curing_in_place_concrete", costTreatment: "OWN_COST" },
  { rowId: "slab-repair:included:curing-application-tools", section: "Состав работы", category: "equipment", titleRu: "Распылитель/инструмент укрытия/водного ухода — по выбранной ветке, в составе работы", unitId: "m2", formulaId: "slab_repair_area_s2716", sourceId: "nrmca_cip11_curing_in_place_concrete", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "slab-repair:work:cure" },

  { rowId: "slab-repair:material:winter-heating-system", section: "Зимнее бетонирование", category: "material", titleRu: "Система электропрогрева по зимнему ППР; тип и шаг не подменяются универсальной нормой", unitId: "m", formulaId: "slab_repair_winter_heating_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST", procurementEligible: true, inclusionAst: winterSelected },
  { rowId: "slab-repair:material:waterstop", section: "Рабочий шов", category: "material", titleRu: "Гидрошпонка рабочего шва", unitId: "m", formulaId: "slab_repair_waterstop_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST", procurementEligible: true, inclusionAst: jointSelected, titleParameterIds: ["waterstop_product_profile"] },
  { rowId: "slab-repair:work:install-waterstop", section: "Рабочий шов", category: "construction_work", titleRu: "Монтаж выбранной гидрошпонки рабочего шва", unitId: "m", formulaId: "slab_repair_waterstop_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST", inclusionAst: jointSelected },

  { rowId: "slab-repair:delivery:ready-mix", section: "Доставка", category: "delivery", titleRu: "Доставка товарного бетона по фактическому маршруту поставщика", unitId: "m3_km", formulaId: "slab_repair_concrete_delivery_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "OWN_COST", inclusionAst: equals("delivery_pricing_mode", "SEPARATE") },
  { rowId: "slab-repair:document:quality-set", section: "Контроль и документация", category: "service", titleRu: "Комплект накладных, паспортов материалов и записей укладки, ремонта и ухода", unitId: "document", formulaId: "slab_repair_quality_documents_s2716", sourceId: "nrmca_cip31_ordering_ready_mixed_concrete", costTreatment: "CONTROL_OR_DOCUMENT" },
];

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  resourceSpecs.map((spec, ordinal) => R(spec, ordinal)),
);

export const SLAB_FOUNDATION_LOCAL_REPAIR_S2716_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PRODUCT_SYSTEM_TDS",
  generatedFromCurrentRows: false,
  evidenceSha256: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/slab-foundation-local-repair-s27-16.json",
  entries: sourcePack.independentRequiredComponents.map((component) => ({
    ...component,
    expectedResourceId: `required-component:${component.semanticKey}`,
    detailPrinciple: "The independently authored component has its own visible row or an explicit included-component owner.",
  })),
});

export function slabRepairMissingRequiredRows(
  rowIds: ReadonlySet<string>,
  curingMethod: "LIQUID_COMPOUND" | "SHEET" | "WATER" = "LIQUID_COMPOUND",
): string[] {
  return SLAB_FOUNDATION_LOCAL_REPAIR_S2716_INDEPENDENT_COMPLETENESS_MAP.entries
    .filter((entry) => entry.condition === "always"
      || entry.condition === "local repair selected"
      || entry.condition === "separate delivery"
      || entry.condition === curingMethod)
    .map((entry) => entry.resolution.rowId)
    .filter((rowId) => !rowIds.has(rowId));
}

export async function compileSlabFoundationLocalRepairS2716(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID;
  if (catalogId !== SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_ID) {
    throw new Error(`SLAB_FOUNDATION_LOCAL_REPAIR_S2716_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.slab-foundation-local-repair-s27-17.v2",
    catalogId,
    primaryMeasureParameterId: "slab_area_m2",
    parameterDefinitions: [...SLAB_FOUNDATION_LOCAL_REPAIR_S2716_PARAMETERS],
    formulaDefinitions: [...SLAB_FOUNDATION_LOCAL_REPAIR_S2716_FORMULAS],
    resourceDefinitions: [...SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RESOURCES],
    submittedParameters,
    confirmedParameters: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RUNTIME_INPUT,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: SLAB_FOUNDATION_LOCAL_REPAIR_S2716_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
