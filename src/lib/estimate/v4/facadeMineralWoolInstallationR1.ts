import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID =
  "canonical-work:base:insulation_interior_facade_install_standard";
export const FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_ID =
  "project_facade_mineral_wool_system_v1";
export const FACADE_MINERAL_WOOL_INSTALLATION_NORM_ID =
  "norm:project:facade_mineral_wool:system:v1";

export const FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая фасадная система, раскладка минераловатных плит, схема дюбелирования и план контроля",
  source_authority: "Проектная организация, изготовитель фасадной системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_FACADE_SYSTEM_LAYOUT_FASTENING_AND_CONTROL_REVISION_EXPLICIT",
  definition_hash: "eh_project_facade_mineral_wool_system_r1",
  exact_locator: "Площадь утепления, раскладка плит 120 мм, клей, дюбели 200 мм по ветровым зонам, подъём, контроль вырыва, противопожарные рассечки и стартовый профиль",
  use_restriction: "Известная площадь определяет только объём монтажной работы; закупочное количество плит, клей, дюбели, подъёмник, контроль и условные элементы берутся из утверждённой фасадной системы, раскладки, расчёта крепления и плана контроля",
});

const CONDITIONAL_DETAILS = new Set([
  "fire_barrier_lamella_designation",
  "fire_barrier_lamella_length_m",
  "start_profile_designation",
  "start_profile_length_m",
]);

const PARAMETER_SPECS = Object.freeze([
  ["area_m2", "Площадь монтажа минераловатного утеплителя фасада", "decimal", "m2", null],
  ["mineral_wool_board_designation", "Фасадная минераловатная плита толщиной 120 мм по спецификации системы", "text", null, null],
  ["mineral_wool_board_quantity_m2", "Закупочная площадь фасадной минераловатной плиты по раскладке", "decimal", "m2", null],
  ["facade_adhesive_designation", "Клеевой состав фасадной теплоизоляционной системы", "text", null, null],
  ["facade_adhesive_mass_kg", "Масса клеевого состава", "decimal", "kg", null],
  ["disc_dowel_designation", "Фасадный тарельчатый дюбель 200 мм с металлическим стержнем", "text", null, null],
  ["disc_dowel_quantity_piece", "Количество фасадных тарельчатых дюбелей", "decimal", "piece", null],
  ["facade_lift_designation", "Фасадный подъёмник по ППР", "text", null, null],
  ["facade_lift_shift", "Количество смен фасадного подъёмника", "decimal", "shift", null],
  ["pullout_control_designation", "План контроля вырыва фасадных дюбелей", "text", null, null],
  ["pullout_control_count_test", "Количество испытаний дюбелей на вырыв", "decimal", "test", null],
  ["fire_barrier_lamella_mode", "Минераловатная противопожарная рассечка требуется в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["fire_barrier_lamella_designation", "Минераловатная ламель противопожарной рассечки", "text", null, null],
  ["fire_barrier_lamella_length_m", "Длина противопожарной рассечки", "decimal", "m", null],
  ["start_profile_mode", "Фасадный стартовый профиль требуется в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["start_profile_designation", "Стартовый профиль фасадной системы", "text", null, null],
  ["start_profile_length_m", "Длина стартового профиля", "decimal", "m", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("fire_barrier_lamella_")
    && parameterId !== "fire_barrier_lamella_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "fire_barrier_lamella_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "fire_barrier_lamella_mode", value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("start_profile_") && parameterId !== "start_profile_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "start_profile_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "start_profile_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type FacadeMineralWoolInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS:
readonly FacadeMineralWoolInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues
        ? { values: enumValues }
        : valueType === "decimal"
          ? { min: 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.facade-mineral-wool-installation-r1",
      semantic_parameter_key: `facade-mineral-wool-installation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: parameterId === "area_m2" ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: parameterId === "area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_FACADE_SYSTEM_LAYOUT_FASTENING_PLAN_METHOD_STATEMENT_OR_CONTROL_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "area_m2",
      guide: {
        guide_kind: parameterId === "area_m2" ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "area_m2"
          ? `${titleRu}: укажите чистую площадь утепления по обмеру или проекту.`
          : `${titleRu}: укажите по раскладке плит, схеме дюбелирования, узлам, ППР или плану контроля.`,
        source_role: parameterId === "area_m2"
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_PRODUCT_OR_METHOD_DOCUMENTATION",
        source_document: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_ID,
        source_locator: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "facade-mineral-wool-installation-r1",
        source_snapshot_hash: "27274767064715de1a2dfa3dfa66201af949041857013fc70e6a0f51771390e7",
        applicability: "Только для монтажа фасадной минераловатной плиты толщиной 120 мм с дюбелем 200 мм без декоративной отделки и базового армирующего слоя.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
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

export const FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("facade_mineral_wool_install_area_v1", "m2", "area_m2"),
  formula("facade_mineral_wool_board_quantity_v1", "m2", "mineral_wool_board_quantity_m2"),
  formula("facade_mineral_wool_adhesive_mass_v1", "kg", "facade_adhesive_mass_kg"),
  formula("facade_disc_dowel_quantity_v1", "piece", "disc_dowel_quantity_piece"),
  formula("facade_insulation_lift_shift_v1", "shift", "facade_lift_shift"),
  formula("facade_insulation_pullout_control_count_v1", "test", "pullout_control_count_test"),
  formula("mineral_wool_fire_barrier_lamella_length_v1", "m", "fire_barrier_lamella_length_m"),
  formula("facade_start_profile_length_v1", "m", "start_profile_length_m"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `facade-mineral-wool-installation:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["area_m2"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_ID,
      source_id: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_ID,
      normId: FACADE_MINERAL_WOOL_INSTALLATION_NORM_ID,
      norm_id: FACADE_MINERAL_WOOL_INSTALLATION_NORM_ID,
      normVersion: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic board reserve or waste factor",
      "automatic adhesive consumption",
      "automatic dowel density or wind-zone layout",
      "automatic lift productivity or pullout-test interval",
      "automatic fire-barrier or start-profile length",
      "decorative plaster, facade paint or base-coat reinforcement mesh",
      "invented price",
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
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:facade_mineral_wool_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж фасадного минераловатного утеплителя толщиной 120 мм", unitId: "m2", formulaId: "facade_mineral_wool_install_area_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_DRAWING" }),
  resource({ rowId: "rc09:facade_mineral_wool_board_120mm", ordinal: 1, section: "Материалы", category: "material", titleRu: "Плита минераловатная фасадная толщиной 120 мм", unitId: "m2", formulaId: "facade_mineral_wool_board_quantity_v1", procurementEligible: true, titleParameterIds: ["mineral_wool_board_designation"], sourceRole: "APPROVED_FACADE_SYSTEM_AND_BOARD_LAYOUT" }),
  resource({ rowId: "rc09:facade_mineral_wool_adhesive", ordinal: 2, section: "Материалы", category: "material", titleRu: "Клеевой состав для фасадных минераловатных плит", unitId: "kg", formulaId: "facade_mineral_wool_adhesive_mass_v1", procurementEligible: true, titleParameterIds: ["facade_adhesive_designation"], sourceRole: "APPROVED_FACADE_PRODUCT_SYSTEM" }),
  resource({ rowId: "rc09:facade_disc_dowel_200mm_metal_pin", ordinal: 3, section: "Материалы", category: "material", titleRu: "Дюбель фасадный тарельчатый 200 мм с металлическим стержнем", unitId: "piece", formulaId: "facade_disc_dowel_quantity_v1", procurementEligible: true, titleParameterIds: ["disc_dowel_designation"], sourceRole: "APPROVED_WIND_ZONE_FASTENING_PLAN" }),
  resource({ rowId: "rc09:facade_insulation_lift", ordinal: 4, section: "Оборудование", category: "equipment", titleRu: "Подъёмник фасадный для монтажа теплоизоляции", unitId: "shift", formulaId: "facade_insulation_lift_shift_v1", procurementEligible: true, titleParameterIds: ["facade_lift_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:facade_insulation_pullout_control", ordinal: 5, section: "Контроль и услуги", category: "service", titleRu: "Контроль вырыва фасадных дюбелей", unitId: "test", formulaId: "facade_insulation_pullout_control_count_v1", procurementEligible: false, titleParameterIds: ["pullout_control_designation"], sourceRole: "APPROVED_FASTENER_CONTROL_PLAN" }),
  resource({ rowId: "rc09:mineral_wool_fire_barrier_lamella", ordinal: 6, section: "Условные материалы", category: "material", titleRu: "Минераловатная ламель противопожарной рассечки", unitId: "m", formulaId: "mineral_wool_fire_barrier_lamella_length_v1", inclusionAst: equals("fire_barrier_lamella_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["fire_barrier_lamella_designation"], sourceRole: "APPROVED_FIRE_SAFETY_FACADE_DETAILS" }),
  resource({ rowId: "rc09:facade_start_profile", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Профиль стартовый фасадной теплоизоляционной системы", unitId: "m", formulaId: "facade_start_profile_length_v1", inclusionAst: equals("start_profile_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["start_profile_designation"], sourceRole: "APPROVED_FACADE_START_DETAIL" }),
]);

export const FACADE_MINERAL_WOOL_INSTALLATION_SHORT_INPUT = Object.freeze({
  area_m2: 300,
});

export const FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 300,
  mineral_wool_board_designation: "Фасадная минераловатная плита 120 мм по утверждённой системе",
  mineral_wool_board_quantity_m2: 315,
  facade_adhesive_designation: "Клеевой состав совместимой фасадной системы",
  facade_adhesive_mass_kg: 1500,
  disc_dowel_designation: "Тарельчатый дюбель 200 мм с металлическим стержнем по расчёту ветровых зон",
  disc_dowel_quantity_piece: 1800,
  facade_lift_designation: "Фасадный подъёмник по ППР монтажа утепления",
  facade_lift_shift: 12,
  pullout_control_designation: "План испытаний фасадных дюбелей на вырыв",
  pullout_control_count_test: 8,
  fire_barrier_lamella_mode: "NOT_REQUIRED",
  start_profile_mode: "NOT_REQUIRED",
});

export async function compileFacadeMineralWoolInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID;
  if (catalogId !== FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID) {
    throw new Error(`FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.facade-mineral-wool-installation-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS],
    resourceDefinitions: [...FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_SUMMARY = Object.freeze({
  sourceId: FACADE_MINERAL_WOOL_INSTALLATION_SOURCE_ID,
  normId: FACADE_MINERAL_WOOL_INSTALLATION_NORM_ID,
  formula: "known facade-insulation area gives installation work only; exact board layout, adhesive, dowels, lift, control and conditional details come from approved project and facade-system documents",
  automaticBoardWasteRejected: true,
  automaticAdhesiveAndDowelRatesRejected: true,
  automaticLiftAndControlRatesRejected: true,
  decorativeFacadeLayersRejected: true,
});
