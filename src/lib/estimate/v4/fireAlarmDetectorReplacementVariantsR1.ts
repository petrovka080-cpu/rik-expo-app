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

export const FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID =
  "official_sp_kr_21_101_2024_fire_alarm_detector_replacement_project_inputs_v1";
export const FIRE_ALARM_DETECTOR_REPLACEMENT_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:detector_replacement_direct_inputs:v1";

export const FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 и утверждённая ведомость замены адресных пожарных извещателей",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики; проектная организация пожарной автоматики; ответственный инженер объекта",
  source_document_version:
    "SP_KR_21_101_2024_PLUS_APPROVED_DEVICE_REPLACEMENT_PACKAGE",
  definition_hash:
    "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  exact_locator:
    "СП КР 21-101:2024: §§12.13–12.17 и §§12.23–12.24 о размещении, адресации, доступе и документации изготовителя; утверждённые дефектная ведомость, схема адресации, узел крепления, ППР, программа проверки и решение по обращению со снятыми устройствами",
  use_restriction:
    "Источник задаёт техническую границу замены, но не устанавливает универсальную трудоёмкость, расход аэрозоля, крепежа, тару или логистику отходов. Новое устройство и адресная метка следуют подтверждённому количеству замен; остальные количества принимаются только из утверждённого проекта, ППР, программы проверки и решения по снятым устройствам.",
  source_kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_APPROVED_PROJECT_PACKAGE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256:
    "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  effective_from: "2024-07-05",
});

export const FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS = Object.freeze({
  high_load: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_replace_high_load",
    catalogVariant: "HIGH_LOAD_SEARCH_IDENTITY",
    canonicalNameRu:
      "Замена адресных пожарных извещателей в зоне высокой плотности устройств",
    aliasesRu: [
      "замена извещателей АПС высокая нагрузка",
      "замена адресных дымовых извещателей высокой плотности",
    ],
  }),
  standard: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_replace_standard",
    catalogVariant: "STANDARD_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Замена адресных пожарных извещателей стандартной зоны",
    aliasesRu: [
      "замена извещателей АПС",
      "замена адресного дымового извещателя",
    ],
  }),
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_replace_technical_room",
    catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY",
    canonicalNameRu:
      "Замена адресных пожарных извещателей в техническом помещении",
    aliasesRu: [
      "замена извещателей АПС техпомещения",
      "замена адресных дымовых извещателей в техническом помещении",
    ],
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_replace_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Замена адресных пожарных извещателей во влажной зоне",
    aliasesRu: [
      "замена извещателей АПС влажная зона",
      "замена адресных дымовых извещателей во влажном помещении",
    ],
  }),
});

export type FireAlarmDetectorReplacementVariantKey =
  keyof typeof FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS;

const PARAMETER_SPECS = Object.freeze([
  ["replacement_device_count", "Количество заменяемых адресных извещателей", "integer", "pcs", null],
  ["existing_detector_designation", "Обозначение снимаемого извещателя", "text", null, null],
  ["new_detector_designation", "Обозначение нового совместимого извещателя", "text", null, null],
  ["removal_labor_man_hour", "Трудоёмкость безопасного отключения и демонтажа", "decimal", "man_hour", null],
  ["installation_labor_man_hour", "Трудоёмкость монтажа нового извещателя", "decimal", "man_hour", null],
  ["address_test_labor_man_hour", "Трудоёмкость восстановления адресации и проверки", "decimal", "man_hour", null],
  ["base_replacement_mode", "Требуется замена монтажной базы", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["replacement_base_designation", "Обозначение новой совместимой базы", "text", null, null],
  ["replacement_base_quantity_piece", "Количество новых совместимых баз", "decimal", "pcs", null],
  ["fastener_mode", "Требуется новый огнестойкий крепёж", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["fastener_designation", "Комплект нового огнестойкого крепежа", "text", null, null],
  ["fastener_quantity_set", "Количество комплектов нового крепежа", "decimal", "set", null],
  ["aerosol_designation", "Тестовый аэрозоль по программе проверки", "text", null, null],
  ["aerosol_volume_l", "Объём тестового аэрозоля", "decimal", "l", null],
  ["test_dispenser_designation", "Устройство подачи тестового аэрозоля", "text", null, null],
  ["test_dispenser_machine_hour", "Машино-часы устройства подачи аэрозоля", "decimal", "machine_hour", null],
  ["replacement_protocol_document_count", "Количество протоколов замены и проверки", "integer", "document", null],
  ["removed_detector_disposition", "Обращение со снятыми извещателями", "enum", null, ["RETURN_TO_OWNER", "DISPOSE_AS_E_WASTE"]],
  ["e_waste_container_designation", "Тара для снятых электронных устройств", "text", null, null],
  ["e_waste_container_quantity_piece", "Количество единиц тары для электронных отходов", "decimal", "pcs", null],
  ["e_waste_mass_kg", "Масса снятых устройств, передаваемых как электронные отходы", "decimal", "kg", null],
  ["e_waste_transport_trip_count", "Количество рейсов перевозки электронных отходов", "decimal", "trip", null],
  ["e_waste_manifest_document_count", "Количество документов передачи электронных отходов", "integer", "document", null],
] as const);

const CONDITIONAL_BRANCHES: Readonly<Record<string, Readonly<{
  parameterId: string;
  requiredValue: InputValue;
  forbiddenValue: InputValue;
}>>> = Object.freeze({
  replacement_base_designation: {
    parameterId: "base_replacement_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  replacement_base_quantity_piece: {
    parameterId: "base_replacement_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  fastener_designation: {
    parameterId: "fastener_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  fastener_quantity_set: {
    parameterId: "fastener_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  e_waste_container_designation: {
    parameterId: "removed_detector_disposition",
    requiredValue: "DISPOSE_AS_E_WASTE",
    forbiddenValue: "RETURN_TO_OWNER",
  },
  e_waste_container_quantity_piece: {
    parameterId: "removed_detector_disposition",
    requiredValue: "DISPOSE_AS_E_WASTE",
    forbiddenValue: "RETURN_TO_OWNER",
  },
  e_waste_mass_kg: {
    parameterId: "removed_detector_disposition",
    requiredValue: "DISPOSE_AS_E_WASTE",
    forbiddenValue: "RETURN_TO_OWNER",
  },
  e_waste_transport_trip_count: {
    parameterId: "removed_detector_disposition",
    requiredValue: "DISPOSE_AS_E_WASTE",
    forbiddenValue: "RETURN_TO_OWNER",
  },
  e_waste_manifest_document_count: {
    parameterId: "removed_detector_disposition",
    requiredValue: "DISPOSE_AS_E_WASTE",
    forbiddenValue: "RETURN_TO_OWNER",
  },
});

const KNOWN_SCOPE = new Set([
  "replacement_device_count",
  "existing_detector_designation",
  "new_detector_designation",
]);

export type FireAlarmDetectorReplacementParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS:
readonly FireAlarmDetectorReplacementParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => {
    const branch = CONDITIONAL_BRANCHES[parameterId];
    return {
      parameter_id: parameterId,
      ordinal,
      value_type: valueType,
      unit_id: unitId,
      title_ru: titleRu,
      required: branch === undefined,
      default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...(branch ? {
          requiredWhen: {
            kind: "equals", parameterId: branch.parameterId, value: branch.requiredValue,
          },
          forbiddenWhen: {
            kind: "equals", parameterId: branch.parameterId, value: branch.forbiddenValue,
          },
        } : {}),
      },
      truth_metadata: {
        contract: "rik-expo-app.fire-alarm-detector-replacement-variants-r1",
        semantic_parameter_key: `fire-alarm-detector-replacement:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.has(parameterId)
          ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.has(parameterId)
          ? "KNOWN_REPLACEMENT_SCOPE"
          : "APPROVED_REPLACEMENT_STATEMENT_METHOD_QA_OR_WASTE_DECISION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: parameterId === "replacement_device_count"
            ? "Укажите подтверждённое число снимаемых и устанавливаемых адресных извещателей."
            : KNOWN_SCOPE.has(parameterId)
              ? `${titleRu}: укажите по дефектной ведомости и спецификации совместимого оборудования.`
              : `${titleRu}: укажите прямое значение по проекту замены, ППР, программе проверки или решению по снятым устройствам.`,
          source_role: KNOWN_SCOPE.has(parameterId)
            ? "USER_SUPPLIED_OR_APPROVED_REPLACEMENT_SCOPE"
            : "APPROVED_REPLACEMENT_STATEMENT_METHOD_QA_OR_WASTE_DECISION",
          source_document: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
          source_locator: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.exact_locator,
          guide_version: "fire-alarm-detector-replacement-r1",
          source_snapshot_hash:
            FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.artifact_sha256,
          applicability:
            "Только замена подтверждённого числа адресных пожарных извещателей; кабель, ППКП, оповещатели, питание и полная система исключены.",
          verified_at: "2026-09-25T00:00:00+06:00",
          guide_validation_policy:
            "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        synthetic: false,
      },
    };
  },
));

function formula(formulaId: string, outputUnitId: string, parameterId: string) {
  const compiled = compileFormulaGraph(parameterId);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: parameterId,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const FORMULA_SPECS = Object.freeze([
  ["fire_alarm_replacement_new_detector_count_v1", "pcs", "replacement_device_count"],
  ["fire_alarm_replacement_address_label_count_v1", "pcs", "replacement_device_count"],
  ["fire_alarm_replacement_removal_labor_v1", "man_hour", "removal_labor_man_hour"],
  ["fire_alarm_replacement_installation_labor_v1", "man_hour", "installation_labor_man_hour"],
  ["fire_alarm_replacement_address_test_labor_v1", "man_hour", "address_test_labor_man_hour"],
  ["fire_alarm_replacement_base_count_v1", "pcs", "replacement_base_quantity_piece"],
  ["fire_alarm_replacement_fastener_count_v1", "set", "fastener_quantity_set"],
  ["fire_alarm_replacement_aerosol_volume_v1", "l", "aerosol_volume_l"],
  ["fire_alarm_replacement_dispenser_time_v1", "machine_hour", "test_dispenser_machine_hour"],
  ["fire_alarm_replacement_protocol_count_v1", "document", "replacement_protocol_document_count"],
  ["fire_alarm_replacement_returned_device_count_v1", "pcs", "replacement_device_count"],
  ["fire_alarm_replacement_e_waste_container_count_v1", "pcs", "e_waste_container_quantity_piece"],
  ["fire_alarm_replacement_e_waste_mass_v1", "kg", "e_waste_mass_kg"],
  ["fire_alarm_replacement_e_waste_transport_v1", "trip", "e_waste_transport_trip_count"],
  ["fire_alarm_replacement_e_waste_manifest_v1", "document", "e_waste_manifest_document_count"],
] as const);

export const FIRE_ALARM_DETECTOR_REPLACEMENT_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(FORMULA_SPECS.map(
  ([formulaId, unitId, parameterId]) => formula(formulaId, unitId, parameterId),
));

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

const ROW_SPECS = Object.freeze([
  ["f09:fire_alarm_replacement_new_detector", "Оборудование системы", "material", "Новый совместимый адресный пожарный извещатель", "pcs", "fire_alarm_replacement_new_detector_count_v1", true, literalTrue, ["new_detector_designation"]],
  ["f09:fire_alarm_replacement_address_label", "Материалы", "material", "Новая индивидуальная этикетка адреса извещателя", "pcs", "fire_alarm_replacement_address_label_count_v1", true, literalTrue, []],
  ["f09:fire_alarm_replacement_removal_labor", "Труд", "construction_work", "Безопасное отключение и демонтаж существующего извещателя", "man_hour", "fire_alarm_replacement_removal_labor_v1", false, literalTrue, ["existing_detector_designation"]],
  ["f09:fire_alarm_replacement_installation_labor", "Труд", "construction_work", "Монтаж нового совместимого извещателя", "man_hour", "fire_alarm_replacement_installation_labor_v1", false, literalTrue, ["new_detector_designation"]],
  ["f09:fire_alarm_replacement_address_test_labor", "Труд", "construction_work", "Восстановление адресации и функциональная проверка извещателя", "man_hour", "fire_alarm_replacement_address_test_labor_v1", false, literalTrue, []],
  ["f09:fire_alarm_replacement_base", "Условные материалы", "material", "Новая совместимая монтажная база", "pcs", "fire_alarm_replacement_base_count_v1", true, equals("base_replacement_mode", "REQUIRED"), ["replacement_base_designation"]],
  ["f09:fire_alarm_replacement_fastener", "Условные материалы", "material", "Комплект нового огнестойкого крепежа базы", "set", "fire_alarm_replacement_fastener_count_v1", true, equals("fastener_mode", "REQUIRED"), ["fastener_designation"]],
  ["f09:fire_alarm_replacement_test_aerosol", "Материалы", "material", "Аэрозоль для функциональной проверки заменённых извещателей", "l", "fire_alarm_replacement_aerosol_volume_v1", true, literalTrue, ["aerosol_designation"]],
  ["f09:fire_alarm_replacement_test_dispenser", "Оборудование", "equipment", "Устройство подачи тестового аэрозоля", "machine_hour", "fire_alarm_replacement_dispenser_time_v1", true, literalTrue, ["test_dispenser_designation"]],
  ["f09:fire_alarm_replacement_protocol", "Контроль", "service", "Протокол замены, адресации и функциональной проверки", "document", "fire_alarm_replacement_protocol_count_v1", true, literalTrue, []],
  ["f09:fire_alarm_replacement_returned_device", "Снятые устройства", "service", "Передача снятого извещателя собственнику", "pcs", "fire_alarm_replacement_returned_device_count_v1", false, equals("removed_detector_disposition", "RETURN_TO_OWNER"), ["existing_detector_designation"]],
  ["f09:fire_alarm_replacement_e_waste_container", "Отходы", "material", "Тара для снятых электронных устройств", "pcs", "fire_alarm_replacement_e_waste_container_count_v1", true, equals("removed_detector_disposition", "DISPOSE_AS_E_WASTE"), ["e_waste_container_designation"]],
  ["f09:fire_alarm_replacement_e_waste_mass", "Отходы", "service", "Передача снятых извещателей как электронных отходов", "kg", "fire_alarm_replacement_e_waste_mass_v1", true, equals("removed_detector_disposition", "DISPOSE_AS_E_WASTE"), []],
  ["f09:fire_alarm_replacement_e_waste_transport", "Перевозка", "service", "Перевозка снятых электронных устройств уполномоченному получателю", "trip", "fire_alarm_replacement_e_waste_transport_v1", true, equals("removed_detector_disposition", "DISPOSE_AS_E_WASTE"), []],
  ["f09:fire_alarm_replacement_e_waste_manifest", "Документация", "service", "Документ передачи электронных отходов", "document", "fire_alarm_replacement_e_waste_manifest_v1", true, equals("removed_detector_disposition", "DISPOSE_AS_E_WASTE"), []],
] as const);

export const FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, unitId, formulaId, procurementEligible,
    inclusionAst, titleParameterIds], ordinal) => {
    const resourceGraph = {
      formulaId,
      normalizedUom: unitId,
      semanticOwnerId: `fire-alarm-detector-replacement:${rowId}`,
      costOwner: "resource",
      ...(titleParameterIds.length > 0 ? {
        titleSpecificationParameterIds: [...titleParameterIds],
        titleSpecificationMode: "APPEND",
        titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: [
        "replacement_device_count",
        "existing_detector_designation",
        "new_detector_designation",
      ],
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: ordinal < 2
        ? "USER_SUPPLIED_OR_APPROVED_REPLACEMENT_SCOPE"
        : "APPROVED_REPLACEMENT_STATEMENT_METHOD_QA_OR_WASTE_DECISION",
      normativeTrace: [{
        sourceId: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
        source_id: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
        normId: FIRE_ALARM_DETECTOR_REPLACEMENT_NORM_ID,
        norm_id: FIRE_ALARM_DETECTOR_REPLACEMENT_NORM_ID,
        normVersion:
          FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.source_document_version,
        source_title: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.source_title,
        exact_locator: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.exact_locator,
        source_definition_hash:
          FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.definition_hash,
      }],
      quantityBasis: ordinal < 2 || ordinal === 10
        ? "CONFIRMED_REPLACEMENT_DEVICE_COUNT"
        : "DIRECT_APPROVED_REPLACEMENT_PROJECT_METHOD_QA_OR_WASTE_INPUT",
      excludedUnownedAssumptions: [
        "universal replacement labor or productivity rate",
        "automatic base, fastener, aerosol, equipment or waste quantity",
        "classification suffix factor",
        "loop cable, control panel, sounder, power supply or full fire-alarm system",
        "invented price",
      ],
    };
    return {
      id: `resource-${rowId.replace(/:/gu, "-")}`,
      row_id: rowId,
      ordinal,
      section,
      category,
      title_ru: titleRu,
      unit_id: unitId,
      formula_id: formulaId,
      inclusion_ast: inclusionAst,
      resource_graph: resourceGraph,
      procurement_eligible: procurementEligible,
      cost_owner_id: rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({
        rowId, ordinal, section, category, titleRu, unitId, formulaId,
        procurementEligible, inclusionAst, resourceGraph, sourceMetadata,
      }),
    };
  },
));

export const FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT = Object.freeze({
  replacement_device_count: 25,
  existing_detector_designation: "Существующий адресный дымовой извещатель по дефектной ведомости",
  new_detector_designation: "Новый совместимый адресный дымовой извещатель по спецификации",
  base_replacement_mode: "NOT_REQUIRED",
  fastener_mode: "NOT_REQUIRED",
  removed_detector_disposition: "RETURN_TO_OWNER",
});

export const FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT,
  removal_labor_man_hour: 5,
  installation_labor_man_hour: 9,
  address_test_labor_man_hour: 4,
  base_replacement_mode: "REQUIRED",
  replacement_base_designation: "Совместимая база по спецификации проекта замены",
  replacement_base_quantity_piece: 25,
  fastener_mode: "REQUIRED",
  fastener_designation: "Огнестойкий крепёж по узлу фактического основания",
  fastener_quantity_set: 25,
  aerosol_designation: "Тестовый аэрозоль по программе функциональной проверки",
  aerosol_volume_l: 0.12,
  test_dispenser_designation: "Устройство подачи аэрозоля по ППР",
  test_dispenser_machine_hour: 1.2,
  replacement_protocol_document_count: 1,
  removed_detector_disposition: "DISPOSE_AS_E_WASTE",
  e_waste_container_designation: "Тара для электронных устройств по плану обращения с отходами",
  e_waste_container_quantity_piece: 2,
  e_waste_mass_kg: 5,
  e_waste_transport_trip_count: 1,
  e_waste_manifest_document_count: 1,
});

export function resolveFireAlarmDetectorReplacementVariant(
  variantKey: string,
): (typeof FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS)[
  FireAlarmDetectorReplacementVariantKey
] {
  if (!Object.prototype.hasOwnProperty.call(
    FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS,
    variantKey,
  )) {
    throw new Error(`FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS[
    variantKey as FireAlarmDetectorReplacementVariantKey
  ];
}

export function fireAlarmDetectorReplacementCompletenessMap(
  variantKey: FireAlarmDetectorReplacementVariantKey,
) {
  const variant = FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM",
    generatedFromCurrentRows: false,
    evidenceSha256:
      FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.artifact_sha256,
    evidenceReferences: [
      FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA.official_url,
      "approved fire-alarm detector defect and replacement statement",
      "approved replacement method, functional-test program and removed-device decision",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map((
      [rowId, , category, titleRu, unitId, formulaId], ordinal,
    ) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category,
      specification: titleRu,
      condition: ordinal === 5
        ? "base_replacement_mode=REQUIRED"
        : ordinal === 6
          ? "fastener_mode=REQUIRED"
          : ordinal === 10
            ? "removed_detector_disposition=RETURN_TO_OWNER"
            : ordinal >= 11
              ? "removed_detector_disposition=DISPOSE_AS_E_WASTE"
              : "fire_alarm_detector_replacement_selected",
      sourceId: FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_ID,
      unitId,
      quantityRule: ordinal < 2 || ordinal === 10
        ? "CONFIRMED_REPLACEMENT_DEVICE_COUNT"
        : "DIRECT_APPROVED_REPLACEMENT_PROJECT_METHOD_QA_OR_WASTE_INPUT",
      detailPrinciple:
        "DEVICE_REPLACEMENT_ONLY_NO_LOOP_PANEL_SOUNDER_POWER_OR_FULL_SYSTEM_SCOPE",
      priceRelation: "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId,
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileFireAlarmDetectorReplacementVariantR1(
  variantKey: FireAlarmDetectorReplacementVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIRE_ALARM_DETECTOR_REPLACEMENT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.fire-alarm-detector-replacement-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "replacement_device_count",
    parameterDefinitions: [...FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_DETECTOR_REPLACEMENT_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
