import formworkNormPack from "../../../../data/estimate-norms/professional/formwork.json";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
} from "./domainFactory/formworkRicsNrm2PhysicalNormV1";

export const FORMWORK_DOKAFLEX_SYSTEM_PROFILE_ID =
  "standard-profile:doka-dokaflex:floor-slab-project-kit:999776002-2024-08" as const;
export const FORMWORK_DOKAFLEX_SOURCE_ID =
  "src_manufacturer_doka_dokaflex_999776002_2024_08" as const;
export const FORMWORK_DOKAFLEX_SOURCE_PDF_SHA256 =
  "3666f2774bfa9558fc2c27dabad9b2055b0a894f9d4135fe4b4ac0cd710dfee9" as const;

/*
 * Component identities are deliberately not catalog work identities. The legacy
 * concrete_slab_form_* catalog records describe complete concrete-slab works in
 * m3, not a standalone formwork operation. A complete-work descriptor may
 * compose this component only after the user/project explicitly selects an
 * elevated suspended slab and the Dokaflex system.
 */
export const FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-component:formwork:dokaflex-floor-slab:standard",
    titleRu: "Съёмная горизонтальная опалубка монолитной бетонной плиты Doka Dokaflex в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-component:formwork:dokaflex-floor-slab:high-load",
    titleRu: "Съёмная горизонтальная опалубка монолитной бетонной плиты Doka Dokaflex для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "large_area",
    catalogId: "canonical-component:formwork:dokaflex-floor-slab:large-area",
    titleRu: "Съёмная горизонтальная опалубка монолитной бетонной плиты Doka Dokaflex на большой площади",
    contextRu: "большая площадь",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-component:formwork:dokaflex-floor-slab:repair",
    titleRu: "Съёмная горизонтальная опалубка монолитной бетонной плиты Doka Dokaflex на участке ремонта",
    contextRu: "участок ремонта",
  },
  {
    contextKey: "small_area",
    catalogId: "canonical-component:formwork:dokaflex-floor-slab:small-area",
    titleRu: "Съёмная горизонтальная опалубка монолитной бетонной плиты Doka Dokaflex на малой площади",
    contextRu: "малая площадь",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-component:formwork:dokaflex-floor-slab:technical-room",
    titleRu: "Съёмная горизонтальная опалубка монолитной бетонной плиты Doka Dokaflex в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-component:formwork:dokaflex-floor-slab:wet-zone",
    titleRu: "Съёмная горизонтальная опалубка монолитной бетонной плиты Doka Dokaflex во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkDokaflexConcreteSlabContextKey =
  (typeof FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS)[number]["contextKey"];
export type FormworkDokaflexInputValue = string | number | boolean;

type TechnologySource = {
  source_id: string;
  title: string;
  url: string;
  supporting_url: string;
  document_version: string;
  exact_locator: string;
  review_status: string;
  reviewed_at: string;
  license_status: string;
  verified_facts: string[];
  limitations: string[];
};

const technologySource = (formworkNormPack.technology_sources as TechnologySource[]).find(
  (source) => source.source_id === FORMWORK_DOKAFLEX_SOURCE_ID,
);
if (
  !technologySource
  || technologySource.review_status !== "reviewed"
  || technologySource.document_version !== "999776002-2024-08"
  || !technologySource.verified_facts.includes(
    "component_spacing_and_quantities_depend_on_slab_thickness_layout_sheeting_and_floor_slab_load",
  )
  || !technologySource.limitations.includes(
    "an_approved_project_layout_structural_check_edge_protection_plan_and_project_or_supplier_schedule_are_required_for_every_commercial_quantity",
  )
) {
  throw new Error(`FORMWORK_DOKAFLEX_SOURCE_CONTRACT_INVALID:${FORMWORK_DOKAFLEX_SOURCE_ID}`);
}

export const FORMWORK_DOKAFLEX_SOURCE_METADATA = Object.freeze({
  source_id: FORMWORK_DOKAFLEX_SOURCE_ID,
  source_document_version: technologySource.document_version,
  source_title: technologySource.title,
  source_url: technologySource.url,
  supporting_url: technologySource.supporting_url,
  exact_locator: technologySource.exact_locator,
  pdf_sha256: FORMWORK_DOKAFLEX_SOURCE_PDF_SHA256,
  definition_hash: estimateDeterministicHash({
    source_pack_version: formworkNormPack.technology_source_pack_version,
    source: technologySource,
  }),
});

export type FormworkDokaflexParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Record<string, unknown>;
};

export type FormworkDokaflexFormula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

const PARAMETER_TITLES_RU: Readonly<Record<string, string>> = Object.freeze({
  product_profile_id: "Профиль правила измерения площади опалубки",
  measured_formwork_contact_area_m2: "Измеренная площадь контакта опалубки с бетоном, м²",
  project_formwork_layout_contact_area_m2: "Площадь плиты в утверждённой раскладке опалубки, м²",
  project_drawing_reference: "Чертёж, по которому измерена площадь контакта",
  element_type: "Тип бетонируемого элемента",
  slab_support_condition: "Конструктивный тип плиты для опалубки",
  element_dimensions_and_face_count: "Размеры элемента и число измеряемых поверхностей",
  plain_or_special_finish: "Класс поверхности бетона",
  vertical_battered_horizontal_or_curved_class: "Класс геометрии поверхности",
  single_or_double_sided_scope: "Односторонняя или двухсторонняя схема",
  openings_voids_and_deduction_rule: "Проектное правило учёта проёмов и пустот",
  permanent_or_removable_formwork: "Постоянная или съёмная опалубка",
  project_measurement_rule_reference: "Подтверждённое проектное правило измерения",
  estimator_approval_reference: "Согласование измеренной площади сметчиком",
  formwork_system_profile_id: "Выбранная система опалубки перекрытия",
  manufacturer_document_reference: "Документ изготовителя выбранной системы",
  project_formwork_layout_reference: "Утверждённая раскладка опалубки и комплектующих",
  system_engineer_approval_reference: "Согласование раскладки инженером",
  structural_spacing_check_reference: "Расчёт шага балок и стоек по толщине и нагрузке плиты",
  slab_thickness_cm: "Толщина монолитной плиты, см",
  propping_height_m: "Высота подпирания, м",
  formwork_sheet_specification: "Точный тип и размер опалубочного листа",
  formwork_sheet_count: "Опалубочные листы по проектной ведомости, шт.",
  primary_beam_specification: "Точный тип и длина главной балки",
  primary_beam_count: "Главные балки по проектной ведомости, шт.",
  secondary_beam_specification: "Точный тип и длина второстепенной балки",
  secondary_beam_count: "Второстепенные балки по проектной ведомости, шт.",
  floor_prop_specification: "Точный тип и рабочая длина стойки",
  floor_prop_count: "Стойки перекрытия по проектной ведомости, шт.",
  lowering_head_count: "Опускные головки H20 по проектной ведомости, шт.",
  supporting_head_count: "Поддерживающие головки H20 DF по проектной ведомости, шт.",
  removable_tripod_count: "Съёмные треноги по проектной ведомости, шт.",
  bracing_system_specification: "Система раскрепления и передачи горизонтальных усилий",
  bracing_set_count: "Комплекты раскрепления по проектной ведомости, шт.",
  secondary_beam_stabilizer_count: "Стабилизаторы второстепенных балок, шт.",
  floor_end_shutter_system_specification: "Система торцевой опалубки плиты",
  floor_end_shutter_count: "Элементы торцевой опалубки по ведомости, шт.",
  access_platform_specification: "Средство безопасного доступа при монтаже листов",
  access_platform_count: "Передвижные подмости или лестничные платформы, шт.",
  edge_protection_specification: "Система защиты открытых кромок",
  edge_protection_set_count: "Комплекты защиты открытых кромок, шт.",
  reshoring_plan_reference: "Утверждённый план распалубки и переподпирания",
  reshoring_prop_count: "Стойки переподпирания по плану, шт.",
  fixing_consumables_specification: "Точный тип монтажного крепежа и расходников",
  fixing_consumables_kg: "Монтажный крепёж и расходники по ведомости, кг",
  form_release_agent_specification: "Точный разделительный состав для листов",
  form_release_agent_l: "Разделительный состав по ведомости, л",
  formwork_handling_worker_h: "Приёмка, сортировка и перемещение комплекта, чел·ч",
  assembly_alignment_worker_h: "Установка стоек, головок, балок и раскреплений, чел·ч",
  sheet_laying_worker_h: "Укладка и крепление опалубочных листов, чел·ч",
  stripping_cleaning_worker_h: "Распалубка, очистка и подготовка к возврату, чел·ч",
  reshoring_worker_h: "Переподпирание по утверждённому плану, чел·ч",
  layout_review_document_count: "Проверка раскладки и ведомости инженером, документ",
  lifting_equipment_hours: "Механизированная подача комплекта на рабочий горизонт, маш·ч",
  shipping_mass_t: "Масса отправляемого комплекта, т",
  outbound_distance_km: "Расстояние доставки на объект, км",
  return_distance_km: "Расстояние возврата арендного комплекта, км",
  rental_duration_days: "Срок аренды возвратного комплекта, сутки",
  project_stage_count: "Число захваток и перестановок",
  reusable_equipment_supply_mode: "Способ обеспечения возвратного комплекта",
  consumables_supply_mode: "Способ обеспечения расходных материалов",
  labor_supply_mode: "Способ привлечения рабочих",
  lifting_supply_mode: "Способ обеспечения механизированной подачи",
  transport_supply_mode: "Способ учёта доставки и возврата",
  edge_protection_applicability: "Применимость защиты открытых кромок",
  reshoring_applicability: "Применимость переподпирания",
  separate_drop_beam_applicability: "Наличие отдельной опалубки капителей и балок",
  deposit_applicability: "Наличие отдельного арендного депозита",
  separate_maintenance_service_applicability: "Наличие отдельной сервисной платы",
});

const PARAMETER_UNITS: Readonly<Record<string, string>> = Object.freeze({
  measured_formwork_contact_area_m2: "m2",
  project_formwork_layout_contact_area_m2: "m2",
  slab_thickness_cm: "cm",
  propping_height_m: "m",
  formwork_sheet_count: "piece",
  primary_beam_count: "piece",
  secondary_beam_count: "piece",
  floor_prop_count: "piece",
  lowering_head_count: "piece",
  supporting_head_count: "piece",
  removable_tripod_count: "piece",
  bracing_set_count: "piece",
  secondary_beam_stabilizer_count: "piece",
  floor_end_shutter_count: "piece",
  access_platform_count: "piece",
  edge_protection_set_count: "piece",
  reshoring_prop_count: "piece",
  fixing_consumables_kg: "kg",
  form_release_agent_l: "l",
  formwork_handling_worker_h: "man_hour",
  assembly_alignment_worker_h: "man_hour",
  sheet_laying_worker_h: "man_hour",
  stripping_cleaning_worker_h: "man_hour",
  reshoring_worker_h: "man_hour",
  layout_review_document_count: "document",
  lifting_equipment_hours: "machine_hour",
  shipping_mass_t: "t",
  outbound_distance_km: "km",
  return_distance_km: "km",
  rental_duration_days: "day",
  project_stage_count: "stage",
});

const ENUM_VALUES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  product_profile_id: [RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID],
  slab_support_condition: ["SUSPENDED_ELEVATED_FLOOR_SLAB"],
  formwork_system_profile_id: [FORMWORK_DOKAFLEX_SYSTEM_PROFILE_ID],
  manufacturer_document_reference: [FORMWORK_DOKAFLEX_SOURCE_ID],
  reusable_equipment_supply_mode: ["RENTAL_RETURNABLE"],
  consumables_supply_mode: ["PURCHASE_FOR_PROJECT"],
  labor_supply_mode: ["CONTRACTOR_SEPARATE"],
  lifting_supply_mode: ["RENTAL_SEPARATE"],
  transport_supply_mode: ["SEPARATE_OUTBOUND_AND_RETURN"],
  edge_protection_applicability: ["REQUIRED_EXPOSED_EDGES"],
  reshoring_applicability: ["REQUIRED_PROJECT_SEQUENCE"],
  separate_drop_beam_applicability: ["NOT_APPLICABLE_NO_DROP_BEAMS"],
  deposit_applicability: ["NOT_APPLICABLE_NO_DEPOSIT_IN_SUPPLIER_QUOTE"],
  separate_maintenance_service_applicability: ["NOT_APPLICABLE_INCLUDED_IN_RETURN_CONDITION"],
});

const INTEGER_PARAMETER_IDS = new Set([
  "formwork_sheet_count", "primary_beam_count", "secondary_beam_count", "floor_prop_count",
  "lowering_head_count", "supporting_head_count", "removable_tripod_count", "bracing_set_count",
  "secondary_beam_stabilizer_count", "floor_end_shutter_count", "access_platform_count",
  "edge_protection_set_count", "reshoring_prop_count", "layout_review_document_count",
  "rental_duration_days", "project_stage_count",
]);

const DECIMAL_PARAMETER_IDS = new Set([
  "measured_formwork_contact_area_m2", "project_formwork_layout_contact_area_m2",
  "slab_thickness_cm", "propping_height_m",
  "fixing_consumables_kg", "form_release_agent_l", "formwork_handling_worker_h",
  "assembly_alignment_worker_h", "sheet_laying_worker_h", "stripping_cleaning_worker_h",
  "reshoring_worker_h", "lifting_equipment_hours", "shipping_mass_t", "outbound_distance_km",
  "return_distance_km",
]);

const EXTRA_PARAMETER_IDS = Object.freeze([
  "slab_support_condition", "project_formwork_layout_contact_area_m2",
  "formwork_system_profile_id", "manufacturer_document_reference",
  "project_formwork_layout_reference",
  "system_engineer_approval_reference", "structural_spacing_check_reference", "slab_thickness_cm",
  "propping_height_m", "formwork_sheet_specification", "formwork_sheet_count",
  "primary_beam_specification", "primary_beam_count", "secondary_beam_specification",
  "secondary_beam_count", "floor_prop_specification", "floor_prop_count", "lowering_head_count",
  "supporting_head_count", "removable_tripod_count", "bracing_system_specification",
  "bracing_set_count", "secondary_beam_stabilizer_count", "floor_end_shutter_system_specification",
  "floor_end_shutter_count", "access_platform_specification", "access_platform_count",
  "edge_protection_specification", "edge_protection_set_count", "reshoring_plan_reference",
  "reshoring_prop_count", "fixing_consumables_specification", "fixing_consumables_kg",
  "form_release_agent_specification", "form_release_agent_l", "formwork_handling_worker_h",
  "assembly_alignment_worker_h", "sheet_laying_worker_h", "stripping_cleaning_worker_h",
  "reshoring_worker_h", "layout_review_document_count", "lifting_equipment_hours", "shipping_mass_t",
  "outbound_distance_km", "return_distance_km", "rental_duration_days", "project_stage_count",
  "reusable_equipment_supply_mode", "consumables_supply_mode", "labor_supply_mode",
  "lifting_supply_mode", "transport_supply_mode", "edge_protection_applicability",
  "reshoring_applicability", "separate_drop_beam_applicability", "deposit_applicability",
  "separate_maintenance_service_applicability",
] as const);

const ALL_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  ...RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
  ...EXTRA_PARAMETER_IDS,
].filter((value, index, values) => values.indexOf(value) === index));

function parameterValueType(parameterId: string): string {
  if (ENUM_VALUES[parameterId]) return "enum";
  if (INTEGER_PARAMETER_IDS.has(parameterId)) return "integer";
  if (DECIMAL_PARAMETER_IDS.has(parameterId)) return "decimal";
  return "text";
}

function parameterConstraints(parameterId: string): Record<string, unknown> {
  if (ENUM_VALUES[parameterId]) return { values: [...ENUM_VALUES[parameterId]!] };
  if (parameterId === "measured_formwork_contact_area_m2") {
    return { min: 0.000001, equalToParameter: "project_formwork_layout_contact_area_m2" };
  }
  if (parameterId === "slab_thickness_cm") return { min: 5, max: 100 };
  if (parameterId === "propping_height_m") return { min: 0.5, max: 5.5 };
  if (INTEGER_PARAMETER_IDS.has(parameterId) || DECIMAL_PARAMETER_IDS.has(parameterId)) {
    return { min: 0.000001 };
  }
  return { maxLength: 1_000 };
}

const MANUFACTURER_PARAMETER_IDS = new Set([
  "slab_support_condition", "formwork_system_profile_id", "manufacturer_document_reference", "slab_thickness_cm",
  "propping_height_m", "structural_spacing_check_reference",
]);

export const FORMWORK_DOKAFLEX_PARAMETERS: readonly FormworkDokaflexParameter[] = Object.freeze(
  ALL_PARAMETER_IDS.map((parameterId, ordinal) => {
    const manufacturerBound = MANUFACTURER_PARAMETER_IDS.has(parameterId);
    return Object.freeze({
      parameter_id: parameterId,
      ordinal,
      value_type: parameterValueType(parameterId),
      unit_id: PARAMETER_UNITS[parameterId] ?? null,
      title_ru: PARAMETER_TITLES_RU[parameterId] ?? parameterId,
      required: true,
      default_value: null,
      constraints_json: parameterConstraints(parameterId),
      truth_metadata: {
        semantic_parameter_key: `${FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS[0].catalogId}:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: "PROJECT_SPECIFIC_INPUT",
        input_origin_class: manufacturerBound
          ? "MANUFACTURER_APPLICABILITY_AND_PROJECT_SELECTION"
          : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
        preliminary_compilation_allowed: false,
        source_confirmation_required: true,
        guide: {
          guide_kind: manufacturerBound ? "MANDATORY_NORM_VALUE" : "PROJECT_DEFINED",
          guide_short_ru: `Укажите подтверждённое значение: ${PARAMETER_TITLES_RU[parameterId] ?? parameterId}.`,
          source_role: manufacturerBound
            ? "OFFICIAL_MANUFACTURER_DOCUMENT"
            : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
          source_document: manufacturerBound ? FORMWORK_DOKAFLEX_SOURCE_ID : null,
          source_locator: manufacturerBound ? FORMWORK_DOKAFLEX_SOURCE_METADATA.exact_locator : null,
          guide_version: "formwork-dokaflex-concrete-slab-r1",
          source_snapshot_hash: manufacturerBound
            ? FORMWORK_DOKAFLEX_SOURCE_PDF_SHA256
            : "71b874d5620e49e895543137db7792c2408eb770b6aee9e61c15bcf10ec48d83",
          applicability: manufacturerBound
            ? "Только горизонтальная опалубка монолитной плиты Doka Dokaflex в пределах расчётной раскладки проекта."
            : "Количество принимается из отдельной утверждённой проектной ведомости или предложения поставщика.",
          verified_at: "2026-09-18T00:00:00+06:00",
          guide_validation_policy: "REJECT_MISSING_PROJECT_SCHEDULE_OR_OUTSIDE_SYSTEM_APPLICABILITY",
        },
        synthetic: false,
      },
    });
  }),
);

function formula(formulaId: string, outputUnitId: string, expressionSource: string): FormworkDokaflexFormula {
  const compiled = compileFormulaGraph(expressionSource);
  return Object.freeze({
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: compiled.source,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

const FORMULA_SPECS = Object.freeze([
  ["dokaflex_measured_contact_area_v1", "m2", "measured_formwork_contact_area_m2"],
  ["dokaflex_sheet_rental_v1", "piece_day", "formwork_sheet_count * rental_duration_days"],
  ["dokaflex_primary_beam_rental_v1", "piece_day", "primary_beam_count * rental_duration_days"],
  ["dokaflex_secondary_beam_rental_v1", "piece_day", "secondary_beam_count * rental_duration_days"],
  ["dokaflex_floor_prop_rental_v1", "piece_day", "floor_prop_count * rental_duration_days"],
  ["dokaflex_lowering_head_rental_v1", "piece_day", "lowering_head_count * rental_duration_days"],
  ["dokaflex_supporting_head_rental_v1", "piece_day", "supporting_head_count * rental_duration_days"],
  ["dokaflex_tripod_rental_v1", "piece_day", "removable_tripod_count * rental_duration_days"],
  ["dokaflex_bracing_rental_v1", "piece_day", "bracing_set_count * rental_duration_days"],
  ["dokaflex_stabilizer_rental_v1", "piece_day", "secondary_beam_stabilizer_count * rental_duration_days"],
  ["dokaflex_end_shutter_rental_v1", "piece_day", "floor_end_shutter_count * rental_duration_days"],
  ["dokaflex_access_rental_v1", "piece_day", "access_platform_count * rental_duration_days"],
  ["dokaflex_edge_protection_rental_v1", "piece_day", "edge_protection_set_count * rental_duration_days"],
  ["dokaflex_reshoring_prop_rental_v1", "piece_day", "reshoring_prop_count * rental_duration_days"],
  ["dokaflex_fixings_v1", "kg", "fixing_consumables_kg"],
  ["dokaflex_release_agent_v1", "l", "form_release_agent_l"],
  ["dokaflex_handling_labor_v1", "man_hour", "formwork_handling_worker_h"],
  ["dokaflex_assembly_labor_v1", "man_hour", "assembly_alignment_worker_h"],
  ["dokaflex_sheet_laying_labor_v1", "man_hour", "sheet_laying_worker_h"],
  ["dokaflex_stripping_labor_v1", "man_hour", "stripping_cleaning_worker_h"],
  ["dokaflex_reshoring_labor_v1", "man_hour", "reshoring_worker_h"],
  ["dokaflex_layout_review_v1", "document", "layout_review_document_count"],
  ["dokaflex_lifting_v1", "machine_hour", "lifting_equipment_hours"],
  ["dokaflex_outbound_transport_v1", "t_km", "shipping_mass_t * outbound_distance_km"],
  ["dokaflex_return_transport_v1", "t_km", "shipping_mass_t * return_distance_km"],
  ["dokaflex_stage_count_v1", "stage", "project_stage_count"],
  ["dokaflex_not_applicable_v1", "item", "project_stage_count * 0"],
] as const);

export const FORMWORK_DOKAFLEX_FORMULAS: readonly FormworkDokaflexFormula[] = Object.freeze(
  FORMULA_SPECS.map(([id, unit, expression]) => formula(id, unit, expression)),
);

const RICS_TRACE = Object.freeze([{
  document_code: RICS_NRM2_FORMWORK_SOURCE_ID,
  source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
  sourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
  norm_id: RICS_NRM2_FORMWORK_NORM_ID,
  normId: RICS_NRM2_FORMWORK_NORM_ID,
  source_title: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_title,
  source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
  normVersion: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
  source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
  exact_locator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
  source_url: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
  applicability: { measurementOnly: true, automaticM2PerM3Factor: false, automaticProductionQuantity: false },
}]);

const DOKA_TRACE = Object.freeze([{
  document_code: FORMWORK_DOKAFLEX_SOURCE_ID,
  source_id: FORMWORK_DOKAFLEX_SOURCE_ID,
  sourceId: FORMWORK_DOKAFLEX_SOURCE_ID,
  source_title: FORMWORK_DOKAFLEX_SOURCE_METADATA.source_title,
  source_document_version: FORMWORK_DOKAFLEX_SOURCE_METADATA.source_document_version,
  source_definition_hash: FORMWORK_DOKAFLEX_SOURCE_METADATA.definition_hash,
  source_snapshot_sha256: FORMWORK_DOKAFLEX_SOURCE_PDF_SHA256,
  exact_locator: FORMWORK_DOKAFLEX_SOURCE_METADATA.exact_locator,
  source_url: FORMWORK_DOKAFLEX_SOURCE_METADATA.source_url,
  applicability: {
    systemProfileId: FORMWORK_DOKAFLEX_SYSTEM_PROFILE_ID,
    projectLayoutAndStructuralCheckRequired: true,
    exposedEdgeAndReshoringPlanRequired: true,
    universalBomOrTurnoverFactor: false,
    projectProductivityAndPricesPublished: false,
  },
}]);

const PHYSICAL_BINDING = Object.freeze({
  technology_class: "FORMWORK_MEASUREMENT",
  operation_class: "MEASURE",
  material_system: "FORMWORK_CONTACT_AREA",
  scope_mode: "FULL_APPLICABLE_SCOPE",
  product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
  applicability_parameter_ids: [...RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS],
  activation: { parameter_id: "product_profile_id", equals: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID },
  quantity_output_parameter_id: "formwork_measured_contact_area_routed_m2",
  quantity_output_formula_id: "dokaflex_measured_contact_area_v1",
});

type ResourceSource = "RICS" | "DOKA_PROJECT" | "PROJECT";
function resource(input: {
  id: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  procurementEligible: boolean;
  source: ResourceSource;
  resourceGraph?: Record<string, unknown>;
  costTreatment?: "INFORMATIONAL_SCOPE";
}): CanonicalEstimateResourceDefinition {
  const normativeTrace = input.source === "RICS" ? RICS_TRACE : input.source === "DOKA_PROJECT" ? DOKA_TRACE : [];
  return Object.freeze({
    id: input.id,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: {
      contract: "formwork-dokaflex-concrete-slab-r1",
      synthetic: false,
      quantitySource: input.source === "RICS"
        ? "RICS_NRM2_MEASURED_CONTACT_AREA"
        : "APPROVED_PROJECT_SCHEDULE_DIRECT",
      universalAreaRateApplied: false,
      universalTurnoverFactorApplied: false,
      ...(input.source === "DOKA_PROJECT" ? {
        formworkSystemProfileParameterId: "formwork_system_profile_id",
        manufacturerDocumentParameterId: "manufacturer_document_reference",
        systemApplicabilityParameterIds: [
          "slab_thickness_cm", "propping_height_m", "structural_spacing_check_reference",
          "project_formwork_layout_reference", "system_engineer_approval_reference",
        ],
      } : {}),
      ...(input.costTreatment ? { costTreatment: input.costTreatment } : {}),
      ...input.resourceGraph,
    },
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: input.source === "RICS"
        ? "INTERNATIONAL_MEASUREMENT_STANDARD"
        : input.source === "DOKA_PROJECT"
          ? "OFFICIAL_SYSTEM_DOCUMENT_AND_APPROVED_PROJECT_SCHEDULE"
          : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      normativeTrace,
      ...(input.costTreatment ? { costTreatment: input.costTreatment } : {}),
      excludedUnownedAssumptions: [
        "universal component count per m2", "universal beam or prop spacing",
        "universal turnover count", "hidden waste or package rounding", "invented price",
      ],
    },
    row_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

function rentalGraph(countParameterId: string): Record<string, unknown> {
  return {
    supplyModeParameterId: "reusable_equipment_supply_mode",
    supplyMode: "RENTAL_RETURNABLE",
    returnable: true,
    rentalDurationParameterId: "rental_duration_days",
    projectStageCountParameterId: "project_stage_count",
    sourceScheduleParameterIds: [
      countParameterId, "rental_duration_days", "project_stage_count",
      "project_formwork_layout_reference", "system_engineer_approval_reference",
    ],
  };
}

function consumableGraph(quantityParameterId: string): Record<string, unknown> {
  return {
    supplyModeParameterId: "consumables_supply_mode",
    supplyMode: "PURCHASE_FOR_PROJECT",
    returnable: false,
    sourceScheduleParameterIds: [quantityParameterId, "project_formwork_layout_reference"],
    procurementQuantityPolicy: "APPROVED_PROJECT_SCHEDULE_FINAL_QUANTITY",
    wasteAndLossTreatment: "INCLUDED_IN_APPROVED_SCHEDULE_NO_ADDITIONAL_FACTOR",
    packageRounding: "NOT_APPLIED_PROJECT_SCHEDULE_ALREADY_COMMERCIAL",
  };
}

type ResourceSpec = readonly [
  string, string, string, string, string, string, boolean, ResourceSource,
  string | null, string | null,
];

const RESOURCE_SPECS: readonly ResourceSpec[] = Object.freeze([
  ["measurement", "information:formwork:dokaflex-measured-contact-area", "Основание расчёта", "service", "Измеренная площадь контакта горизонтальной опалубки с бетоном по RICS NRM 2", "m2", false, "RICS", null, null],
  ["sheet", "equipment:formwork:dokaflex-3so-sheets-rental", "Возвратный арендный комплект", "equipment", "Опалубочные листы Doka 3-SO", "piece_day", true, "DOKA_PROJECT", "formwork_sheet_count", "formwork_sheet_specification"],
  ["primary", "equipment:formwork:dokaflex-primary-beams-rental", "Возвратный арендный комплект", "equipment", "Главные балки Doka H20", "piece_day", true, "DOKA_PROJECT", "primary_beam_count", "primary_beam_specification"],
  ["secondary", "equipment:formwork:dokaflex-secondary-beams-rental", "Возвратный арендный комплект", "equipment", "Второстепенные балки Doka H20", "piece_day", true, "DOKA_PROJECT", "secondary_beam_count", "secondary_beam_specification"],
  ["prop", "equipment:formwork:dokaflex-floor-props-rental", "Возвратный арендный комплект", "equipment", "Стойки перекрытия Doka Eurex", "piece_day", true, "DOKA_PROJECT", "floor_prop_count", "floor_prop_specification"],
  ["lowering", "equipment:formwork:dokaflex-lowering-heads-rental", "Возвратный арендный комплект", "equipment", "Опускные головки Doka H20, артикул 586174000", "piece_day", true, "DOKA_PROJECT", "lowering_head_count", null],
  ["supporting", "equipment:formwork:dokaflex-supporting-heads-rental", "Возвратный арендный комплект", "equipment", "Поддерживающие головки Doka H20 DF, артикул 586179000", "piece_day", true, "DOKA_PROJECT", "supporting_head_count", null],
  ["tripod", "equipment:formwork:dokaflex-tripods-rental", "Возвратный арендный комплект", "equipment", "Съёмные треноги Doka для стоек перекрытия", "piece_day", true, "DOKA_PROJECT", "removable_tripod_count", null],
  ["bracing", "equipment:formwork:dokaflex-bracing-rental", "Возвратный арендный комплект", "equipment", "Комплекты раскрепления опалубки перекрытия", "piece_day", true, "DOKA_PROJECT", "bracing_set_count", "bracing_system_specification"],
  ["stabilizer", "equipment:formwork:dokaflex-secondary-beam-stabilizers-rental", "Возвратный арендный комплект", "equipment", "Стабилизаторы второстепенных балок Doka", "piece_day", true, "DOKA_PROJECT", "secondary_beam_stabilizer_count", null],
  ["end-shutter", "equipment:formwork:dokaflex-floor-end-shutter-rental", "Возвратный арендный комплект", "equipment", "Торцевая опалубка плиты Doka", "piece_day", true, "DOKA_PROJECT", "floor_end_shutter_count", "floor_end_shutter_system_specification"],
  ["access", "equipment:formwork:dokaflex-access-platform-rental", "Возвратный арендный комплект", "equipment", "Передвижные подмости или лестничные платформы для монтажа", "piece_day", true, "DOKA_PROJECT", "access_platform_count", "access_platform_specification"],
  ["edge", "equipment:formwork:dokaflex-edge-protection-rental", "Возвратный арендный комплект", "equipment", "Защита открытых кромок плиты", "piece_day", true, "DOKA_PROJECT", "edge_protection_set_count", "edge_protection_specification"],
  ["reshoring", "equipment:formwork:dokaflex-reshoring-props-rental", "Возвратный арендный комплект", "equipment", "Стойки переподпирания по проектной последовательности", "piece_day", true, "DOKA_PROJECT", "reshoring_prop_count", null],
  ["fixing", "material:formwork:dokaflex-project-fixings", "Расходные материалы", "material", "Монтажный крепёж и расходные материалы по ведомости", "kg", true, "PROJECT", "fixing_consumables_kg", "fixing_consumables_specification"],
  ["release", "material:formwork:dokaflex-release-agent", "Расходные материалы", "material", "Разделительный состав для опалубочных листов", "l", true, "PROJECT", "form_release_agent_l", "form_release_agent_specification"],
  ["handling", "work:formwork:dokaflex-receive-sort-handle", "Работы", "construction_work", "Приёмка, сортировка и перемещение комплекта", "man_hour", false, "PROJECT", "formwork_handling_worker_h", null],
  ["assembly", "work:formwork:dokaflex-assemble-align-brace", "Работы", "construction_work", "Установка стоек, головок, балок и раскреплений", "man_hour", false, "PROJECT", "assembly_alignment_worker_h", null],
  ["sheet-laying", "work:formwork:dokaflex-lay-and-fix-sheets", "Работы", "construction_work", "Укладка и крепление опалубочных листов", "man_hour", false, "PROJECT", "sheet_laying_worker_h", null],
  ["stripping", "work:formwork:dokaflex-strip-clean-return", "Работы", "construction_work", "Распалубка, очистка и подготовка комплекта к возврату", "man_hour", false, "PROJECT", "stripping_cleaning_worker_h", null],
  ["reshoring-work", "work:formwork:dokaflex-reshoring", "Работы", "construction_work", "Переподпирание плиты по утверждённому плану", "man_hour", false, "PROJECT", "reshoring_worker_h", null],
  ["review", "service:formwork:dokaflex-engineer-layout-review", "Услуги", "service", "Инженерная проверка раскладки, шага балок и стоек", "document", true, "PROJECT", "layout_review_document_count", null],
  ["lifting", "equipment:formwork:dokaflex-level-lifting", "Механизмы", "equipment", "Механизированная подача комплекта на рабочий горизонт", "machine_hour", true, "PROJECT", "lifting_equipment_hours", null],
  ["outbound", "delivery:formwork:dokaflex-outbound-kit", "Логистика", "delivery", "Доставка комплекта Dokaflex на объект", "t_km", true, "PROJECT", "shipping_mass_t", null],
  ["return", "delivery:formwork:dokaflex-return-kit", "Логистика", "delivery", "Возврат арендного комплекта Dokaflex поставщику", "t_km", true, "PROJECT", "shipping_mass_t", null],
  ["stages", "information:formwork:dokaflex-installation-stages", "Основание расчёта", "service", "Захватки и перестановки по утверждённой раскладке", "stage", false, "PROJECT", "project_stage_count", null],
  ["drop-beam-na", "information:formwork:dokaflex-drop-beam-not-applicable", "Неприменимые позиции", "service", "Опалубка капителей и пониженных балок исключена: проектная плита без пониженных балок", "item", false, "PROJECT", null, null],
  ["deposit-na", "information:formwork:dokaflex-rental-deposit-not-applicable", "Неприменимые позиции", "service", "Отдельный арендный депозит отсутствует в предложении поставщика", "item", false, "PROJECT", null, null],
  ["maintenance-na", "information:formwork:dokaflex-maintenance-not-applicable", "Неприменимые позиции", "service", "Отдельная сервисная плата отсутствует: условия возврата включены в аренду", "item", false, "PROJECT", null, null],
]);

function formulaForResource(key: string): string {
  const direct: Readonly<Record<string, string>> = {
    measurement: "dokaflex_measured_contact_area_v1", sheet: "dokaflex_sheet_rental_v1",
    primary: "dokaflex_primary_beam_rental_v1", secondary: "dokaflex_secondary_beam_rental_v1",
    prop: "dokaflex_floor_prop_rental_v1", lowering: "dokaflex_lowering_head_rental_v1",
    supporting: "dokaflex_supporting_head_rental_v1", tripod: "dokaflex_tripod_rental_v1",
    bracing: "dokaflex_bracing_rental_v1", stabilizer: "dokaflex_stabilizer_rental_v1",
    "end-shutter": "dokaflex_end_shutter_rental_v1", access: "dokaflex_access_rental_v1",
    edge: "dokaflex_edge_protection_rental_v1", reshoring: "dokaflex_reshoring_prop_rental_v1",
    fixing: "dokaflex_fixings_v1", release: "dokaflex_release_agent_v1",
    handling: "dokaflex_handling_labor_v1", assembly: "dokaflex_assembly_labor_v1",
    "sheet-laying": "dokaflex_sheet_laying_labor_v1", stripping: "dokaflex_stripping_labor_v1",
    "reshoring-work": "dokaflex_reshoring_labor_v1", review: "dokaflex_layout_review_v1",
    lifting: "dokaflex_lifting_v1", outbound: "dokaflex_outbound_transport_v1",
    return: "dokaflex_return_transport_v1", stages: "dokaflex_stage_count_v1",
  };
  return direct[key] ?? "dokaflex_not_applicable_v1";
}

export const FORMWORK_DOKAFLEX_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  RESOURCE_SPECS.map((spec, ordinal) => {
    const [key, rowId, section, category, titleRu, unitId, procurementEligible, source, quantityId, specId] = spec;
    const rental = source === "DOKA_PROJECT" && quantityId != null;
    const consumable = ["fixing_consumables_kg", "form_release_agent_l"].includes(quantityId ?? "");
    const projectGraph: Record<string, unknown> = rental
      ? rentalGraph(quantityId!)
      : consumable
        ? consumableGraph(quantityId!)
        : quantityId
          ? { sourceScheduleParameterIds: [quantityId] }
          : {};
    if (specId) {
      projectGraph.titleSpecificationParameterIds = [specId];
      projectGraph.titleSpecificationMode = "APPEND";
    }
    if (key === "measurement") projectGraph.professionalPhysicalNormBindingV1 = PHYSICAL_BINDING;
    if (source === "DOKA_PROJECT") {
      projectGraph.scopeApplicabilityParameterId = "slab_support_condition";
      projectGraph.scopeApplicabilityRequiredValue = "SUSPENDED_ELEVATED_FLOOR_SLAB";
      projectGraph.projectLayoutContactAreaParameterId = "project_formwork_layout_contact_area_m2";
    }
    if (key === "review") projectGraph.sourceScheduleParameterIds = [
      "layout_review_document_count", "structural_spacing_check_reference", "system_engineer_approval_reference",
    ];
    if (["handling", "assembly", "sheet-laying", "stripping", "reshoring-work"].includes(key)) {
      projectGraph.supplyModeParameterId = "labor_supply_mode";
      projectGraph.supplyMode = "CONTRACTOR_SEPARATE";
    }
    if (key === "lifting") projectGraph.supplyModeParameterId = "lifting_supply_mode";
    if (key === "outbound" || key === "return") {
      projectGraph.supplyModeParameterId = "transport_supply_mode";
      projectGraph.sourceScheduleParameterIds = [
        "shipping_mass_t", key === "outbound" ? "outbound_distance_km" : "return_distance_km",
      ];
    }
    if (key === "edge") projectGraph.applicabilityParameterId = "edge_protection_applicability";
    if (key === "reshoring" || key === "reshoring-work") {
      projectGraph.applicabilityParameterId = "reshoring_applicability";
      projectGraph.sourceScheduleParameterIds = [
        ...((projectGraph.sourceScheduleParameterIds as string[] | undefined) ?? []),
        "reshoring_plan_reference",
      ];
    }
    if (key === "drop-beam-na") {
      projectGraph.applicabilityParameterId = "separate_drop_beam_applicability";
    }
    if (key === "deposit-na") projectGraph.applicabilityParameterId = "deposit_applicability";
    if (key === "maintenance-na") {
      projectGraph.applicabilityParameterId = "separate_maintenance_service_applicability";
    }
    const informational = key === "measurement" || key === "stages" || key.endsWith("-na");
    return resource({
      id: `resource-dokaflex-${key}`,
      rowId,
      ordinal,
      section,
      category,
      titleRu,
      unitId,
      formulaId: formulaForResource(key),
      procurementEligible,
      source,
      resourceGraph: projectGraph,
      ...(informational ? { costTreatment: "INFORMATIONAL_SCOPE" as const } : {}),
    });
  }),
);

type SlabSchedule = Readonly<{
  area: number; thickness: number; height: number; sheets: number; primary: number; secondary: number;
  props: number; lowering: number; supporting: number; tripods: number; bracing: number;
  stabilizers: number; endShutters: number; access: number; edge: number; reshoring: number;
  fixings: number; releaseAgent: number; handling: number; assembly: number; sheetLaying: number;
  stripping: number; reshoringLabor: number; lifting: number; mass: number; days: number; stages: number;
}>;

const SLAB_SCHEDULES: Readonly<Record<FormworkDokaflexConcreteSlabContextKey, SlabSchedule>> = Object.freeze({
  standard: { area: 120, thickness: 20, height: 3.2, sheets: 60, primary: 20, secondary: 42, props: 28, lowering: 14, supporting: 14, tripods: 14, bracing: 4, stabilizers: 20, endShutters: 18, access: 2, edge: 12, reshoring: 18, fixings: 10, releaseAgent: 12, handling: 20, assembly: 80, sheetLaying: 36, stripping: 48, reshoringLabor: 16, lifting: 4, mass: 3.4, days: 21, stages: 2 },
  high_load: { area: 110, thickness: 35, height: 3.5, sheets: 58, primary: 24, secondary: 48, props: 38, lowering: 19, supporting: 19, tripods: 19, bracing: 6, stabilizers: 24, endShutters: 20, access: 2, edge: 14, reshoring: 28, fixings: 13, releaseAgent: 11, handling: 25, assembly: 102, sheetLaying: 40, stripping: 58, reshoringLabor: 24, lifting: 6, mass: 4.2, days: 28, stages: 2 },
  large_area: { area: 360, thickness: 22, height: 3.3, sheets: 180, primary: 58, secondary: 122, props: 82, lowering: 41, supporting: 41, tripods: 34, bracing: 12, stabilizers: 40, endShutters: 42, access: 4, edge: 28, reshoring: 56, fixings: 28, releaseAgent: 34, handling: 52, assembly: 220, sheetLaying: 104, stripping: 126, reshoringLabor: 48, lifting: 14, mass: 9.8, days: 35, stages: 4 },
  repair: { area: 72, thickness: 18, height: 3.0, sheets: 39, primary: 16, secondary: 32, props: 24, lowering: 12, supporting: 12, tripods: 12, bracing: 5, stabilizers: 16, endShutters: 16, access: 2, edge: 12, reshoring: 16, fixings: 9, releaseAgent: 8, handling: 18, assembly: 68, sheetLaying: 28, stripping: 38, reshoringLabor: 14, lifting: 4, mass: 2.8, days: 24, stages: 3 },
  small_area: { area: 42, thickness: 16, height: 2.9, sheets: 24, primary: 10, secondary: 20, props: 16, lowering: 8, supporting: 8, tripods: 8, bracing: 4, stabilizers: 10, endShutters: 12, access: 1, edge: 10, reshoring: 10, fixings: 6, releaseAgent: 5, handling: 12, assembly: 42, sheetLaying: 18, stripping: 24, reshoringLabor: 9, lifting: 2, mass: 1.7, days: 14, stages: 1 },
  technical_room: { area: 64, thickness: 20, height: 4.2, sheets: 35, primary: 18, secondary: 36, props: 30, lowering: 15, supporting: 15, tripods: 15, bracing: 8, stabilizers: 18, endShutters: 16, access: 3, edge: 14, reshoring: 22, fixings: 10, releaseAgent: 7, handling: 22, assembly: 92, sheetLaying: 32, stripping: 46, reshoringLabor: 20, lifting: 5, mass: 3.3, days: 26, stages: 3 },
  wet_zone: { area: 86, thickness: 20, height: 3.1, sheets: 46, primary: 18, secondary: 38, props: 28, lowering: 14, supporting: 14, tripods: 14, bracing: 6, stabilizers: 20, endShutters: 18, access: 2, edge: 14, reshoring: 20, fixings: 12, releaseAgent: 10, handling: 21, assembly: 88, sheetLaying: 35, stripping: 44, reshoringLabor: 18, lifting: 4.5, mass: 3.5, days: 24, stages: 2 },
});

export function formworkDokaflexConcreteSlabAcceptanceInputR1(
  contextKey: FormworkDokaflexConcreteSlabContextKey,
): Readonly<Record<string, FormworkDokaflexInputValue>> {
  const target = FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  const schedule = SLAB_SCHEDULES[contextKey];
  if (!target || !schedule) throw new Error(`FORMWORK_DOKAFLEX_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase();
  const drawing = `ACCEPTANCE-FW-DOKAFLEX-SLAB-${reference}-001-REV-A`;
  const layout = `ACCEPTANCE-FW-DOKAFLEX-LAYOUT-${reference}-001-REV-A`;
  return Object.freeze({
    product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
    measured_formwork_contact_area_m2: schedule.area,
    project_formwork_layout_contact_area_m2: schedule.area,
    project_drawing_reference: drawing,
    element_type: `Монолитная бетонная плита с опалубливаемой нижней поверхностью, ${target.contextRu}`,
    slab_support_condition: "SUSPENDED_ELEVATED_FLOOR_SLAB",
    element_dimensions_and_face_count: `Нижняя горизонтальная поверхность и торцы плиты, итог ${schedule.area} м² по чертежу ${drawing}`,
    plain_or_special_finish: "PLAIN",
    vertical_battered_horizontal_or_curved_class: "HORIZONTAL",
    single_or_double_sided_scope: "SINGLE_SIDED",
    openings_voids_and_deduction_rule: `PROJECT_RULE:openings deducted by drawing ${drawing}, no universal deduction`,
    permanent_or_removable_formwork: "REMOVABLE",
    project_measurement_rule_reference: `RICS_NRM2_WS11_CONFIRMED:${drawing}`,
    estimator_approval_reference: `ACCEPTANCE-EST-FW-DOKAFLEX-${reference}-001-REV-A`,
    formwork_system_profile_id: FORMWORK_DOKAFLEX_SYSTEM_PROFILE_ID,
    manufacturer_document_reference: FORMWORK_DOKAFLEX_SOURCE_ID,
    project_formwork_layout_reference: layout,
    system_engineer_approval_reference: `ACCEPTANCE-FW-DOKAFLEX-ENG-${reference}-001-REV-A`,
    structural_spacing_check_reference: `ACCEPTANCE-FW-DOKAFLEX-SPACING-${reference}-001-REV-A`,
    slab_thickness_cm: schedule.thickness,
    propping_height_m: schedule.height,
    formwork_sheet_specification: `Doka 3-SO 21 мм по ведомости ${layout}`,
    formwork_sheet_count: schedule.sheets,
    primary_beam_specification: `Doka H20 top 3,90 м, главная балка по ведомости ${layout}`,
    primary_beam_count: schedule.primary,
    secondary_beam_specification: `Doka H20 top 2,65 м, второстепенная балка по ведомости ${layout}`,
    secondary_beam_count: schedule.secondary,
    floor_prop_specification: `Doka Eurex с рабочей длиной по высоте ${schedule.height} м и расчёту ${reference}`,
    floor_prop_count: schedule.props,
    lowering_head_count: schedule.lowering,
    supporting_head_count: schedule.supporting,
    removable_tripod_count: schedule.tripods,
    bracing_system_specification: `Раскрепление по расчёту горизонтальных усилий ${reference}`,
    bracing_set_count: schedule.bracing,
    secondary_beam_stabilizer_count: schedule.stabilizers,
    floor_end_shutter_system_specification: `Doka floor end-shutter clamp 586239000 по раскладке ${layout}`,
    floor_end_shutter_count: schedule.endShutters,
    access_platform_specification: `Wheel-around scaffold DF или Platform stairway 0.97m по ППР ${reference}`,
    access_platform_count: schedule.access,
    edge_protection_specification: `Doka XP и торцевые ограждения по плану защиты кромок ${reference}`,
    edge_protection_set_count: schedule.edge,
    reshoring_plan_reference: `ACCEPTANCE-FW-DOKAFLEX-RESHORING-${reference}-001-REV-A`,
    reshoring_prop_count: schedule.reshoring,
    fixing_consumables_specification: `Крепёж листов и торцов по ведомости ${layout}`,
    fixing_consumables_kg: schedule.fixings,
    form_release_agent_specification: `Разделительный состав для Doka 3-SO по предложению поставщика ${reference}`,
    form_release_agent_l: schedule.releaseAgent,
    formwork_handling_worker_h: schedule.handling,
    assembly_alignment_worker_h: schedule.assembly,
    sheet_laying_worker_h: schedule.sheetLaying,
    stripping_cleaning_worker_h: schedule.stripping,
    reshoring_worker_h: schedule.reshoringLabor,
    layout_review_document_count: 1,
    lifting_equipment_hours: schedule.lifting,
    shipping_mass_t: schedule.mass,
    outbound_distance_km: 25,
    return_distance_km: 25,
    rental_duration_days: schedule.days,
    project_stage_count: schedule.stages,
    reusable_equipment_supply_mode: "RENTAL_RETURNABLE",
    consumables_supply_mode: "PURCHASE_FOR_PROJECT",
    labor_supply_mode: "CONTRACTOR_SEPARATE",
    lifting_supply_mode: "RENTAL_SEPARATE",
    transport_supply_mode: "SEPARATE_OUTBOUND_AND_RETURN",
    edge_protection_applicability: "REQUIRED_EXPOSED_EDGES",
    reshoring_applicability: "REQUIRED_PROJECT_SEQUENCE",
    separate_drop_beam_applicability: "NOT_APPLICABLE_NO_DROP_BEAMS",
    deposit_applicability: "NOT_APPLICABLE_NO_DEPOSIT_IN_SUPPLIER_QUOTE",
    separate_maintenance_service_applicability: "NOT_APPLICABLE_INCLUDED_IN_RETURN_CONDITION",
  });
}

export async function compileFormworkDokaflexConcreteSlabR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS[0].catalogId;
  if (!FORMWORK_DOKAFLEX_FLOOR_SLAB_COMPONENT_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`FORMWORK_DOKAFLEX_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.formwork-dokaflex-concrete-slab-r1",
    catalogId,
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    parameterDefinitions: [...FORMWORK_DOKAFLEX_PARAMETERS],
    formulaDefinitions: [...FORMWORK_DOKAFLEX_FORMULAS],
    resourceDefinitions: [...FORMWORK_DOKAFLEX_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 32,
    hashJson: async (value) => JSON.stringify(value),
  });
}
