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
  source_document_version: "PROJECT_BOILER_500KW_MATERIAL_LABOR_EQUIPMENT_TEST_LOGISTICS_BALANCE_S27_24",
  definition_hash: "f872aa6d0092b49568679184d8134781e702a42fd80368544a05cfe2497ee732",
  exact_locator: "Количество водогрейных котлов, мощность 500 кВт и природный газ; паспорт котла и поставляемой модулируемой горелки; ведомость фланцев, арматуры, группы безопасности и КИП; узел дымоходного адаптера; программа гидравлического испытания и проверки защит; газовая рампа, насос, теплообменник, расширительный бак и водоподготовка только по условным проектным ветвям",
  use_restriction: "Известные количество, паспортная мощность, топливо и исполнение горелки определяют монтаж, котёл, горелку и индивидуальное испытание. Количества фланцев, арматуры, группы безопасности, КИП и высокотемпературного герметика берутся только из утверждённых проектных документов. Полная котельная не включается.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "f872aa6d0092b49568679184d8134781e702a42fd80368544a05cfe2497ee732",
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
  "boiler_product_designation",
  "burner_product_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "boiler_retained_spare_set", "boiler_supplier_pack_size_set",
  "burner_retained_spare_set", "burner_supplier_pack_size_set",
]);

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
  ["boiler_product_designation", "Точная марка и каталожное обозначение водогрейного котла", "text", null, null],
  ["burner_product_designation", "Точная марка и каталожное обозначение газовой горелки", "text", null, null],
  ["boiler_retained_spare_set", "Сохраняемый резерв водогрейных котлов", "decimal", "set", null],
  ["boiler_supplier_pack_size_set", "Количество котлов в поставочной упаковке", "integer", "set", null],
  ["burner_retained_spare_set", "Сохраняемый резерв газовых горелок", "decimal", "set", null],
  ["burner_supplier_pack_size_set", "Количество горелок в поставочной упаковке", "integer", "set", null],
  ["boiler_commissioning_record_designation", "Акт гидравлического испытания и проверки защит котла", "text", null, null],
  ["boiler_commissioning_record_quantity_document", "Количество актов испытания и проверки защит", "decimal", "document", null],
  ["boiler_installation_piping_labor_h", "Труд монтажников по установке и обвязке котла", "decimal", "man_hour", null],
  ["boiler_commissioning_labor_h", "Труд наладчиков по испытаниям котла и горелки", "decimal", "man_hour", null],
  ["boiler_lifting_equipment_machine_h", "Работа грузоподъёмного механизма", "decimal", "machine_hour", null],
  ["boiler_welding_equipment_machine_h", "Работа сварочного оборудования для обвязки", "decimal", "machine_hour", null],
  ["boiler_hydraulic_test_pump_machine_h", "Работа насоса гидравлического испытания", "decimal", "machine_hour", null],
  ["boiler_flue_gas_analyzer_machine_h", "Работа анализатора дымовых газов", "decimal", "machine_hour", null],
  ["boiler_delivery_trip_count", "Рейсы доставки котла, горелки и комплектующих", "integer", "trip", null],
  ["boiler_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов монтажа", "integer", "trip", null],
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
          ? { min: parameterId.endsWith("_retained_spare_set")
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.hot-water-boiler-piping-r1",
      semantic_parameter_key: `hot-water-boiler-piping:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_BOILER_SCHEDULE_PIPING_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по выбранному котлу и подтверждённому объёму работ.`
          : `${titleRu}: укажите по спецификации, схеме обвязки, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_BOILER_PIPING_METHOD_OR_QA_DOCUMENTATION",
        source_document: HOT_WATER_BOILER_PIPING_SOURCE_ID,
        source_locator: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.exact_locator,
        guide_version: "hot-water-boiler-piping-r1",
        source_snapshot_hash: HOT_WATER_BOILER_PIPING_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для монтажа и обвязки водогрейного котла указанной мощности и топлива; полная котельная исключена.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const HOT_WATER_BOILER_PIPING_RUNTIME_INPUT = Object.freeze({
  boiler_retained_spare_set: 0,
  boiler_supplier_pack_size_set: 1,
  burner_retained_spare_set: 0,
  burner_supplier_pack_size_set: 1,
});
export const HOT_WATER_BOILER_PIPING_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(HOT_WATER_BOILER_PIPING_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const HOT_WATER_BOILER_PIPING_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(HOT_WATER_BOILER_PIPING_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [HOT_WATER_BOILER_PIPING_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
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
  formula("hot_water_boiler_order_v2", "set",
    "ceil((boiler_count+boiler_retained_spare_set)/boiler_supplier_pack_size_set)*boiler_supplier_pack_size_set"),
  formula("modulating_gas_burner_order_v2", "set",
    "ceil((boiler_count+burner_retained_spare_set)/burner_supplier_pack_size_set)*burner_supplier_pack_size_set"),
  formula("boiler_flange_set_quantity_v1", "set", "flange_set_quantity"),
  formula("boiler_isolation_valve_quantity_v1", "pcs", "isolation_valve_quantity_piece"),
  formula("boiler_safety_group_quantity_v1", "set", "safety_group_quantity_set"),
  formula("boiler_instrument_set_quantity_v1", "set", "instrument_set_quantity_set"),
  formula("high_temperature_flue_sealant_mass_v1", "kg", "flue_sealant_mass_kg"),
  formula("boiler_hydraulic_safety_commission_count_v1", "test", "boiler_count"),
  formula("boiler_installed_net_v2", "set", "boiler_count"),
  formula("boiler_retained_spare_v2", "set", "boiler_retained_spare_set"),
  formula("boiler_total_need_v2", "set", "boiler_count+boiler_retained_spare_set"),
  formula("boiler_package_count_v2", "package",
    "ceil((boiler_count+boiler_retained_spare_set)/boiler_supplier_pack_size_set)"),
  formula("boiler_remainder_v2", "set",
    "ceil((boiler_count+boiler_retained_spare_set)/boiler_supplier_pack_size_set)*boiler_supplier_pack_size_set-boiler_count"),
  formula("boiler_surplus_v2", "set",
    "max(0,ceil((boiler_count+boiler_retained_spare_set)/boiler_supplier_pack_size_set)*boiler_supplier_pack_size_set-boiler_count-boiler_retained_spare_set)"),
  formula("burner_installed_net_v2", "set", "boiler_count"),
  formula("burner_retained_spare_v2", "set", "burner_retained_spare_set"),
  formula("burner_total_need_v2", "set", "boiler_count+burner_retained_spare_set"),
  formula("burner_package_count_v2", "package",
    "ceil((boiler_count+burner_retained_spare_set)/burner_supplier_pack_size_set)"),
  formula("burner_remainder_v2", "set",
    "ceil((boiler_count+burner_retained_spare_set)/burner_supplier_pack_size_set)*burner_supplier_pack_size_set-boiler_count"),
  formula("burner_surplus_v2", "set",
    "max(0,ceil((boiler_count+burner_retained_spare_set)/burner_supplier_pack_size_set)*burner_supplier_pack_size_set-boiler_count-burner_retained_spare_set)"),
  formula("boiler_commissioning_record_v2", "document", "boiler_commissioning_record_quantity_document"),
  formula("boiler_installation_piping_labor_v2", "man_hour", "boiler_installation_piping_labor_h"),
  formula("boiler_commissioning_labor_v2", "man_hour", "boiler_commissioning_labor_h"),
  formula("boiler_lifting_equipment_v2", "machine_hour", "boiler_lifting_equipment_machine_h"),
  formula("boiler_welding_equipment_v2", "machine_hour", "boiler_welding_equipment_machine_h"),
  formula("boiler_hydraulic_test_pump_v2", "machine_hour", "boiler_hydraulic_test_pump_machine_h"),
  formula("boiler_flue_gas_analyzer_v2", "machine_hour", "boiler_flue_gas_analyzer_machine_h"),
  formula("boiler_delivery_v2", "trip", "boiler_delivery_trip_count"),
  formula("boiler_waste_removal_v2", "trip", "boiler_waste_removal_trip_count"),
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
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
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
    costTreatment: input.costTreatment ?? "OWN_COST",
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
      "automatic retained spare or supplier package",
      "automatic labor, lifting, welding, test-equipment or logistics quantity",
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
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE", procurementEligible: false,
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:hot_water_boiler_500kw", ordinal: 1,
    section: "Оборудование системы", category: "material", titleRu: "Котёл водогрейный по паспортной мощности для природного газа",
    unitId: "set", formulaId: "hot_water_boiler_order_v2",
    titleParameterIds: ["boiler_product_designation"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE", procurementEligible: true }),
  resource({ rowId: "rc09:modulating_gas_burner_500kw", ordinal: 2,
    section: "Оборудование системы", category: "material", titleRu: "Горелка газовая модулируемая по паспортной мощности котла",
    unitId: "set", formulaId: "modulating_gas_burner_order_v2",
    titleParameterIds: ["burner_product_designation"],
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
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BOILER_SCOPE", procurementEligible: false,
    costTreatment: "INFORMATIONAL_SCOPE" }),
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
  resource({ rowId: "rc09:boiler-balance:installed-net", ordinal: 14,
    section: "Баланс котлов", category: "material", titleRu: "Чистое количество смонтированных водогрейных котлов",
    unitId: "set", formulaId: "boiler_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:boiler-balance:retained-spare", ordinal: 15,
    section: "Баланс котлов", category: "material", titleRu: "Сохраняемый резерв водогрейных котлов",
    unitId: "set", formulaId: "boiler_retained_spare_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:boiler-balance:total-need", ordinal: 16,
    section: "Баланс котлов", category: "material", titleRu: "Общая потребность в водогрейных котлах",
    unitId: "set", formulaId: "boiler_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:boiler-balance:package-count", ordinal: 17,
    section: "Баланс котлов", category: "material", titleRu: "Количество поставочных упаковок котлов",
    unitId: "package", formulaId: "boiler_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:boiler-balance:remainder", ordinal: 18,
    section: "Баланс котлов", category: "material", titleRu: "Остаток котлов после монтажа",
    unitId: "set", formulaId: "boiler_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:boiler-balance:surplus-beyond-reserve", ordinal: 19,
    section: "Баланс котлов", category: "material", titleRu: "Свободный остаток котлов сверх резерва",
    unitId: "set", formulaId: "boiler_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:burner-balance:installed-net", ordinal: 20,
    section: "Баланс горелок", category: "material", titleRu: "Чистое количество установленных газовых горелок",
    unitId: "set", formulaId: "burner_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:burner-balance:retained-spare", ordinal: 21,
    section: "Баланс горелок", category: "material", titleRu: "Сохраняемый резерв газовых горелок",
    unitId: "set", formulaId: "burner_retained_spare_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:burner-balance:total-need", ordinal: 22,
    section: "Баланс горелок", category: "material", titleRu: "Общая потребность в газовых горелках",
    unitId: "set", formulaId: "burner_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:burner-balance:package-count", ordinal: 23,
    section: "Баланс горелок", category: "material", titleRu: "Количество поставочных упаковок горелок",
    unitId: "package", formulaId: "burner_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:burner-balance:remainder", ordinal: 24,
    section: "Баланс горелок", category: "material", titleRu: "Остаток горелок после монтажа",
    unitId: "set", formulaId: "burner_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:burner-balance:surplus-beyond-reserve", ordinal: 25,
    section: "Баланс горелок", category: "material", titleRu: "Свободный остаток горелок сверх резерва",
    unitId: "set", formulaId: "burner_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:boiler_commissioning_record", ordinal: 26,
    section: "Контроль", category: "service", titleRu: "Акт гидравлического испытания и проверки защит котла",
    unitId: "document", formulaId: "boiler_commissioning_record_v2", procurementEligible: false,
    titleParameterIds: ["boiler_commissioning_record_designation"], sourceRole: "APPROVED_TEST_PROGRAM",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:boiler-installation-piping", ordinal: 27,
    section: "Труд", category: "construction_work", titleRu: "Труд монтажников: установка и обвязка водогрейного котла",
    unitId: "man_hour", formulaId: "boiler_installation_piping_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:labor:boiler-commissioning", ordinal: 28,
    section: "Труд", category: "construction_work", titleRu: "Труд наладчиков: испытания котла и газовой горелки",
    unitId: "man_hour", formulaId: "boiler_commissioning_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "rc09:equipment:boiler-lifting", ordinal: 29,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Грузоподъёмный механизм для установки котла и горелки",
    unitId: "machine_hour", formulaId: "boiler_lifting_equipment_v2", procurementEligible: true,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:equipment:boiler-welding", ordinal: 30,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Сварочное оборудование для обвязки котла",
    unitId: "machine_hour", formulaId: "boiler_welding_equipment_v2", procurementEligible: true,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:equipment:boiler-hydraulic-test-pump", ordinal: 31,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Насос гидравлического испытания обвязки котла",
    unitId: "machine_hour", formulaId: "boiler_hydraulic_test_pump_v2", procurementEligible: true,
    sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "rc09:equipment:boiler-flue-gas-analyzer", ordinal: 32,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Анализатор дымовых газов для настройки горелки",
    unitId: "machine_hour", formulaId: "boiler_flue_gas_analyzer_v2", procurementEligible: true,
    sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "rc09:logistics:boiler-delivery", ordinal: 33,
    section: "Логистика", category: "service", titleRu: "Доставка котла, горелки, материалов и инструмента",
    unitId: "trip", formulaId: "boiler_delivery_v2", procurementEligible: true,
    sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "rc09:logistics:boiler-waste-removal", ordinal: 34,
    section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и отходов монтажа",
    unitId: "trip", formulaId: "boiler_waste_removal_v2", procurementEligible: true,
    sourceRole: "APPROVED_WASTE_PLAN" }),
]);

export const HOT_WATER_BOILER_PIPING_SHORT_INPUT = Object.freeze({
  boiler_count: 1,
  thermal_power_kw: 500,
  fuel_type: "NATURAL_GAS",
  burner_configuration: "SEPARATE_MODULATING_GAS_BURNER",
  boiler_product_designation: "BOILER-500-NG",
  burner_product_designation: "BURNER-500-MOD",
});

export const HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT = Object.freeze({
  ...HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  ...HOT_WATER_BOILER_PIPING_RUNTIME_INPUT,
  flange_set_designation: "Фланцы, прокладки и крепёж по схеме обвязки", flange_set_quantity: 4,
  isolation_valve_designation: "Кран шаровой стальной полнопроходной по схеме", isolation_valve_quantity_piece: 4,
  safety_group_designation: "Группа безопасности по тепломеханической схеме", safety_group_quantity_set: 1,
  instrument_set_designation: "Комплект КИП по проекту автоматизации", instrument_set_quantity_set: 1,
  flue_sealant_designation: "Герметик по узлу дымоходного адаптера", flue_sealant_mass_kg: 1.1,
  boiler_commissioning_record_designation: "Акт испытания котла и проверки защит по программе ПНР",
  boiler_commissioning_record_quantity_document: 1,
  boiler_installation_piping_labor_h: 48,
  boiler_commissioning_labor_h: 16,
  boiler_lifting_equipment_machine_h: 8,
  boiler_welding_equipment_machine_h: 12,
  boiler_hydraulic_test_pump_machine_h: 4,
  boiler_flue_gas_analyzer_machine_h: 4,
  boiler_delivery_trip_count: 1,
  boiler_waste_removal_trip_count: 1,
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
    confirmedParameters: { ...HOT_WATER_BOILER_PIPING_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
