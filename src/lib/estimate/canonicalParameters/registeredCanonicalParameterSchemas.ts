import {
  ASPHALT_PARAMETER_SCHEMA_ID_V4,
  ASPHALT_WORK_ID_V4,
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4,
  ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
} from "../v4/asphalt";
import {
  ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION,
  ASPHALT_REFERENCE_V1_ID,
} from "../v4/asphalt/asphaltReferenceV1";
import { ELECTRICAL_CANONICAL_PARAMETER_SCHEMA } from "../v4/electrical/electricalCanonicalV1";
import {
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
  asphaltRelatedParameterKeysForProfileV4,
} from "../v4/asphalt/asphaltRelatedSemanticRegistryV4";
import { ASPHALT_RELATED_PARAMETER_METADATA_V4 } from "../v4/asphalt/asphaltRelatedProductionBindingV4";
import { ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4 } from "../v4/asphalt/compileAsphaltRelatedThroughCoreV4";
import { INTERIOR_FINISHES_CANONICAL_PARAMETER_SCHEMAS } from "../v4/domains/interiorFinishesComplete/canonicalParameterSchemas";
import { WATER_SEWER_CANONICAL_PARAMETER_SCHEMAS } from "../v4/domains/waterSupplySewerageComplete/canonicalParameterSchemas";
import { HVAC_CANONICAL_PARAMETER_SCHEMAS } from "../v4/domains/heatingVentilationComplete/canonicalParameterSchemas";
import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  type CanonicalParameterDefinition,
  type CanonicalParameterSchema,
  type CanonicalParameterValueType,
} from "./canonicalParameterCore";
import { createCanonicalParameterSchemaRegistry } from "./canonicalParameterSchemaRegistry";

function asphaltValueType(inputKind: string): CanonicalParameterValueType {
  if (["quantity", "integer", "decimal"].includes(inputKind)) return "number";
  if (inputKind === "boolean") return "boolean";
  return "string";
}

const ASPHALT_CANONICAL_PARAMETER_DEFINITIONS: readonly CanonicalParameterDefinition[] =
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.map((parameter, index) => ({
    parameterId: parameter.canonical_key,
    label: parameter.professional_name_ru,
    description: parameter.user_help_ru,
    valueType: asphaltValueType(parameter.input_kind),
    unit: parameter.canonical_unit_id,
    requiredLevel: parameter.necessity === "critical"
      ? "BLOCKING_REQUIRED"
      : parameter.necessity === "recommended"
        ? "CONTRACT_REQUIRED"
        : "OPTIONAL",
    visibilityCondition: { kind: "ALWAYS" as const },
    validation: {
      ...(parameter.range?.minimum != null ? { min: parameter.range.minimum } : {}),
      ...(parameter.range?.maximum != null ? { max: parameter.range.maximum } : {}),
      ...(parameter.input_kind === "integer" ? { integer: true } : {}),
      ...(["text", "document", "location"].includes(parameter.input_kind)
        ? { nonEmpty: true }
        : {}),
    },
    allowedValues: parameter.choices.map((choice) => ({
      value: choice.value,
      label: choice.label_ru,
    })),
    affectsRows: parameter.affected_row_ids.length > 0
      ? [...parameter.affected_row_ids]
      : parameter.specification_bindings.map((binding) => `specification:${binding}`),
    affectsFormula: parameter.formula_dependencies.length > 0
      ? [...parameter.formula_dependencies]
      : parameter.specification_bindings.length > 0
        ? parameter.specification_bindings.map((binding) => `specification:${binding}`)
        : parameter.affected_row_ids.map((rowId) => `inclusion:${rowId}`),
    normativeSource: null,
    displayOrder: index + 1,
  }));

export const ASPHALT_CANONICAL_PARAMETER_SCHEMA: CanonicalParameterSchema = {
  coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  schemaId: `canonical:${ASPHALT_PARAMETER_SCHEMA_ID_V4}`,
  schemaVersion: "1.0.0",
  workPassportId: ASPHALT_REFERENCE_V1_ID,
  canonicalWorkKey: ASPHALT_WORK_ID_V4,
  calculationVersion: `${ASPHALT_V4_RUNTIME_TEMPLATE_VERSION}|${ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION}`,
  definitions: ASPHALT_CANONICAL_PARAMETER_DEFINITIONS,
  requiredAlternatives: [
    { alternativeId: "area", parameterIds: ["area_m2"] },
    { alternativeId: "length_width", parameterIds: ["length_m", "width_m"] },
  ],
};

function asphaltRelatedValueType(
  key: string,
  allowedValues: readonly (string | boolean)[],
): CanonicalParameterValueType {
  if (allowedValues.length > 0) {
    return typeof allowedValues[0] === "boolean" ? "boolean" : "string";
  }
  const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[key];
  return metadata?.unit || metadata?.minimum != null || metadata?.maximum != null || metadata?.integer
    ? "number"
    : "string";
}

const ASPHALT_RELATED_ALLOWED_VALUE_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  COLD_MILLING: "Холодное фрезерование",
  MECHANICAL_BREAKOUT: "Механизированный демонтаж",
  MANUAL_BREAKOUT: "Ручной демонтаж",
  COMBINED: "Комбинированный способ",
  FULL: "Полный демонтаж",
  PARTIAL: "Частичный демонтаж",
  RECYCLING: "Переработка",
  RECOVERED_MATERIAL: "Повторное использование",
  TEMPORARY_STORAGE: "Временное складирование",
  DISPOSAL: "Утилизация",
  PURE_DEMOLITION: "Только демонтаж",
  DEMOLITION_AND_REINSTATEMENT: "Демонтаж и восстановление",
  LIGHT: "Лёгкая нагрузка",
  MEDIUM: "Средняя нагрузка",
  HEAVY: "Тяжёлая нагрузка",
  VERY_HEAVY: "Особо тяжёлая нагрузка",
  PROJECT_SPECIFIED: "По проекту",
  PASSENGER_CARS: "Легковые автомобили",
  MIXED: "Смешанный транспорт",
  TRUCKS: "Грузовой транспорт",
  SPECIAL_EQUIPMENT: "Специальная техника",
  LIGHT_COMMERCIAL: "Лёгкий коммерческий транспорт",
  ACCEPTED: "Принято и готово",
  LOCAL_REPAIR_REQUIRED: "Требуется локальный ремонт",
  NEW_BASE_REQUIRED: "Требуется новое основание",
  RECONSTRUCTION_REQUIRED: "Требуется переустройство",
  SOUND: "Без дефектов, препятствующих укладке",
  DEFECTS_REQUIRE_REPAIR: "Дефекты требуют ремонта",
  PROFILE_MILLING_REQUIRED: "Требуется выравнивающее фрезерование",
  DENSE_FINE_GRAINED: "Плотная мелкозернистая смесь",
  STONE_MASTIC: "Щебёночно-мастичная смесь",
  POROUS: "Пористая смесь",
  DENSE_COARSE_GRAINED: "Плотная крупнозернистая смесь",
  CRUSHED_STONE: "Щебёночное основание",
  SAND_GRAVEL: "Песчано-гравийное основание",
  ASPHALT_GRANULATE: "Асфальтогранулят по проекту",
  SAND: "Песчаный подстилающий слой",
  ROAD_CURB: "Дорожный бортовой камень",
  PARKING_CURB: "Парковочный бортовой камень",
  SURFACE_CHANNEL: "Поверхностный канал",
  TRAY: "Водоотводный лоток",
  POINT_INLETS: "Точечные дождеприёмники",
  ROAD_PAINT: "Дорожная краска",
  THERMOPLASTIC: "Термопластик",
  COLD_PLASTIC: "Холодный пластик",
  SAW_CUT_AND_REPLACE: "Резка карты, удаление и восстановление",
  MILL_AND_REPLACE: "Фрезерование карты и восстановление",
  INFRARED_REPAIR: "Инфракрасный ремонт по проекту",
  ROLLED: "Рулонная гидроизоляция",
  MASTIC: "Мастичная гидроизоляция",
  SPRAY_APPLIED: "Напыляемая гидроизоляция",
  REPLACEMENT_REQUIRED: "Требуется замена",
  true: "Да",
  false: "Нет",
});

function asphaltRelatedAllowedValueLabelRu(value: string | boolean): string {
  return ASPHALT_RELATED_ALLOWED_VALUE_LABELS_RU[String(value)] ?? String(value);
}

const ASPHALT_RELATED_VISIBILITY: Readonly<Record<string, {
  parameterId: string;
  value: string | boolean;
}>> = Object.freeze({
  haul_distance_km: { parameterId: "haul_required", value: true },
  truck_payload_t: { parameterId: "haul_required", value: true },
  reinstatement_depth_mm: { parameterId: "work_scope", value: "DEMOLITION_AND_REINSTATEMENT" },
  new_asphalt_density_t_m3: { parameterId: "work_scope", value: "DEMOLITION_AND_REINSTATEMENT" },
  tack_coat_required: { parameterId: "work_scope", value: "DEMOLITION_AND_REINSTATEMENT" },
  total_area_m2: { parameterId: "removal_extent", value: "PARTIAL" },
  removal_share: { parameterId: "removal_extent", value: "PARTIAL" },
  tack_coat_rate_l_m2: { parameterId: "tack_coat_required", value: true },
  binder_layer_thickness_mm: { parameterId: "binder_layer_required", value: true },
  binder_mix_type: { parameterId: "binder_layer_required", value: true },
  base_layer_thickness_mm: { parameterId: "base_construction_required", value: true },
  base_material_type: { parameterId: "base_construction_required", value: true },
  base_material_compaction_factor: { parameterId: "base_construction_required", value: true },
  subbase_layer_thickness_mm: { parameterId: "subbase_required", value: true },
  subbase_material_type: { parameterId: "subbase_required", value: true },
  subbase_material_compaction_factor: { parameterId: "subbase_required", value: true },
  base_repair_area_m2: { parameterId: "base_condition", value: "LOCAL_REPAIR_REQUIRED" },
  curb_length_m: { parameterId: "curb_required", value: true },
  curb_type: { parameterId: "curb_required", value: true },
  drainage_length_m: { parameterId: "drainage_required", value: true },
  drainage_inlet_count: { parameterId: "drainage_required", value: true },
  drainage_type: { parameterId: "drainage_required", value: true },
  marking_area_m2: { parameterId: "marking_required", value: true },
  marking_material_type: { parameterId: "marking_required", value: true },
  marking_material_rate_kg_m2: { parameterId: "marking_required", value: true },
  marking_glass_beads_required: { parameterId: "marking_required", value: true },
  marking_glass_beads_rate_kg_m2: { parameterId: "marking_glass_beads_required", value: true },
  accessible_space_count: { parameterId: "accessible_parking_required", value: true },
  sign_count: { parameterId: "signing_required", value: true },
  lighting_pole_count: { parameterId: "lighting_required", value: true },
  lighting_luminaire_count: { parameterId: "lighting_required", value: true },
  lighting_cable_length_m: { parameterId: "lighting_required", value: true },
  lighting_cabinet_count: { parameterId: "lighting_required", value: true },
  milling_depth_mm: { parameterId: "milling_required", value: true },
  number_of_passes: { parameterId: "milling_required", value: true },
  boundary_cut_length_m: { parameterId: "boundary_cut_required", value: true },
  removal_labor_productivity_m2_per_man_hour: { parameterId: "asphalt_removal_package_required", value: true },
  removal_control_interval_m2_per_test: { parameterId: "asphalt_removal_package_required", value: true },
  removal_documentation_count: { parameterId: "asphalt_removal_package_required", value: true },
  milling_productivity_m3_per_machine_hour: { parameterId: "removal_method", value: "COLD_MILLING" },
  breakout_productivity_m3_per_machine_hour: { parameterId: "removal_method", value: "MECHANICAL_BREAKOUT" },
  manual_breakout_productivity_m3_per_machine_hour: { parameterId: "removal_method", value: "MANUAL_BREAKOUT" },
  combined_removal_productivity_m3_per_machine_hour: { parameterId: "removal_method", value: "COMBINED" },
  loader_productivity_t_per_machine_hour: { parameterId: "loading_required", value: true },
  base_cleaning_productivity_m2_per_man_hour: { parameterId: "base_cleaning_required", value: true },
  waterproofing_material_kg_m2: { parameterId: "bridge_deck_package_required", value: true },
  protective_layer_density_t_m3: { parameterId: "bridge_deck_package_required", value: true },
  expansion_joint_sealant_kg_m: { parameterId: "bridge_deck_package_required", value: true },
  bridge_waterproofing_productivity_m2_per_man_hour: { parameterId: "bridge_deck_package_required", value: true },
  bridge_waterproofing_machine_productivity_m2_per_machine_hour: { parameterId: "bridge_deck_package_required", value: true },
});

const ASPHALT_REMOVAL_OPERATION_CLASSES_V4 = new Set([
  "FULL_DEPTH_DEMOLITION",
  "PARTIAL_DEPTH_MILLING",
  "PARTIAL_DEPTH_REMOVAL",
  "COLD_MILLING",
  "LOCAL_BREAKUP",
  "MECHANICAL_BREAKOUT",
  "REMOVE_AND_HAUL",
]);

export const ASPHALT_RELATED_CANONICAL_PARAMETER_SCHEMAS_V4: readonly CanonicalParameterSchema[] =
  Object.freeze(ASPHALT_RELATED_EXTRA_PROFILES_V4
    // asphalt_concrete_pavement is the established Asphalt V4 owner above.
    // Its expanded-template IDs are routing aliases, not a second canonical
    // schema/work/passport registration.
    .filter((profile) => profile.canonicalWorkKey !== ASPHALT_WORK_ID_V4)
    .map((profile): CanonicalParameterSchema => {
    const keys = asphaltRelatedParameterKeysForProfileV4(profile);
    const definitions = keys.map((key, index): CanonicalParameterDefinition => {
      const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[key] ?? { labelRu: key, tier: "P1" as const };
      const allowedValues = metadata.allowedValues ?? [];
      const removalOperation = ASPHALT_REMOVAL_OPERATION_CLASSES_V4.has(profile.operationClass);
      const removalCoreAlwaysVisible = removalOperation && [
        "removal_labor_productivity_m2_per_man_hour",
        "removal_control_interval_m2_per_test",
        "removal_documentation_count",
      ].includes(key);
      const visibility = removalCoreAlwaysVisible ? undefined : ASPHALT_RELATED_VISIBILITY[key];
      const localRepairOrBaseConstruction = [
        "base_layer_thickness_mm",
        "base_material_type",
        "base_material_compaction_factor",
      ].includes(key) && keys.includes("base_condition") && keys.includes("base_construction_required");
      const conditional = localRepairOrBaseConstruction ||
        Boolean(visibility && keys.includes(visibility.parameterId));
      const geometryAlternative = ["area_m2", "length_m", "width_m"].includes(key) &&
        keys.includes("area_m2") && keys.includes("length_m") && keys.includes("width_m");
      const scopeDecision = key === "estimate_scope_mode" ||
        (key === "project_scope" && !removalOperation &&
          ["ROAD", "PARKING", "YARD_OR_SITE"].includes(profile.applicationContext));
      const installationResource = !removalOperation &&
        ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4.includes(
          key as (typeof ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4)[number],
        );
      const required = profile.requiredParameters.includes(key) || removalCoreAlwaysVisible ||
        geometryAlternative || scopeDecision || installationResource;
      return {
        parameterId: key,
        label: metadata.labelRu,
        description: `${metadata.labelRu}. Значение используется только точным паспортом ${profile.professionalNameRu}.`,
        valueType: asphaltRelatedValueType(key, allowedValues),
        unit: metadata.unit ?? null,
        requiredLevel: required || conditional
          ? "BLOCKING_REQUIRED"
          : "OPTIONAL",
        visibilityCondition: localRepairOrBaseConstruction
          ? {
            kind: "ANY_OF" as const,
            conditions: Object.freeze([
              { parameterId: "base_construction_required", value: true },
              { parameterId: "base_condition", value: "LOCAL_REPAIR_REQUIRED" },
            ]),
          }
          : conditional && visibility
            ? { kind: "PARAMETER_EQUALS" as const, ...visibility }
            : { kind: "ALWAYS" as const },
        validation: metadata.unit || metadata.minimum != null || metadata.maximum != null
          ? {
            min: metadata.minimum ?? Number.EPSILON,
            ...(metadata.maximum != null ? { max: metadata.maximum } : {}),
            ...(metadata.integer ? { integer: true } : {}),
          }
          : { nonEmpty: true },
        allowedValues: allowedValues.map((value) => ({
          value,
          label: asphaltRelatedAllowedValueLabelRu(value),
        })),
        affectsRows: [profile.canonicalWorkKey],
        affectsFormula: [profile.formulaGraphVersion],
        normativeSource: null,
        displayOrder: index + 1,
      };
    });
    const hasGeometryAlternative = keys.includes("area_m2") &&
      keys.includes("length_m") && keys.includes("width_m");
    return Object.freeze({
      coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
      schemaId: `canonical:${profile.parameterSchemaId}`,
      schemaVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
      workPassportId: profile.passportId,
      canonicalWorkKey: profile.canonicalWorkKey,
      calculationVersion: `${profile.calculationStrategyId}|${profile.formulaGraphVersion}`,
      definitions: Object.freeze(definitions),
      requiredAlternatives: hasGeometryAlternative
        ? Object.freeze([
          { alternativeId: `${profile.canonicalWorkKey}:area`, parameterIds: Object.freeze(["area_m2"]) },
          { alternativeId: `${profile.canonicalWorkKey}:length-width`, parameterIds: Object.freeze(["length_m", "width_m"]) },
        ])
        : Object.freeze([]),
    });
    }));

const ASPHALT_RESOURCE_LEVEL_PROFILE_V4 = ASPHALT_RELATED_EXTRA_PROFILES_V4.find(
  (profile) => profile.canonicalWorkKey === ASPHALT_WORK_ID_V4,
);
if (!ASPHALT_RESOURCE_LEVEL_PROFILE_V4) {
  throw new Error("ASPHALT_RESOURCE_LEVEL_CANONICAL_PROFILE_MISSING");
}
const ASPHALT_RESOURCE_LEVEL_KEYS_V4 = asphaltRelatedParameterKeysForProfileV4(
  ASPHALT_RESOURCE_LEVEL_PROFILE_V4,
);
const ASPHALT_RESOURCE_LEVEL_DEFINITIONS: readonly CanonicalParameterDefinition[] =
  ASPHALT_RESOURCE_LEVEL_KEYS_V4
    .map((key, index): CanonicalParameterDefinition => {
      const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[key] ?? { labelRu: key, tier: "P1" as const };
      const allowedValues = metadata.allowedValues ?? [];
      const visibility = ASPHALT_RELATED_VISIBILITY[key];
      const localRepairOrBaseConstruction = [
        "base_layer_thickness_mm",
        "base_material_type",
        "base_material_compaction_factor",
      ].includes(key) && ASPHALT_RESOURCE_LEVEL_KEYS_V4.includes("base_condition") &&
        ASPHALT_RESOURCE_LEVEL_KEYS_V4.includes("base_construction_required");
      const conditional = localRepairOrBaseConstruction ||
        Boolean(visibility && ASPHALT_RESOURCE_LEVEL_KEYS_V4.includes(visibility.parameterId));
      const required = key === "estimate_scope_mode" || key === "project_scope" ||
        ASPHALT_RESOURCE_LEVEL_PROFILE_V4.requiredParameters.includes(key) ||
        ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4.includes(
          key as (typeof ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4)[number],
        );
      return {
        parameterId: key,
        label: metadata.labelRu,
        description: `${metadata.labelRu}. Значение используется точным ресурсным паспортом асфальтовой работы.`,
        valueType: asphaltRelatedValueType(key, allowedValues),
        unit: metadata.unit ?? null,
        requiredLevel: required || conditional ? "BLOCKING_REQUIRED" : "OPTIONAL",
        visibilityCondition: localRepairOrBaseConstruction
          ? {
            kind: "ANY_OF" as const,
            conditions: Object.freeze([
              { parameterId: "base_construction_required", value: true },
              { parameterId: "base_condition", value: "LOCAL_REPAIR_REQUIRED" },
            ]),
          }
          : conditional && visibility
            ? { kind: "PARAMETER_EQUALS" as const, ...visibility }
            : { kind: "ALWAYS" as const },
        validation: metadata.unit || metadata.minimum != null || metadata.maximum != null
          ? {
            min: metadata.minimum ?? Number.EPSILON,
            ...(metadata.maximum != null ? { max: metadata.maximum } : {}),
            ...(metadata.integer ? { integer: true } : {}),
          }
          : { nonEmpty: true },
        allowedValues: allowedValues.map((value) => ({
          value,
          label: asphaltRelatedAllowedValueLabelRu(value),
        })),
        affectsRows: [ASPHALT_WORK_ID_V4],
        affectsFormula: [ASPHALT_RESOURCE_LEVEL_PROFILE_V4.formulaGraphVersion],
        normativeSource: null,
        displayOrder: index + 1,
      };
    });

export const ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA: CanonicalParameterSchema = Object.freeze({
  coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  schemaId: `canonical:${ASPHALT_RESOURCE_LEVEL_PROFILE_V4.parameterSchemaId}`,
  schemaVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
  workPassportId: ASPHALT_RESOURCE_LEVEL_PROFILE_V4.passportId,
  canonicalWorkKey: ASPHALT_RESOURCE_LEVEL_PROFILE_V4.canonicalWorkKey,
  calculationVersion: `${ASPHALT_RESOURCE_LEVEL_PROFILE_V4.calculationStrategyId}|${ASPHALT_RESOURCE_LEVEL_PROFILE_V4.formulaGraphVersion}`,
  definitions: Object.freeze(ASPHALT_RESOURCE_LEVEL_DEFINITIONS),
  requiredAlternatives: Object.freeze([
    { alternativeId: `${ASPHALT_WORK_ID_V4}:area`, parameterIds: Object.freeze(["area_m2"]) },
    { alternativeId: `${ASPHALT_WORK_ID_V4}:length-width`, parameterIds: Object.freeze(["length_m", "width_m"]) },
  ]),
});

export const REGISTERED_CANONICAL_PARAMETER_SCHEMAS =
  createCanonicalParameterSchemaRegistry([
    ASPHALT_CANONICAL_PARAMETER_SCHEMA,
    ELECTRICAL_CANONICAL_PARAMETER_SCHEMA,
    ...ASPHALT_RELATED_CANONICAL_PARAMETER_SCHEMAS_V4,
    ...INTERIOR_FINISHES_CANONICAL_PARAMETER_SCHEMAS,
    ...WATER_SEWER_CANONICAL_PARAMETER_SCHEMAS,
    ...HVAC_CANONICAL_PARAMETER_SCHEMAS,
  ]);
