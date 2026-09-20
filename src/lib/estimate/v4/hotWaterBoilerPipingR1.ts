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

export const HOT_WATER_BOILER_PIPING_CATALOG_ID =
  "canonical-work:expanded:boiler_installation";
export const HOT_WATER_BOILER_PIPING_SOURCE_ID =
  "project_hot_water_boiler_500kw_piping_package_v1";
export const HOT_WATER_BOILER_PIPING_NORM_ID =
  "norm:project:hot_water_boiler_500kw_piping:package:v1";

export const HOT_WATER_BOILER_PIPING_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая спецификация водогрейного котла и горелки, схема обвязки, тепломеханические чертежи, ППР и программа испытаний",
  source_authority: "Проектная организация ОВ/ТМ, изготовители котла и горелки, утверждающий инженер проекта",
  source_document_version: "PROJECT_BOILER_500KW_BURNER_PIPING_INSTRUMENTATION_COMMISSIONING_REVISION_EXPLICIT",
  definition_hash: "eh_project_hot_water_boiler_500kw_piping_package_r1",
  exact_locator: "Количество водогрейных котлов, мощность 500 кВт и природный газ; паспорт котла и поставляемой модулируемой горелки; ведомость фланцев, арматуры, группы безопасности и КИП; узел дымоходного адаптера; программа гидравлического испытания и проверки защит; газовая рампа, насос, теплообменник, расширительный бак и водоподготовка только по условным проектным ветвям",
  use_restriction: "Известные количество, паспортная мощность, топливо и исполнение горелки определяют монтаж, котёл, горелку и индивидуальное испытание. Количества фланцев, арматуры, группы безопасности, КИП и высокотемпературного герметика берутся только из утверждённых проектных документов. Полная котельная не включается.",
});

const CONDITIONAL_PREFIXES = [
  "gas_train",
  "circulation_pump",
  "plate_heat_exchanger",
  "expansion_vessel",
  "water_treatment",
] as const;
const CONDITIONAL_DETAILS = new Set(CONDITIONAL_PREFIXES.flatMap((prefix) => [
  `${prefix}_designation`,
  `${prefix}_quantity`,
]));
const KNOWN_SCOPE = [
  "boiler_count",
  "thermal_power_kw",
  "fuel_type",
  "burner_configuration",
];

const PARAMETER_SPECS = Object.freeze([
  ["boiler_count", "Количество водогрейных котлов", "integer", "set", null],
  ["thermal_power_kw", "Паспортная тепловая мощность одного котла", "decimal", "kW", null],
  ["fuel_type", "Расчётное топливо", "enum", null, ["NATURAL_GAS"]],
  ["burner_configuration", "Исполнение поставляемой горелки", "enum", null,
    ["SEPARATE_MODULATING_GAS_BURNER"]],
  ["flange_set_designation", "Комплект фланцев, прокладок и крепежа по схеме обвязки", "text", null, null],
  ["flange_set_quantity", "Количество комплектов фланцев, прокладок и крепежа", "decimal", "set", null],
  ["isolation_valve_designation", "Запорная арматура котла по схеме обвязки", "text", null, null],
  ["isolation_valve_quantity_piece", "Количество единиц запорной арматуры котла", "decimal", "pcs", null],
  ["safety_group_designation", "Группа безопасности по тепломеханической схеме", "text", null, null],
  ["safety_group_quantity_set", "Количество групп безопасности", "decimal", "set", null],
  ["instrument_set_designation", "Комплект термометров, манометров и датчиков по проекту", "text", null, null],
  ["instrument_set_quantity_set", "Количество комплектов КИП", "decimal", "set", null],
  ["flue_sealant_designation", "Высокотемпературный герметик дымоходного адаптера", "text", null, null],
  ["flue_sealant_mass_kg", "Масса высокотемпературного герметика", "decimal", "kg", null],
  ["gas_train_mode", "Газовая рампа входит в этот объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["gas_train_designation", "Газовая рампа по проекту и паспорту горелки", "text", null, null],
  ["gas_train_quantity", "Количество комплектов газовой рампы", "decimal", "set", null],
  ["circulation_pump_mode", "Циркуляционный насос входит в этот объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["circulation_pump_designation", "Циркуляционный насос по проекту", "text", null, null],
  ["circulation_pump_quantity", "Количество циркуляционных насосов", "decimal", "pcs", null],
  ["plate_heat_exchanger_mode", "Пластинчатый теплообменник входит в этот объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["plate_heat_exchanger_designation", "Пластинчатый теплообменник по проекту", "text", null, null],
  ["plate_heat_exchanger_quantity", "Количество пластинчатых теплообменников", "decimal", "pcs", null],
  ["expansion_vessel_mode", "Расширительный бак входит в этот объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["expansion_vessel_designation", "Расширительный бак по проекту", "text", null, null],
  ["expansion_vessel_quantity", "Количество расширительных баков", "decimal", "pcs", null],
  ["water_treatment_mode", "Водоподготовка входит в этот объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["water_treatment_designation", "Установка водоподготовки по проекту", "text", null, null],
  ["water_treatment_quantity", "Количество комплектов водоподготовки", "decimal", "set", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const prefix = CONDITIONAL_PREFIXES.find((candidate) =>
    parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type HotWaterBoilerPipingParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const HOT_WATER_BOILER_PIPING_PARAMETERS:
readonly HotWaterBoilerPipingParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.hot-water-boiler-piping-r1",
      semantic_parameter_key: `hot-water-boiler-piping:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_BOILER_SCHEDULE_PIPING_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по выбранному котлу и подтверждённому объёму работ.`
          : `${titleRu}: укажите по спецификации, схеме обвязки, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE"
          : "APPROVED_BOILER_PIPING_METHOD_OR_QA_DOCUMENTATION",
        source_document: HOT_WATER_BOILER_PIPING_SOURCE_ID,
        source_locator: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.exact_locator,
        guide_version: "hot-water-boiler-piping-r1",
        source_snapshot_hash: "7dbe1f19125287fd05a27efaf81455f6c9ac22d252b49c0d5147f78b823df00f",
        applicability: "Только для монтажа и обвязки водогрейного котла указанной мощности и топлива; полная котельная исключена.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
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

export const HOT_WATER_BOILER_PIPING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("hot_water_boiler_install_pipe_count_v1", "set", "boiler_count"),
  formula("hot_water_boiler_500kw_count_v1", "set", "boiler_count"),
  formula("modulating_gas_burner_500kw_count_v1", "set", "boiler_count"),
  formula("boiler_flange_set_quantity_v1", "set", "flange_set_quantity"),
  formula("boiler_isolation_valve_quantity_v1", "pcs", "isolation_valve_quantity_piece"),
  formula("boiler_safety_group_quantity_v1", "set", "safety_group_quantity_set"),
  formula("boiler_instrument_set_quantity_v1", "set", "instrument_set_quantity_set"),
  formula("high_temperature_flue_sealant_mass_v1", "kg", "flue_sealant_mass_kg"),
  formula("boiler_hydraulic_safety_commission_count_v1", "test", "boiler_count"),
  formula("gas_train_quantity_v1", "set", "gas_train_quantity"),
  formula("boiler_circulation_pump_quantity_v1", "pcs", "circulation_pump_quantity"),
  formula("plate_heat_exchanger_quantity_v1", "pcs", "plate_heat_exchanger_quantity"),
  formula("expansion_vessel_quantity_v1", "pcs", "expansion_vessel_quantity"),
  formula("water_treatment_quantity_v1", "set", "water_treatment_quantity"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  sourceRole: string;
  procurementEligible: boolean;
  inclusionAst?: Json;
  titleParameterIds?: string[];
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `hot-water-boiler-piping:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: HOT_WATER_BOILER_PIPING_SOURCE_ID,
      source_id: HOT_WATER_BOILER_PIPING_SOURCE_ID,
      normId: HOT_WATER_BOILER_PIPING_NORM_ID,
      norm_id: HOT_WATER_BOILER_PIPING_NORM_ID,
      normVersion: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.source_document_version,
      source_title: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.source_title,
      exact_locator: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.exact_locator,
      source_definition_hash: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical flange, valve, safety-group, instrument or sealant rates",
      "automatic conditional boiler-house equipment quantities",
      "full boiler house",
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

export const HOT_WATER_BOILER_PIPING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:hot_water_boiler_install_pipe", ordinal: 0,
    section: "Работы", category: "construction_work", titleRu: "Монтаж и обвязка водогрейного котла",
    unitId: "set", formulaId: "hot_water_boiler_install_pipe_count_v1",
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE", procurementEligible: false }),
  resource({ rowId: "rc09:hot_water_boiler_500kw", ordinal: 1,
    section: "Оборудование системы", category: "material", titleRu: "Котёл водогрейный по паспортной мощности для природного газа",
    unitId: "set", formulaId: "hot_water_boiler_500kw_count_v1",
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE", procurementEligible: true }),
  resource({ rowId: "rc09:modulating_gas_burner_500kw", ordinal: 2,
    section: "Оборудование системы", category: "material", titleRu: "Горелка газовая модулируемая по паспортной мощности котла",
    unitId: "set", formulaId: "modulating_gas_burner_500kw_count_v1",
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE", procurementEligible: true }),
  resource({ rowId: "rc09:boiler_flange_gasket_fastener_set", ordinal: 3,
    section: "Материалы", category: "material", titleRu: "Комплект фланцев, прокладок и крепежа обвязки котла",
    unitId: "set", formulaId: "boiler_flange_set_quantity_v1", titleParameterIds: ["flange_set_designation"],
    sourceRole: "APPROVED_BOILER_PIPING_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:boiler_isolation_valve", ordinal: 4,
    section: "Материалы", category: "material", titleRu: "Запорная арматура обвязки водогрейного котла",
    unitId: "pcs", formulaId: "boiler_isolation_valve_quantity_v1", titleParameterIds: ["isolation_valve_designation"],
    sourceRole: "APPROVED_BOILER_PIPING_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:boiler_safety_group", ordinal: 5,
    section: "Материалы", category: "material", titleRu: "Группа безопасности водогрейного котла",
    unitId: "set", formulaId: "boiler_safety_group_quantity_v1", titleParameterIds: ["safety_group_designation"],
    sourceRole: "APPROVED_BOILER_SAFETY_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:boiler_thermomanometer_sensor_set", ordinal: 6,
    section: "Материалы", category: "material", titleRu: "Комплект термометров, манометров и датчиков котла",
    unitId: "set", formulaId: "boiler_instrument_set_quantity_v1", titleParameterIds: ["instrument_set_designation"],
    sourceRole: "APPROVED_BOILER_INSTRUMENTATION_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:high_temperature_flue_sealant", ordinal: 7,
    section: "Материалы", category: "material", titleRu: "Герметик высокотемпературный для дымоходного адаптера",
    unitId: "kg", formulaId: "high_temperature_flue_sealant_mass_v1", titleParameterIds: ["flue_sealant_designation"],
    sourceRole: "APPROVED_FLUE_ADAPTER_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:boiler_hydraulic_safety_commission", ordinal: 8,
    section: "Контроль", category: "service", titleRu: "Гидравлическое испытание и проверка защит котла",
    unitId: "test", formulaId: "boiler_hydraulic_safety_commission_count_v1",
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE", procurementEligible: true }),
  resource({ rowId: "rc09:gas_train", ordinal: 9,
    section: "Условное оборудование", category: "equipment", titleRu: "Газовая рампа котельной горелки",
    unitId: "set", formulaId: "gas_train_quantity_v1", inclusionAst: equals("gas_train_mode", "REQUIRED"),
    titleParameterIds: ["gas_train_designation"], sourceRole: "APPROVED_GAS_SUPPLY_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:boiler_circulation_pump", ordinal: 10,
    section: "Условное оборудование", category: "equipment", titleRu: "Циркуляционный насос котлового контура",
    unitId: "pcs", formulaId: "boiler_circulation_pump_quantity_v1", inclusionAst: equals("circulation_pump_mode", "REQUIRED"),
    titleParameterIds: ["circulation_pump_designation"], sourceRole: "APPROVED_BOILER_PIPING_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:plate_heat_exchanger", ordinal: 11,
    section: "Условное оборудование", category: "equipment", titleRu: "Теплообменник пластинчатый котлового контура",
    unitId: "pcs", formulaId: "plate_heat_exchanger_quantity_v1", inclusionAst: equals("plate_heat_exchanger_mode", "REQUIRED"),
    titleParameterIds: ["plate_heat_exchanger_designation"], sourceRole: "APPROVED_BOILER_PIPING_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:expansion_vessel", ordinal: 12,
    section: "Условное оборудование", category: "equipment", titleRu: "Бак расширительный мембранный котлового контура",
    unitId: "pcs", formulaId: "expansion_vessel_quantity_v1", inclusionAst: equals("expansion_vessel_mode", "REQUIRED"),
    titleParameterIds: ["expansion_vessel_designation"], sourceRole: "APPROVED_BOILER_PIPING_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:water_treatment", ordinal: 13,
    section: "Условное оборудование", category: "equipment", titleRu: "Установка водоподготовки котлового контура",
    unitId: "set", formulaId: "water_treatment_quantity_v1", inclusionAst: equals("water_treatment_mode", "REQUIRED"),
    titleParameterIds: ["water_treatment_designation"], sourceRole: "APPROVED_WATER_TREATMENT_SCHEME", procurementEligible: true }),
]);

export const HOT_WATER_BOILER_PIPING_SHORT_INPUT = Object.freeze({
  boiler_count: 1,
  thermal_power_kw: 500,
  fuel_type: "NATURAL_GAS",
  burner_configuration: "SEPARATE_MODULATING_GAS_BURNER",
});

export const HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT = Object.freeze({
  ...HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  flange_set_designation: "Фланцы, прокладки и крепёж по схеме обвязки", flange_set_quantity: 4,
  isolation_valve_designation: "Кран шаровой стальной полнопроходной по схеме", isolation_valve_quantity_piece: 4,
  safety_group_designation: "Группа безопасности по тепломеханической схеме", safety_group_quantity_set: 1,
  instrument_set_designation: "Комплект КИП по проекту автоматизации", instrument_set_quantity_set: 1,
  flue_sealant_designation: "Герметик по узлу дымоходного адаптера", flue_sealant_mass_kg: 1.1,
  gas_train_mode: "NOT_REQUIRED",
  circulation_pump_mode: "NOT_REQUIRED",
  plate_heat_exchanger_mode: "NOT_REQUIRED",
  expansion_vessel_mode: "NOT_REQUIRED",
  water_treatment_mode: "NOT_REQUIRED",
});

export async function compileHotWaterBoilerPipingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? HOT_WATER_BOILER_PIPING_CATALOG_ID;
  if (catalogId !== HOT_WATER_BOILER_PIPING_CATALOG_ID) {
    throw new Error(`HOT_WATER_BOILER_PIPING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.hot-water-boiler-piping-r1",
    catalogId,
    primaryMeasureParameterId: "boiler_count",
    parameterDefinitions: [...HOT_WATER_BOILER_PIPING_PARAMETERS],
    formulaDefinitions: [...HOT_WATER_BOILER_PIPING_FORMULAS],
    resourceDefinitions: [...HOT_WATER_BOILER_PIPING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
