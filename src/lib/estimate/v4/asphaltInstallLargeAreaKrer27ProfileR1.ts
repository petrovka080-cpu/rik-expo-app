import sourcePack from "../../../../data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

export const ASPHALT_INSTALL_KRER27_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_install_large_area";
export const ASPHALT_INSTALL_KRER27_SOURCE_ID = "kg_krer_27_06_020_01_021_01_2015";
export const ASPHALT_INSTALL_KRER27_PROFILE_SOURCE_ID = "s27_19_selected_hot_asphalt_profile_r2";
export const ASPHALT_INSTALL_KRER27_NORM_ID = "KRER-27-06-020-01-PLUS-021-01-50MM-R2";
export const ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256 =
  "4d861329b43bb096533f97d9d75d3a745acc161b009a92dee31ee046d3fdbcd0";

export const ASPHALT_INSTALL_KRER27_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕР-2015 № 27: горячее асфальтобетонное покрытие 27-06-020-01 с поправкой 27-06-021-01",
  source_authority: "Министерство строительства Кыргызской Республики; NAPA/FAA; Asphalt Institute",
  source_document_version: "KRER_2015_27_06_020_01_021_01_WITH_S27_19_PRELIMINARY_PROFILE_R2",
  definition_hash: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
  source_kind: "NORMATIVE_OPERATION_MAP",
  official_url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf",
  artifact_sha256: "cd3d6735d1bbdda5957945b7682f032785c76624b54a435edfe5d2ef5e107161",
  effective_from: "2015-01-01",
  exact_locator: "КРЕР 27-06-020-01, печатные страницы 92-93: 1000 м² горячего плотного мелкозернистого покрытия типа А/Б/В толщиной 4 см; 27-06-021-01, страницы 96-97: поправка на каждые 0,5 см.",
  use_restriction: "Один слой 50 мм горячей плотной мелкозернистой смеси типа А/Б/В при плотности каменных материалов 2,5-2,9 т/м³ на принятом основании. Точный тип, марка и паспорт смеси подтверждаются проектом и поставщиком.",
});

const PROFILE = sourcePack.selectedPreliminaryProfile;
const RATES = sourcePack.krerRatesPer1000M2;

export const ASPHALT_INSTALL_KRER27_SHORT_INPUT = Object.freeze({ area_m2: 5_000 });

export const ASPHALT_INSTALL_KRER27_RUNTIME_INPUT = Object.freeze({
  layer_thickness_mm: PROFILE.layerThicknessMm,
  krer_base_thickness_mm: PROFILE.baseThicknessMm,
  krer_increment_thickness_mm: PROFILE.incrementThicknessMm,
  labor_base_man_h_per_1000m2: RATES.laborBaseManH,
  labor_increment_man_h_per_1000m2: RATES.laborPerAdditional5MmManH,
  crane_machine_h_per_1000m2: RATES.craneMachineH,
  tar_sprayer_machine_h_per_1000m2: RATES.tarSprayerMachineH,
  tar_sprayer_increment_machine_h_per_1000m2: RATES.tarSprayerPerAdditional5MmMachineH,
  roller_machine_h_per_1000m2: RATES.roller8tMachineH,
  roller_13t_machine_h_per_1000m2: RATES.roller13tMachineH,
  watering_machine_h_per_1000m2: RATES.watering6000lMachineH,
  paver_machine_h_per_1000m2: RATES.asphaltPaverMachineH,
  onboard_vehicle_machine_h_per_1000m2: RATES.onboardVehicleMachineH,
  road_bitumen_base_t_per_1000m2: RATES.roadBitumenBaseT,
  road_bitumen_increment_t_per_1000m2: RATES.roadBitumenPerAdditional5MmT,
  technical_kerosene_t_per_1000m2: RATES.technicalKeroseneT,
  hardwood_bars_m3_per_1000m2: RATES.hardwoodBarsM3,
  asphalt_mix_base_t_per_1000m2: RATES.asphaltMixBaseT,
  asphalt_mix_increment_t_per_1000m2: RATES.asphaltMixPerAdditional5MmT,
  haul_distance_km: PROFILE.haulDistanceKm,
  truck_capacity_t: PROFILE.truckCapacityT,
  truck_average_speed_km_h: PROFILE.truckAverageSpeedKmH,
  truck_turnaround_h: PROFILE.truckTurnaroundH,
  acceptance_lot_m2: PROFILE.acceptanceLotM2,
  work_journal_count: PROFILE.workJournalCount,
  execution_documentation_count: PROFILE.executionDocumentationCount,
  material_passport_register_count: PROFILE.materialPassportRegisterCount,
  traffic_control_setup_count: PROFILE.trafficControlSetupCount,
  mobilization_count_per_unique_machine: PROFILE.mobilizationCountPerUniqueMachine,
});

export const ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT = Object.freeze({
  ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
  ...ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
});

const NORMATIVE_IDS = new Set([
  "krer_base_thickness_mm",
  "krer_increment_thickness_mm",
  "labor_base_man_h_per_1000m2",
  "labor_increment_man_h_per_1000m2",
  "crane_machine_h_per_1000m2",
  "tar_sprayer_machine_h_per_1000m2",
  "tar_sprayer_increment_machine_h_per_1000m2",
  "roller_machine_h_per_1000m2",
  "roller_13t_machine_h_per_1000m2",
  "watering_machine_h_per_1000m2",
  "paver_machine_h_per_1000m2",
  "onboard_vehicle_machine_h_per_1000m2",
  "road_bitumen_base_t_per_1000m2",
  "road_bitumen_increment_t_per_1000m2",
  "technical_kerosene_t_per_1000m2",
  "hardwood_bars_m3_per_1000m2",
  "asphalt_mix_base_t_per_1000m2",
  "asphalt_mix_increment_t_per_1000m2",
]);
const DERIVED_IDS = new Set([
  "work_journal_count",
  "execution_documentation_count",
  "material_passport_register_count",
]);

export const ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(ASPHALT_INSTALL_KRER27_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    NORMATIVE_IDS.has(parameterId) ? "NORMATIVE" : DERIVED_IDS.has(parameterId) ? "DERIVED" : "ASSUMPTION",
  ])),
) as Readonly<Record<string, "NORMATIVE" | "ASSUMPTION" | "DERIVED">>;

export const ASPHALT_INSTALL_KRER27_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(ASPHALT_INSTALL_KRER27_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    NORMATIVE_IDS.has(parameterId) ? [ASPHALT_INSTALL_KRER27_SOURCE_ID] : [],
  ])),
);

type ParameterSpec = readonly [string, string, "decimal" | "integer", string, number, number?];
const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  ["area_m2", "Площадь устраиваемого асфальтобетонного покрытия", "decimal", "m2", 0.001],
  ["layer_thickness_mm", "Толщина одного слоя покрытия", "decimal", "mm", 30, 200],
  ["krer_base_thickness_mm", "Базовая толщина таблицы КРЕР 27-06-020", "decimal", "mm", 40, 40],
  ["krer_increment_thickness_mm", "Шаг поправки толщины КРЕР", "decimal", "mm", 5, 5],
  ["labor_base_man_h_per_1000m2", "Труд рабочих на 1000 м² при базовой толщине", "decimal", "man_hour_per_1000m2", 0.000001],
  ["labor_increment_man_h_per_1000m2", "Добавочный труд на 1000 м² на каждые 5 мм", "decimal", "man_hour_per_1000m2", 0.000001],
  ["crane_machine_h_per_1000m2", "Автокран на 1000 м²", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["tar_sprayer_machine_h_per_1000m2", "Гудронатор ручной на 1000 м²", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["tar_sprayer_increment_machine_h_per_1000m2", "Добавочный гудронатор на 1000 м² на каждые 5 мм", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["roller_machine_h_per_1000m2", "Каток 8 т на 1000 м²", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["roller_13t_machine_h_per_1000m2", "Каток 13 т на 1000 м²", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["watering_machine_h_per_1000m2", "Поливомоечная машина 6000 л на 1000 м²", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["paver_machine_h_per_1000m2", "Асфальтоукладчик на 1000 м²", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["onboard_vehicle_machine_h_per_1000m2", "Бортовой автомобиль до 5 т на 1000 м²", "decimal", "machine_hour_per_1000m2", 0.000001],
  ["road_bitumen_base_t_per_1000m2", "Битум дорожный на 1000 м² при базовой толщине", "decimal", "t_per_1000m2", 0.000001],
  ["road_bitumen_increment_t_per_1000m2", "Добавочный битум на 1000 м² на каждые 5 мм", "decimal", "t_per_1000m2", 0.000001],
  ["technical_kerosene_t_per_1000m2", "Керосин технический на 1000 м²", "decimal", "t_per_1000m2", 0.000001],
  ["hardwood_bars_m3_per_1000m2", "Брусья боковых упоров на 1000 м²", "decimal", "m3_per_1000m2", 0.000001],
  ["asphalt_mix_base_t_per_1000m2", "Смесь асфальтобетонная на 1000 м² при базовой толщине", "decimal", "t_per_1000m2", 0.000001],
  ["asphalt_mix_increment_t_per_1000m2", "Добавочная смесь на 1000 м² на каждые 5 мм", "decimal", "t_per_1000m2", 0.000001],
  ["haul_distance_km", "Расстояние доставки смеси", "decimal", "km", 0.001],
  ["truck_capacity_t", "Грузоподъёмность самосвала", "decimal", "t", 0.001],
  ["truck_average_speed_km_h", "Средняя скорость самосвала по маршруту", "decimal", "km_h", 0.001],
  ["truck_turnaround_h", "Погрузка, ожидание и выгрузка одного рейса", "decimal", "machine_hour", 0.001],
  ["acceptance_lot_m2", "Площадь предварительной партии контроля", "decimal", "m2", 0.001],
  ["work_journal_count", "Журнал производства работ", "integer", "document", 1],
  ["execution_documentation_count", "Комплект исполнительной документации", "integer", "document", 1],
  ["material_passport_register_count", "Реестр паспортов материалов", "integer", "document", 1],
  ["traffic_control_setup_count", "Комплект организации безопасной рабочей зоны", "integer", "set", 1],
  ["mobilization_count_per_unique_machine", "Мобилизация и возврат одной уникальной машины", "integer", "service", 1]
]);

export const ASPHALT_INSTALL_KRER27_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, minimum, maximum], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: {
      min: minimum,
      ...(maximum == null ? {} : { max: maximum }),
      ...(parameterId === "layer_thickness_mm" ? { multipleOf: 5 } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.asphalt-install-large-area-krer27-profile-r1",
      semantic_parameter_key: `asphalt-install-krer27:${parameterId}`,
      visibility_role: parameterId === "area_m2" ? "USER_INPUT" : DERIVED_IDS.has(parameterId)
        ? "USER_DERIVED_READONLY" : "INTERNAL_ONLY",
      value_source_role: parameterId === "area_m2" ? "USER_MEASURED" : NORMATIVE_IDS.has(parameterId)
        ? "OFFICIAL_NORM" : DERIVED_IDS.has(parameterId) ? "BACKEND_DERIVED" : "VISIBLE_PRELIMINARY_PROFILE_ASSUMPTION",
      input_origin_class: parameterId === "area_m2" ? "KNOWN_WORK_SCOPE" : "SELECTED_PRELIMINARY_PAVING_PROFILE",
      preliminary_compilation_allowed: parameterId !== "area_m2",
      source_confirmation_required: false,
      guide: {
        guide_kind: NORMATIVE_IDS.has(parameterId) ? "MANDATORY_NORM_VALUE" : parameterId === "area_m2"
          ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: parameterId === "area_m2"
          ? "Укажите чистую площадь выбранного однослойного покрытия."
          : "Значение применено до необязательного уточнения и заменяется проектом, ППР, маршрутом или планом качества.",
        source_role: NORMATIVE_IDS.has(parameterId) ? "KG_KRER_27_06_020_01_021_01" : "VISIBLE_PRELIMINARY_PROFILE",
        source_document: NORMATIVE_IDS.has(parameterId)
          ? ASPHALT_INSTALL_KRER27_SOURCE_ID
          : ASPHALT_INSTALL_KRER27_PROFILE_SOURCE_ID,
        source_locator: NORMATIVE_IDS.has(parameterId)
          ? ASPHALT_INSTALL_KRER27_SOURCE_METADATA.exact_locator
          : "selectedPreliminaryProfile in the S26.4 independently reviewed source pack",
        guide_version: "asphalt-install-large-area-krer27-profile-r1",
        source_snapshot_hash: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
        applicability: ASPHALT_INSTALL_KRER27_SOURCE_METADATA.use_restriction,
        verified_at: "2026-09-22T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_ASSUMPTIONS_WITH_PROJECT_DATA",
      },
      hidden_default_forbidden: parameterId === "area_m2",
      runtime_profile_value: parameterId !== "area_m2",
      runtime_profile_classification: ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION[parameterId] ?? null,
      synthetic: false,
    },
  })),
);

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

const SCALE = "area_m2/1000";
const STEPS = "((layer_thickness_mm-krer_base_thickness_mm)/krer_increment_thickness_mm)";
const MIX = `${SCALE}*(asphalt_mix_base_t_per_1000m2+${STEPS}*asphalt_mix_increment_t_per_1000m2)`;

export const ASPHALT_INSTALL_KRER27_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("asphalt_install_area_v1", "m2", "area_m2"),
  formula("asphalt_install_labor_v1", "man_hour", `${SCALE}*(labor_base_man_h_per_1000m2+${STEPS}*labor_increment_man_h_per_1000m2)`),
  formula("asphalt_install_crane_v1", "machine_hour", `${SCALE}*crane_machine_h_per_1000m2`),
  formula("asphalt_install_tar_sprayer_v1", "machine_hour", `${SCALE}*(tar_sprayer_machine_h_per_1000m2+${STEPS}*tar_sprayer_increment_machine_h_per_1000m2)`),
  formula("asphalt_install_roller_v1", "machine_hour", `${SCALE}*roller_machine_h_per_1000m2`),
  formula("asphalt_install_surface_grinder_v1", "machine_hour", `${SCALE}*roller_13t_machine_h_per_1000m2`),
  formula("asphalt_install_tractor_brush_v1", "machine_hour", `${SCALE}*watering_machine_h_per_1000m2`),
  formula("asphalt_install_paver_v1", "machine_hour", `${SCALE}*paver_machine_h_per_1000m2`),
  formula("asphalt_install_onboard_vehicle_v1", "machine_hour", `${SCALE}*onboard_vehicle_machine_h_per_1000m2`),
  formula("asphalt_install_road_bitumen_v1", "t", `${SCALE}*(road_bitumen_base_t_per_1000m2+${STEPS}*road_bitumen_increment_t_per_1000m2)`),
  formula("asphalt_install_technical_kerosene_v1", "t", `${SCALE}*technical_kerosene_t_per_1000m2`),
  formula("asphalt_install_hardwood_bars_v1", "m3", `${SCALE}*hardwood_bars_m3_per_1000m2`),
  formula("asphalt_install_mix_v1", "t", MIX),
  formula("asphalt_install_truck_trips_v1", "trip", `ceil(${MIX}/truck_capacity_t)`),
  formula("asphalt_install_ton_km_v1", "t_km", `${MIX}*haul_distance_km`),
  formula("asphalt_install_truck_machine_h_v1", "machine_hour", `ceil(${MIX}/truck_capacity_t)*(2*haul_distance_km/truck_average_speed_km_h+truck_turnaround_h)`),
  formula("asphalt_install_acceptance_lots_v1", "pcs", "ceil(area_m2/acceptance_lot_m2)"),
  formula("asphalt_install_work_journal_v1", "document", "work_journal_count"),
  formula("asphalt_install_execution_docs_v1", "document", "execution_documentation_count"),
  formula("asphalt_install_material_passports_v1", "document", "material_passport_register_count"),
  formula("asphalt_install_traffic_control_v1", "set", "traffic_control_setup_count"),
  formula("asphalt_install_mobilization_v1", "service", "mobilization_count_per_unique_machine"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE" | "CONTROL_OR_DOCUMENT";

type IndependentRequiredComponent = Readonly<{
  semanticKey: string;
  operationId: string;
  category: string;
  specification: string;
  condition: string;
  sourceId: string;
  unitId: string;
  quantityRule: string;
  detailPrinciple: string;
  priceRelation: CostTreatment | "INCLUDED_IN_PARENT";
  formulaId: string;
  resolution: Readonly<{
    kind: "ROW" | "INCLUDED_COMPONENT_ROW";
    rowId: string;
    parentRowId?: string;
  }>;
}>;

const INDEPENDENT_REQUIRED_COMPONENTS = sourcePack.independentRequiredComponents as
  readonly IndependentRequiredComponent[];
const SOURCE_RECORDS = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));
const SOURCE_ID_BY_ROW_ID = new Map(INDEPENDENT_REQUIRED_COMPONENTS.map((component) => [
  component.resolution.rowId,
  component.sourceId,
]));

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: "material" | "equipment" | "service" | "construction_work";
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: CostTreatment;
  procurementEligible?: boolean;
  sourceId?: string;
  parentRowId?: string;
}>): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `asphalt-install-krer27:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "area_m2",
    preliminaryProfileId: ASPHALT_INSTALL_KRER27_NORM_ID,
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
  };
  const rawSourceId = input.sourceId
    ?? SOURCE_ID_BY_ROW_ID.get(input.rowId)
    ?? ASPHALT_INSTALL_KRER27_SOURCE_ID;
  const sourceId = rawSourceId === "kg_krer_27_06_019_02_2015"
    ? ASPHALT_INSTALL_KRER27_SOURCE_ID
    : rawSourceId;
  const sourceRecord = SOURCE_RECORDS.get(sourceId);
  const normId = sourceId === ASPHALT_INSTALL_KRER27_SOURCE_ID
    ? ASPHALT_INSTALL_KRER27_NORM_ID
    : sourceId === ASPHALT_INSTALL_KRER27_PROFILE_SOURCE_ID
      ? "S26_4_SELECTED_PRELIMINARY_PROFILE_R1"
      : sourceId === "napa_faa_asphalt_paving_handbook_2025"
        ? "NAPA_FAA_ASPHALT_PAVING_HANDBOOK_2025"
        : "ASPHALT_INSTITUTE_ENGINEERING_FAQ";
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: sourceId === ASPHALT_INSTALL_KRER27_SOURCE_ID ? "OFFICIAL_KG_RESOURCE_NORM" : "TECHNOLOGY_AND_QA_CROSSCHECK",
    sourcePackSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId,
      source_id: sourceId,
      normId,
      norm_id: normId,
      normVersion: sourceId === ASPHALT_INSTALL_KRER27_SOURCE_ID
        ? ASPHALT_INSTALL_KRER27_SOURCE_METADATA.source_document_version
        : "2026-09-22",
      source_title: sourceRecord?.authority ?? ASPHALT_INSTALL_KRER27_SOURCE_METADATA.source_title,
      exact_locator: sourceRecord?.exactLocator ?? ASPHALT_INSTALL_KRER27_SOURCE_METADATA.exact_locator,
      source_definition_hash: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
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
    inclusion_ast: literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible ?? false,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const rows: Omit<Parameters<typeof resource>[0], "ordinal">[] = [
  { rowId: "asphalt:operation:base-acceptance-cleaning", section: "Технологические операции", category: "service", titleRu: "Приёмка и очистка подготовленного основания", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:operation:side-stop-setting", section: "Технологические операции", category: "service", titleRu: "Установка боковых упоров", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:operation:bitumen-application", section: "Технологические операции", category: "service", titleRu: "Распределение дорожного битума по принятой технологии", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:operation:mix-receiving-feed", section: "Технологические операции", category: "service", titleRu: "Приёмка, разгрузка и непрерывная подача горячей смеси", unitId: "t", formulaId: "asphalt_install_mix_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:operation:mechanical-paving", section: "Технологические операции", category: "service", titleRu: "Механизированная укладка однослойного покрытия", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:operation:rolling-compaction", section: "Технологические операции", category: "service", titleRu: "Уплотнение покрытия катком по технологической схеме", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:operation:edge-joint-finishing", section: "Технологические операции", category: "service", titleRu: "Отделка кромок, сопряжений и поверхности", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:operation:final-clean-handover", section: "Технологические операции", category: "service", titleRu: "Финальная очистка и передача покрытия на контроль", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },

  { rowId: "asphalt:material:hot-dense-fine-mix", section: "Материалы", category: "material", titleRu: "Горячая асфальтобетонная смесь, тип и марка по проекту", unitId: "t", formulaId: "asphalt_install_mix_v1", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "asphalt:material:road-bitumen", section: "Материалы", category: "material", titleRu: "Битум нефтяной дорожный жидкий", unitId: "t", formulaId: "asphalt_install_road_bitumen_v1", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "asphalt:material:technical-kerosene", section: "Материалы", category: "material", titleRu: "Керосин технический для технологических целей", unitId: "t", formulaId: "asphalt_install_technical_kerosene_v1", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "asphalt:material:hardwood-side-stop-bars", section: "Материалы", category: "material", titleRu: "Брусья обрезные из твёрдых пород для боковых упоров", unitId: "m3", formulaId: "asphalt_install_hardwood_bars_v1", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "asphalt:labor:road-workers", section: "Труд", category: "construction_work", titleRu: "Труд рабочих-строителей по КРЕР 27-06-020-01 и поправке 27-06-021-01", unitId: "man_hour", formulaId: "asphalt_install_labor_v1", costTreatment: "OWN_COST" },

  { rowId: "asphalt:equipment:crane-10t", section: "Машины и механизмы", category: "equipment", titleRu: "Кран на автомобильном ходу 10 т", unitId: "machine_hour", formulaId: "asphalt_install_crane_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:equipment:hand-tar-sprayer", section: "Машины и механизмы", category: "equipment", titleRu: "Гудронатор ручной", unitId: "machine_hour", formulaId: "asphalt_install_tar_sprayer_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:equipment:smooth-roller-8t", section: "Машины и механизмы", category: "equipment", titleRu: "Каток дорожный самоходный гладкий 8 т", unitId: "machine_hour", formulaId: "asphalt_install_roller_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:equipment:surface-grinder", section: "Машины и механизмы", category: "equipment", titleRu: "Каток дорожный самоходный гладкий 13 т", unitId: "machine_hour", formulaId: "asphalt_install_surface_grinder_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:equipment:tractor-road-brush", section: "Машины и механизмы", category: "equipment", titleRu: "Машина поливомоечная, вместимость 6000 л", unitId: "machine_hour", formulaId: "asphalt_install_tractor_brush_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:equipment:asphalt-paver", section: "Машины и механизмы", category: "equipment", titleRu: "Асфальтоукладчик", unitId: "machine_hour", formulaId: "asphalt_install_paver_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:equipment:onboard-vehicle-5t", section: "Машины и механизмы", category: "equipment", titleRu: "Автомобиль бортовой грузоподъёмностью до 5 т", unitId: "machine_hour", formulaId: "asphalt_install_onboard_vehicle_v1", costTreatment: "OWN_COST" },
];

const machineComponents = [
  ["crane-10t", "Кран 10 т", "asphalt_install_crane_v1", "asphalt:equipment:crane-10t"],
  ["hand-tar-sprayer", "Гудронатор ручной", "asphalt_install_tar_sprayer_v1", "asphalt:equipment:hand-tar-sprayer"],
  ["smooth-roller-8t", "Каток 8 т", "asphalt_install_roller_v1", "asphalt:equipment:smooth-roller-8t"],
  ["surface-grinder", "Каток 13 т", "asphalt_install_surface_grinder_v1", "asphalt:equipment:surface-grinder"],
  ["tractor-road-brush", "Поливомоечная машина 6000 л", "asphalt_install_tractor_brush_v1", "asphalt:equipment:tractor-road-brush"],
  ["asphalt-paver", "Асфальтоукладчик", "asphalt_install_paver_v1", "asphalt:equipment:asphalt-paver"],
  ["onboard-vehicle-5t", "Бортовой автомобиль", "asphalt_install_onboard_vehicle_v1", "asphalt:equipment:onboard-vehicle-5t"],
] as const;
for (const [key, title, formulaId, parentRowId] of machineComponents) {
  rows.push(
    { rowId: `asphalt:included:operator:${key}`, section: "Состав машино-часа", category: "construction_work", titleRu: `Машинист/оператор: ${title}`, unitId: "machine_hour", formulaId, costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId },
    { rowId: `asphalt:included:fuel-energy:${key}`, section: "Состав машино-часа", category: "service", titleRu: `Топливо, энергия и эксплуатационные жидкости: ${title}`, unitId: "machine_hour", formulaId, costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId },
  );
}
rows.push(
  { rowId: "asphalt:included:roller-water-scrapers", section: "Состав машино-часа", category: "service", titleRu: "Система смачивания вальцов и скребки катка", unitId: "machine_hour", formulaId: "asphalt_install_roller_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt:equipment:smooth-roller-8t" },
  { rowId: "asphalt:included:paver-screed-grade-control", section: "Состав машино-часа", category: "service", titleRu: "Подогрев выглаживающей плиты и система контроля профиля асфальтоукладчика", unitId: "machine_hour", formulaId: "asphalt_install_paver_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt:equipment:asphalt-paver" },

  { rowId: "asphalt:delivery:truck-trips", section: "Доставка смеси", category: "service", titleRu: "Рейсы самосвалов с горячей асфальтобетонной смесью", unitId: "trip", formulaId: "asphalt_install_truck_trips_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:delivery:ton-km", section: "Доставка смеси", category: "service", titleRu: "Транспортная работа по доставке горячей смеси", unitId: "t_km", formulaId: "asphalt_install_ton_km_v1", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt:delivery:truck-machine-hours", section: "Доставка смеси", category: "equipment", titleRu: "Автосамосвалы: движение, погрузка, ожидание и разгрузка", unitId: "machine_hour", formulaId: "asphalt_install_truck_machine_h_v1", costTreatment: "OWN_COST" },

  { rowId: "asphalt:mobilization:paver", section: "Мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат асфальтоукладчика", unitId: "service", formulaId: "asphalt_install_mobilization_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:mobilization:roller", section: "Мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат катка 8 т", unitId: "service", formulaId: "asphalt_install_mobilization_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:mobilization:roller-13t", section: "Мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат катка 13 т", unitId: "service", formulaId: "asphalt_install_mobilization_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:mobilization:tar-sprayer", section: "Мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат гудронатора", unitId: "service", formulaId: "asphalt_install_mobilization_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:mobilization:tractor-brush", section: "Мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат поливомоечной машины", unitId: "service", formulaId: "asphalt_install_mobilization_v1", costTreatment: "OWN_COST" },

  { rowId: "asphalt:quality:material-passports", section: "Контроль качества", category: "service", titleRu: "Входной контроль и реестр паспортов асфальтобетонной смеси и битума", unitId: "document", formulaId: "asphalt_install_material_passports_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:quality:mix-temperature", section: "Контроль качества", category: "service", titleRu: "Контроль температуры смеси при каждом рейсе", unitId: "pcs", formulaId: "asphalt_install_truck_trips_v1", costTreatment: "OWN_COST", sourceId: "napa_faa_asphalt_paving_handbook_2025" },
  { rowId: "asphalt:quality:bitumen-application", section: "Контроль качества", category: "service", titleRu: "Контроль равномерности нанесения дорожного битума", unitId: "pcs", formulaId: "asphalt_install_acceptance_lots_v1", costTreatment: "OWN_COST", sourceId: "napa_faa_asphalt_paving_handbook_2025" },
  { rowId: "asphalt:quality:layer-thickness", section: "Контроль качества", category: "service", titleRu: "Контроль толщины слоя покрытия", unitId: "pcs", formulaId: "asphalt_install_acceptance_lots_v1", costTreatment: "OWN_COST", sourceId: "napa_faa_asphalt_paving_handbook_2025" },
  { rowId: "asphalt:quality:density", section: "Контроль качества", category: "service", titleRu: "Контроль плотности уплотнённого покрытия", unitId: "pcs", formulaId: "asphalt_install_acceptance_lots_v1", costTreatment: "OWN_COST", sourceId: "napa_faa_asphalt_paving_handbook_2025" },
  { rowId: "asphalt:quality:smoothness", section: "Контроль качества", category: "service", titleRu: "Контроль ровности поверхности", unitId: "pcs", formulaId: "asphalt_install_acceptance_lots_v1", costTreatment: "OWN_COST", sourceId: "napa_faa_asphalt_paving_handbook_2025" },
  { rowId: "asphalt:quality:grade-slope", section: "Контроль качества", category: "service", titleRu: "Геодезический контроль отметок и поперечного уклона", unitId: "pcs", formulaId: "asphalt_install_acceptance_lots_v1", costTreatment: "OWN_COST", sourceId: "napa_faa_asphalt_paving_handbook_2025" },

  { rowId: "asphalt:document:work-journal", section: "Исполнительная документация", category: "service", titleRu: "Журнал производства работ и операционного контроля", unitId: "document", formulaId: "asphalt_install_work_journal_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "asphalt:document:execution-set", section: "Исполнительная документация", category: "service", titleRu: "Комплект исполнительных схем, актов и протоколов", unitId: "document", formulaId: "asphalt_install_execution_docs_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "asphalt:document:delivery-register", section: "Исполнительная документация", category: "service", titleRu: "Реестр рейсов, температур и партий смеси", unitId: "document", formulaId: "asphalt_install_material_passports_v1", costTreatment: "CONTROL_OR_DOCUMENT" },

  { rowId: "asphalt:organization:traffic-control", section: "Организация работ", category: "service", titleRu: "Организация безопасной рабочей зоны и регулирование движения", unitId: "set", formulaId: "asphalt_install_traffic_control_v1", costTreatment: "OWN_COST" },
  { rowId: "asphalt:organization:continuous-flow", section: "Организация работ", category: "service", titleRu: "Организация непрерывного потока доставки, укладки и уплотнения", unitId: "m2", formulaId: "asphalt_install_area_v1", costTreatment: "INFORMATIONAL_SCOPE" },
);

export const ASPHALT_INSTALL_KRER27_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(rows.map((row, ordinal) => resource({ ...row, ordinal })));

const completenessEntries = INDEPENDENT_REQUIRED_COMPONENTS.map((component) => ({
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

export const ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "NORMATIVE_OPERATION_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json",
  entries: completenessEntries,
});

export async function compileAsphaltInstallLargeAreaKrer27ProfileR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ASPHALT_INSTALL_KRER27_CATALOG_ID;
  if (catalogId !== ASPHALT_INSTALL_KRER27_CATALOG_ID) {
    throw new Error(`ASPHALT_INSTALL_KRER27_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.asphalt-install-large-area-krer27-profile-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...ASPHALT_INSTALL_KRER27_PARAMETERS],
    formulaDefinitions: [...ASPHALT_INSTALL_KRER27_FORMULAS],
    resourceDefinitions: [...ASPHALT_INSTALL_KRER27_RESOURCES],
    submittedParameters,
    confirmedParameters: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: ASPHALT_INSTALL_KRER27_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
