import cctvWholeSourceR1 from '../../../../data/estimate-benchmarks/source-packs/cctv-whole-g5-protect-method-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec}from'./automaticConstructionOwnerR1';
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

export function assessCctvG5ProtectMethodR1(value:unknown){
 const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const a=record(value)?value:{},docs=record(a.records)?a.records:{};
 const missing=cctvWholeSourceR1.requiredActualRecords.filter(f=>typeof docs[f.id]!=='string'||!String(docs[f.id]).trim()).map(f=>f.id);
 const issues:string[]=[];
 if(a.bindingChannel!=='SERVER_REVIEWED_PROJECT_RECORDS')issues.push('TRUSTED_ACTUAL_RECORDS_REQUIRED');
 if(a.methodId!==cctvWholeSourceR1.candidateMethodId)issues.push('SUPPORTED_WHOLE_METHOD_NOT_SELECTED');
 const sourceBindings=record(a.sourceBindings)?a.sourceBindings:{};
 for(const path of ['g5-techspec-current.html','patch-outdoor-current.html','usw-lite8-spec.html','unvr-spec.html','g5-qig-index.js','g5-qig-C.js']){
  const expected=cctvWholeSourceR1.primarySources.find(p=>p.path==='primary-sources/'+path)?.sha256;
  if(!expected||sourceBindings[path]!==expected)issues.push('EXACT_SOURCE_VERSION_BINDING_REQUIRED:'+path);
 }
 if(a.cameraModel!=='UVC-G5-Turret-Ultra'||a.recorderModel!=='UNVR'||a.switchModel!=='USW-Lite-8-PoE')issues.push('EXACT_DEVICE_PROFILE_REQUIRED');
 if(a.mountVariant!=='C_SURFACE_ENTRY'||a.baseFixingApproved!==true||a.connectorGeometryApproved!==true)issues.push('ACTUAL_QIG_C_BASE_AND_CONNECTOR_REQUIRED');
 if(a.cableModel!=='UACC-Cable-Patch-Outdoor'||a.factoryTerminated!==true||a.grommet!=='h')issues.push('FACTORY_OUTDOOR_PATCH_AND_MATCHED_INSERT_REQUIRED');
 if(a.actualRouteEnvironmentApproved!==true||a.nonCondensing!==true||a.actualSupplyAndFailurePlanApproved!==true||a.actualPoeLinkBudgetApproved!==true)issues.push('ACTUAL_ENVIRONMENT_SUPPLY_AND_LOADED_POE_LINK_REQUIRED');
 if(a.protectPlanApproved!==true||a.networkPlanApproved!==true||a.storagePlanApproved!==true||a.actualTestProgramApproved!==true)issues.push('RECORD_NETWORK_STORAGE_TEST_PROGRAM_REQUIRED');
 const n=record(a.measurements)?a.measurements:{};
 const number=(id:string)=>typeof n[id]==='number'&&Number.isFinite(n[id])?n[id] as number:null;
 const ids=['cameraCount','actualFreePoePorts','otherPseLoadW','assignedCameraPseLoadW','voltageAtCameraMinV','voltageAtCameraMaxV','routeRequiredLengthM','factoryPatchLengthM','cableDiameterMm','minimumInstalledBendMm','adjacentWallClearanceCm','cameraAmbientMinC','cameraAmbientMaxC','switchAmbientMinC','switchAmbientMaxC','recorderAmbientMinC','recorderAmbientMaxC','driveCount'];
 for(const id of ids)if(number(id)===null)issues.push('ACTUAL_NUMERIC_FACT_REQUIRED:'+id);
 const count=number('cameraCount'),ports=number('actualFreePoePorts'),drives=number('driveCount');
 if(count!==null&&(!Number.isInteger(count)||count<1||count>4))issues.push('CAMERA_SCOPE_OUTSIDE_ONE_SWITCH_PROFILE');
 if(ports!==null&&(!Number.isInteger(ports)||ports<0||ports>4))issues.push('INVALID_ACTUAL_FREE_POE_PORTS');
 if(count!==null&&ports!==null&&count>ports)issues.push('INSUFFICIENT_ACTUAL_FREE_POE_PORTS');
 const other=number('otherPseLoadW'),assigned=number('assignedCameraPseLoadW');
 if(other!==null&&assigned!==null&&(other<0||assigned<0||other+assigned>52))issues.push('ACTUAL_TOTAL_PSE_BUDGET_EXCEEDED');
 if(count!==null&&assigned!==null&&assigned<4*count)issues.push('CAMERA_WORST_CASE_AND_LINK_LOSS_BUDGET_REQUIRED');
 const portsActual=Array.isArray(a.portAllocations)?a.portAllocations:[];
 if(count!==null&&(portsActual.length!==count||new Set(portsActual.filter(record).map(p=>p.port)).size!==count))issues.push('EXACT_UNIQUE_ACTUAL_PORT_ALLOCATION_REQUIRED');
 let reserved=0;
 for(const item of portsActual){
  if(!record(item)||typeof item.port!=='number'||!Number.isInteger(item.port)||item.port<1||item.port>4||item.negotiatedStandardPoE!==true
   ||typeof item.worstCasePseDemandW!=='number'||!Number.isFinite(item.worstCasePseDemandW)||item.worstCasePseDemandW<4
   ||typeof item.reservedPseW!=='number'||!Number.isFinite(item.reservedPseW)||item.reservedPseW<Number(item.worstCasePseDemandW)||item.reservedPseW>30)
    issues.push('PER_PORT_LOADED_POE_EVIDENCE_INVALID');
  else reserved+=item.reservedPseW;
 }
 if(assigned!==null&&Math.abs(reserved-assigned)>0.000001)issues.push('PER_PORT_AND_AGGREGATE_POWER_DISAGREE');
 const required=number('routeRequiredLengthM'),patch=number('factoryPatchLengthM');
 if(patch!==null&&![1,2,3,5,8].includes(patch))issues.push('UNSUPPORTED_EXACT_FACTORY_PATCH_LENGTH');
 if(required!==null&&(required<=0||(patch!==null&&required>patch)))issues.push('MEASURED_ROUTE_EXCEEDS_FACTORY_PATCH');
 const limits=[['voltageAtCameraMinV',37,57],['voltageAtCameraMaxV',37,57],['cableDiameterMm',5.5,6.5],['minimumInstalledBendMm',50.4,Infinity],['adjacentWallClearanceCm',60,Infinity],
  ['cameraAmbientMinC',-30,50],['cameraAmbientMaxC',-30,50],['switchAmbientMinC',-15,40],['switchAmbientMaxC',-15,40],['recorderAmbientMinC',-5,40],['recorderAmbientMaxC',-5,40]]as const;
 for(const[id,min,max]of limits){const x=number(id);if(x!==null&&(x<min||x>max))issues.push('OUTSIDE_PRIMARY_LIMIT:'+id);}
 for(const[minId,maxId]of [['voltageAtCameraMinV','voltageAtCameraMaxV'],['cameraAmbientMinC','cameraAmbientMaxC'],['switchAmbientMinC','switchAmbientMaxC'],['recorderAmbientMinC','recorderAmbientMaxC']]as const){const lo=number(minId),hi=number(maxId);if(lo!==null&&hi!==null&&lo>hi)issues.push('REVERSED_ACTUAL_INTERVAL:'+minId);}
 if(drives!==null&&(!Number.isInteger(drives)||drives<1||drives>4))issues.push('RECORDING_REQUIRES_ACTUAL_SUPPORTED_STORAGE');
 const blocked=missing.length>0||issues.length>0;
 return{status:blocked?'BLOCKED':'COMPATIBILITY_INPUTS_PRESENT',visibleBlocked:blocked,ownerRowId:'rc09:cctv_system_install_commission',missingActualRecordIds:missing,issues,
  estimateCompilationAllowed:false,sourceAdmission:false,documentAuthenticityAttested:false,physicalProvisionAccepted:false,executionOrCommissioningPass:false,fullTechnicalAcceptance:false}as const;
}

export const CCTV_G5_PROTECT_WHOLE_SOURCE_R1=cctvWholeSourceR1;
export const CCTV_WHOLE_CHANNEL_SOURCE_R2=cctvWholeSourceR1.wholeR2;

/** Existing source-family factory rebound to ROOT's actual current body.
 * It requires the explicit internal method and never replaces broad CCTV. */
export function cctvG5ProtectWholeMethodModelR1(profileId:string):AutomaticOwnerDefinition{
 const s=cctvWholeSourceR1.wholeR2;if(profileId!==s.profileId)throw Error('CCTV_EXPLICIT_INTERNAL_WHOLE_PROFILE_REQUIRED');
 const p=s.currentParentModel,nativeParameters=p.parameters as unknown as AutomaticOwnerDefinition['parameters'],active={kind:'greater_than' as const,parameterId:'cctv_camera_count',value:0},unknown=s.resources.filter(x=>x.quantityParameterId!==null);
 const baseOrgIds=s.organisationalInputs.filter(x=>x.id!=='cctv_whole_actual_print_posts_r2').map(x=>x.id),printing={kind:'and' as const,operands:[active,{kind:'equals' as const,parameterId:s.markingId,value:'PRINTED'}]};
 const nativeSpecs:AutomaticParameterSpec[]=nativeParameters.map(x=>{if(!['integer','decimal','text','enum'].includes(x.value_type))throw Error('CCTV_NATIVE_TYPE_REQUIRED:'+x.parameter_id);const c=x.constraints_json??{};return{id:x.parameter_id,title:x.title_ru,kind:'internal' as const,valueType:x.value_type as AutomaticParameterSpec['valueType'],unitId:x.unit_id,...(Array.isArray(c.values)?{values:c.values as string[]}:{})};});
 const controls=[{id:s.decisionId,title:'Применимость полного канала CCTV',values:s.decisions},{id:s.markingId,title:'Фактический метод маркировки',values:s.markingMethods},{id:s.storageId,title:'Фактический режим защиты архива',values:s.storageModes}];
 const specs:AutomaticParameterSpec[]=[...nativeSpecs,...unknown.map(x=>({id:x.quantityParameterId!,title:x.nameRu,kind:'ordinary' as const,valueType:['pcs','pair'].includes(x.unitId)?'integer' as const:'decimal' as const,unitId:x.unitId,min:0})),...s.organisationalInputs.map(x=>({id:x.id,title:x.titleRu,kind:'conditional' as const,valueType:'integer' as const,unitId:x.unitId,min:x.min,resourceBranchConsumers:x.id==='cctv_whole_actual_print_posts_r2'?['reference:cctv:method:label_printer']:[s.scopeRowId]})),...s.actualRecords.map(x=>({id:x.id,title:x.titleRu,kind:'conditional' as const,valueType:'text' as const,unitId:null,resourceBranchConsumers:[s.scopeRowId]})),...controls.map(x=>({id:x.id,title:x.title,kind:'conditional' as const,valueType:'enum' as const,unitId:null,values:x.values,resourceBranchConsumers:[s.scopeRowId]}))];
 const condition=(x:typeof s.resources[number])=>'conditionalDecision'in x?{kind:'and' as const,operands:[active,{kind:'equals' as const,parameterId:x.conditionalDecision!.parameterId,value:x.conditionalDecision!.value}]}:active;
 const a=buildAutomaticConstructionOwnerR1({contract:s.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:'EXACT_WHOLE_CCTV_METHOD_SOURCE_NOT_GENERIC_INSTALL_LABOUR_NORM',sourceMetadata:{source_title:s.titleRu,source_document_version:s.contract,definition_hash:s.projectDocumentSha256,artifact_sha256:s.projectDocumentSha256,exact_locator:'R752 actualCCTV result1 48/33/33; priorG5A/B/C,UNVR,Lite8 exactQIG; capturedHDD8TB,LinkIQRev2+baseproduct'},applicabilityRu:'Выбранный полный канал камеры, питания PoE, сети, регистратора и записи. Источники, фактический метод, состав и архив не приняты одной сборкой модели.',ordinary:specs.filter(x=>x.kind!=='conditional'),profile:[],conditional:specs.filter(x=>x.kind==='conditional'),deferMissingProjectFactsToRows:true,
  rows:[...s.effectiveOwners.map(x=>({rowId:x.rowId,formulaId:x.formulaId,title:'Фактическое устройство CCTV',section:'Оборудование',category:'equipment',unitId:x.unitId,expression:x.expression,procurement:true,costTreatment:'OWN_COST' as const,effectiveQuantityOutput:{parameterId:x.parameterId,unitId:x.unitId}})),...s.resources.map(x=>({rowId:x.rowId,formulaId:x.formulaId,title:x.nameRu,section:'Ресурсы канала видеонаблюдения',category:x.resourceKind==='LABOR'?'construction_work':x.resourceKind==='SERVICE'?'service':'material',unitId:x.unitId,expression:x.expression,inclusion:condition(x),procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,purchaseBalanceOwnerRowId:x.costOwnerRowId})),{rowId:s.scopeRowId,formulaId:s.scopeFormulaId,title:'Полный состав и применимость канала CCTV',section:'Контроль состава',category:'service',unitId:'pcs',expression:'cctv_camera_count',inclusion:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'}],
  excludedUnownedAssumptions:['No area/16camera/30day fixture as actual','No generalLAN/UPS/rack duplication','No metre-price to factorypiece conversion','No native bracket/box/panel/termination zero/exclusion without approvedwholemethod','No factoryinventory as installedconsumption','No tools per camera or machinehour','No PoE nominal/classadvertisement as loadedactualcamera power','No LinkIQqualification asTIAcertification/video/archive','No liveview/shortclip/plannedcounter as retentionPASS','No rawTB or RAIDpercent as retention/drivecount','No source-only physical/full/ordinaryadmission']});
 const nativeIds=new Set(nativeParameters.map(x=>x.parameter_id)),effectiveIds=new Set(s.effectiveOwners.map(x=>x.parameterId)),unknownIds=new Set(unknown.map(x=>x.quantityParameterId)),orgIds=new Set(s.organisationalInputs.map(x=>x.id)),pf=new Map(s.nativeParameterForwards.map(x=>[x.parameterId,x.after]));
 const parameters=[...nativeParameters.map(x=>pf.has(x.parameter_id)?pf.get(x.parameter_id)! as unknown as typeof x:x),...a.parameters.filter(x=>!nativeIds.has(x.parameter_id)).map((x,i)=>{
  const z={...x,ordinal:nativeParameters.length+i,required:false,default_value:null};
  if(effectiveIds.has(x.parameter_id))return{...z,constraints_json:{...x.constraints_json,conditionalWholeIntegerV1:{contractVersion:'canonical-conditional-whole-integer/v1',when:{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'}}},truth_metadata:{...x.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}};
  if(unknownIds.has(x.parameter_id))return{...z,truth_metadata:{...unresolvedApplicationNormTruthR1(x.truth_metadata,'Количество или полный применимый источник этой позиции не установлены. Камеры, дни архива, паспортные интервалы и часы не задают расход.'),visible_when:{kind:'literal',value:false},runtime_profile_value:false,hidden_default_forbidden:true}};
  return{...z,constraints_json:{...x.constraints_json,requiredWhen:x.parameter_id==='cctv_whole_actual_print_posts_r2'?printing:active},truth_metadata:{...x.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',source_confirmation_required:orgIds.has(x.parameter_id),runtime_profile_value:false,hidden_default_forbidden:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'},...(controls.some(y=>y.id===x.parameter_id)?{unknown_enum_values:['UNKNOWN']}:{})}};
 })];
 const refs=new Map(s.operationRoster.map(x=>[x.operationId,x])),decl=new Map(s.nativeBindings.map(x=>[x.rowId,x])),sourceRows=new Map(s.resources.map(x=>[x.rowId,x]));
 const op=(id:string)=>{const x=refs.get(id);if(!x)throw Error('CCTV_WHOLE_OPERATION_MISSING:'+id);return x;};
 const rh=(r:CanonicalEstimateResourceDefinition)=>{const{row_sha256:_old,...v}=r;return{...v,row_sha256:estimateDeterministicHash(v)};};
 const saved=p.resources as unknown as readonly CanonicalEstimateResourceDefinition[],savedFormulas=p.formulas as unknown as readonly CanonicalEstimateFormulaDefinition[];
 const native=saved.map(r=>{const d=decl.get(r.row_id);if(!d)throw Error('CCTV_ACTUAL_ROW_MISSING:'+r.row_id);const linked=d.operationIds.map(op),old=r.resource_graph.operationCompositionV1 as Record<string,unknown>|undefined,prior=Array.isArray(old?.additionalOperations)?old!.additionalOperations as readonly Record<string,unknown>[]:[],seen=new Set([old?.operationId,...prior.map(x=>x.operationId)]);
  if(old&&linked.length&&old.groupId!==s.operationRoster[0]!.groupId)throw Error('CCTV_NATIVE_OPERATION_GROUP_MISMATCH:'+r.row_id);
  const refs=old?{...old,additionalOperations:[...prior,...linked.filter(x=>!seen.has(x.operationId))]}:linked.length?{...linked[0]!,additionalOperations:linked.slice(1)}:undefined,shadow=a.resources.find(x=>x.row_id===r.row_id);
  return rh({...r,source_metadata:{...r.source_metadata,cctvWholeProfileSourceR2:{explicitProfileId:s.profileId,sourceAdmission:false,nativeUnitAndPriceRetained:true}},resource_graph:{...r.resource_graph,...(refs?{operationCompositionV1:refs}:{}),...(shadow?{effectiveQuantityOutputV1:shadow.resource_graph.effectiveQuantityOutputV1}:{}),
   ...(r.row_id==='rc09:cctv_ip_camera'?{purchaseBalanceV1:{unitId:'pcs',balanceScope:'new_order_vs_required_consumption',requirementBasis:'selected_supply_order',consumedExpression:'cctv_camera_count+cctv_camera_retained_spare_piece',plannedConsumptionExpression:'cctv_camera_count',stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'cctv_camera_supplier_pack_size_piece',manualQuantumViolationPolicy:'retain-raw-and-block-quantum'}}:{}),...(r.row_id==='rc09:cctv_storage_drive'?{nominalRawCapacitySourceR2:{expression:'8*cctv_storage_drive_quantity_piece',unitId:'TB',notUsableCapacityOrRetention:true,sourceAdmission:false}}:{}),cctvWholeSourceBoundaryR2:{physicalPriceCoverageAccepted:false,sourceAdmission:false,FULL:false}}});
 });
 const extras=a.resources.filter(x=>!s.effectiveOwners.some(y=>y.rowId===x.row_id)).map((r,i)=>{const d=sourceRows.get(r.row_id),linked=d?d.operationIds.map(op):[...s.operationRoster],first=linked[0]!;
  let next=rh({...r,ordinal:native.length+i,cost_owner_id:d?.costOwnerRowId??r.cost_owner_id,procurement_eligible:false,source_metadata:{...r.source_metadata,sourceAdmission:false},resource_graph:{...r.resource_graph,operationCompositionV1:{...first,additionalOperations:linked.slice(1)},physicalPriceCoverageAccepted:false,actualVideoAndRetentionPass:false,...(d?{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:d.costOwnerRowId,includedInResourceOwnerRowId:d.costOwnerRowId,purchaseBalanceOwnerRowId:d.costOwnerRowId,sourceWholeCctvQuantityR2:{quantityUnknown:d.quantityUnknown,authority:d.authority,inventoryNotConsumption:d.inventoryNotConsumption,...('installedConsumptionExpression'in d?{installedConsumptionExpression:d.installedConsumptionExpression,samePhysicalIdNotNewOrder:true}:{}),...('installedInSelectedC35TableA'in d?{installedInSelectedC35TableA:d.installedInSelectedC35TableA,stockStillDelivered:true}:{})},...(!d.quantityUnknown?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:d.unitId,parameterIds:compileFormulaGraph(d.expression).inputParameterIds,reasonRu:'Фактический измеритель или поставка исходного владельца; явная ручная правка сохраняет происхождение без второй оплаты.'}}:{})}:{})}});
  if(r.row_id===s.scopeRowId)next=rh({...next,resource_graph:{...next.resource_graph,inputParameterIds:[...s.actualRecords.map(x=>x.id),...baseOrgIds,...controls.map(x=>x.id)],scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',objectFactMode:'PROJECT_APPLICABILITY_ONLY',groupId:s.operationRoster[0]!.groupId,groupTitleRu:'Полный канал видеонаблюдения',titleRu:'Применимость камеры, питания, сети и записи',reasonRu:'Отдельный зелёный разъём, тест PoE, live view или короткий клип не подтверждает полный метод, обеспечение, архив и фактическую приёмку.',exactScopeWhen:{kind:'and',operands:[active,{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'}]},objectFactParameterId:s.decisionId,unknownObjectValues:['UNKNOWN'],requiredFactParameterIds:[...s.actualRecords.map(x=>x.id),...baseOrgIds,...controls.map(x=>x.id)],coveringRowIds:[],projectOperationContextsV1:[{when:{kind:'equals',parameterId:s.markingId,value:'PRINTED'},resourceRowIds:['reference:cctv:method:label_printer'],applicabilityWhen:{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'},requiredFactParameterIds:['cctv_whole_actual_print_posts_r2']}],originalRowIds:[...s.nativeBindings.filter(x=>!x.rowId.includes('cctv-camera-balance:')).map(x=>x.rowId),...s.resources.map(x=>x.rowId)],sourceEvidence:[{sha256:s.projectDocumentSha256,locator:'WholeCCTV sourceR2 over actualR752; pending unitowner/physicalcomposition/source/ordinaryadmission retained'}]}}});return next;
 });
 const ff=new Map(s.nativeFormulaForwards.map(x=>[x.formulaId,x])),formulas=[...savedFormulas.map(x=>{const z=ff.get(x.formula_id);if(!z)return x;const a=compileFormulaGraph(z.afterExpression);return{...x,expression_source:z.afterExpression,ast:a.ast,input_parameter_ids:a.inputParameterIds,ast_sha256:estimateDeterministicHash(a.ast)};}),...a.formulas.filter(x=>!s.effectiveOwners.some(z=>z.formulaId===x.formula_id))],resources=[...native,...extras];
 if(new Set(parameters.map(x=>x.parameter_id)).size!==parameters.length||new Set(formulas.map(x=>x.formula_id)).size!==formulas.length||new Set(resources.map(x=>x.row_id)).size!==resources.length)throw Error('CCTV_WHOLE_SOURCE_ID_COLLISION');
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['cctv_system_count','cctv_camera_count','cctv_camera_type','cctv_nvr_count','cctv_archive_retention_days']};
}

/** Extends the retained compatibility assessment, without adding an estimate
 * evaluator or treating project record strings as authenticity proofs. */
export function assessCctvWholeChannelInputsR2(value:unknown){
 const rec=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x),a=rec(value)?value:{},s=cctvWholeSourceR1.wholeR2,base=assessCctvG5ProtectMethodR1(value),docs=rec(a.records)?a.records:{},m=rec(a.measurements)?a.measurements:{},issues=[...base.issues];
 const missing=s.actualRecords.filter(x=>typeof docs[x.id]!=='string'||!String(docs[x.id]).trim()).map(x=>x.id);
 if(a.profileId!==s.profileId||a.allCameraFactoryPartsFromSelectedNewOrder!==true)issues.push('EXPLICIT_WHOLE_INTERNAL_NEW_ORDER_PROFILE_REQUIRED');
 if(a.scope!=='WHOLE_CAMERA_POE_NETWORK_RECORD_PLAYBACK_EXPORT'||a.switchMount!=='TABLE_A'||a.driveModel!=='UACC_HDD_E_8TB_35_SATA'||a.driveFormFactor!=='3_5')issues.push('EXACT_WHOLE_RECORDING_PROFILE_REQUIRED');
 const d=m.driveCount;if(typeof d!=='number'||!Number.isSafeInteger(d)||d<1||d>4)issues.push('ACTUAL_SUPPORTED_DRIVE_COUNT_REQUIRED');
 for(const k of ['driveOperatingMinC','driveOperatingMaxC']){const x=m[k];if(typeof x!=='number'||!Number.isFinite(x)||x<5||x>60)issues.push('ACTUAL_SELECTED_DRIVE_TEMPERATURE_REQUIRED:'+k);}
 if(typeof m.driveOperatingMinC==='number'&&typeof m.driveOperatingMaxC==='number'&&m.driveOperatingMinC>m.driveOperatingMaxC)issues.push('REVERSED_ACTUAL_DRIVE_TEMPERATURE');
 if(m.actualFreePoePorts===4&&typeof m.otherPseLoadW==='number'&&m.otherPseLoadW>0)issues.push('OTHER_PSE_LOAD_REQUIRES_REAL_OCCUPIED_PORT_ALLOCATION');
 if(a.storageMode==='SINGLE_DRIVE_NO_REDUNDANCY_APPROVED'){if(d!==1)issues.push('SINGLE_DRIVE_MODE_REQUIRES_ONE_ACTUAL_DRIVE');}
 else if(a.storageMode==='BASIC_PROTECTION_APPROVED'){if(typeof d!=='number'||d<2)issues.push('BASIC_PROTECTION_REQUIRES_ACTUAL_SUPPORTED_ARRAY');}
 else if(a.storageMode==='RAID10_APPROVED'){if(d!==4)issues.push('THIS_UNVR_RAID10_REQUIRES_FOUR_ACTUAL_DRIVES');}
 else issues.push('ACTUAL_STORAGE_PROTECTION_DECISION_REQUIRED');
 for(const k of ['actualFactoryPieceAndLegacyMetreOwnerReviewed','actualNativeBracketBoxPanelEndsOverlapReviewed','actualSingleOwnerNoLanUpsRackDuplicateReviewed','actualLinkIqKitAndApplicationReviewed','actualSeparateCameraTerminalVoltageMethodReviewed','actualRecorderDiskRevisionAndHealthReviewed','actualUsableCapacityModeAndRetentionBoundaryReviewed','actualSceneDayNightPrivacyAudioAndClockReviewed','actualPlaybackSeekExportAndRecipientOpenReviewed','actualPowerFailureRecoveryAndGapProgrammeReviewed','actualBackupHandoverCleanupReviewed'])if(a[k]!==true)issues.push('ACTUAL_WHOLE_CONDITION_REQUIRED:'+k);
 for(const k of ['actualMountPosts','actualServicePosts','actualTestPosts'])if(typeof a[k]!=='number'||!Number.isSafeInteger(a[k])||(a[k]as number)<1)issues.push('ACTUAL_EQUIPPED_POST_INVENTORY_REQUIRED:'+k);
 const bindings=rec(a.sourceBindings)?a.sourceBindings:{};
 for(const name of ['hdd-enterprise8tb-techspec.html','fluke-linkiq-r2-user-manual.pdf','fluke-linkiq100-official-product.html']){const x=s.primarySources.find(x=>x.path.replace(/\\/g,'/').endsWith('/'+name));if(!x||bindings[name]!==x.sha256)issues.push('EXACT_WHOLE_PRIMARY_BINDING_REQUIRED:'+name);}
 if(a.connectorPassUsedAsVideoArchivePass===true||a.linkIqPassUsedAsCertification===true||a.liveViewUsedAsRecordingPass===true||a.shortClipUsedAsRetentionDays===true||a.rawTbOrRaidPercentUsedAsRetention===true||a.plannedCameraCountUsedAsExecutedPass===true)issues.push('FALSE_VIDEO_ARCHIVE_RETENTION_PASS_FORBIDDEN');
 return{status:missing.length||issues.length?'BLOCKED':'DOCUMENT_INPUTS_PRESENT',missingActualRecordIds:missing,issues,sourceAdmission:false,projectApproval:false,documentAuthenticityAttested:false,estimateCompilationAllowed:false,physicalCompositionAccepted:false,executedVideoRecordingPass:false,executedRetentionProof:false,linkIqPassIsInstalledCableCertification:false,connectorTestIsWholeCctvPass:false,legacyCableUnitMigrationAdmitted:false,factorySupplyGuardPassed:false,fullBroadCctvAccepted:false,FULL:false}as const;
}

export const CCTV_WHOLE_QUANTITY_SOURCE_R3=cctvWholeSourceR1.wholeR2.quantityForwardR3;
/** Reuses the same whole model and compiler. Only the explicitly reviewed
 * inline instrument stock rule is projected; this is not a new CCTV catalog. */
export function cctvWholeOrdinaryQuantityModelR3(profileId:string):AutomaticOwnerDefinition{
 const s=cctvWholeSourceR1.wholeR2,q=s.quantityForwardR3,base=cctvG5ProtectWholeMethodModelR1(profileId),active={kind:'greater_than' as const,parameterId:'cctv_camera_count',value:0};
 const delta=buildAutomaticConstructionOwnerR1({contract:q.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:'PROJECT_WHOLE_CCTV_INLINE_STOCK_NOT_LABOUR_NORM',sourceMetadata:{source_title:q.titleRu,source_document_version:q.contract,definition_hash:q.projectMethod.sha256,artifact_sha256:q.projectMethod.sha256,exact_locator:'TC-NTP1 V1 manual PDF2–6; datasheet PDF4; exact reviewed temporary camera-end topology'},applicabilityRu:'Фактически выбранный временный inline метод проверки питания с подключённой камерой; штатная герметизация и заземление восстанавливаются и проверяются отдельно.',
  ordinary:[{id:'cctv_camera_count',title:'Фактическое число камер',kind:'internal',valueType:'integer',unitId:'pcs'}],profile:[],conditional:[{id:q.postId,title:'Фактически оснащённые посты проверки питания с подключённой камерой',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,resourceBranchConsumers:[s.scopeRowId,q.leadRowId,q.meterRowId]},
   {id:q.methodId,title:'Выбранный метод измерения питания с подключённой камерой',kind:'conditional',valueType:'enum',unitId:null,values:[q.methodValue],resourceBranchConsumers:[s.scopeRowId]},
   {id:q.recordId,title:'Проверенный временный измерительный узел и плоскость измерения питания',kind:'conditional',valueType:'text',unitId:null,resourceBranchConsumers:[s.scopeRowId]}],deferMissingProjectFactsToRows:true,
  rows:[{rowId:q.leadRowId,formulaId:q.leadFormulaId,title:'Заводской соединительный кабель временного измерительного узла',section:'Проверка питания камеры',category:'material',unitId:'pcs',expression:q.postId,inclusion:active,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalanceOwnerRowId:q.ownerRowId}],excludedUnownedAssumptions:['No instrument per camera, labour hour, life or default post','No included RJ45 leads, batteries or charger in the captured tester package','No meter display as exact camera-terminal voltage or video/archive PASS']});
 const additions=delta.parameters.filter(p=>!base.parameters.some(x=>x.parameter_id===p.parameter_id)).map(p=>({...p,ordinal:base.parameters.length,required:false,default_value:null,constraints_json:{...p.constraints_json,requiredWhen:active},truth_metadata:{...p.truth_metadata,contract:q.contract,semantic_parameter_key:s.catalogId+':'+p.parameter_id,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',source_confirmation_required:p.parameter_id===q.postId,runtime_profile_value:false,hidden_default_forbidden:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'}}}));
 const parameters=[...base.parameters,...additions].map((p,i)=>({...p,ordinal:i,truth_metadata:{...p.truth_metadata,contract:q.contract,semantic_parameter_key:s.catalogId+':'+p.parameter_id}}));
 const quantityAst=compileFormulaGraph(q.postId),formulas=[...base.formulas.map(f=>f.formula_id===q.meterFormulaId?{...f,expression_source:q.postId,ast:quantityAst.ast,input_parameter_ids:quantityAst.inputParameterIds,ast_sha256:estimateDeterministicHash(quantityAst.ast)}:f),...delta.formulas];
 const declarations=new Map(q.resourceDeclarations.map(r=>[r.rowId,r])),opMap=new Map(s.operationRoster.map(o=>[o.operationId,o]));
 const resources=[...base.resources,...delta.resources].map((r,i)=>{
  const d=declarations.get(r.row_id),scope=r.row_id===s.scopeRowId;if(!d&&!scope)throw Error('CCTV_R3_SOURCE_DECLARATION_REQUIRED:'+r.row_id);
  if(d&&(d.formulaId!==r.formula_id||d.unitId!==r.unit_id))throw Error('CCTV_R3_SOURCE_FORMULA_UNIT_MISMATCH:'+r.row_id);
  const linked=(d?.operationIds??s.operationRoster.map(o=>o.operationId)).map(id=>{const op=opMap.get(id);if(!op)throw Error('CCTV_R3_OPERATION_MISSING:'+id);return op;});
  const graph:Record<string,unknown>={...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:d?.publicNameRu??'Применимость и состав полного канала видеонаблюдения',brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:d?.resourceKind??'SERVICE',...((d?.rowKind??'PROCESS_NOTE')==='RESOURCE'?{}:{rowKind:d?.rowKind??'PROCESS_NOTE'})},
   ...(linked.length?{operationCompositionV1:{...linked[0]!,...(linked.length>1?{additionalOperations:linked.slice(1)}:{})}}:{}),cctvQuantitySourceProjectionR3:{contract:q.contract,sourceAdmission:false,physicalClosure:false,sourceClassReviewAccepted:false}};
  if(r.row_id===q.meterRowId||r.row_id===q.leadRowId){graph.costTreatment='INCLUDED_IN_RESOURCE_ROWS';graph.parentCostOwnerId=q.ownerRowId;graph.includedInResourceOwnerRowId=q.ownerRowId;graph.purchaseBalanceOwnerRowId=q.ownerRowId;
   graph.inputParameterIds=[...new Set([...(r.resource_graph.inputParameterIds as string[]??[]).filter(id=>id!==q.originalNeedId),q.postId,q.methodId,q.recordId])];
   if(r.row_id===q.meterRowId){graph.priorSourceWholeCctvQuantityR2=graph.sourceWholeCctvQuantityR2;delete graph.sourceWholeCctvQuantityR2;}
   graph.sourceWholeCctvQuantityR3={expression:q.postId,sourceNeedId:q.originalNeedId,quantityRuleKnownForExplicitMethodOnly:true,actualPostInventoryNotConsumption:true,actualInstrumentSelectionNotProved:true,measurementPlaneNotCameraTerminal:true,physicalPriceCoverageAccepted:false};
   graph.derivedQuantityEditPolicyV1={contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'pcs',parameterIds:[q.postId],reasonRu:'Один прибор и отдельный соединительный кабель на фактически определённый полностью оснащённый пост; ручная правка сохраняет происхождение и единственного владельца оплаты.'};
  }
  if(scope){const prior=r.resource_graph.scopeRequirementV1 as Record<string,unknown>;
   // The full channel is required in HANDWRITTEN and PRINTED modes alike.
   // A print-only project context cannot govern the whole carrier: otherwise
   // the common PROJECT_SCOPE evaluator correctly declares it not applicable.
   const wholeFacts=[...(prior.requiredFactParameterIds as string[]),q.postId,q.methodId,q.recordId];
   const wholeContext={when:active,resourceRowIds:q.resourceDeclarations.filter(d=>d.rowKind==='RESOURCE').map(d=>d.rowId),applicabilityWhen:{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'},requiredFactParameterIds:wholeFacts};
   graph.inputParameterIds=[...new Set([...(r.resource_graph.inputParameterIds as string[]??[]),q.postId,q.methodId,q.recordId])];graph.scopeRequirementV1={...prior,requiredFactParameterIds:wholeFacts,projectOperationContextsV1:[wholeContext,...(prior.projectOperationContextsV1 as Record<string,unknown>[]??[])],originalRowIds:[...(prior.originalRowIds as string[]),q.leadRowId],sourceEvidence:[...(prior.sourceEvidence as unknown[]),{sha256:q.projectMethod.sha256,locator:'CCTV quantity R3 exact inline kit; measurement plane, shield, environment, accuracy and restoration require actual reviewed record'}]};}
  const{row_sha256:_old,...body}=r;const next={...body,ordinal:i,...(r.row_id===q.leadRowId?{cost_owner_id:q.ownerRowId,procurement_eligible:false}:{}),resource_graph:graph};return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 if(new Set(parameters.map(p=>p.parameter_id)).size!==parameters.length||new Set(formulas.map(f=>f.formula_id)).size!==formulas.length||new Set(resources.map(r=>r.row_id)).size!==resources.length)throw Error('CCTV_R3_ID_COLLISION');
 return{...base,parameters,formulas,resources};
}

export function assessCctvWholeInlineInputsR3(value:unknown){
 const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x),a=record(value)?value:{},q=CCTV_WHOLE_QUANTITY_SOURCE_R3,base=assessCctvWholeChannelInputsR2(value),issues=[...base.issues],records=record(a.records)?a.records:{},m=record(a.inlineMeasurements)?a.inlineMeasurements:{},pins=record(a.sourceBindings)?a.sourceBindings:{};
 const missing=[...base.missingActualRecordIds];if(typeof records[q.recordId]!=='string'||!String(records[q.recordId]).trim())missing.push(q.recordId);
 if(a.inlineMethod!==q.methodValue||a.inlineMode!=='I'||a.inlineTopology!=='EXISTING_CAMERA_FIELD_CORD_TO_PSE_PORT_ONE_EXTRA_FACTORY_LEAD_TO_ACTUAL_CAMERA')issues.push('EXACT_REVIEWED_INLINE_I_METHOD_REQUIRED');
 if(typeof a.actualInlinePosts!=='number'||!Number.isSafeInteger(a.actualInlinePosts)||a.actualInlinePosts<1)issues.push('ACTUAL_EQUIPPED_INLINE_POSTS_REQUIRED');
 for(const k of ['actualPseFirstCheckReviewed','actualExtraLeadAndMeasurementPlaneReviewed','actualUncertaintyAndCameraTerminalEnvelopeReviewed','actualShieldAndEarthPathReviewed','actualDryIsolationAndSupportedMeterReviewed','actualSealRestorationAndFinalLinkRetestReviewed','actualMeterRevisionSerialConditionReviewed'])if(a[k]!==true)issues.push('ACTUAL_INLINE_CONDITION_REQUIRED:'+k);
 for(const [k,lo,hi]of[['meterTemperatureMinC',0,50],['meterTemperatureMaxC',0,50],['meterHumidityMaxPercent',0,95],['standardPoEMinV',36,60],['standardPoEMaxV',36,60],['modeCurrentMaxMa',0,990],['modePowerMaxW',0,50],['temporaryChannelLengthM',0,100]]as const){const n=m[k];if(typeof n!=='number'||!Number.isFinite(n)||n<lo||n>hi||(k==='temporaryChannelLengthM'&&n>=100))issues.push('INLINE_ACTUAL_LIMIT_OR_FACT_REQUIRED:'+k);}
 for(const [lo,hi]of[['meterTemperatureMinC','meterTemperatureMaxC'],['standardPoEMinV','standardPoEMaxV']]as const)if(typeof m[lo]==='number'&&typeof m[hi]==='number'&&(m[lo]as number)>(m[hi]as number))issues.push('REVERSED_INLINE_ACTUAL_INTERVAL:'+lo);
 if(a.inlineNonCondensing!==true||a.inlineLeadModel!=='UACC_CABLE_PATCH_OUTDOOR_1M_FACTORY'||a.inlineLeadCategoryAtLeast5!==true||a.actualCameraConnected!==true)issues.push('COMPATIBLE_DRY_TEMPORARY_LEAD_AND_REAL_PD_REQUIRED');
 for(const p of q.primaryPins)if(pins[p.path.replace(/\\/g,'/').split('/').pop()!]!==p.sha256)issues.push('EXACT_INLINE_PRIMARY_BINDING_REQUIRED:'+p.path);
 if(a.meterDisplayUsedAsExactTerminalVoltage===true||a.inlinePassUsedAsRecordingRetentionPass===true||a.inlineMeterUsedAsCableCertification===true)issues.push('INLINE_DISPLAY_OR_POWER_PASS_PROMOTION_FORBIDDEN');
 return{...base,status:issues.length||missing.length?'BLOCKED':'DOCUMENT_INPUTS_PRESENT',issues,missingActualRecordIds:missing,actualInlineInventoryOrMeasurementsAccepted:false,executedInlinePowerPass:false,executedVideoRecordingPass:false,executedRetentionProof:false,sourceAdmission:false,estimateCompilationAllowed:false,FULL:false}as const;
}

export const CCTV_WHOLE_MEASURED_SOURCE_R5=cctvWholeSourceR1.wholeR2.continuedSourceR5;

/** The existing whole CCTV owner and ordinary compiler are retained. These
 * actual measurements are not consumption rates or a second calculator. */
export function cctvWholeMeasuredModelR5(profileId:string):AutomaticOwnerDefinition{
 const s=CCTV_WHOLE_CHANNEL_SOURCE_R2,q=CCTV_WHOLE_MEASURED_SOURCE_R5;
 if(profileId!==s.profileId)throw Error('CCTV_R5_EXACT_EXISTING_WHOLE_PROFILE_REQUIRED');
 if(!q.freshParent||estimateDeterministicHash(q.freshParent.nativeParentModel)!==estimateDeterministicHash(s.currentParentModel))throw Error('CCTV_R5_FRESH_ACTUAL_WHOLE_PARENT_REQUIRED');
 const base=cctvWholeOrdinaryQuantityModelR3(profileId),active={kind:'greater_than' as const,parameterId:'cctv_camera_count',value:0};
 const factIds=[q.quantityRecordId,q.shieldRecordId,q.shieldMethodId],numericIds=new Set(q.measurements.map(m=>m.id)),retiredUniformId='cctv_whole_actual_factory_cord_length_m_r2';
 const addition=buildAutomaticConstructionOwnerR1({contract:q.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:CCTV_SYSTEM_NORM_ID,
  sourceMetadata:{source_title:q.titleRu,source_document_version:q.contract,definition_hash:q.projectMethod.sha256,artifact_sha256:q.projectMethod.sha256,exact_locator:q.locatorKey},
  applicabilityRu:'Тот же выбранный целый канал CCTV. Измеренные трассы, расход по журналу и масса отходов не подтверждают применимость, питание, запись или оплату.',
  ordinary:[{id:'cctv_camera_count',title:'Фактическое число камер',kind:'internal',valueType:'integer',unitId:'pcs',min:1}],profile:[],
  conditional:[...q.measurements.map(m=>({id:m.id,title:m.titleRu,kind:'conditional' as const,valueType:m.valueType==='integer'?'integer' as const:'decimal' as const,unitId:m.unitId,min:0})),
   {id:q.quantityRecordId,title:'Проверенный по каждой линии журнал трассы, выдачи, неиспользованного возврата и взвешивания отходов',kind:'conditional',valueType:'text',unitId:null,resourceBranchConsumers:[s.scopeRowId]},
   {id:q.shieldRecordId,title:'Фактические интерфейсы экрана, земли и защиты от ESD и перенапряжений',kind:'conditional',valueType:'text',unitId:null,resourceBranchConsumers:[s.scopeRowId]},
   {id:q.shieldMethodId,title:'Проверка непрерывности экрана включена; отдельный защитный интерфейс рассмотрен',kind:'conditional',valueType:'enum',unitId:null,values:q.shieldMethodValues,resourceBranchConsumers:[s.scopeRowId]}],
  deferMissingProjectFactsToRows:true,rows:q.quantityRules.map(r=>({rowId:r.rowId,formulaId:r.formulaId,title:r.nameRu,section:'Измеренное обеспечение выбранного CCTV',category:r.category,unitId:r.unitId,expression:r.expression,inclusion:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const})),
  excludedUnownedAssumptions:['No uniform camera cord fromN, cable diameter, bend radius or strip length','No issue return clamped to zero or manual quantity curing a negative balance','No numeric UNKNOWN promoted to applicability condition','No site facts or project approval from a string fixture','No generic optical cleaner from mounting-place cloth','No stock consumption or raw TB retention conversion','No shield as PE or default surge protector count','No nominalPoE/LinkIQ/live view as whole recording or certification','No native metre price/factory piece duplicate or extra LAN/UPS/rack billing']});
 const baseIds=new Set(base.parameters.map(p=>p.parameter_id));
 const parameters:AutomaticOwnerDefinition['parameters']=[...base.parameters.map(p=>{
  if(p.parameter_id==='cctv_camera_count')return{...p,constraints_json:{...p.constraints_json,max:q.profileBoundary.cameraCountMaximum},truth_metadata:{...p.truth_metadata,provenance:{cctvR5PriorTruthMetadata:p.truth_metadata,scope:'Existing explicit single-PSE whole profile only',sourceBoundary:'Four real PoE ports are only an upper bound; actual free ports, loaded demand, shield and recording conditions remain mandatory'}}};
  if(p.parameter_id!==retiredUniformId)return p;
  const{requiredWhen:_oldRequired,...constraints}=p.constraints_json??{};
  const oldProvenance=p.truth_metadata.provenance,provenance=oldProvenance&&typeof oldProvenance==='object'&&!Array.isArray(oldProvenance)?oldProvenance:{};
  return{...p,required:false,default_value:null,constraints_json:constraints,truth_metadata:{...p.truth_metadata,provenance:{...provenance,cctvR5HistoricalUniformInputOnly:true}}};
 }),...addition.parameters.filter(p=>!baseIds.has(p.parameter_id)).map((p,i)=>({...p,ordinal:base.parameters.length+i,required:false,default_value:null,
  constraints_json:{...p.constraints_json,...(numericIds.has(p.parameter_id)?{}:{requiredWhen:active})},
  truth_metadata:{...p.truth_metadata,contract:q.contract,semantic_parameter_key:s.catalogId+':'+p.parameter_id,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',runtime_profile_value:false,hidden_default_forbidden:true,source_confirmation_required:true,...(p.parameter_id===q.shieldMethodId?{unknown_enum_values:['UNKNOWN']}:{}),provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'}}}))];
 const rules=new Map(q.quantityRules.map(r=>[r.rowId,r])),formulaIds=new Set(q.quantityRules.map(r=>r.formulaId)),declarations=new Map(q.resourceDeclarations.map(d=>[d.rowId,d])),programme=new Map(q.operationProgramme.map(o=>[o.operationId,o]));
 const formulas=[...base.formulas.filter(f=>!formulaIds.has(f.formula_id)),...addition.formulas];
 const resources=base.resources.map(r=>{
  const d=declarations.get(r.row_id);if(!d||d.formulaId!==r.formula_id||d.unitId!==r.unit_id)throw Error('CCTV_R5_SOURCE_ID_FORMULA_UNIT_REQUIRED:'+r.row_id);
  const rule=rules.get(r.row_id),graph:Record<string,unknown>={...r.resource_graph};
  const refs=d.operationIds.map(id=>{const op=programme.get(id);if(!op)throw Error('CCTV_R5_WHOLE_SOURCE_OPERATION_REQUIRED:'+id);const{wholeCompatibleKitAndBoundaryRu:_kit,resourceRowIds:_rows,actualResult:_actual,sourceAndObjectApproval:_approval,executionPass:_pass,...ref}=op;return ref;});
  if(refs.length){graph.operationCompositionV1={...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})};graph.cctvWholeProgrammeR5={contract:q.contract,sourceMethodSha256:q.projectMethod.sha256,operationIds:d.operationIds,actualResultAccepted:false,executedRecordingPass:false,executedRetentionPass:false,deviceTestIsWholeAcceptance:false};}
  if(rule){const priorFormula=base.formulas.find(f=>f.formula_id===r.formula_id);if(!priorFormula)throw Error('CCTV_R5_PRIOR_FORMULA_REQUIRED:'+r.row_id);
   graph.inputParameterIds=[...new Set([...(Array.isArray(graph.inputParameterIds)?graph.inputParameterIds.filter((x):x is string=>typeof x==='string'):[]).filter(id=>id!==rule.originalQuantityParameterId),...compileFormulaGraph(rule.expression).inputParameterIds])];
   graph.sourceMeasuredQuantityR5={contract:q.contract,projectMethodSha256:q.projectMethod.sha256,originalQuantityParameterId:rule.originalQuantityParameterId,oldNeedId:rule.oldNeedId,priorFormula,priorSourceMetadata:r.source_metadata,priorSourceMetadataSha256:estimateDeterministicHash(r.source_metadata),quantityExpression:rule.expression,quantityKind:rule.kind,actualLedgerAccepted:false,formulaIsApplicationNorm:false,priceCoverageAccepted:false};
   graph.formulaOutputBoundsV1={schemaVersion:'canonical_formula_output_bounds_v1',unitId:r.unit_id,minimum:0,reasonRu:r.unit_id==='pcs'?'Неиспользованный возврат того же материала не может превышать его фактическую выдачу по этому журналу.':r.unit_id==='kg'?'Тара той же партии не может превышать измеренную массу брутто.':'Укажите раздельные измеренные участки трассы, смонтированные петли и вводы без повторного учёта.'};
   graph.derivedQuantityEditPolicyV1={contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:compileFormulaGraph(rule.expression).inputParameterIds,reasonRu:'Количество следует фактическому журналу. Явная ручная правка сохраняет происхождение, владельца оплаты и запрет второго заказа.'};
   const presentation=graph.publicResourcePresentationV1;
   if(presentation&&typeof presentation==='object'&&!Array.isArray(presentation))graph.publicResourcePresentationV1={...presentation,nameRu:rule.nameRu};
  }
  if(r.row_id===s.scopeRowId){
   const scope=graph.scopeRequirementV1;if(!scope||typeof scope!=='object'||Array.isArray(scope))throw Error('CCTV_R5_EXISTING_WHOLE_SCOPE_REQUIRED');
   const prior=scope as Record<string,unknown>;
   const knownStrings=(x:unknown):string[]=>Array.isArray(x)?x.filter((v):v is string=>typeof v==='string'):[];
   const priorFacts=knownStrings(prior.requiredFactParameterIds).filter(id=>id!==retiredUniformId),required=[...new Set([...priorFacts,...factIds])];
   const priorContexts=Array.isArray(prior.projectOperationContextsV1)?prior.projectOperationContextsV1:[];
   const contexts=priorContexts.map(c=>{if(!c||typeof c!=='object'||Array.isArray(c))throw Error('CCTV_R5_EXISTING_CONTEXT_OBJECT_REQUIRED');const item=c as Record<string,unknown>;
    const oldRequired=knownStrings(item.requiredFactParameterIds).filter(id=>id!==retiredUniformId);
    const isWhole=knownStrings(item.resourceRowIds).includes('rc09:cctv_ip_camera');
    const oldUnknown=item.unknownFactValues,unknownValues=oldUnknown&&typeof oldUnknown==='object'&&!Array.isArray(oldUnknown)?oldUnknown:{};
    return{...item,applicabilityWhen:{kind:'and',operands:[item.applicabilityWhen,{kind:'equals',parameterId:q.shieldMethodId,value:q.supportedShieldMethod}]},requiredFactParameterIds:[...new Set([...oldRequired,s.decisionId,q.shieldMethodId,...(isWhole?factIds:[])])],unknownFactValues:{...unknownValues,[s.decisionId]:['UNKNOWN'],[q.shieldMethodId]:['UNKNOWN']}};});
   graph.inputParameterIds=[...new Set([...knownStrings(graph.inputParameterIds).filter(id=>id!==retiredUniformId),...factIds])];
   graph.cctvPriorUniformCordFactIdR5=retiredUniformId;
   graph.scopeRequirementV1={...prior,exactScopeWhen:{kind:'and',operands:[prior.exactScopeWhen,{kind:'equals',parameterId:q.shieldMethodId,value:q.supportedShieldMethod}]},requiredFactParameterIds:required,projectOperationContextsV1:contexts,sourceEvidence:[...(Array.isArray(prior.sourceEvidence)?prior.sourceEvidence:[]),{source_document_version:q.contract,definition_hash:q.projectMethod.sha256,sha256:q.projectMethod.sha256,locator:q.locatorKey+'; actual ledger and shield interfaces/Shield Test ON remain mandatory. LinkIQ physicalpages21/44 defaultOFF is not verified; page59 no testing while charging.'}]};
  }
  const{row_sha256:_old,...body}=r;const next={...body,resource_graph:graph};return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 if(new Set(parameters.map(p=>p.parameter_id)).size!==parameters.length||new Set(formulas.map(f=>f.formula_id)).size!==formulas.length||new Set(resources.map(r=>r.row_id)).size!==resources.length)throw Error('CCTV_R5_SOURCE_ID_COLLISION');
 return{...base,parameters,formulas,resources};
}

/** Shape/compatibility boundary only; no record is authenticated here and no
 * numerical result is used as executed commissioning or a safety design. */
export function assessCctvWholeMeasuredInputsR5(value:unknown){
 const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x),a=record(value)?value:{},q=CCTV_WHOLE_MEASURED_SOURCE_R5,base=assessCctvWholeInlineInputsR3(value),issues=[...base.issues],records=record(a.records)?a.records:{};
 const missing=[...base.missingActualRecordIds];for(const id of [q.quantityRecordId,q.shieldRecordId])if(typeof records[id]!=='string'||!String(records[id]).trim())missing.push(id);
 if(a.shieldTestMethod!==q.supportedShieldMethod||a.shieldTestEnabled!==true||a.shieldWireMapUsedAsProtectiveEarthPass===true||a.linkIqTestWhileCharging===true)issues.push('CCTV_R5_EXPLICIT_SHIELD_TEST_AND_SEPARATE_PE_REVIEW_REQUIRED');
 for(const key of ['actualDisjointFactoryCordRouteLoopEntryLedgerReviewed','actualExactMediaIssueUnusedReturnAndSpoilageReviewed','actualSameWasteLotGrossTareAndScaleReviewed','actualSeparateNativeCablePiecePriceOwnerReviewed','actualShieldEarthAndSurgeInterfaceReviewed','actualNoUnknownLightningDesignFromIpRating'])if(a[key]!==true)issues.push('ACTUAL_CCTV_R5_CONDITION_REQUIRED:'+key);
 if(a.factoryCordCutToRoute===true||a.nativeMetresPromotedToSecondFactoryPieceOrder===true||a.cleaningClothUsedAsOpticApproval===true||a.defaultSurgeProtectorCountFromCameraCount===true)issues.push('CCTV_R5_PHYSICAL_SCOPE_OR_OWNER_PROMOTION_FORBIDDEN');
 if(a.issueLedgerUsedAsInstalledLabelMap===true||a.issuedBagCapacityUsedAsWasteMass===true||a.numericMeasurementsUsedAsProjectApproval===true)issues.push('CCTV_R5_BALANCE_IS_NOT_APPLICABILITY_OR_QA_PROOF');
 return{...base,status:missing.length||issues.length?'BLOCKED':'DOCUMENT_INPUTS_PRESENT',missingActualRecordIds:[...new Set(missing)],issues,sourceAdmission:false,actualLedgerAccepted:false,executedInlinePowerPass:false,executedVideoRecordingPass:false,executedRetentionProof:false,ordinaryEstimateAdmission:false,FULL:false}as const;
}
