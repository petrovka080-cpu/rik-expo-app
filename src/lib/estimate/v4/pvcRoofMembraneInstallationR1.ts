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

export const PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID =
  "canonical-work:base:roofing_interior_flat_roof_install_standard";
export const PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_ID =
  "project_pvc_roof_membrane_mechanical_system_v1";
export const PVC_ROOF_MEMBRANE_INSTALLATION_NORM_ID =
  "norm:project:pvc_roof_membrane:mechanical_system:v1";

export const PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая раскладка кровельной ПВХ-мембраны, схема механического крепления и технологическая карта сварки",
  source_authority: "Проектная организация, изготовитель кровельной системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_LAYOUT_FASTENING_PLAN_AND_METHOD_STATEMENT_REVISION_EXPLICIT",
  definition_hash: "eh_project_pvc_roof_membrane_mechanical_system_r1",
  exact_locator: "Чистая площадь покрытия, раскладка полотен и нахлёстов, ветровые зоны, крепёж, примыкания, сварка и план контроля швов",
  use_restriction: "Известная площадь определяет только объём монтажной работы; закупочное количество мембраны, крепёж, примыкания, герметик, машина и контроль берутся из утверждённой раскладки, схемы крепления, технологической карты и плана контроля",
});

const CONDITIONAL_DETAILS = new Set([
  "detail_membrane_designation",
  "detail_membrane_area_m2",
  "contact_adhesive_designation",
  "contact_adhesive_mass_kg",
]);

const PARAMETER_SPECS = Object.freeze([
  ["area_m2", "Площадь монтажа кровельной ПВХ-мембраны", "decimal", "m2", null],
  ["reinforced_membrane_designation", "Армированная кровельная ПВХ-мембрана толщиной 1,5 мм по спецификации системы", "text", null, null],
  ["reinforced_membrane_quantity_m2", "Закупочная площадь армированной ПВХ-мембраны с раскладкой и нахлёстами", "decimal", "m2", null],
  ["telescopic_fastener_designation", "Телескопический крепёж по основанию и схеме ветровых зон", "text", null, null],
  ["telescopic_fastener_quantity_piece", "Количество телескопического крепежа", "decimal", "piece", null],
  ["edge_rail_designation", "Краевая прижимная рейка по узлам примыканий", "text", null, null],
  ["edge_rail_length_m", "Длина краевой прижимной рейки", "decimal", "m", null],
  ["liquid_pvc_designation", "Жидкий ПВХ для герметизации сварных швов", "text", null, null],
  ["liquid_pvc_volume_l", "Объём жидкого ПВХ", "decimal", "l", null],
  ["hot_air_welder_designation", "Автомат горячего воздуха по технологической карте сварки", "text", null, null],
  ["hot_air_welder_machine_h", "Машино-часы автомата горячего воздуха", "decimal", "machine_hour", null],
  ["weld_probe_control_designation", "План контроля сварных швов ПВХ-мембраны", "text", null, null],
  ["weld_probe_control_count_test", "Количество проверок сварных швов", "decimal", "test", null],
  ["detail_membrane_mode", "Неармированная мембрана для деталей требуется в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["detail_membrane_designation", "Неармированная ПВХ-мембрана для деталей и примыканий", "text", null, null],
  ["detail_membrane_area_m2", "Площадь неармированной мембраны для деталей", "decimal", "m2", null],
  ["contact_adhesive_mode", "Контактный клей требуется в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["contact_adhesive_designation", "Контактный клей системы ПВХ-мембраны", "text", null, null],
  ["contact_adhesive_mass_kg", "Масса контактного клея", "decimal", "kg", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("detail_membrane_") && parameterId !== "detail_membrane_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "detail_membrane_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "detail_membrane_mode", value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("contact_adhesive_") && parameterId !== "contact_adhesive_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "contact_adhesive_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "contact_adhesive_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type PvcRoofMembraneInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS:
readonly PvcRoofMembraneInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.pvc-roof-membrane-installation-r1",
      semantic_parameter_key: `pvc-roof-membrane-installation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: parameterId === "area_m2" ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: parameterId === "area_m2"
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_PRODUCT_LAYOUT_FASTENING_PLAN_METHOD_STATEMENT_OR_CONTROL_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "area_m2",
      guide: {
        guide_kind: parameterId === "area_m2" ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "area_m2"
          ? `${titleRu}: укажите чистую площадь покрытия по обмеру или проекту.`
          : `${titleRu}: укажите по раскладке полотен, схеме крепления, узлам, технологической карте или плану контроля.`,
        source_role: parameterId === "area_m2"
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_PRODUCT_OR_METHOD_DOCUMENTATION",
        source_document: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_ID,
        source_locator: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "pvc-roof-membrane-installation-r1",
        source_snapshot_hash: "c1fd6b617425954e6e816d7920325cd9b66bbb3de2bce3424fb246ce5ccfa3ce",
        applicability: "Только для механически закрепляемой армированной кровельной ПВХ-мембраны толщиной 1,5 мм без соседних слоёв кровельного пирога.",
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

export const PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("pvc_membrane_hot_air_install_area_v1", "m2", "area_m2"),
  formula("reinforced_pvc_membrane_quantity_v1", "m2", "reinforced_membrane_quantity_m2"),
  formula("pvc_membrane_telescopic_fastener_quantity_v1", "piece", "telescopic_fastener_quantity_piece"),
  formula("pvc_membrane_edge_rail_length_v1", "m", "edge_rail_length_m"),
  formula("liquid_pvc_joint_sealant_volume_v1", "l", "liquid_pvc_volume_l"),
  formula("automatic_hot_air_roof_welder_time_v1", "machine_hour", "hot_air_welder_machine_h"),
  formula("pvc_membrane_weld_probe_test_count_v1", "test", "weld_probe_control_count_test"),
  formula("unreinforced_pvc_detail_membrane_area_v1", "m2", "detail_membrane_area_m2"),
  formula("pvc_contact_adhesive_mass_v1", "kg", "contact_adhesive_mass_kg"),
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
    semanticOwnerId: `pvc-roof-membrane-installation:${input.rowId}`,
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
      sourceId: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_ID,
      source_id: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_ID,
      normId: PVC_ROOF_MEMBRANE_INSTALLATION_NORM_ID,
      norm_id: PVC_ROOF_MEMBRANE_INSTALLATION_NORM_ID,
      normVersion: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic membrane overlap or waste factor",
      "automatic fastener density or wind-zone layout",
      "automatic perimeter or edge-rail length",
      "automatic liquid-PVC or contact-adhesive consumption",
      "automatic welding-machine productivity or weld-test interval",
      "vapour barrier, insulation, slope screed, cement screed or metal-tile lathing",
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

export const PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:pvc_membrane_hot_air_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Раскладка, механическое крепление и сварка кровельной ПВХ-мембраны толщиной 1,5 мм", unitId: "m2", formulaId: "pvc_membrane_hot_air_install_area_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_DRAWING" }),
  resource({ rowId: "rc09:reinforced_pvc_roof_membrane_1_5mm", ordinal: 1, section: "Материалы", category: "material", titleRu: "Мембрана ПВХ кровельная армированная толщиной 1,5 мм", unitId: "m2", formulaId: "reinforced_pvc_membrane_quantity_v1", procurementEligible: true, titleParameterIds: ["reinforced_membrane_designation"], sourceRole: "APPROVED_MEMBRANE_LAYOUT_AND_PRODUCT_SCHEDULE" }),
  resource({ rowId: "rc09:pvc_membrane_telescopic_fastener", ordinal: 2, section: "Материалы", category: "material", titleRu: "Крепёж телескопический для механической фиксации ПВХ-мембраны", unitId: "piece", formulaId: "pvc_membrane_telescopic_fastener_quantity_v1", procurementEligible: true, titleParameterIds: ["telescopic_fastener_designation"], sourceRole: "APPROVED_WIND_ZONE_FASTENING_PLAN" }),
  resource({ rowId: "rc09:pvc_membrane_edge_rail", ordinal: 3, section: "Материалы", category: "material", titleRu: "Рейка краевая прижимная оцинкованная", unitId: "m", formulaId: "pvc_membrane_edge_rail_length_v1", procurementEligible: true, titleParameterIds: ["edge_rail_designation"], sourceRole: "APPROVED_ROOF_EDGE_AND_ABUTMENT_DETAILS" }),
  resource({ rowId: "rc09:liquid_pvc_joint_sealant", ordinal: 4, section: "Материалы", category: "material", titleRu: "Жидкий ПВХ для герметизации сварных швов", unitId: "l", formulaId: "liquid_pvc_joint_sealant_volume_v1", procurementEligible: true, titleParameterIds: ["liquid_pvc_designation"], sourceRole: "APPROVED_PRODUCT_SYSTEM_AND_WELD_METHOD" }),
  resource({ rowId: "rc09:automatic_hot_air_roof_welder", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Автомат горячего воздуха для сварки кровельной ПВХ-мембраны", unitId: "machine_hour", formulaId: "automatic_hot_air_roof_welder_time_v1", procurementEligible: true, titleParameterIds: ["hot_air_welder_designation"], sourceRole: "APPROVED_WELD_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:pvc_membrane_weld_probe_test", ordinal: 6, section: "Контроль и услуги", category: "service", titleRu: "Контроль сварных швов кровельной ПВХ-мембраны", unitId: "test", formulaId: "pvc_membrane_weld_probe_test_count_v1", procurementEligible: false, titleParameterIds: ["weld_probe_control_designation"], sourceRole: "APPROVED_WELD_CONTROL_PLAN" }),
  resource({ rowId: "rc09:unreinforced_pvc_detail_membrane", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Мембрана ПВХ неармированная для деталей и примыканий", unitId: "m2", formulaId: "unreinforced_pvc_detail_membrane_area_v1", inclusionAst: equals("detail_membrane_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["detail_membrane_designation"], sourceRole: "APPROVED_ROOF_DETAIL_SCHEDULE" }),
  resource({ rowId: "rc09:pvc_contact_adhesive", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Клей контактный системы кровельной ПВХ-мембраны", unitId: "kg", formulaId: "pvc_contact_adhesive_mass_v1", inclusionAst: equals("contact_adhesive_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["contact_adhesive_designation"], sourceRole: "APPROVED_PRODUCT_SYSTEM_AND_ROOF_DETAILS" }),
]);

export const PVC_ROOF_MEMBRANE_INSTALLATION_SHORT_INPUT = Object.freeze({
  area_m2: 500,
});

export const PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 500,
  reinforced_membrane_designation: "Армированная ПВХ-мембрана 1,5 мм по утверждённой раскладке",
  reinforced_membrane_quantity_m2: 535,
  telescopic_fastener_designation: "Телескопический крепёж по расчёту ветровых зон и основанию",
  telescopic_fastener_quantity_piece: 2700,
  edge_rail_designation: "Рейка краевая по ведомости примыканий",
  edge_rail_length_m: 112,
  liquid_pvc_designation: "Жидкий ПВХ совместимой кровельной системы",
  liquid_pvc_volume_l: 6.4,
  hot_air_welder_designation: "Автомат горячего воздуха по технологической карте",
  hot_air_welder_machine_h: 9,
  weld_probe_control_designation: "План контроля сварных швов кровельной мембраны",
  weld_probe_control_count_test: 10,
  detail_membrane_mode: "NOT_REQUIRED",
  contact_adhesive_mode: "NOT_REQUIRED",
});

export async function compilePvcRoofMembraneInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID;
  if (catalogId !== PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID) {
    throw new Error(`PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pvc-roof-membrane-installation-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS],
    resourceDefinitions: [...PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_SUMMARY = Object.freeze({
  sourceId: PVC_ROOF_MEMBRANE_INSTALLATION_SOURCE_ID,
  normId: PVC_ROOF_MEMBRANE_INSTALLATION_NORM_ID,
  formula: "known roof-covering area gives installation work only; exact membrane layout, fastening, details, welding equipment and control quantities come from approved project and product-system documents",
  automaticMembraneWasteRejected: true,
  automaticFastenerAndPerimeterRatesRejected: true,
  automaticConsumableEquipmentAndControlRatesRejected: true,
  adjacentRoofLayersRejected: true,
});
