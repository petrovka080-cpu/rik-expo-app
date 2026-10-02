import sourcePack from "../../../../data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type RuntimeClass = "NORMATIVE" | "ASSUMPTION";
type ValueType = "decimal" | "integer" | "text" | "enum";
type ResourceKind =
  | "operation" | "labor" | "material" | "consumable"
  | "equipment" | "delivery" | "control" | "service";

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_vibrate_standard";
export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_ID =
  "stairs_concrete_vibration_standard_s27_23";
export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID =
  "ACI-309-WACKER-IRFU45-STAIRS-VIBRATION-S27-23-PRELIMINARY-R1";
export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256 =
  "248c48012ed587514fa90d6ca7ef4eae59604aed3b8fcc04a09e4a4cbdbf57ac";

const PROFILE = sourcePack.selectedPreliminaryProfile;
const ACI = "ACI_309_CONSOLIDATION_PREVIEW_2026_10_01";
const WACKER = "WACKER_NEUSON_IRFU_TECHNICAL_DATA_2026_10_01";
const PRELIMINARY = "S27_23_VISIBLE_STAIRS_VIBRATION_PLANNING_PROFILE";

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT = Object.freeze({
  approved_consolidation_method: PROFILE.approvedConsolidationMethod,
  selected_vibrator_reference: PROFILE.selectedVibratorReference,
  vibrator_head_diameter_mm: PROFILE.vibratorHeadDiameterMm,
  vibrator_nominal_power_kw: PROFILE.vibratorNominalPowerKw,
  vibrator_vibrations_per_min: PROFILE.vibratorVibrationsPerMin,
  machine_productivity_m3_per_machine_hour: PROFILE.machineProductivityM3PerMachineHour,
  labor_productivity_m3_per_man_hour: PROFILE.laborProductivityM3PerManHour,
  rental_shift_hour: PROFILE.rentalShiftHour,
  active_vibrator_count: PROFILE.activeVibratorCount,
  backup_vibrator_count: PROFILE.backupVibratorCount,
  electrical_protection_set_count: PROFILE.electricalProtectionSetCount,
  extension_cable_set_count: PROFILE.extensionCableSetCount,
  cleaning_labor_h_per_used_vibrator: PROFILE.cleaningLaborHPerUsedVibrator,
  cleaning_water_m3_per_used_vibrator: PROFILE.cleaningWaterM3PerUsedVibrator,
  cleaning_brush_count: PROFILE.cleaningBrushCount,
  cleaning_wipe_package_count: PROFILE.cleaningWipePackageCount,
  wash_water_container_count: PROFILE.washWaterContainerCount,
  quality_record_count: PROFILE.qualityRecordCount,
  mobilization_trip_count: PROFILE.mobilizationTripCount,
  wash_water_disposal_trip_count: PROFILE.washWaterDisposalTripCount,
});

const NORMATIVE_IDS = new Set([
  "approved_consolidation_method", "selected_vibrator_reference",
  "vibrator_head_diameter_mm", "vibrator_nominal_power_kw",
  "vibrator_vibrations_per_min",
]);

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION =
  Object.freeze(Object.fromEntries(
    Object.keys(STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT)
      .map((parameterId) => [parameterId, NORMATIVE_IDS.has(parameterId)
        ? "NORMATIVE" : "ASSUMPTION"]),
  ) as Readonly<Record<string, RuntimeClass>>);

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_SOURCE_IDS =
  Object.freeze(Object.fromEntries(
    Object.keys(STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT)
      .map((parameterId) => [parameterId, [
        STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_ID,
      ]]),
  ) as Readonly<Record<string, readonly string[]>>);

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SHORT_INPUT = Object.freeze({
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
});

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
  concrete_mix_reference: "PROJECT-CONCRETE-MIX-STAIRS-REV-A",
  placement_location: "Лестничный марш и площадка; захватка STAIRS-VIB-01",
});

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "ACI 309 applicability and Wacker Neuson IRFU45 stair-concrete vibration profile",
  source_authority: "American Concrete Institute; Wacker Neuson; видимый профиль S27.23",
  source_document_version: "ACI_309R_05_AND_WACKER_IRFU_CAPTURE_2026_10_01",
  definition_hash: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
  source_kind: "METHOD_APPLICABILITY_PLUS_SELECTED_EQUIPMENT_PLUS_VISIBLE_ASSUMPTIONS",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
  use_restriction: PROFILE.assumptionPolicy,
  source_pack_path:
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
});

type ParameterDescriptor = Readonly<{
  id: string;
  title: string;
  unit: string | null;
  guide: string;
  type?: ValueType;
  min?: number;
  values?: readonly string[];
  required?: boolean;
}>;

const D = (
  id: string,
  title: string,
  unit: string | null,
  guide: string,
  options: Pick<ParameterDescriptor, "type" | "min" | "values" | "required"> = {},
): ParameterDescriptor => ({ id, title, unit, guide, ...options });

const PARAMETERS: readonly ParameterDescriptor[] = [
  D("consolidated_concrete_volume_m3", "Объём свежеуложенного бетона лестницы", "m3", "Ввести объём из ведомости укладки бетона.", { min: 0.001 }),
  D("concrete_mix_reference", "Ссылка на проектную смесь", null, "Уточнить класс, подвижность и смесь из проекта.", { type: "text", required: false }),
  D("placement_location", "Захватка лестницы", null, "Указать марш, площадку и границу захватки.", { type: "text", required: false }),
  D("approved_consolidation_method", "Способ уплотнения", null, "Профиль применим к глубинному вибрированию.", { type: "enum", values: ["INTERNAL_VIBRATION"] }),
  D("selected_vibrator_reference", "Предварительно выбранный вибратор", null, "Подтвердить модель по ППР и армированию.", { type: "text" }),
  D("vibrator_head_diameter_mm", "Диаметр булавы", "mm", "Официальная карточка IRFU45: 45 мм.", { min: 0.001 }),
  D("vibrator_nominal_power_kw", "Номинальная мощность вибратора", "kw", "Официальная карточка IRFU45: 0,88 кВт.", { min: 0.001 }),
  D("vibrator_vibrations_per_min", "Частота колебаний", "item_per_min", "Официальная карточка IRFU45: 12 000 1/мин.", { type: "integer", min: 1 }),
  D("machine_productivity_m3_per_machine_hour", "Плановая производительность вибратора", "m3_per_machine_hour", "Видимое допущение ППР; заменить утверждённым графиком.", { min: 0.001 }),
  D("labor_productivity_m3_per_man_hour", "Плановая производительность труда", "m3_per_man_hour", "Видимое допущение ППР; заменить утверждённой нормой проекта.", { min: 0.001 }),
  D("rental_shift_hour", "Часов в смене аренды", "hour", "Заменить условиями поставщика.", { min: 0.001 }),
  D("active_vibrator_count", "Рабочих вибраторов", "item", "Видимое оснащение захватки.", { type: "integer", min: 1 }),
  D("backup_vibrator_count", "Резервных вибраторов", "item", "Видимый резерв; уточнить по непрерывности бетонирования.", { type: "integer", min: 0 }),
  D("electrical_protection_set_count", "Комплектов электрозащиты", "item", "Уточнить по временной электросети.", { type: "integer", min: 0 }),
  D("extension_cable_set_count", "Комплектов удлинителя", "item", "Уточнить по расстоянию до точки питания.", { type: "integer", min: 0 }),
  D("cleaning_labor_h_per_used_vibrator", "Труд очистки одного использованного вибратора", "man_hour", "Видимое допущение ППР; не равно времени работы вибратора.", { min: 0 }),
  D("cleaning_water_m3_per_used_vibrator", "Вода на очистку одного использованного вибратора", "m3", "Видимое допущение на одну очистку; не умножается на машино-часы.", { min: 0 }),
  D("cleaning_brush_count", "Щёток для очистки", "item", "Видимое количество расходной оснастки.", { type: "integer", min: 0 }),
  D("cleaning_wipe_package_count", "Упаковок салфеток", "item", "Видимое количество для очистки оборудования.", { type: "integer", min: 0 }),
  D("wash_water_container_count", "Ёмкостей для промывочной воды", "item", "Уточнить по экологическому ППР.", { type: "integer", min: 0 }),
  D("quality_record_count", "Записей контроля", "document", "Видимый комплект записей по захватке.", { type: "integer", min: 1 }),
  D("mobilization_trip_count", "Рейсов доставки и возврата", "trip", "Заменить маршрутом и предложением поставщика.", { type: "integer", min: 0 }),
  D("wash_water_disposal_trip_count", "Рейсов удаления промывочной воды", "trip", "Уточнить допустимый способ обращения.", { type: "integer", min: 0 }),
];

const PROJECT_IDS = new Set([
  "consolidated_concrete_volume_m3", "concrete_mix_reference", "placement_location",
]);

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze(PARAMETERS.map(
  (descriptor, ordinal) => ({
    parameter_id: descriptor.id,
    ordinal,
    value_type: descriptor.type ?? "decimal",
    unit_id: descriptor.unit ?? null,
    title_ru: descriptor.title,
    required: descriptor.required ?? true,
    default_value: null,
    constraints_json: {
      ...(descriptor.min == null ? {} : { min: descriptor.min }),
      ...(descriptor.values ? { values: [...descriptor.values] } : {}),
      ...(descriptor.type === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.s27-23.stairs-concrete-vibration.v1",
      semantic_parameter_key: `stairs-concrete-vibration-s27-23:${descriptor.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: PROJECT_IDS.has(descriptor.id)
        ? "USER_OR_PROJECT_MEASURED"
        : "VISIBLE_NORMATIVE_OR_REPLACEABLE_PROFILE",
      input_origin_class: PROJECT_IDS.has(descriptor.id)
        ? "PROJECT_PLACEMENT_SCOPE"
        : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: descriptor.id !== "consolidated_concrete_volume_m3",
      source_confirmation_required: false,
      hidden_default_forbidden: PROJECT_IDS.has(descriptor.id),
      runtime_profile_value: Object.prototype.hasOwnProperty.call(
        STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
        descriptor.id,
      ),
      synthetic: false,
      guide: {
        guide_kind: descriptor.id === "consolidated_concrete_volume_m3"
          ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: descriptor.guide,
        source_role: NORMATIVE_IDS.has(descriptor.id)
          ? "PRIMARY_METHOD_OR_MANUFACTURER_EQUIPMENT_DATA"
          : PROJECT_IDS.has(descriptor.id)
            ? "PROJECT_PLACEMENT_SCOPE"
            : "VISIBLE_REPLACEABLE_PLANNING_ASSUMPTION",
        source_document: NORMATIVE_IDS.has(descriptor.id)
          ? (descriptor.id === "approved_consolidation_method" ? ACI : WACKER)
          : PRELIMINARY,
        source_locator: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_METADATA.exact_locator,
        guide_version: "stairs-concrete-vibration-standard-s27-23-r1",
        source_snapshot_hash: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
        applicability: PROFILE.assumptionPolicy,
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy:
          "FIRST_ESTIMATE_NOW_THEN_REPLACE_PRODUCTIVITY_EQUIPMENT_AND_PROJECT_CONTEXT",
      },
    },
  })),
);

function formula(id: string, unit: string, expression: string): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: `stairs_concrete_vibration_${id}_s2723`,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast),
  };
}

const F = (id: string, unit: string, expression: string) => formula(id, unit, expression);
const MACHINE_HOURS = "consolidated_concrete_volume_m3/machine_productivity_m3_per_machine_hour";

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  F("volume", "m3", "consolidated_concrete_volume_m3"),
  F("single", "service", "1"),
  F("machine_hours", "machine_hour", MACHINE_HOURS),
  F("labor_hours", "man_hour", "consolidated_concrete_volume_m3/labor_productivity_m3_per_man_hour"),
  F("rental_shifts", "shift", `ceil((${MACHINE_HOURS})/rental_shift_hour)`),
  F("active_vibrators", "item", "active_vibrator_count"),
  F("backup_vibrators", "item", "backup_vibrator_count"),
  F("electrical_protection", "item", "electrical_protection_set_count"),
  F("extension_cable", "item", "extension_cable_set_count"),
  F("electricity", "kwh", `(${MACHINE_HOURS})*vibrator_nominal_power_kw*active_vibrator_count`),
  F("cleaning_labor", "man_hour", "active_vibrator_count*cleaning_labor_h_per_used_vibrator"),
  F("cleaning_water", "m3", "active_vibrator_count*cleaning_water_m3_per_used_vibrator"),
  F("cleaning_brush", "item", "cleaning_brush_count"),
  F("cleaning_wipes", "item", "cleaning_wipe_package_count"),
  F("wash_container", "item", "wash_water_container_count"),
  F("quality_records", "document", "quality_record_count"),
  F("mobilization", "trip", "mobilization_trip_count"),
  F("wash_water_disposal", "trip", "wash_water_disposal_trip_count"),
]);

type ResourceSpec = Readonly<{
  stage: string;
  rowId: string;
  kind: ResourceKind;
  title: string;
  unit: string;
  formula: string;
  source: string;
  procurement?: boolean;
  informational?: boolean;
}>;

const id = (short: string) => `stairs_concrete_vibration_${short}_s2723`;
const R = (
  stage: string,
  rowId: string,
  kind: ResourceKind,
  title: string,
  unit: string,
  shortFormula: string,
  source: string,
  options: Pick<ResourceSpec, "procurement" | "informational"> = {},
): ResourceSpec => ({ stage, rowId, kind, title, unit, formula: id(shortFormula), source, ...options });

const RESOURCE_SPECS: readonly ResourceSpec[] = [
  R("01 · Объём и применимость", "concrete-stairs-vibration:01:control:scope-volume", "control", "Объём свежеуложенного бетона лестницы, подлежащий уплотнению", "m3", "volume", ACI, { informational: true }),
  R("01 · Объём и применимость", "concrete-stairs-vibration:01:control:method-applicability", "control", "Проверка применимости глубинного вибрирования по смеси и условиям укладки", "service", "single", ACI, { informational: true }),
  R("01 · Объём и применимость", "concrete-stairs-vibration:01:control:equipment-suitability", "control", "Подтверждение диаметра булавы по геометрии лестницы и армированию", "service", "single", WACKER, { informational: true }),

  R("02 · Подготовка оборудования", "concrete-stairs-vibration:02:operation:equipment-check", "operation", "Осмотр, пробный пуск и подготовка глубинного вибратора", "item", "active_vibrators", ACI),
  R("02 · Подготовка оборудования", "concrete-stairs-vibration:02:equipment:electrical-protection", "equipment", "Комплект защитного подключения временной электросети", "item", "electrical_protection", PRELIMINARY, { procurement: true }),
  R("02 · Подготовка оборудования", "concrete-stairs-vibration:02:equipment:extension-cable", "equipment", "Защищённый удлинитель для зоны бетонирования", "item", "extension_cable", PRELIMINARY, { procurement: true }),

  R("03 · Виброуплотнение", "concrete-stairs-vibration:03:operation:internal-vibration", "operation", "Глубинное виброуплотнение свежеуложенного бетона лестницы", "m3", "volume", ACI),
  R("03 · Виброуплотнение", "concrete-stairs-vibration:03:labor:vibration-crew", "labor", "Труд звена виброуплотнения по видимой плановой производительности", "man_hour", "labor_hours", PRELIMINARY),
  R("03 · Виброуплотнение", "concrete-stairs-vibration:03:equipment:active-vibrator", "equipment", "Работа Wacker Neuson IRFU45/230/5 или подтверждённого аналога", "machine_hour", "machine_hours", WACKER, { informational: true }),
  R("03 · Виброуплотнение", "concrete-stairs-vibration:03:equipment:rental-shifts", "equipment", "Смены аренды рабочего глубинного вибратора", "shift", "rental_shifts", PRELIMINARY, { procurement: true }),
  R("03 · Виброуплотнение", "concrete-stairs-vibration:03:equipment:backup-vibrator", "equipment", "Резервный глубинный вибратор на захватке", "item", "backup_vibrators", PRELIMINARY, { procurement: true }),
  R("03 · Виброуплотнение", "concrete-stairs-vibration:03:material:electricity", "material", "Электроэнергия по мощности выбранного вибратора", "kwh", "electricity", WACKER, { procurement: true }),

  R("04 · Очистка оборудования", "concrete-stairs-vibration:04:operation:cleaning", "operation", "Очистка вибробулавы и шланга после захватки", "service", "single", PRELIMINARY, { informational: true }),
  R("04 · Очистка оборудования", "concrete-stairs-vibration:04:labor:cleaning", "labor", "Труд очистки использованного вибратора без повторного начисления машино-часов", "man_hour", "cleaning_labor", PRELIMINARY),
  R("04 · Очистка оборудования", "concrete-stairs-vibration:04:consumable:cleaning-water", "consumable", "Вода для контролируемой очистки оборудования", "m3", "cleaning_water", PRELIMINARY, { procurement: true }),
  R("04 · Очистка оборудования", "concrete-stairs-vibration:04:consumable:brush", "consumable", "Щётка для очистки вибробулавы и шланга", "item", "cleaning_brush", PRELIMINARY, { procurement: true }),
  R("04 · Очистка оборудования", "concrete-stairs-vibration:04:consumable:wipes", "consumable", "Упаковка ветоши или салфеток для оборудования", "item", "cleaning_wipes", PRELIMINARY, { procurement: true }),
  R("04 · Очистка оборудования", "concrete-stairs-vibration:04:equipment:wash-water-container", "equipment", "Ёмкость для сбора промывочной воды", "item", "wash_container", PRELIMINARY, { procurement: true }),

  R("05 · Контроль", "concrete-stairs-vibration:05:control:quality-record", "control", "Запись контроля выполнения виброуплотнения захватки", "document", "quality_records", ACI, { informational: true }),
  R("05 · Контроль", "concrete-stairs-vibration:05:control:no-concrete-double-count", "control", "Бетонная смесь учитывается только в операции укладки и не дублируется здесь", "service", "single", ACI, { informational: true }),

  R("06 · Логистика", "concrete-stairs-vibration:06:delivery:mobilization", "delivery", "Доставка и возврат вибраторов и электрической оснастки", "trip", "mobilization", PRELIMINARY, { procurement: true }),
  R("06 · Логистика", "concrete-stairs-vibration:06:delivery:wash-water", "delivery", "Передача собранной промывочной воды по согласованной схеме", "trip", "wash_water_disposal", PRELIMINARY, { procurement: true }),
];

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));

function category(kind: ResourceKind): string {
  if (["material", "consumable"].includes(kind)) return "material";
  if (kind === "labor") return "labor";
  if (kind === "equipment") return "equipment";
  if (kind === "delivery") return "delivery";
  if (["control", "service"].includes(kind)) return "service";
  return "construction_work";
}

function resource(spec: ResourceSpec, ordinal: number): CanonicalEstimateResourceDefinition {
  const source = SOURCE_BY_ID.get(spec.source);
  const informational = spec.informational === true;
  const procurementEligible = spec.procurement
    ?? (["material", "consumable"].includes(spec.kind) && !informational);
  const resourceGraph = {
    formulaId: spec.formula,
    normalizedUom: spec.unit,
    semanticOwnerId: `stairs-concrete-vibration-s27-23:${spec.rowId}`,
    resourceKind: spec.kind,
    stage: spec.stage,
    costOwner: informational ? "scope" : "resource",
    costTreatment: informational ? "INFORMATIONAL_SCOPE" : "OWN_COST",
    payable: !informational,
    noDoubleCount: true,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    preliminaryProfileId: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID,
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
    contextParameterIds: [
      "concrete_mix_reference", "placement_location", "approved_consolidation_method",
      "selected_vibrator_reference", "vibrator_head_diameter_mm",
      "vibrator_vibrations_per_min",
    ],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: source?.role ?? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
    sourcePackSha256: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId: spec.source,
      source_id: spec.source,
      normId: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID,
      normVersion: "S27.23",
      source_title: source?.authority ?? spec.source,
      source_url: source?.officialUrl ?? null,
      exact_locator: source?.exactLocator ?? "selected visible preliminary profile",
      source_definition_hash: source?.artifactSha256
        ?? STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
    }],
    engineeringLimitations: [...sourcePack.engineeringLimitations],
  };
  return {
    id: `resource-${spec.rowId.replace(/:/gu, "-")}`,
    row_id: spec.rowId,
    ordinal,
    section: spec.stage,
    category: category(spec.kind),
    title_ru: spec.title,
    unit_id: spec.unit,
    formula_id: spec.formula,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resourceGraph,
    procurement_eligible: procurementEligible,
    cost_owner_id: spec.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ spec, resourceGraph, sourceMetadata }),
  };
}

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  RESOURCE_SPECS.map((spec, ordinal) => resource(spec, ordinal)),
);

export const STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.stairs-concrete-vibration-completeness.v1",
    sourceKind: "INDEPENDENT_ATOMIC_TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
    sourcePackPath:
      "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
    entries: sourcePack.independentRequiredComponents.map((component) => ({
      ...component,
      expectedResourceIds: [...component.requiredRowIds],
    })),
  });

export function stairsConcreteVibrationStandardMissingRows(
  rowIds: ReadonlySet<string>,
): string[] {
  return STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export async function compileStairsConcreteVibrationStandardS2723(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.stairs-concrete-vibration-standard-s27-23.v1",
    catalogId: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_CATALOG_ID,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS],
    formulaDefinitions: [...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS],
    resourceDefinitions: [...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
