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

export const FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID =
  "official_sp_kr_21_101_2024_fire_alarm_functional_test_program_v1";
export const FIRE_ALARM_FUNCTIONAL_TEST_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:functional_test_direct_inputs:v1";

export const FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 и утверждённая программа функциональной проверки пожарной сигнализации",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики; ответственная проектная или эксплуатирующая организация",
  source_document_version:
    "SP_KR_21_101_2024_PLUS_APPROVED_FUNCTIONAL_TEST_PROGRAM",
  definition_hash:
    "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  exact_locator:
    "СП КР 21-101:2024: §§12.13–12.17 о зонах контроля и извещателях; §§12.23–12.24 об адресации, шлейфах, доступе и документации изготовителя; утверждённая программа функциональной проверки с перечнем точек, цепей, интерфейсов, резервного питания, оборудования и протоколов",
  use_restriction:
    "Источник задаёт техническую границу проверки, но не устанавливает универсальное число испытаний, трудоёмкость, расход аэрозоля или время оборудования. Все количества, кроме известного числа проверяемых извещателей, принимаются прямо из утверждённой программы проверки и фактической конфигурации системы.",
  source_kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_APPROVED_TEST_PROGRAM",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256:
    "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  effective_from: "2024-07-05",
});

export const FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS = Object.freeze({
  high_load: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_test_high_load",
    catalogVariant: "HIGH_LOAD_SEARCH_IDENTITY",
    canonicalNameRu:
      "Функциональная проверка пожарной сигнализации зоны высокой плотности устройств",
    aliasesRu: ["испытание АПС высокая нагрузка", "проверка пожарных извещателей высокой плотности"],
  }),
  standard: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_test_standard",
    catalogVariant: "STANDARD_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Функциональная проверка пожарной сигнализации стандартной зоны",
    aliasesRu: ["испытание АПС", "функциональная проверка пожарной сигнализации"],
  }),
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_test_technical_room",
    catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY",
    canonicalNameRu:
      "Функциональная проверка пожарной сигнализации технического помещения",
    aliasesRu: ["испытание АПС техпомещения", "проверка пожарной сигнализации технического помещения"],
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_test_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Функциональная проверка пожарной сигнализации влажной зоны",
    aliasesRu: ["испытание АПС влажной зоны", "проверка пожарной сигнализации влажного помещения"],
  }),
});

export type FireAlarmFunctionalTestVariantKey =
  keyof typeof FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS;

const PARAMETER_SPECS = Object.freeze([
  ["detector_test_count", "Количество функционально проверяемых пожарных извещателей", "integer", "test", 1],
  ["manual_call_point_test_count", "Количество проверок ручных пожарных извещателей", "integer", "test", 0],
  ["loop_fault_test_count", "Количество проверок контроля неисправности шлейфа", "integer", "test", 0],
  ["alarm_transmission_test_count", "Количество проверок передачи тревожного сигнала", "integer", "test", 0],
  ["external_interface_test_count", "Количество проверок внешних интерфейсов", "integer", "test", 0],
  ["standby_power_transfer_test_count", "Количество проверок перехода на резервное питание", "integer", "test", 0],
  ["functional_test_labor_man_hour", "Трудоёмкость функциональной проверки", "decimal", "man_hour", 0.000_001],
  ["aerosol_designation", "Тестовый аэрозоль по программе проверки", "text", null, null],
  ["aerosol_volume_l", "Объём тестового аэрозоля", "decimal", "l", 0.000_001],
  ["test_equipment_designation", "Измерительное и тестовое оборудование", "text", null, null],
  ["test_equipment_machine_hour", "Время применения тестового оборудования", "decimal", "machine_hour", 0.000_001],
  ["test_protocol_document_count", "Количество протоколов функциональной проверки", "integer", "document", 1],
  ["defect_register_document_count", "Количество реестров выявленных дефектов", "integer", "document", 0],
] as const);

const KNOWN_SCOPE = new Set(["detector_test_count"]);

export type FireAlarmFunctionalTestParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS:
readonly FireAlarmFunctionalTestParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, minimum], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: valueType === "text"
      ? { minLength: 1, maxLength: 1_000 }
      : { min: minimum },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-functional-test-variants-r1",
      semantic_parameter_key: `fire-alarm-functional-test:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId)
        ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_FIRE_ALARM_DETECTOR_TEST_SCOPE"
        : "APPROVED_FUNCTIONAL_TEST_PROGRAM_OR_SYSTEM_CONFIGURATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.has(parameterId)
          ? "Укажите подтверждённое число извещателей, которые требуется функционально проверить."
          : `${titleRu}: укажите прямое значение по утверждённой программе проверки и фактической конфигурации системы.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_DETECTOR_TEST_SCOPE"
          : "APPROVED_FUNCTIONAL_TEST_PROGRAM_OR_SYSTEM_CONFIGURATION",
        source_document: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
        source_locator: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.exact_locator,
        guide_version: "fire-alarm-functional-test-r1",
        source_snapshot_hash: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.artifact_sha256,
        applicability:
          "Только функциональная проверка существующей пожарной сигнализации; монтаж, замена, конфигурирование и общесистемная пусконаладка исключены.",
        verified_at: "2026-09-25T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      zero_value_meaning: minimum === 0
        ? "EXPLICITLY_ABSENT_FROM_APPROVED_TEST_PROGRAM"
        : undefined,
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

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
  ["fire_alarm_detector_functional_test_count_v1", "test", "detector_test_count"],
  ["fire_alarm_manual_call_point_test_count_v1", "test", "manual_call_point_test_count"],
  ["fire_alarm_loop_fault_test_count_r1", "test", "loop_fault_test_count"],
  ["fire_alarm_transmission_test_count_v1", "test", "alarm_transmission_test_count"],
  ["fire_alarm_external_interface_test_count_r1", "test", "external_interface_test_count"],
  ["fire_alarm_standby_power_transfer_test_count_v1", "test", "standby_power_transfer_test_count"],
  ["fire_alarm_functional_test_labor_v1", "man_hour", "functional_test_labor_man_hour"],
  ["fire_alarm_functional_test_aerosol_v1", "l", "aerosol_volume_l"],
  ["fire_alarm_functional_test_equipment_v1", "machine_hour", "test_equipment_machine_hour"],
  ["fire_alarm_functional_test_protocol_v1", "document", "test_protocol_document_count"],
  ["fire_alarm_functional_test_defect_register_v1", "document", "defect_register_document_count"],
] as const);

export const FIRE_ALARM_FUNCTIONAL_TEST_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(FORMULA_SPECS.map(
  ([formulaId, unitId, parameterId]) => formula(formulaId, unitId, parameterId),
));

const ROW_SPECS = Object.freeze([
  ["f09:fire_alarm_detector_functional_test", "Функциональные проверки", "construction_work", "Функциональная проверка пожарного извещателя", false, []],
  ["f09:fire_alarm_manual_call_point_test", "Функциональные проверки", "construction_work", "Функциональная проверка ручного пожарного извещателя", false, []],
  ["f09:fire_alarm_loop_fault_test", "Функциональные проверки", "construction_work", "Проверка контроля неисправности шлейфа пожарной сигнализации", false, []],
  ["f09:fire_alarm_transmission_test", "Функциональные проверки", "construction_work", "Проверка передачи тревожного сигнала", false, []],
  ["f09:fire_alarm_external_interface_test", "Функциональные проверки", "construction_work", "Проверка внешнего интерфейса пожарной автоматики", false, []],
  ["f09:fire_alarm_standby_power_test", "Функциональные проверки", "construction_work", "Проверка перехода пожарной сигнализации на резервное питание", false, []],
  ["f09:fire_alarm_functional_test_labor", "Труд", "construction_work", "Труд специалистов по функциональной проверке пожарной сигнализации", false, []],
  ["f09:fire_alarm_functional_test_aerosol", "Материалы", "material", "Аэрозоль для функциональной проверки дымовых извещателей", true, ["aerosol_designation"]],
  ["f09:fire_alarm_functional_test_equipment", "Оборудование", "equipment", "Измерительное и тестовое оборудование", true, ["test_equipment_designation"]],
  ["f09:fire_alarm_functional_test_protocol", "Документация", "service", "Протокол функциональной проверки пожарной сигнализации", true, []],
  ["f09:fire_alarm_functional_test_defect_register", "Документация", "service", "Реестр дефектов, выявленных при функциональной проверке", true, []],
] as const);

const literalTrue = Object.freeze({ kind: "literal", value: true });

export const FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, procurementEligible, titleParameterIds], ordinal) => {
    const [formulaId, unitId] = FORMULA_SPECS[ordinal];
    const resourceGraph = {
      formulaId,
      normalizedUom: unitId,
      semanticOwnerId: `fire-alarm-functional-test:${rowId}`,
      costOwner: "resource",
      ...(titleParameterIds.length > 0 ? {
        titleSpecificationParameterIds: [...titleParameterIds],
        titleSpecificationMode: "APPEND",
        titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: ["detector_test_count"],
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: ordinal === 0
        ? "USER_SUPPLIED_OR_APPROVED_DETECTOR_TEST_SCOPE"
        : "APPROVED_FUNCTIONAL_TEST_PROGRAM_OR_SYSTEM_CONFIGURATION",
      normativeTrace: [{
        sourceId: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
        source_id: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
        normId: FIRE_ALARM_FUNCTIONAL_TEST_NORM_ID,
        norm_id: FIRE_ALARM_FUNCTIONAL_TEST_NORM_ID,
        normVersion: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.source_document_version,
        source_title: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.source_title,
        exact_locator: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.exact_locator,
        source_definition_hash: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.definition_hash,
      }],
      quantityBasis: ordinal === 0
        ? "KNOWN_DETECTOR_TEST_COUNT"
        : "DIRECT_APPROVED_FUNCTIONAL_TEST_PROGRAM_INPUT",
      excludedUnownedAssumptions: [
        "universal test count, productivity, labor or consumable rate",
        "classification suffix factor",
        "installation, replacement, configuration or commissioning scope",
        "device, cable, panel, sounder or power-supply procurement",
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
      inclusion_ast: literalTrue,
      resource_graph: resourceGraph,
      procurement_eligible: procurementEligible,
      cost_owner_id: rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({
        rowId, ordinal, section, category, titleRu, unitId, formulaId,
        procurementEligible, resourceGraph, sourceMetadata,
      }),
    };
  },
));

export const FIRE_ALARM_FUNCTIONAL_TEST_SHORT_INPUT = Object.freeze({
  detector_test_count: 100,
});

export const FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_ALARM_FUNCTIONAL_TEST_SHORT_INPUT,
  manual_call_point_test_count: 5,
  loop_fault_test_count: 8,
  alarm_transmission_test_count: 6,
  external_interface_test_count: 4,
  standby_power_transfer_test_count: 2,
  functional_test_labor_man_hour: 40,
  aerosol_designation: "Тестовый аэрозоль по утверждённой программе проверки",
  aerosol_volume_l: 0.25,
  test_equipment_designation: "Комплект тестового оборудования по программе проверки",
  test_equipment_machine_hour: 8,
  test_protocol_document_count: 2,
  defect_register_document_count: 1,
});

export function resolveFireAlarmFunctionalTestVariant(
  variantKey: string,
): (typeof FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS)[FireAlarmFunctionalTestVariantKey] {
  if (!Object.prototype.hasOwnProperty.call(
    FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS,
    variantKey,
  )) {
    throw new Error(`FIRE_ALARM_FUNCTIONAL_TEST_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS[
    variantKey as FireAlarmFunctionalTestVariantKey
  ];
}

export function fireAlarmFunctionalTestCompletenessMap(
  variantKey: FireAlarmFunctionalTestVariantKey,
) {
  const variant = FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM",
    generatedFromCurrentRows: false,
    evidenceSha256: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.artifact_sha256,
    evidenceReferences: [
      FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA.official_url,
      "approved fire-alarm functional-test program",
      "actual system configuration and manufacturer documentation",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map(([rowId, , category, titleRu], ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category,
      specification: titleRu,
      condition: "fire_alarm_functional_test_selected",
      sourceId: FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_ID,
      unitId: FORMULA_SPECS[ordinal][1],
      quantityRule: ordinal === 0
        ? "KNOWN_DETECTOR_TEST_COUNT"
        : "DIRECT_APPROVED_FUNCTIONAL_TEST_PROGRAM_INPUT",
      detailPrinciple:
        "FUNCTIONAL_TEST_ONLY_NO_INSTALLATION_REPLACEMENT_CONFIGURATION_OR_COMMISSIONING",
      priceRelation: "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: FORMULA_SPECS[ordinal][0],
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileFireAlarmFunctionalTestVariantR1(
  variantKey: FireAlarmFunctionalTestVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIRE_ALARM_FUNCTIONAL_TEST_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.fire-alarm-functional-test-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "detector_test_count",
    parameterDefinitions: [...FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_FUNCTIONAL_TEST_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 16,
    hashJson: async (value) => JSON.stringify(value),
  });
}
