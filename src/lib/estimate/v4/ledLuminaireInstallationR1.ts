import surfacePack from '../../../../data/estimate-benchmarks/source-packs/led-luminaire-installation-balanced-s27-23.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
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

export const LED_LUMINAIRE_INSTALLATION_CATALOG_ID =
  "canonical-work:base:electrical_interior_lighting_install_standard";
export const LED_LUMINAIRE_INSTALLATION_SOURCE_ID =
  "s2723_krerm_guidance_and_project_led_luminaire_package_v2";
export const LED_LUMINAIRE_INSTALLATION_NORM_ID =
  "norm:kg:krerm-2015-guidance-2.9.2:project-led-luminaire-package:v2";

export const LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость светильников, план потолков, узел крепления и подключения, ППР и программа электроизмерений",
  source_authority: "Проектная электротехническая организация, изготовитель светильника и утверждающий инженер проекта",
  source_document_version:
    "KG_KRERM_2015_GUIDANCE_CAPTURE_2026_10_01_AND_PROJECT_LED_LUMINAIRE_PACKAGE_REVISION_EXPLICIT",
  definition_hash: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
  exact_locator: "КРЕРм-2015, Указания по применению, п. 2.9.2: проектно-зависимые материалы принимаются по проектным данным с учётом трудноустранимых потерь и отходов; ведомость накладных LED-светильников 36 Вт IP40; основание и узел крепления; схема подключения; ППР; программа проверки защитного соединения; отдельный драйвер и адаптер усиления потолка только по условным проектным ветвям",
  use_restriction: "Известное количество и точная идентичность светильников определяют монтаж и чистое количество изделий. Сохраняемый резерв и упаковка остаются видимыми заменяемыми предварительными значениями 0 шт. и 1 шт.; крепёж, соединители, провод, PE-наконечники, труд, оборудование, логистика и испытания принимаются только из утверждённых проектных, продуктовых, ППР и QA-документов. Линия освещения, выключатели и распределительный щит не включаются.",
  source_kind: "OFFICIAL_NORMATIVE_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE",
  official_url:
    "https://minstroy.gov.kg/ru/state_program/download-pdf/montazoborudovania-62169004e91aaf866.70682138.pdf",
  artifact_sha256: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
});

const CONDITIONAL_DETAILS = new Set([
  "separate_driver_designation", "separate_driver_quantity_piece",
  "ceiling_adapter_designation", "ceiling_adapter_quantity_set",
]);
const PARAMETER_SPECS = Object.freeze([
  ["luminaire_count", "Количество монтируемых светильников", "integer", "pcs", null],
  ["rated_power", "Номинальная мощность светильника", "enum", null, ["36_W"]],
  ["ingress_protection", "Степень защиты светильника", "enum", null, ["IP40"]],
  ["mounting_type", "Способ монтажа светильника", "enum", null, ["SURFACE"]],
  ["luminaire_retained_spare_piece", "Сохраняемый резерв светильников", "decimal", "pcs", null],
  ["luminaire_supplier_pack_size_piece", "Количество светильников в упаковке поставщика", "integer", "pcs", null],
  ["anchor_set_designation", "Комплект крепления по основанию и узлу", "text", null, null],
  ["anchor_set_quantity_set", "Количество комплектов крепления", "decimal", "set", null],
  ["terminal_connector_designation", "Клеммный соединитель по схеме подключения", "text", null, null],
  ["terminal_connector_quantity_piece", "Количество клеммных соединителей", "decimal", "pcs", null],
  ["connection_wire_designation", "Присоединительный провод по узлу", "text", null, null],
  ["connection_wire_length_m", "Длина присоединительного провода", "decimal", "m", null],
  ["pe_lug_designation", "Наконечник защитного проводника по схеме", "text", null, null],
  ["pe_lug_quantity_piece", "Количество PE-наконечников", "decimal", "pcs", null],
  ["work_platform_designation", "Средство доступа по ППР и высоте монтажа", "text", null, null],
  ["work_platform_shift", "Количество смен средства доступа", "decimal", "shift", null],
  ["pe_test_designation", "Проверка защитного соединения по программе", "text", null, null],
  ["pe_test_count", "Количество проверок защитного соединения", "decimal", "test", null],
  ["luminaire_installation_labor_h", "Труд электромонтажников по ППР", "decimal", "man_hour", null],
  ["luminaire_testing_labor_h", "Труд электролаборатории по программе испытаний", "decimal", "man_hour", null],
  ["luminaire_drilling_tool_machine_h", "Работа инструмента сверления основания", "decimal", "machine_hour", null],
  ["luminaire_installation_tool_machine_h", "Работа электромонтажного инструмента", "decimal", "machine_hour", null],
  ["luminaire_tester_machine_h", "Работа измерительного комплекта", "decimal", "machine_hour", null],
  ["luminaire_delivery_trip_count", "Рейсы доставки светильников и комплектующих", "integer", "trip", null],
  ["luminaire_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов", "integer", "trip", null],
  ["separate_driver_mode", "Отдельный LED-драйвер требуется по ведомости", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["separate_driver_designation", "Отдельный LED-драйвер по ведомости", "text", null, null],
  ["separate_driver_quantity_piece", "Количество отдельных LED-драйверов", "decimal", "pcs", null],
  ["ceiling_adapter_mode", "Адаптер усиления потолка требуется по узлу", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["ceiling_adapter_designation", "Адаптер усиления потолка по узлу", "text", null, null],
  ["ceiling_adapter_quantity_set", "Количество адаптеров усиления потолка", "decimal", "set", null],
] as const);
const KNOWN_SCOPE = ["luminaire_count", "rated_power", "ingress_protection", "mounting_type"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "luminaire_retained_spare_piece", "luminaire_supplier_pack_size_piece",
]);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("separate_driver_")
    ? "separate_driver_mode"
    : parameterId.startsWith("ceiling_adapter_")
      ? "ceiling_adapter_mode"
      : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type LedLuminaireInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const LED_LUMINAIRE_INSTALLATION_PARAMETERS:
readonly LedLuminaireInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
        : valueType === "decimal" || valueType === "integer"
          ? { min: VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            && parameterId !== "luminaire_supplier_pack_size_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.led-luminaire-installation-r1",
      semantic_parameter_key: `led-luminaire-installation:${parameterId}`,
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
          : "APPROVED_LUMINAIRE_SCHEDULE_MOUNTING_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "luminaire_count"
          ? "Укажите подтверждённое количество устанавливаемых светильников по ведомости."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по маркировке и типу выбранного светильника.`
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? `${titleRu}: предварительное нейтральное значение видно в смете; замените по ведомости и условиям поставщика.`
              : `${titleRu}: укажите по ведомости, узлу крепления/подключения, ППР или программе измерений.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_LUMINAIRE_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PROJECT_LUMINAIRE_SCHEDULE_MOUNTING_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
        source_document: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
        source_locator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "led-luminaire-installation-s27-23-r2",
        source_snapshot_hash: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для монтажа накладных LED-светильников 36 Вт IP40; кабельная линия освещения, выключатели и распределительный щит исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT = Object.freeze({
  luminaire_retained_spare_piece: 0,
  luminaire_supplier_pack_size_piece: 1,
});
export const LED_LUMINAIRE_INSTALLATION_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT).map((parameterId) => [
    parameterId, "ASSUMPTION",
  ])) as Readonly<Record<string, "ASSUMPTION">>,
);
export const LED_LUMINAIRE_INSTALLATION_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT).map((parameterId) => [
    parameterId, [LED_LUMINAIRE_INSTALLATION_SOURCE_ID],
  ])) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}
export const LED_LUMINAIRE_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("led_luminaire_install_count_v1", "pcs", "luminaire_count"),
  formula("led_luminaire_36w_ip40_count_v1", "pcs", "luminaire_count"),
  formula("led_luminaire_retained_spare_v2", "pcs", "luminaire_retained_spare_piece"),
  formula("led_luminaire_total_need_v2", "pcs",
    "luminaire_count+luminaire_retained_spare_piece"),
  formula("led_luminaire_package_count_v2", "package",
    "ceil((luminaire_count+luminaire_retained_spare_piece)/luminaire_supplier_pack_size_piece)"),
  formula("led_luminaire_order_quantity_v2", "pcs",
    "ceil((luminaire_count+luminaire_retained_spare_piece)/luminaire_supplier_pack_size_piece)*luminaire_supplier_pack_size_piece"),
  formula("led_luminaire_remainder_v2", "pcs",
    "ceil((luminaire_count+luminaire_retained_spare_piece)/luminaire_supplier_pack_size_piece)*luminaire_supplier_pack_size_piece-luminaire_count"),
  formula("led_luminaire_surplus_v2", "pcs",
    "max(0,ceil((luminaire_count+luminaire_retained_spare_piece)/luminaire_supplier_pack_size_piece)*luminaire_supplier_pack_size_piece-luminaire_count-luminaire_retained_spare_piece)"),
  formula("luminaire_mounting_anchor_set_quantity_v1", "set", "anchor_set_quantity_set"),
  formula("luminaire_terminal_connector_quantity_v1", "pcs", "terminal_connector_quantity_piece"),
  formula("luminaire_connection_wire_length_v1", "m", "connection_wire_length_m"),
  formula("luminaire_pe_lug_quantity_v1", "pcs", "pe_lug_quantity_piece"),
  formula("luminaire_work_platform_shift_v1", "shift", "work_platform_shift"),
  formula("luminaire_pe_continuity_test_count_v1", "test", "pe_test_count"),
  formula("separate_led_driver_quantity_v1", "pcs", "separate_driver_quantity_piece"),
  formula("ceiling_reinforcement_adapter_quantity_v1", "set", "ceiling_adapter_quantity_set"),
  formula("led_luminaire_installation_labor_v2", "man_hour", "luminaire_installation_labor_h"),
  formula("led_luminaire_testing_labor_v2", "man_hour", "luminaire_testing_labor_h"),
  formula("led_luminaire_drilling_tool_v2", "machine_hour", "luminaire_drilling_tool_machine_h"),
  formula("led_luminaire_installation_tool_v2", "machine_hour", "luminaire_installation_tool_machine_h"),
  formula("led_luminaire_tester_v2", "machine_hour", "luminaire_tester_machine_h"),
  formula("led_luminaire_delivery_v2", "trip", "luminaire_delivery_trip_count"),
  formula("led_luminaire_waste_removal_v2", "trip", "luminaire_waste_removal_trip_count"),
]);
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; inclusionAst?: Json; procurementEligible: boolean;
  titleParameterIds?: string[]; sourceRole: string;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `led-luminaire-installation:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
  };
  const sourceMetadata = {
    truth_contract_version: "R3", synthetic: false, sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
      source_id: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
      normId: LED_LUMINAIRE_INSTALLATION_NORM_ID,
      norm_id: LED_LUMINAIRE_INSTALLATION_NORM_ID,
      normVersion: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: [
      "automatic anchor set or terminal connector per luminaire",
      "historical connection-wire, work-platform or test rate",
      "automatic PE lug, separate LED driver or ceiling reinforcement adapter",
      "lighting cable line, light switch or distribution board",
      "invented price",
    ],
  };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

export const LED_LUMINAIRE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:led_luminaire_install", ordinal: 0, section: "Технологическая операция", category: "construction_work", titleRu: "Монтаж и подключение накладного светодиодного светильника 36 Вт IP40", unitId: "pcs", formulaId: "led_luminaire_install_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_LUMINAIRE_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:led_luminaire_36w_ip40", ordinal: 1, section: "Закупка светильников", category: "material", titleRu: "Светильник светодиодный накладной 36 Вт IP40 — заказ", unitId: "pcs", formulaId: "led_luminaire_order_quantity_v2", procurementEligible: true, sourceRole: "VISIBLE_PROCUREMENT_BALANCE" }),
  resource({ rowId: "rc09:luminaire_mounting_anchor_set", ordinal: 2, section: "Материалы", category: "material", titleRu: "Комплект крепления накладного светильника по основанию", unitId: "set", formulaId: "luminaire_mounting_anchor_set_quantity_v1", procurementEligible: true, titleParameterIds: ["anchor_set_designation"], sourceRole: "APPROVED_MOUNTING_DETAIL" }),
  resource({ rowId: "rc09:luminaire_terminal_connector", ordinal: 3, section: "Материалы", category: "material", titleRu: "Клеммный соединитель светильника по схеме подключения", unitId: "pcs", formulaId: "luminaire_terminal_connector_quantity_v1", procurementEligible: true, titleParameterIds: ["terminal_connector_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:luminaire_connection_wire_3x1_5", ordinal: 4, section: "Материалы", category: "material", titleRu: "Провод присоединительный негорючий 3×1,5 мм²", unitId: "m", formulaId: "luminaire_connection_wire_length_v1", procurementEligible: true, titleParameterIds: ["connection_wire_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:luminaire_pe_lug", ordinal: 5, section: "Материалы", category: "material", titleRu: "Наконечник кольцевой для защитного проводника светильника", unitId: "pcs", formulaId: "luminaire_pe_lug_quantity_v1", procurementEligible: true, titleParameterIds: ["pe_lug_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:luminaire_work_platform", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "Средство доступа для монтажа светильника", unitId: "shift", formulaId: "luminaire_work_platform_shift_v1", procurementEligible: true, titleParameterIds: ["work_platform_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:luminaire_pe_continuity_test", ordinal: 7, section: "Контроль", category: "service", titleRu: "Проверка защитного соединения и включения светильника", unitId: "test", formulaId: "luminaire_pe_continuity_test_count_v1", procurementEligible: false, titleParameterIds: ["pe_test_designation"], sourceRole: "APPROVED_QA_PLAN", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "led:balance:installed-net", ordinal: 8, section: "Баланс светильников", category: "material", titleRu: "Чистое количество установленных светильников", unitId: "pcs", formulaId: "led_luminaire_36w_ip40_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_LUMINAIRE_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "led:balance:retained-spare", ordinal: 9, section: "Баланс светильников", category: "material", titleRu: "Сохраняемый резерв светильников", unitId: "pcs", formulaId: "led_luminaire_retained_spare_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "led:balance:total-need", ordinal: 10, section: "Баланс светильников", category: "material", titleRu: "Общая потребность: монтаж + сохраняемый резерв", unitId: "pcs", formulaId: "led_luminaire_total_need_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "led:balance:package-count", ordinal: 11, section: "Баланс светильников", category: "material", titleRu: "Количество упаковок поставщика", unitId: "package", formulaId: "led_luminaire_package_count_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "led:balance:remainder", ordinal: 12, section: "Баланс светильников", category: "material", titleRu: "Остаток после установки", unitId: "pcs", formulaId: "led_luminaire_remainder_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "led:balance:surplus-beyond-reserve", ordinal: 13, section: "Баланс светильников", category: "material", titleRu: "Свободный остаток сверх сохраняемого резерва", unitId: "pcs", formulaId: "led_luminaire_surplus_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "led:labor:installation", ordinal: 14, section: "Труд", category: "construction_work", titleRu: "Труд электромонтажников: крепление и подключение светильников", unitId: "man_hour", formulaId: "led_luminaire_installation_labor_v2", procurementEligible: false, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "led:labor:testing", ordinal: 15, section: "Труд", category: "construction_work", titleRu: "Труд электролаборатории: проверка защитного соединения и включения", unitId: "man_hour", formulaId: "led_luminaire_testing_labor_v2", procurementEligible: false, sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "led:equipment:drilling-tool", ordinal: 16, section: "Инструмент и оборудование", category: "equipment", titleRu: "Инструмент сверления основания под крепление", unitId: "machine_hour", formulaId: "led_luminaire_drilling_tool_v2", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "led:equipment:installation-tool", ordinal: 17, section: "Инструмент и оборудование", category: "equipment", titleRu: "Электромонтажный инструмент для крепления и подключения", unitId: "machine_hour", formulaId: "led_luminaire_installation_tool_v2", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "led:equipment:tester", ordinal: 18, section: "Контроль", category: "equipment", titleRu: "Измерительный комплект для проверки защитного соединения", unitId: "machine_hour", formulaId: "led_luminaire_tester_v2", procurementEligible: true, sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "led:logistics:delivery", ordinal: 19, section: "Логистика", category: "service", titleRu: "Доставка светильников, комплектующих и инструмента", unitId: "trip", formulaId: "led_luminaire_delivery_v2", procurementEligible: true, sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "led:logistics:waste-removal", ordinal: 20, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и отходов монтажа", unitId: "trip", formulaId: "led_luminaire_waste_removal_v2", procurementEligible: true, sourceRole: "APPROVED_WASTE_PLAN" }),
  resource({ rowId: "rc09:separate_led_driver", ordinal: 21, section: "Условные материалы", category: "material", titleRu: "Отдельный LED-драйвер по ведомости светильников", unitId: "pcs", formulaId: "separate_led_driver_quantity_v1", inclusionAst: equals("separate_driver_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["separate_driver_designation"], sourceRole: "APPROVED_LUMINAIRE_SCHEDULE" }),
  resource({ rowId: "rc09:suspended_ceiling_reinforcement_adapter", ordinal: 22, section: "Условные материалы", category: "material", titleRu: "Адаптер усиления подвесного потолка под светильник", unitId: "set", formulaId: "ceiling_reinforcement_adapter_quantity_v1", inclusionAst: equals("ceiling_adapter_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["ceiling_adapter_designation"], sourceRole: "APPROVED_MOUNTING_DETAIL" }),
]);

export const LED_LUMINAIRE_INSTALLATION_SHORT_INPUT = Object.freeze({
  luminaire_count: 30, rated_power: "36_W", ingress_protection: "IP40", mounting_type: "SURFACE",
});
export const LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  ...LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT,
  anchor_set_designation: "Комплект анкеров по бетонному основанию и узлу", anchor_set_quantity_set: 30,
  terminal_connector_designation: "Клеммный соединитель по схеме подключения", terminal_connector_quantity_piece: 30,
  connection_wire_designation: "Негорючий провод 3×1,5 мм² по узлу", connection_wire_length_m: 18,
  pe_lug_designation: "Кольцевой наконечник PE по схеме", pe_lug_quantity_piece: 30,
  work_platform_designation: "Передвижная вышка по высоте и ППР", work_platform_shift: 0.6,
  pe_test_designation: "Проверка защитного соединения по программе", pe_test_count: 30,
  luminaire_installation_labor_h: 18,
  luminaire_testing_labor_h: 3,
  luminaire_drilling_tool_machine_h: 6,
  luminaire_installation_tool_machine_h: 10,
  luminaire_tester_machine_h: 3,
  luminaire_delivery_trip_count: 1,
  luminaire_waste_removal_trip_count: 1,
  separate_driver_mode: "NOT_REQUIRED", ceiling_adapter_mode: "NOT_REQUIRED",
});

export async function compileLedLuminaireInstallationR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? LED_LUMINAIRE_INSTALLATION_CATALOG_ID;
  if (catalogId !== LED_LUMINAIRE_INSTALLATION_CATALOG_ID) {
    throw new Error(`LED_LUMINAIRE_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const whole=ledSurfaceWholeDefinitionR1();
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.led-luminaire-installation-r1", catalogId,
    primaryMeasureParameterId: "luminaire_count",
    parameterDefinitions: [...whole.parameters],
    formulaDefinitions: [...whole.formulas],
    resourceDefinitions: [...whole.resources], submittedParameters,
    confirmedParameters: { ...LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT },
    currencyCode: "KGS", priceItems: [], maximumResourceRows: 30,
    hashJson: async (value) => JSON.stringify(value) });
}

/** Whole-cycle authority for the existing31/23/23 owner. Manufacturer supply
 * does not authenticate an object, an installation norm, an order or a price. */
export const LED_SURFACE_WHOLE_SOURCE_R1=surfacePack.wholeCycle;
const surfaceWhole=LED_SURFACE_WHOLE_SOURCE_R1;
export const LED_SURFACE_WHOLE_SOURCE_SHA_R1=canonicalEstimateSha256HexText(canonicalEstimateStableJson(surfaceWhole));
export const ledSurfaceFactoryComponentRowIdsR1=surfaceWhole.factoryComponents.map(c=>surfaceWhole.prefix+':'+c.key);
function ledSurfaceOperationR1(key:string):Record<string,any>{
 const op=surfaceWhole.operations.find(o=>o.key===key);if(!op)throw Error('LED_SURFACE_EXACT_OPERATION_REQUIRED:'+key);
 const {key:_key,...body}=op;return {...body,contractVersion:'canonical-operation-resource/v1'};
}
function ledSurfaceUsesR1(keys:readonly string[]):Record<string,any>{
 if(!keys.length)throw Error('LED_SURFACE_RESOURCE_CONSUMER_REQUIRED');
 const uses=keys.map(ledSurfaceOperationR1);return {...uses[0],additionalOperations:uses.slice(1)};
}
const ledSurfaceRehashR1=(row:CanonicalEstimateResourceDefinition):CanonicalEstimateResourceDefinition=>{
 const {row_sha256:_old,...body}=row;return {...body,row_sha256:estimateDeterministicHash(body)};
};
export function assertLedSurfaceWholeFactoryDefinitionR1(d:Pick<AutomaticOwnerDefinition,'formulas'|'resources'>):void{
 for(const c of surfaceWhole.factoryComponents){
  const id=surfaceWhole.prefix+':'+c.key,row=d.resources.find(r=>r.row_id===id),formula=d.formulas.find(f=>f.formula_id===surfaceWhole.prefix+':formula:'+c.key);
  if(!row||row.unit_id!==c.unitId||row.cost_owner_id!==surfaceWhole.paidFactoryOwnerRowId
   ||row.procurement_eligible!==false||row.resource_graph.costTreatment!=='INCLUDED_IN_RESOURCE_ROWS'
   ||row.resource_graph.includedInResourceOwnerRowId!==surfaceWhole.paidFactoryOwnerRowId
   ||formula?.expression_source!=='luminaire_count*'+c.countPerLuminaire)
   throw Error('LED_SURFACE_FACTORY_COMPONENT_OWNER_OR_QUANTITY_DRIFT:'+id);
  const first=row.resource_graph.operationCompositionV1 as Record<string,any>;
  const ops=[first,...(first?.additionalOperations??[])].map(o=>o?.operationId);
  if(c.uses.some(k=>!ops.includes(surfaceWhole.prefix+':'+k)))throw Error('LED_SURFACE_FACTORY_COMPONENT_CONSUMER_LOST:'+id);
 }
}
/** Pass the personally verified actual parent body in ordinary intake. The
 * default source arrays are authoring inputs only, never a fresh DB receipt. */
export function ledSurfaceWholeDefinitionR1(parent:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>={
 parameters:LED_LUMINAIRE_INSTALLATION_PARAMETERS,formulas:LED_LUMINAIRE_INSTALLATION_FORMULAS,resources:LED_LUMINAIRE_INSTALLATION_RESOURCES,
}):AutomaticOwnerDefinition{
 if(parent.parameters.length!==31||parent.formulas.length!==23||parent.resources.length!==23
  ||surfaceWhole.factoryComponents.length!==6||surfaceWhole.operations.length!==14
  ||surfaceWhole.privateProductEvidence.powerW!==36||surfaceWhole.privateProductEvidence.ip!=='IP40'
  ||surfaceWhole.privateProductEvidence.protectionClass!=='I'
  ||surfaceWhole.sources[0]?.sha256!=='da725fcbbc72468a473855484bc102b5bee4d88f3ff7d2cdd1334fe7ded88d84')throw Error('LED_SURFACE_EXACT_CURRENT_AND_FACTORY_SOURCE_REQUIRED');
 for(const old of LED_LUMINAIRE_INSTALLATION_RESOURCES){const current=parent.resources.find(r=>r.row_id===old.row_id);
  if(!current||current.ordinal!==old.ordinal||current.unit_id!==old.unit_id||current.formula_id!==old.formula_id||current.cost_owner_id!==old.cost_owner_id)
   throw Error('LED_SURFACE_CURRENT_LOGICAL_RESOURCE_DRIFT:'+old.row_id);}
 for(const old of LED_LUMINAIRE_INSTALLATION_FORMULAS){const current=parent.formulas.find(f=>f.formula_id===old.formula_id);
  if(!current||current.output_unit_id!==old.output_unit_id||current.expression_source!==old.expression_source
   ||canonicalEstimateStableJson(current.input_parameter_ids)!==canonicalEstimateStableJson(old.input_parameter_ids))throw Error('LED_SURFACE_CURRENT_FORMULA_DRIFT:'+old.formula_id);}
 const selected={kind:'equals' as const,parameterId:surfaceWhole.factoryProfileId,value:surfaceWhole.factoryProfileValue};
 const fit={kind:'equals' as const,parameterId:surfaceWhole.factoryFitId,value:surfaceWhole.factoryFitValue};
 const facts=[surfaceWhole.factoryProfileId,surfaceWhole.factoryDocumentId,surfaceWhole.factoryFitId];
 const extra=buildAutomaticConstructionOwnerR1({contract:surfaceWhole.contract,semanticOwner:LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  sourceId:LED_LUMINAIRE_INSTALLATION_SOURCE_ID,normId:'MANUFACTURER_EXACT_FACTORY_BOM_NOT_INSTALLATION_NORM',
  sourceMetadata:{source_title:'Точное заводское исполнение линейного светильника и штатного комплекта',source_document_version:surfaceWhole.contract,
   definition_hash:LED_SURFACE_WHOLE_SOURCE_SHA_R1,artifact_sha256:surfaceWhole.sources[0].sha256,exact_locator:surfaceWhole.sources.map(s=>s.locatorRu).join('; ')},
  applicabilityRu:surfaceWhole.scopeRu,ordinary:[{id:'luminaire_count',title:'Подтверждённое число монтируемых светильников',kind:'ordinary',valueType:'integer',unitId:'pcs',min:1}],profile:[],
  conditional:[{id:surfaceWhole.factoryProfileId,title:'Точное физическое исполнение заводского комплекта',kind:'conditional',valueType:'enum',unitId:null,values:[surfaceWhole.factoryProfileValue]},
   {id:surfaceWhole.factoryDocumentId,title:'Ведомость точной ревизии и совместимого монтажа',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected},
   {id:surfaceWhole.factoryFitId,title:'Применимость полного монтажного узла',kind:'conditional',valueType:'enum',unitId:null,values:[surfaceWhole.factoryFitValue],requiredWhen:selected},
   {id:surfaceWhole.additionalMountingId,title:'Отдельный объём дополнительного крепления',kind:'conditional',valueType:'enum',unitId:null,
    values:[surfaceWhole.noAdditionalMountingValue,surfaceWhole.additionalMountingValue],requiredWhen:selected}],
  rows:surfaceWhole.factoryComponents.map(c=>({rowId:surfaceWhole.prefix+':'+c.key,formulaId:surfaceWhole.prefix+':formula:'+c.key,
   section:'Заводское изделие и штатное крепление',category:'material',title:c.titleRu,unitId:c.unitId,expression:'luminaire_count*'+c.countPerLuminaire,
   inputParameterIds:facts,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurement:false,inclusion:{kind:'and',operands:[selected,fit]}})),
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:surfaceWhole.returnWhen.map(n=>n.id+': '+n.returnWhen)});
 const parameters=[...parent.parameters.map(p=>p.parameter_id==='separate_driver_mode'?{...p,constraints_json:{...p.constraints_json,
  // A supplied NOT_REQUIRED remains valid; a second external driver conflicts
  // with this exact assembled factory variant, using an existing common rule.
  forbiddenWhen:{kind:'and',operands:[selected,{kind:'equals',parameterId:'separate_driver_mode',value:'REQUIRED'}]}}}:p),
  ...extra.parameters.filter(p=>p.parameter_id!=='luminaire_count').map((p,i)=>({...p,ordinal:31+i,truth_metadata:{...p.truth_metadata,
   value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'USER_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},actualProjectAuthenticated:false,
   guide:{...p.truth_metadata.guide as Record<string,unknown>,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION',
    guide_validation_policy:'MANDATORY_BLOCK',guide_version:surfaceWhole.contract,source_snapshot_hash:LED_SURFACE_WHOLE_SOURCE_SHA_R1,
    source_document:LED_LUMINAIRE_INSTALLATION_SOURCE_ID,source_locator:'EXACT_FACTORY_REVISION_AND_ACTUAL_COMPATIBLE_MOUNTING_DOCUMENT_REQUIRED',
    applicability:surfaceWhole.scopeRu,verified_at:'2026-10-28T00:00:00+06:00',evidenceReviewOnlyNotProjectAdmission:true}}}))];
 const resources=[...parent.resources.map(r=>{
  const uses=(surfaceWhole.resourceUses as Record<string,string[]>)[r.row_id],isCounter=!uses;
  if(isCounter&&!['rc09:led_luminaire_install','rc09:luminaire_pe_continuity_test'].includes(r.row_id)&&!r.row_id.startsWith('led:balance:'))throw Error('LED_SURFACE_EXACT_LEGACY_ROW_REQUIRED:'+r.row_id);
  const kind=(surfaceWhole.resourceKinds as Record<string,string>)[r.row_id]??'MATERIAL';
  return ledSurfaceRehashR1({...r,
   // Existing source-owned ordinary inclusion; no duplicate charge for supplied
   // screws/plugs. A distinct additional project kit retains its own old owner.
   ...(r.row_id==='rc09:luminaire_mounting_anchor_set'?{inclusion_ast:{kind:'and',operands:[r.inclusion_ast,{kind:'or',operands:[
    {kind:'not',operand:selected},{kind:'equals',parameterId:surfaceWhole.additionalMountingId,value:surfaceWhole.additionalMountingValue}]}]}}:{}),
   resource_graph:{...r.resource_graph,
   ...(uses?{operationCompositionV1:ledSurfaceUsesR1(uses)}:{calculationDetailV1:true}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
    brandAndModelRu:null,specificationRu:null,...(isCounter?{rowKind:'CALCULATION_DETAIL'}:{resourceKind:kind}),
    detailsRu:[isCounter?'Расчётные сведения; отдельный физический ресурс, монтажный этап и повторная оплата не создаются.':'Полный применимый состав и количества остаются отдельными требованиями источника и объекта.']}},
   source_metadata:{...r.source_metadata,wholeCycleSourceSha256:LED_SURFACE_WHOLE_SOURCE_SHA_R1,
    actualProjectAuthenticated:false,physicalKitOrPriceNotClosedByOperationBinding:true}});
 }),...extra.resources.map((r,i)=>{
  const c=surfaceWhole.factoryComponents[i]!;
  return ledSurfaceRehashR1({...r,ordinal:23+i,cost_owner_id:surfaceWhole.paidFactoryOwnerRowId,resource_graph:{...r.resource_graph,
   parentCostOwnerId:surfaceWhole.paidFactoryOwnerRowId,includedInResourceOwnerRowId:surfaceWhole.paidFactoryOwnerRowId,
   operationCompositionV1:ledSurfaceUsesR1(c.uses),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:c.titleRu,nameRu:c.titleRu,
    resourceKind:'MATERIAL',brandAndModelRu:null,specificationRu:null,detailsRu:[c.basis,'Количество применения=N, а не объём заказа, наличие или цена. Штатная совместимость с основанием требует подтверждения.']}},
   source_metadata:{...r.source_metadata,normativeTrace:[],normative_source_ids:[],sourceRole:'MANUFACTURER_FACTORY_INCLUDED_COMPONENT_NOT_INSTALLATION_NORM',
    wholeFactoryBOMSource:surfaceWhole.sources,quantityBasis:c.basis,quantityDriver:'luminaire_count',factoryCountPerUnit:c.countPerLuminaire,
    independentPurchaseAllowed:false,automaticGenericPriceInheritanceAllowed:false,actualProjectAuthenticated:false,
    factorySourceRevisionRequired:true,currentWebEanEquivalenceProved:false,full_technical_acceptance:false}});
 })];
 const formulas=[...parent.formulas,...extra.formulas],consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 assertLedSurfaceWholeFactoryDefinitionR1({formulas,resources});
 return{parameters:parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],
  resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}})),formulas,resources,
  runtimeInput:{...LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT},runtimeClassification:{...LED_LUMINAIRE_INSTALLATION_RUNTIME_CLASSIFICATION},
  runtimeSourceIds:{...LED_LUMINAIRE_INSTALLATION_RUNTIME_SOURCE_IDS},ordinaryParameterIds:['luminaire_count']};
}
export function ledSurfaceWholeCompletenessR1(){
 const counterIds=['rc09:led_luminaire_install','rc09:luminaire_pe_continuity_test',...LED_LUMINAIRE_INSTALLATION_RESOURCES.filter(r=>r.row_id.startsWith('led:balance:')).map(r=>r.row_id)];
 const entry=(rowId:string,formulaId:string,unitId:string,keys:readonly string[])=>({expectedResourceId:rowId,formulaId,unitId,
  sourceId:LED_LUMINAIRE_INSTALLATION_SOURCE_ID,operationId:surfaceWhole.prefix+':'+keys[0],requiredOperationIds:keys.map(k=>surfaceWhole.prefix+':'+k),
  condition:'Exact existing surface36IP40 scope; actual method/complete provisions/source conditions still required.',resolution:{kind:'ROW' as const,rowId}});
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  operationResourceBindingRequired:true,evidenceSha256:LED_SURFACE_WHOLE_SOURCE_SHA_R1,
  operationRoster:surfaceWhole.operations.map(({key:_key,...op})=>op),
  operationRequirements:surfaceWhole.independentClassRequirements.map(op=>({operationId:op.operationId,sourceId:LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
   requirements:Object.fromEntries(op.classes.map(({kind,...requirement})=>[kind,requirement]))})),
  entries:[...LED_LUMINAIRE_INSTALLATION_RESOURCES.filter(r=>!counterIds.includes(r.row_id)).map(r=>entry(r.row_id,r.formula_id,r.unit_id,(surfaceWhole.resourceUses as Record<string,string[]>)[r.row_id]!)),
   ...surfaceWhole.factoryComponents.map(c=>({...entry(surfaceWhole.prefix+':'+c.key,surfaceWhole.prefix+':formula:'+c.key,c.unitId,c.uses),
    resolution:{kind:'INCLUDED_COMPONENT_ROW' as const,rowId:surfaceWhole.prefix+':'+c.key,parentRowId:surfaceWhole.paidFactoryOwnerRowId}})),
   ...counterIds.map(rowId=>({expectedResourceId:rowId,operationId:surfaceWhole.prefix+':accept-scope',sourceId:LED_LUMINAIRE_INSTALLATION_SOURCE_ID,condition:'Preserved nonphysical calculation detail, not an onsite subwork or another paid resource.',
    resolution:{kind:'NOT_APPLICABLE' as const,reasonRu:'Сохранён исходный расчётный показатель; физическое применение представлено отдельными ресурсами с одним владельцем.'}}))]};
}
export const LED_SURFACE_FACTORY_DEMO_R1=Object.freeze({
 [surfaceWhole.factoryProfileId]:surfaceWhole.factoryProfileValue,
 [surfaceWhole.factoryDocumentId]:'EXPLICIT_DEMO_NOT_OBJECT_DOCUMENT: exact source revision and compatible method fixture',
 [surfaceWhole.factoryFitId]:surfaceWhole.factoryFitValue,
 [surfaceWhole.additionalMountingId]:surfaceWhole.noAdditionalMountingValue,
});
