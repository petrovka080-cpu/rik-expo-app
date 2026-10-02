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

export const CCTV_SYSTEM_CATALOG_ID = "canonical-work:expanded:CCTV_system";
export const CCTV_SYSTEM_SOURCE_ID =
  "project_cctv_camera_layout_archive_network_method_qa_v1";
export const CCTV_SYSTEM_NORM_ID =
  "norm:project:cctv_system:camera_layout_archive_network_method_qa:v1";

export const CCTV_SYSTEM_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённые планы видеонаблюдения, ведомость камер и сетевого оборудования, расчёт архива, кабельный журнал, ППР и программа ПНР",
  source_authority: "Проектная организация систем безопасности, CCTV-интегратор, изготовитель оборудования, служба ПНР и утверждающий инженер проекта",
  source_document_version: "PROJECT_CCTV_CAMERA_NVR_NETWORK_STORAGE_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "746de865be85bd1b719f5aaa7e2fa762d3cdb3927989ef4f2b5cfcfd7d23d055",
  exact_locator: "Одна система CCTV, 16 выбранных PoE IP-камер CAM-IP-4MP-IR, один NVR-32CH и архив 30 суток; PoE, диски, кабели, окончания, крепёж, расходники, труд, подъём, настройка и контроль — только по утверждённому проектному комплекту",
  use_restriction: "Площадь здания не определяет камеры, кабельные трассы или объём архива. Битрейт, кодек, диски, аналитика и интеграция требуют прямого проектного основания. СКУД, пожарная сигнализация, общая LAN, серверная и общая UPS исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "746de865be85bd1b719f5aaa7e2fa762d3cdb3927989ef4f2b5cfcfd7d23d055",
});

const KNOWN_SCOPE = [
  "cctv_system_count", "cctv_camera_count", "cctv_camera_designation",
  "cctv_camera_type", "cctv_nvr_count", "cctv_nvr_designation",
  "cctv_archive_retention_days",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "cctv_camera_retained_spare_piece",
  "cctv_camera_supplier_pack_size_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "video_analytics_license_designation", "video_analytics_license_quantity_piece",
  "external_integration_gateway_designation", "external_integration_gateway_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["cctv_system_count", "Количество систем CCTV", "integer", "system", null],
  ["cctv_camera_count", "Количество устанавливаемых камер CCTV", "integer", "pcs", null],
  ["cctv_camera_designation", "Марка и каталожное обозначение камеры CCTV", "text", null, null],
  ["cctv_camera_type", "Тип камеры CCTV", "enum", null, ["IP_POE_4MP_IR", "IP_POE_OTHER"]],
  ["cctv_nvr_count", "Количество сетевых видеорегистраторов", "integer", "pcs", null],
  ["cctv_nvr_designation", "Марка и обозначение сетевого видеорегистратора", "text", null, null],
  ["cctv_archive_retention_days", "Требуемый срок хранения архива", "integer", "day", null],
  ["cctv_camera_retained_spare_piece", "Сохраняемый резерв камер CCTV", "decimal", "pcs", null],
  ["cctv_camera_supplier_pack_size_piece", "Количество камер CCTV в поставочной упаковке", "decimal", "pcs", null],
  ["camera_mounting_bracket_designation", "Кронштейн камеры по узлу установки", "text", null, null],
  ["camera_mounting_bracket_quantity_piece", "Количество кронштейнов камер", "decimal", "pcs", null],
  ["camera_junction_box_designation", "Монтажная коробка камеры CCTV", "text", null, null],
  ["camera_junction_box_quantity_piece", "Количество монтажных коробок камер", "decimal", "pcs", null],
  ["cctv_network_cable_designation", "Сетевой кабель CCTV по кабельному журналу", "text", null, null],
  ["cctv_network_cable_length_m", "Длина сетевого кабеля CCTV", "decimal", "m", null],
  ["cctv_patch_panel_designation", "Патч-панель CCTV по спецификации", "text", null, null],
  ["cctv_patch_panel_quantity_piece", "Количество патч-панелей CCTV", "decimal", "pcs", null],
  ["cctv_poe_switch_designation", "PoE-коммутатор CCTV по спецификации", "text", null, null],
  ["cctv_poe_switch_quantity_piece", "Количество PoE-коммутаторов CCTV", "decimal", "pcs", null],
  ["cctv_storage_drive_designation", "Накопитель архива CCTV по расчёту", "text", null, null],
  ["cctv_storage_drive_quantity_piece", "Количество накопителей архива CCTV", "decimal", "pcs", null],
  ["cctv_monitor_designation", "Монитор рабочего места CCTV", "text", null, null],
  ["cctv_monitor_quantity_piece", "Количество мониторов CCTV", "decimal", "pcs", null],
  ["cctv_termination_designation", "Оконцевание сетевого кабеля CCTV", "text", null, null],
  ["cctv_termination_quantity_piece", "Количество окончаний сетевого кабеля", "decimal", "pcs", null],
  ["cctv_label_designation", "Маркировка камер и кабелей CCTV", "text", null, null],
  ["cctv_label_quantity_piece", "Количество элементов маркировки CCTV", "decimal", "pcs", null],
  ["cctv_fastening_designation", "Крепёж камер и кабелей CCTV", "text", null, null],
  ["cctv_fastening_quantity_set", "Количество комплектов крепежа CCTV", "decimal", "set", null],
  ["cctv_consumable_designation", "Монтажные расходники CCTV", "text", null, null],
  ["cctv_consumable_quantity_kg", "Масса монтажных расходников CCTV", "decimal", "kg", null],
  ["cctv_grounding_conductor_designation", "Защитный проводник оборудования CCTV", "text", null, null],
  ["cctv_grounding_conductor_length_m", "Длина защитного проводника CCTV", "decimal", "m", null],
  ["cctv_test_report_designation", "Протокол проверки и ПНР CCTV", "text", null, null],
  ["cctv_test_report_quantity_document", "Количество протоколов проверки CCTV", "decimal", "document", null],
  ["cctv_camera_equipment_install_labor_h", "Труд по монтажу камер и оборудования CCTV", "decimal", "man_hour", null],
  ["cctv_cabling_termination_labor_h", "Труд по прокладке и окончанию кабелей CCTV", "decimal", "man_hour", null],
  ["cctv_configuration_commissioning_labor_h", "Труд по настройке, юстировке и ПНР CCTV", "decimal", "man_hour", null],
  ["cctv_lifting_equipment_machine_h", "Работа подъёмного средства для монтажа камер", "decimal", "machine_hour", null],
  ["cctv_network_tester_machine_h", "Работа сетевого тестера и станции настройки CCTV", "decimal", "machine_hour", null],
  ["cctv_delivery_trip_count", "Рейсы доставки оборудования и материалов CCTV", "integer", "trip", null],
  ["cctv_packaging_removal_trip_count", "Рейсы вывоза упаковки и монтажных отходов CCTV", "integer", "trip", null],
  ["video_analytics_mode", "Видеоаналитика входит в объём CCTV", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["video_analytics_license_designation", "Лицензия видеоаналитики по проекту", "text", null, null],
  ["video_analytics_license_quantity_piece", "Количество лицензий видеоаналитики", "decimal", "pcs", null],
  ["external_integration_mode", "Внешняя интеграция CCTV входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["external_integration_gateway_designation", "Шлюз или лицензия внешней интеграции CCTV", "text", null, null],
  ["external_integration_gateway_quantity_piece", "Количество шлюзов или лицензий интеграции", "decimal", "pcs", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("video_analytics_license_")
    ? "video_analytics_mode"
    : parameterId.startsWith("external_integration_gateway_")
      ? "external_integration_mode"
      : null;
  if (!branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type CctvSystemParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CCTV_SYSTEM_PARAMETERS: readonly CctvSystemParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
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
          ? { min: parameterId === "cctv_camera_retained_spare_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.cctv-system-r1",
      semantic_parameter_key: `cctv-system:${parameterId}`,
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
          : "APPROVED_CCTV_LAYOUT_ARCHIVE_NETWORK_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, плану камер или требованиям к архиву.`
          : `${titleRu}: укажите по плану CCTV, спецификации, расчёту архива, кабельному журналу, ППР или программе ПНР.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_CCTV_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_CCTV_LAYOUT_ARCHIVE_NETWORK_METHOD_OR_QA_DOCUMENTATION",
        source_document: CCTV_SYSTEM_SOURCE_ID,
        source_locator: CCTV_SYSTEM_SOURCE_METADATA.exact_locator,
        guide_version: "cctv-system-r1",
        source_snapshot_hash: CCTV_SYSTEM_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённой CCTV; СКУД, пожарная сигнализация и общая LAN исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const CCTV_SYSTEM_RUNTIME_INPUT = Object.freeze({
  cctv_camera_retained_spare_piece: 0,
  cctv_camera_supplier_pack_size_piece: 1,
});
export const CCTV_SYSTEM_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(CCTV_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const CCTV_SYSTEM_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(CCTV_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [CCTV_SYSTEM_SOURCE_ID]],
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

export const CCTV_SYSTEM_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("cctv_system_install_count_v1", "system", "cctv_system_count"),
  formula("cctv_camera_order_v1", "pcs",
    "ceil((cctv_camera_count+cctv_camera_retained_spare_piece)/cctv_camera_supplier_pack_size_piece)*cctv_camera_supplier_pack_size_piece"),
  formula("cctv_camera_bracket_quantity_v1", "pcs", "camera_mounting_bracket_quantity_piece"),
  formula("cctv_camera_junction_box_quantity_v1", "pcs", "camera_junction_box_quantity_piece"),
  formula("cctv_network_cable_length_v1", "m", "cctv_network_cable_length_m"),
  formula("cctv_patch_panel_quantity_v1", "pcs", "cctv_patch_panel_quantity_piece"),
  formula("cctv_poe_switch_quantity_v1", "pcs", "cctv_poe_switch_quantity_piece"),
  formula("cctv_nvr_quantity_v1", "pcs", "cctv_nvr_count"),
  formula("cctv_storage_drive_quantity_v1", "pcs", "cctv_storage_drive_quantity_piece"),
  formula("cctv_monitor_quantity_v1", "pcs", "cctv_monitor_quantity_piece"),
  formula("cctv_termination_quantity_v1", "pcs", "cctv_termination_quantity_piece"),
  formula("cctv_label_quantity_v1", "pcs", "cctv_label_quantity_piece"),
  formula("cctv_fastening_quantity_v1", "set", "cctv_fastening_quantity_set"),
  formula("cctv_consumable_quantity_v1", "kg", "cctv_consumable_quantity_kg"),
  formula("cctv_grounding_conductor_length_v1", "m", "cctv_grounding_conductor_length_m"),
  formula("cctv_camera_test_count_v1", "test", "cctv_camera_count"),
  formula("cctv_camera_register_count_v1", "camera", "cctv_camera_count"),
  formula("cctv_video_analytics_license_quantity_v1", "pcs", "video_analytics_license_quantity_piece"),
  formula("cctv_external_integration_gateway_quantity_v1", "pcs", "external_integration_gateway_quantity_piece"),
  formula("cctv_camera_installed_net_v1", "pcs", "cctv_camera_count"),
  formula("cctv_camera_retained_spare_v1", "pcs", "cctv_camera_retained_spare_piece"),
  formula("cctv_camera_total_need_v1", "pcs", "cctv_camera_count+cctv_camera_retained_spare_piece"),
  formula("cctv_camera_package_count_v1", "package",
    "ceil((cctv_camera_count+cctv_camera_retained_spare_piece)/cctv_camera_supplier_pack_size_piece)"),
  formula("cctv_camera_remainder_v1", "pcs",
    "ceil((cctv_camera_count+cctv_camera_retained_spare_piece)/cctv_camera_supplier_pack_size_piece)*cctv_camera_supplier_pack_size_piece-cctv_camera_count"),
  formula("cctv_camera_surplus_v1", "pcs",
    "max(0,ceil((cctv_camera_count+cctv_camera_retained_spare_piece)/cctv_camera_supplier_pack_size_piece)*cctv_camera_supplier_pack_size_piece-cctv_camera_count-cctv_camera_retained_spare_piece)"),
  formula("cctv_test_report_quantity_v1", "document", "cctv_test_report_quantity_document"),
  formula("cctv_camera_equipment_install_labor_v1", "man_hour", "cctv_camera_equipment_install_labor_h"),
  formula("cctv_cabling_termination_labor_v1", "man_hour", "cctv_cabling_termination_labor_h"),
  formula("cctv_configuration_commissioning_labor_v1", "man_hour", "cctv_configuration_commissioning_labor_h"),
  formula("cctv_lifting_equipment_v1", "machine_hour", "cctv_lifting_equipment_machine_h"),
  formula("cctv_network_tester_v1", "machine_hour", "cctv_network_tester_machine_h"),
  formula("cctv_delivery_v1", "trip", "cctv_delivery_trip_count"),
  formula("cctv_packaging_removal_v1", "trip", "cctv_packaging_removal_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; sourceRole: string; procurementEligible: boolean;
  inclusionAst?: Json; titleParameterIds?: string[];
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `cctv-system:${input.rowId}`,
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
      sourceId: CCTV_SYSTEM_SOURCE_ID, source_id: CCTV_SYSTEM_SOURCE_ID,
      normId: CCTV_SYSTEM_NORM_ID, norm_id: CCTV_SYSTEM_NORM_ID,
      normVersion: CCTV_SYSTEM_SOURCE_METADATA.source_document_version,
      source_title: CCTV_SYSTEM_SOURCE_METADATA.source_title,
      exact_locator: CCTV_SYSTEM_SOURCE_METADATA.exact_locator,
      source_definition_hash: CCTV_SYSTEM_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "floor-area-derived camera, cable or archive quantity",
      "static 432-m route or generic electrical productivity",
      "automatic bitrate, codec, storage, analytics or external integration",
      "automatic retained spare or supplier package",
      "access control, fire alarm, general LAN, server room or building UPS",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId, ordinal: input.ordinal, section: input.section,
    category: input.category, title_ru: input.titleRu, unit_id: input.unitId,
    formula_id: input.formulaId, inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph, procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId, source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const CCTV_SYSTEM_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:cctv_system_install_commission", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и пусконаладка системы видеонаблюдения CCTV", unitId: "system", formulaId: "cctv_system_install_count_v1", sourceRole: "USER_SUPPLIED_OR_APPROVED_CCTV_SCOPE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv_ip_camera", ordinal: 1, section: "Оборудование", category: "equipment", titleRu: "IP-камера CCTV", unitId: "pcs", formulaId: "cctv_camera_order_v1", titleParameterIds: ["cctv_camera_designation", "cctv_camera_type"], sourceRole: "USER_SELECTED_AND_APPROVED_CCTV_CAMERA", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_camera_mounting_bracket", ordinal: 2, section: "Комплектующие", category: "material", titleRu: "Кронштейн установки камеры CCTV", unitId: "pcs", formulaId: "cctv_camera_bracket_quantity_v1", titleParameterIds: ["camera_mounting_bracket_designation"], sourceRole: "APPROVED_CCTV_INSTALLATION_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_camera_junction_box", ordinal: 3, section: "Комплектующие", category: "material", titleRu: "Монтажная коробка камеры CCTV", unitId: "pcs", formulaId: "cctv_camera_junction_box_quantity_v1", titleParameterIds: ["camera_junction_box_designation"], sourceRole: "APPROVED_CCTV_INSTALLATION_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_network_cable", ordinal: 4, section: "Материалы", category: "material", titleRu: "Сетевой кабель CCTV", unitId: "m", formulaId: "cctv_network_cable_length_v1", titleParameterIds: ["cctv_network_cable_designation"], sourceRole: "APPROVED_CCTV_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_patch_panel", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Патч-панель CCTV", unitId: "pcs", formulaId: "cctv_patch_panel_quantity_v1", titleParameterIds: ["cctv_patch_panel_designation"], sourceRole: "APPROVED_CCTV_NETWORK_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_poe_switch", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "PoE-коммутатор CCTV", unitId: "pcs", formulaId: "cctv_poe_switch_quantity_v1", titleParameterIds: ["cctv_poe_switch_designation"], sourceRole: "APPROVED_CCTV_NETWORK_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_nvr", ordinal: 7, section: "Оборудование", category: "equipment", titleRu: "Сетевой видеорегистратор CCTV", unitId: "pcs", formulaId: "cctv_nvr_quantity_v1", titleParameterIds: ["cctv_nvr_designation"], sourceRole: "USER_SELECTED_AND_APPROVED_CCTV_RECORDER", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_storage_drive", ordinal: 8, section: "Оборудование", category: "equipment", titleRu: "Накопитель архива CCTV", unitId: "pcs", formulaId: "cctv_storage_drive_quantity_v1", titleParameterIds: ["cctv_storage_drive_designation"], sourceRole: "APPROVED_CCTV_ARCHIVE_CALCULATION", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_monitor", ordinal: 9, section: "Оборудование", category: "equipment", titleRu: "Монитор рабочего места CCTV", unitId: "pcs", formulaId: "cctv_monitor_quantity_v1", titleParameterIds: ["cctv_monitor_designation"], sourceRole: "APPROVED_CCTV_EQUIPMENT_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_termination", ordinal: 10, section: "Комплектующие", category: "material", titleRu: "Оконцевание сетевого кабеля CCTV", unitId: "pcs", formulaId: "cctv_termination_quantity_v1", titleParameterIds: ["cctv_termination_designation"], sourceRole: "APPROVED_CCTV_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_label", ordinal: 11, section: "Комплектующие", category: "material", titleRu: "Маркировка камер и кабелей CCTV", unitId: "pcs", formulaId: "cctv_label_quantity_v1", titleParameterIds: ["cctv_label_designation"], sourceRole: "APPROVED_CCTV_LABELING_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_fastening", ordinal: 12, section: "Крепёж", category: "material", titleRu: "Комплект крепления камер и кабелей CCTV", unitId: "set", formulaId: "cctv_fastening_quantity_v1", titleParameterIds: ["cctv_fastening_designation"], sourceRole: "APPROVED_CCTV_INSTALLATION_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_consumable", ordinal: 13, section: "Расходники", category: "material", titleRu: "Монтажные расходники CCTV", unitId: "kg", formulaId: "cctv_consumable_quantity_v1", titleParameterIds: ["cctv_consumable_designation"], sourceRole: "APPROVED_CCTV_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_grounding_conductor", ordinal: 14, section: "Материалы", category: "material", titleRu: "Защитный проводник оборудования CCTV", unitId: "m", formulaId: "cctv_grounding_conductor_length_v1", titleParameterIds: ["cctv_grounding_conductor_designation"], sourceRole: "APPROVED_CCTV_GROUNDING_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_camera_test", ordinal: 15, section: "Контроль", category: "service", titleRu: "Проверка изображения, потока, записи и воспроизведения камеры CCTV", unitId: "test", formulaId: "cctv_camera_test_count_v1", sourceRole: "USER_SUPPLIED_CAMERA_COUNT_AND_APPROVED_COMMISSIONING_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv_camera_register", ordinal: 16, section: "Документы", category: "service", titleRu: "Запись камеры в исполнительном реестре CCTV", unitId: "camera", formulaId: "cctv_camera_register_count_v1", sourceRole: "USER_SUPPLIED_CAMERA_COUNT_AND_APPROVED_ASBUILT_REGISTER", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv_video_analytics_license", ordinal: 17, section: "Условное оборудование", category: "equipment", titleRu: "Лицензия видеоаналитики CCTV", unitId: "pcs", formulaId: "cctv_video_analytics_license_quantity_v1", inclusionAst: equals("video_analytics_mode", "REQUIRED"), titleParameterIds: ["video_analytics_license_designation"], sourceRole: "APPROVED_CCTV_ANALYTICS_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv_external_integration_gateway", ordinal: 18, section: "Условное оборудование", category: "equipment", titleRu: "Шлюз или лицензия внешней интеграции CCTV", unitId: "pcs", formulaId: "cctv_external_integration_gateway_quantity_v1", inclusionAst: equals("external_integration_mode", "REQUIRED"), titleParameterIds: ["external_integration_gateway_designation"], sourceRole: "APPROVED_CCTV_INTEGRATION_ARCHITECTURE", procurementEligible: true }),
  resource({ rowId: "rc09:cctv-camera-balance:installed-net", ordinal: 19, section: "Баланс камер CCTV", category: "equipment", titleRu: "Количество устанавливаемых камер CCTV", unitId: "pcs", formulaId: "cctv_camera_installed_net_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv-camera-balance:retained-spare", ordinal: 20, section: "Баланс камер CCTV", category: "equipment", titleRu: "Сохраняемый резерв камер CCTV", unitId: "pcs", formulaId: "cctv_camera_retained_spare_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv-camera-balance:total-need", ordinal: 21, section: "Баланс камер CCTV", category: "equipment", titleRu: "Общая потребность в камерах CCTV", unitId: "pcs", formulaId: "cctv_camera_total_need_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv-camera-balance:package-count", ordinal: 22, section: "Баланс камер CCTV", category: "equipment", titleRu: "Количество поставочных упаковок камер CCTV", unitId: "package", formulaId: "cctv_camera_package_count_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv-camera-balance:remainder", ordinal: 23, section: "Баланс камер CCTV", category: "equipment", titleRu: "Остаток камер CCTV после монтажа", unitId: "pcs", formulaId: "cctv_camera_remainder_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv-camera-balance:surplus-beyond-spare", ordinal: 24, section: "Баланс камер CCTV", category: "equipment", titleRu: "Свободный остаток камер сверх резерва", unitId: "pcs", formulaId: "cctv_camera_surplus_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cctv_test_report", ordinal: 25, section: "Контроль", category: "service", titleRu: "Протокол проверки и пусконаладки CCTV", unitId: "document", formulaId: "cctv_test_report_quantity_v1", titleParameterIds: ["cctv_test_report_designation"], sourceRole: "APPROVED_CCTV_COMMISSIONING_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:cctv-camera-equipment-install", ordinal: 26, section: "Труд", category: "construction_work", titleRu: "Труд по монтажу камер и оборудования CCTV", unitId: "man_hour", formulaId: "cctv_camera_equipment_install_labor_v1", sourceRole: "APPROVED_CCTV_INSTALLATION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:cctv-cabling-termination", ordinal: 27, section: "Труд", category: "construction_work", titleRu: "Труд по прокладке и окончанию кабелей CCTV", unitId: "man_hour", formulaId: "cctv_cabling_termination_labor_v1", sourceRole: "APPROVED_CCTV_INSTALLATION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:cctv-configuration-commissioning", ordinal: 28, section: "Труд", category: "construction_work", titleRu: "Труд по настройке, юстировке и пусконаладке CCTV", unitId: "man_hour", formulaId: "cctv_configuration_commissioning_labor_v1", sourceRole: "APPROVED_CCTV_COMMISSIONING_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:equipment:cctv-lifting", ordinal: 29, section: "Механизмы и инструмент", category: "equipment", titleRu: "Подъёмное средство для монтажа камер CCTV", unitId: "machine_hour", formulaId: "cctv_lifting_equipment_v1", sourceRole: "APPROVED_CCTV_INSTALLATION_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:equipment:cctv-network-tester", ordinal: 30, section: "Механизмы и инструмент", category: "equipment", titleRu: "Сетевой тестер и инженерная станция настройки CCTV", unitId: "machine_hour", formulaId: "cctv_network_tester_v1", sourceRole: "APPROVED_CCTV_COMMISSIONING_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:cctv-delivery", ordinal: 31, section: "Логистика", category: "service", titleRu: "Доставка оборудования и материалов CCTV", unitId: "trip", formulaId: "cctv_delivery_v1", sourceRole: "APPROVED_CCTV_LOGISTICS_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:cctv-packaging-removal", ordinal: 32, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и монтажных отходов CCTV", unitId: "trip", formulaId: "cctv_packaging_removal_v1", sourceRole: "APPROVED_CCTV_WASTE_PLAN", procurementEligible: true }),
]);

export const CCTV_SYSTEM_SHORT_INPUT = Object.freeze({
  cctv_system_count: 1,
  cctv_camera_count: 16,
  cctv_camera_designation: "CAM-IP-4MP-IR",
  cctv_camera_type: "IP_POE_4MP_IR",
  cctv_nvr_count: 1,
  cctv_nvr_designation: "NVR-32CH",
  cctv_archive_retention_days: 30,
  ...CCTV_SYSTEM_RUNTIME_INPUT,
});

export const CCTV_SYSTEM_ACCEPTANCE_INPUT = Object.freeze({
  ...CCTV_SYSTEM_SHORT_INPUT,
  camera_mounting_bracket_designation: "Кронштейн камеры по узлу установки", camera_mounting_bracket_quantity_piece: 16,
  camera_junction_box_designation: "Коробка монтажная IP66 по узлу", camera_junction_box_quantity_piece: 16,
  cctv_network_cable_designation: "Кабель U/UTP Cat6 LSZH по кабельному журналу", cctv_network_cable_length_m: 720,
  cctv_patch_panel_designation: "Патч-панель 24 порта Cat6", cctv_patch_panel_quantity_piece: 1,
  cctv_poe_switch_designation: "PoE-коммутатор 24 порта по спецификации", cctv_poe_switch_quantity_piece: 1,
  cctv_storage_drive_designation: "HDD surveillance 12 TB по расчёту архива", cctv_storage_drive_quantity_piece: 4,
  cctv_monitor_designation: "Монитор CCTV 27 дюймов", cctv_monitor_quantity_piece: 1,
  cctv_termination_designation: "Модуль RJ45 Cat6 по кабельному журналу", cctv_termination_quantity_piece: 32,
  cctv_label_designation: "Маркировка камер и кабелей по проекту", cctv_label_quantity_piece: 32,
  cctv_fastening_designation: "Комплект крепления кабеля и камер по узлам", cctv_fastening_quantity_set: 120,
  cctv_consumable_designation: "Стяжки, термоусадка и монтажная мелочёвка", cctv_consumable_quantity_kg: 6,
  cctv_grounding_conductor_designation: "Проводник PE 6 мм² по схеме", cctv_grounding_conductor_length_m: 18,
  cctv_test_report_designation: "Протокол проверки изображения, архива и ПНР CCTV", cctv_test_report_quantity_document: 1,
  cctv_camera_equipment_install_labor_h: 64,
  cctv_cabling_termination_labor_h: 96,
  cctv_configuration_commissioning_labor_h: 48,
  cctv_lifting_equipment_machine_h: 24,
  cctv_network_tester_machine_h: 20,
  cctv_delivery_trip_count: 2,
  cctv_packaging_removal_trip_count: 1,
  video_analytics_mode: "NOT_REQUIRED",
  external_integration_mode: "NOT_REQUIRED",
});

export async function compileCctvSystemR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CCTV_SYSTEM_CATALOG_ID;
  if (catalogId !== CCTV_SYSTEM_CATALOG_ID) {
    throw new Error(`CCTV_SYSTEM_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.cctv-system-r1",
    catalogId,
    primaryMeasureParameterId: "cctv_system_count",
    parameterDefinitions: [...CCTV_SYSTEM_PARAMETERS],
    formulaDefinitions: [...CCTV_SYSTEM_FORMULAS],
    resourceDefinitions: [...CCTV_SYSTEM_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...CCTV_SYSTEM_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
