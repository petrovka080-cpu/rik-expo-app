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

export const FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_pile_cap_form_wet_zone" as const;
export const FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID =
  "standard-profile:doka-frami-xlife:foundation-project-kit:2023-11" as const;
export const FORMWORK_FRAMI_XLIFE_SOURCE_ID =
  "src_manufacturer_doka_frami_xlife_foundation_999810202_2023_11" as const;
export const FORMWORK_FRAMI_XLIFE_SOURCE_PACK_SHA256 =
  "f65a2f09b226bf662db7c9e046e27779bbb4fcbcc26e50c3eb1e7b50d91eadd7" as const;
export const FORMWORK_FRAMI_XLIFE_TITLE_RU =
  "Съёмная опалубка ростверка Doka Frami Xlife по утверждённой проектной раскладке" as const;

export const FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_standard",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_high_load",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "large_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_large_area",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife на большом участке",
    contextRu: "большой участок",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_repair",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife на участке ремонта",
    contextRu: "участок ремонта",
  },
  {
    contextKey: "small_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_small_area",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife на малом участке",
    contextRu: "малый участок",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_form_technical_room",
    titleRu: "Съёмная опалубка свайного ростверка Doka Frami Xlife в технической зоне",
    contextRu: "техническая зона",
  },
  {
    contextKey: "wet_zone",
    catalogId: FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID,
    titleRu: FORMWORK_FRAMI_XLIFE_TITLE_RU,
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifePileCapContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_standard",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_high_load",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "large_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_large_area",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife на большой площади",
    contextRu: "большая площадь",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_repair",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife при локальном ремонте основания",
    contextRu: "локальный ремонт основания",
  },
  {
    contextKey: "small_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_small_area",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife на малой площади",
    contextRu: "малая площадь",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_technical_room",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_form_wet_zone",
    titleRu: "Съёмная опалубка ленточного фундамента Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeStripFoundationContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_standard",
    titleRu: "Съёмная опалубка плитного фундамента Doka Frami Xlife в стандартной зоне",
    contextRu: "стандартная зона",
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_high_load",
    titleRu: "Съёмная опалубка плитного фундамента Doka Frami Xlife для зоны высокой нагрузки",
    contextRu: "зона высокой нагрузки",
  },
  {
    contextKey: "large_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_large_area",
    titleRu: "Съёмная опалубка плитного фундамента Doka Frami Xlife на большой площади",
    contextRu: "большая площадь",
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_repair",
    titleRu: "Съёмная опалубка плитного фундамента Doka Frami Xlife при локальном ремонте основания",
    contextRu: "локальный ремонт основания",
  },
  {
    contextKey: "small_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_small_area",
    titleRu: "Съёмная опалубка плитного фундамента Doka Frami Xlife на малой площади",
    contextRu: "малая площадь",
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_technical_room",
    titleRu: "Съёмная опалубка плитного фундамента Doka Frami Xlife в техническом помещении",
    contextRu: "техническое помещение",
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_form_wet_zone",
    titleRu: "Съёмная опалубка плитного фундамента Doka Frami Xlife во влажной зоне",
    contextRu: "влажная зона",
  },
] as const);

export type FormworkFramiXlifeSlabFoundationContextKey =
  (typeof FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS)[number]["contextKey"];

export const FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS = Object.freeze([
  ...FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS,
  ...FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS,
] as const);

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

const formworkTechnologySource = (formworkNormPack.technology_sources as TechnologySource[]).find(
  (source) => source.source_id === FORMWORK_FRAMI_XLIFE_SOURCE_ID,
);
if (
  !formworkTechnologySource
  || formworkTechnologySource.review_status !== "reviewed"
  || formworkTechnologySource.document_version !== "999810202-2023-11"
  || !formworkTechnologySource.verified_facts.includes(
    "top_and_bottom_tie_counts_depend_on_panel_orientation_and_dimensions",
  )
  || !formworkTechnologySource.limitations.includes(
    "no_universal_bill_of_materials_or_turnover_factor_is_published",
  )
) {
  throw new Error(`FORMWORK_TECHNOLOGY_SOURCE_CONTRACT_INVALID:${FORMWORK_FRAMI_XLIFE_SOURCE_ID}`);
}

export const FORMWORK_FRAMI_XLIFE_SOURCE_METADATA = Object.freeze({
  source_id: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  source_document_version: formworkTechnologySource.document_version,
  source_title: formworkTechnologySource.title,
  source_url: formworkTechnologySource.url,
  supporting_url: formworkTechnologySource.supporting_url,
  exact_locator: formworkTechnologySource.exact_locator,
  definition_hash: estimateDeterministicHash({
    source_pack_version: formworkNormPack.technology_source_pack_version,
    source: formworkTechnologySource,
  }),
});

export type FormworkFramiXlifeInputValue = string | number | boolean;

export type FormworkFramiXlifeParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Record<string, unknown>;
};

export type FormworkFramiXlifeFormula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

const PARAMETER_TITLES_RU: Readonly<Record<string, string>> = Object.freeze({
  product_profile_id: "Профиль правила измерения площади опалубки",
  measured_formwork_contact_area_m2: "Измеренная площадь контакта опалубки с бетоном, м²",
  project_drawing_reference: "Чертёж, по которому измерена площадь контакта",
  element_type: "Тип бетонируемого элемента",
  element_dimensions_and_face_count: "Размеры элемента и число измеряемых граней",
  plain_or_special_finish: "Класс поверхности бетона",
  vertical_battered_horizontal_or_curved_class: "Класс геометрии поверхности",
  single_or_double_sided_scope: "Односторонняя или двухсторонняя схема",
  openings_voids_and_deduction_rule: "Проектное правило учёта проёмов и пустот",
  permanent_or_removable_formwork: "Постоянная или съёмная опалубка",
  project_measurement_rule_reference: "Подтверждённое проектное правило измерения",
  estimator_approval_reference: "Согласование измеренной площади сметчиком",
  formwork_system_profile_id: "Выбранная система опалубки",
  manufacturer_document_reference: "Документ изготовителя выбранной системы",
  project_formwork_layout_reference: "Утверждённая раскладка щитов и комплектующих",
  system_engineer_approval_reference: "Согласование раскладки инженером",
  foundation_wall_thickness_cm: "Толщина бетонируемого элемента, см",
  panel_specification: "Точный тип и размер щитов Frami Xlife",
  corner_element_specification: "Точный тип угловых элементов Frami Xlife",
  panel_connector_specification: "Точный тип соединителей щитов Frami Xlife",
  frami_xlife_panel_count: "Щиты Frami Xlife по проектной ведомости, шт.",
  frami_xlife_corner_element_count: "Угловые элементы Frami Xlife по проектной ведомости, шт.",
  frami_clamp_count: "Соединители щитов Frami по проектной ведомости, шт.",
  flat_tie_rod_10_80_count: "Плоские стяжки Frami 10–80 см, артикул 588475000, шт.",
  flat_tie_rod_clip_count: "Зажимы плоских стяжек Frami, артикул 588434000, шт.",
  foundation_clamp_count: "Фундаментные зажимы Frami, артикул 588452000, шт.",
  plumbing_strut_260_count: "Подкосы для выверки 260 по проектной ведомости, шт.",
  perforated_tape_50x2_length_m: "Перфорированная лента 50×2 мм, артикул 588206000, м",
  joint_sealing_tape_specification: "Точный тип ленты для герметизации стыков",
  joint_sealing_tape_length_m: "Лента для герметизации стыков по проектной ведомости, м",
  form_release_agent_specification: "Точный разделительный состав для щитов",
  form_release_agent_l: "Разделительный состав по проектной ведомости, л",
  formwork_handling_worker_h: "Приёмка, сортировка и перемещение комплекта, чел·ч",
  assembly_alignment_worker_h: "Сборка, установка и выверка опалубки, чел·ч",
  stripping_cleaning_worker_h: "Распалубка, очистка и подготовка к возврату, чел·ч",
  layout_review_document_count: "Проверка раскладки и ведомости инженером, документ",
  crane_hours: "Работа крана на подаче и перестановке, маш·ч",
  shipping_mass_t: "Масса отправляемого комплекта, т",
  outbound_distance_km: "Расстояние доставки на объект, км",
  return_distance_km: "Расстояние возврата арендного комплекта, км",
  rental_duration_days: "Срок аренды возвратного комплекта, сутки",
  project_stage_count: "Число этапов установки и перестановки",
  reusable_equipment_supply_mode: "Способ обеспечения возвратного комплекта",
  consumables_supply_mode: "Способ обеспечения расходных материалов",
  labor_supply_mode: "Способ привлечения рабочих",
  crane_supply_mode: "Способ обеспечения крана",
  transport_supply_mode: "Способ учёта доставки и возврата",
  separate_working_platform_applicability: "Необходимость отдельной рабочей площадки",
  supporting_construction_applicability: "Необходимость отдельной поддерживающей конструкции",
  compensation_insert_applicability: "Необходимость компенсационных вставок",
  deposit_applicability: "Наличие отдельного арендного депозита",
  separate_maintenance_service_applicability: "Наличие отдельной сервисной платы за обслуживание",
});

const PARAMETER_UNITS: Readonly<Record<string, string>> = Object.freeze({
  measured_formwork_contact_area_m2: "m2",
  foundation_wall_thickness_cm: "cm",
  frami_xlife_panel_count: "piece",
  frami_xlife_corner_element_count: "piece",
  frami_clamp_count: "piece",
  flat_tie_rod_10_80_count: "piece",
  flat_tie_rod_clip_count: "piece",
  foundation_clamp_count: "piece",
  plumbing_strut_260_count: "piece",
  perforated_tape_50x2_length_m: "m",
  joint_sealing_tape_length_m: "m",
  form_release_agent_l: "l",
  formwork_handling_worker_h: "man_hour",
  assembly_alignment_worker_h: "man_hour",
  stripping_cleaning_worker_h: "man_hour",
  layout_review_document_count: "document",
  crane_hours: "machine_hour",
  shipping_mass_t: "t",
  outbound_distance_km: "km",
  return_distance_km: "km",
  rental_duration_days: "day",
  project_stage_count: "stage",
});

const ENUM_VALUES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  product_profile_id: [RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID],
  formwork_system_profile_id: [FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID],
  manufacturer_document_reference: [FORMWORK_FRAMI_XLIFE_SOURCE_ID],
  reusable_equipment_supply_mode: ["RENTAL_RETURNABLE"],
  consumables_supply_mode: ["PURCHASE_FOR_PROJECT"],
  labor_supply_mode: ["CONTRACTOR_SEPARATE"],
  crane_supply_mode: ["RENTAL_SEPARATE"],
  transport_supply_mode: ["SEPARATE_OUTBOUND_AND_RETURN"],
  separate_working_platform_applicability: ["NOT_APPLICABLE_GROUND_LEVEL_FOUNDATION"],
  supporting_construction_applicability: ["NOT_APPLICABLE_DOUBLE_SIDED_TIED"],
  compensation_insert_applicability: ["NOT_APPLICABLE_APPROVED_LAYOUT_HAS_NO_GAPS"],
  deposit_applicability: ["NOT_APPLICABLE_NO_DEPOSIT_IN_SUPPLIER_QUOTE"],
  separate_maintenance_service_applicability: ["NOT_APPLICABLE_INCLUDED_IN_RETURN_CONDITION"],
});

const INTEGER_PARAMETER_IDS = new Set([
  "frami_xlife_panel_count",
  "frami_xlife_corner_element_count",
  "frami_clamp_count",
  "flat_tie_rod_10_80_count",
  "flat_tie_rod_clip_count",
  "foundation_clamp_count",
  "plumbing_strut_260_count",
  "layout_review_document_count",
  "rental_duration_days",
  "project_stage_count",
]);

const DECIMAL_PARAMETER_IDS = new Set([
  "measured_formwork_contact_area_m2",
  "foundation_wall_thickness_cm",
  "perforated_tape_50x2_length_m",
  "joint_sealing_tape_length_m",
  "form_release_agent_l",
  "formwork_handling_worker_h",
  "assembly_alignment_worker_h",
  "stripping_cleaning_worker_h",
  "crane_hours",
  "shipping_mass_t",
  "outbound_distance_km",
  "return_distance_km",
]);

const EXTRA_PARAMETER_IDS = Object.freeze([
  "formwork_system_profile_id",
  "manufacturer_document_reference",
  "project_formwork_layout_reference",
  "system_engineer_approval_reference",
  "foundation_wall_thickness_cm",
  "panel_specification",
  "corner_element_specification",
  "panel_connector_specification",
  "frami_xlife_panel_count",
  "frami_xlife_corner_element_count",
  "frami_clamp_count",
  "flat_tie_rod_10_80_count",
  "flat_tie_rod_clip_count",
  "foundation_clamp_count",
  "plumbing_strut_260_count",
  "perforated_tape_50x2_length_m",
  "joint_sealing_tape_specification",
  "joint_sealing_tape_length_m",
  "form_release_agent_specification",
  "form_release_agent_l",
  "formwork_handling_worker_h",
  "assembly_alignment_worker_h",
  "stripping_cleaning_worker_h",
  "layout_review_document_count",
  "crane_hours",
  "shipping_mass_t",
  "outbound_distance_km",
  "return_distance_km",
  "rental_duration_days",
  "project_stage_count",
  "reusable_equipment_supply_mode",
  "consumables_supply_mode",
  "labor_supply_mode",
  "crane_supply_mode",
  "transport_supply_mode",
  "separate_working_platform_applicability",
  "supporting_construction_applicability",
  "compensation_insert_applicability",
  "deposit_applicability",
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
  const values = ENUM_VALUES[parameterId];
  if (values) return { values: [...values] };
  if (parameterId === "foundation_wall_thickness_cm") return { min: 10, max: 80 };
  if (INTEGER_PARAMETER_IDS.has(parameterId) || DECIMAL_PARAMETER_IDS.has(parameterId)) {
    return { min: 0.000001 };
  }
  return { maxLength: 1_000 };
}

const MANUFACTURER_PARAMETER_IDS = new Set([
  "formwork_system_profile_id",
  "manufacturer_document_reference",
  "foundation_wall_thickness_cm",
]);

export const FORMWORK_FRAMI_XLIFE_PARAMETERS: readonly FormworkFramiXlifeParameter[] = Object.freeze(
  ALL_PARAMETER_IDS.map((parameterId, ordinal) => {
    const manufacturerBound = MANUFACTURER_PARAMETER_IDS.has(parameterId);
    return {
      parameter_id: parameterId,
      ordinal,
      value_type: parameterValueType(parameterId),
      unit_id: PARAMETER_UNITS[parameterId] ?? null,
      title_ru: PARAMETER_TITLES_RU[parameterId] ?? parameterId,
      required: true,
      default_value: null,
      constraints_json: parameterConstraints(parameterId),
      truth_metadata: {
        semantic_parameter_key: `${FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID}:${parameterId}`,
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
          source_document: manufacturerBound ? FORMWORK_FRAMI_XLIFE_SOURCE_ID : null,
          source_locator: manufacturerBound ? FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.exact_locator : null,
          guide_version: "formwork-frami-xlife-project-kit-r1",
          source_snapshot_hash: manufacturerBound
            ? FORMWORK_FRAMI_XLIFE_SOURCE_PACK_SHA256
            : "9f8108ca88b86165a988763f65dbc7899754b6cc3997c5b221c792c94cc301dc",
          applicability: manufacturerBound
            ? "Только система Doka Frami Xlife для фундамента в пределах официально описанной применимости."
            : "Количество принимается из утверждённой проектной ведомости или коммерческого предложения, а не из универсальной нормы на м².",
          verified_at: "2026-09-15T00:00:00+06:00",
          guide_validation_policy: "REJECT_MISSING_PROJECT_SCHEDULE_OR_OUTSIDE_SYSTEM_APPLICABILITY",
        },
        synthetic: false,
      },
    };
  }),
);

function formula(
  formulaId: string,
  outputUnitId: string,
  expressionSource: string,
): FormworkFramiXlifeFormula {
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

export const FORMWORK_FRAMI_XLIFE_FORMULAS: readonly FormworkFramiXlifeFormula[] = Object.freeze([
  formula("formwork_measured_contact_area_v1", "m2", "measured_formwork_contact_area_m2"),
  formula("frami_panel_rental_v1", "piece_day", "frami_xlife_panel_count * rental_duration_days"),
  formula("frami_corner_rental_v1", "piece_day", "frami_xlife_corner_element_count * rental_duration_days"),
  formula("frami_connector_rental_v1", "piece_day", "frami_clamp_count * rental_duration_days"),
  formula("frami_flat_tie_rental_v1", "piece_day", "flat_tie_rod_10_80_count * rental_duration_days"),
  formula("frami_flat_tie_clip_rental_v1", "piece_day", "flat_tie_rod_clip_count * rental_duration_days"),
  formula("frami_foundation_clamp_rental_v1", "piece_day", "foundation_clamp_count * rental_duration_days"),
  formula("frami_plumbing_strut_rental_v1", "piece_day", "plumbing_strut_260_count * rental_duration_days"),
  formula("frami_perforated_tape_v1", "m", "perforated_tape_50x2_length_m"),
  formula("frami_joint_sealing_tape_v1", "m", "joint_sealing_tape_length_m"),
  formula("frami_release_agent_v1", "l", "form_release_agent_l"),
  formula("formwork_handling_labor_v1", "man_hour", "formwork_handling_worker_h"),
  formula("formwork_assembly_labor_v1", "man_hour", "assembly_alignment_worker_h"),
  formula("formwork_stripping_labor_v1", "man_hour", "stripping_cleaning_worker_h"),
  formula("formwork_layout_review_v1", "document", "layout_review_document_count"),
  formula("formwork_crane_v1", "machine_hour", "crane_hours"),
  formula("formwork_outbound_transport_v1", "t_km", "shipping_mass_t * outbound_distance_km"),
  formula("formwork_return_transport_v1", "t_km", "shipping_mass_t * return_distance_km"),
  formula("formwork_stage_count_v1", "stage", "project_stage_count"),
  formula("formwork_explicit_not_applicable_v1", "item", "project_stage_count * 0"),
]);

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
  applicability: {
    measurementOnly: true,
    automaticM2PerM3Factor: false,
    automaticProductionQuantity: false,
  },
}]);

const DOKA_TRACE = Object.freeze([{
  document_code: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  source_id: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  sourceId: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  source_title: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.source_title,
  source_document_version: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.source_document_version,
  source_definition_hash: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.definition_hash,
  exact_locator: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.exact_locator,
  source_url: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.source_url,
  applicability: {
    systemProfileId: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    projectLayoutRequired: true,
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
  quantity_output_formula_id: "formwork_measured_contact_area_v1",
});

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
  source: "RICS" | "DOKA_PROJECT" | "PROJECT";
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
      contract: "formwork-frami-xlife-project-kit-r1",
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
          "foundation_wall_thickness_cm",
          "project_formwork_layout_reference",
          "system_engineer_approval_reference",
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
        "universal panel count per m2",
        "universal accessory count per m2",
        "universal turnover count",
        "hidden waste or package rounding",
        "invented price",
      ],
    },
    row_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

function rentalGraph(countParameterId: string) {
  return {
    supplyModeParameterId: "reusable_equipment_supply_mode",
    supplyMode: "RENTAL_RETURNABLE",
    returnable: true,
    rentalDurationParameterId: "rental_duration_days",
    projectStageCountParameterId: "project_stage_count",
    stageAccounting: "PEAK_SIMULTANEOUS_KIT_TIMES_TOTAL_RENTAL_DURATION",
    sourceScheduleParameterIds: [
      countParameterId,
      "rental_duration_days",
      "project_stage_count",
      "project_formwork_layout_reference",
      "system_engineer_approval_reference",
    ],
  };
}

function consumableGraph(quantityParameterId: string) {
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

export const FORMWORK_FRAMI_XLIFE_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    id: "resource-formwork-rics-measured-contact-area",
    rowId: "information:formwork:measured-contact-area",
    ordinal: 0,
    section: "Основание расчёта",
    category: "service",
    titleRu: "Измеренная площадь контакта опалубки с бетоном по RICS NRM 2",
    unitId: "m2",
    formulaId: "formwork_measured_contact_area_v1",
    procurementEligible: false,
    source: "RICS",
    costTreatment: "INFORMATIONAL_SCOPE",
    resourceGraph: { professionalPhysicalNormBindingV1: PHYSICAL_BINDING },
  }),
  resource({
    id: "resource-frami-xlife-panels-rental",
    rowId: "equipment:formwork:frami-xlife-panels-rental",
    ordinal: 1,
    section: "Возвратный арендный комплект",
    category: "equipment",
    titleRu: "Щиты рамной опалубки Doka Frami Xlife",
    unitId: "piece_day",
    formulaId: "frami_panel_rental_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: {
      ...rentalGraph("frami_xlife_panel_count"),
      titleSpecificationParameterIds: ["panel_specification"],
      titleSpecificationMode: "APPEND",
    },
  }),
  resource({
    id: "resource-frami-xlife-corners-rental",
    rowId: "equipment:formwork:frami-xlife-corners-rental",
    ordinal: 2,
    section: "Возвратный арендный комплект",
    category: "equipment",
    titleRu: "Угловые элементы Doka Frami Xlife",
    unitId: "piece_day",
    formulaId: "frami_corner_rental_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: {
      ...rentalGraph("frami_xlife_corner_element_count"),
      titleSpecificationParameterIds: ["corner_element_specification"],
      titleSpecificationMode: "APPEND",
    },
  }),
  resource({
    id: "resource-frami-panel-connectors-rental",
    rowId: "equipment:formwork:frami-panel-connectors-rental",
    ordinal: 3,
    section: "Возвратный арендный комплект",
    category: "equipment",
    titleRu: "Соединители щитов Doka Frami",
    unitId: "piece_day",
    formulaId: "frami_connector_rental_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: {
      ...rentalGraph("frami_clamp_count"),
      titleSpecificationParameterIds: ["panel_connector_specification"],
      titleSpecificationMode: "APPEND",
    },
  }),
  resource({
    id: "resource-frami-flat-ties-rental",
    rowId: "equipment:formwork:frami-flat-ties-10-80-rental",
    ordinal: 4,
    section: "Возвратный арендный комплект",
    category: "equipment",
    titleRu: "Плоская стяжка Frami 10–80 см, артикул 588475000",
    unitId: "piece_day",
    formulaId: "frami_flat_tie_rental_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: rentalGraph("flat_tie_rod_10_80_count"),
  }),
  resource({
    id: "resource-frami-flat-tie-clips-rental",
    rowId: "equipment:formwork:frami-flat-tie-clips-rental",
    ordinal: 5,
    section: "Возвратный арендный комплект",
    category: "equipment",
    titleRu: "Зажим плоской стяжки Frami, артикул 588434000",
    unitId: "piece_day",
    formulaId: "frami_flat_tie_clip_rental_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: rentalGraph("flat_tie_rod_clip_count"),
  }),
  resource({
    id: "resource-frami-foundation-clamps-rental",
    rowId: "equipment:formwork:frami-foundation-clamps-rental",
    ordinal: 6,
    section: "Возвратный арендный комплект",
    category: "equipment",
    titleRu: "Фундаментный зажим Frami, артикул 588452000",
    unitId: "piece_day",
    formulaId: "frami_foundation_clamp_rental_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: rentalGraph("foundation_clamp_count"),
  }),
  resource({
    id: "resource-frami-plumbing-struts-rental",
    rowId: "equipment:formwork:plumbing-struts-260-rental",
    ordinal: 7,
    section: "Возвратный арендный комплект",
    category: "equipment",
    titleRu: "Подкосы Doka 260 для выверки щитов",
    unitId: "piece_day",
    formulaId: "frami_plumbing_strut_rental_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: rentalGraph("plumbing_strut_260_count"),
  }),
  resource({
    id: "resource-frami-perforated-tape",
    rowId: "material:formwork:perforated-tape-50x2",
    ordinal: 8,
    section: "Расходные материалы",
    category: "material",
    titleRu: "Перфорированная лента Frami 50×2 мм, артикул 588206000",
    unitId: "m",
    formulaId: "frami_perforated_tape_v1",
    procurementEligible: true,
    source: "DOKA_PROJECT",
    resourceGraph: consumableGraph("perforated_tape_50x2_length_m"),
  }),
  resource({
    id: "resource-formwork-joint-sealing-tape",
    rowId: "material:formwork:joint-sealing-tape",
    ordinal: 9,
    section: "Расходные материалы",
    category: "material",
    titleRu: "Лента для герметизации стыков щитов",
    unitId: "m",
    formulaId: "frami_joint_sealing_tape_v1",
    procurementEligible: true,
    source: "PROJECT",
    resourceGraph: {
      ...consumableGraph("joint_sealing_tape_length_m"),
      titleSpecificationParameterIds: ["joint_sealing_tape_specification"],
      titleSpecificationMode: "APPEND",
    },
  }),
  resource({
    id: "resource-formwork-release-agent",
    rowId: "material:formwork:release-agent",
    ordinal: 10,
    section: "Расходные материалы",
    category: "material",
    titleRu: "Разделительный состав для щитов опалубки",
    unitId: "l",
    formulaId: "frami_release_agent_v1",
    procurementEligible: true,
    source: "PROJECT",
    resourceGraph: {
      ...consumableGraph("form_release_agent_l"),
      titleSpecificationParameterIds: ["form_release_agent_specification"],
      titleSpecificationMode: "APPEND",
    },
  }),
  resource({
    id: "resource-formwork-handling-labor",
    rowId: "work:formwork:receive-sort-handle-kit",
    ordinal: 11,
    section: "Работы",
    category: "construction_work",
    titleRu: "Приёмка, сортировка и перемещение комплекта опалубки",
    unitId: "man_hour",
    formulaId: "formwork_handling_labor_v1",
    procurementEligible: false,
    source: "PROJECT",
    resourceGraph: {
      supplyModeParameterId: "labor_supply_mode",
      sourceScheduleParameterIds: ["formwork_handling_worker_h"],
    },
  }),
  resource({
    id: "resource-formwork-assembly-labor",
    rowId: "work:formwork:assemble-install-align",
    ordinal: 12,
    section: "Работы",
    category: "construction_work",
    titleRu: "Сборка, установка, крепление и выверка опалубки",
    unitId: "man_hour",
    formulaId: "formwork_assembly_labor_v1",
    procurementEligible: false,
    source: "PROJECT",
    resourceGraph: {
      supplyModeParameterId: "labor_supply_mode",
      sourceScheduleParameterIds: ["assembly_alignment_worker_h"],
    },
  }),
  resource({
    id: "resource-formwork-stripping-labor",
    rowId: "work:formwork:strip-clean-return-preparation",
    ordinal: 13,
    section: "Работы",
    category: "construction_work",
    titleRu: "Распалубка, очистка щитов и подготовка комплекта к возврату",
    unitId: "man_hour",
    formulaId: "formwork_stripping_labor_v1",
    procurementEligible: false,
    source: "PROJECT",
    resourceGraph: {
      supplyModeParameterId: "labor_supply_mode",
      sourceScheduleParameterIds: ["stripping_cleaning_worker_h"],
    },
  }),
  resource({
    id: "resource-formwork-layout-review",
    rowId: "service:formwork:engineer-layout-review",
    ordinal: 14,
    section: "Услуги",
    category: "service",
    titleRu: "Инженерная проверка раскладки щитов и комплектности ведомости",
    unitId: "document",
    formulaId: "formwork_layout_review_v1",
    procurementEligible: true,
    source: "PROJECT",
    resourceGraph: {
      supplyMode: "SEPARATE_PROJECT_SERVICE",
      sourceScheduleParameterIds: ["layout_review_document_count", "system_engineer_approval_reference"],
    },
  }),
  resource({
    id: "resource-formwork-crane",
    rowId: "equipment:formwork:crane-handling",
    ordinal: 15,
    section: "Механизмы",
    category: "equipment",
    titleRu: "Кран для подачи и перестановки комплекта опалубки",
    unitId: "machine_hour",
    formulaId: "formwork_crane_v1",
    procurementEligible: true,
    source: "PROJECT",
    resourceGraph: {
      supplyModeParameterId: "crane_supply_mode",
      supplyMode: "RENTAL_SEPARATE",
      sourceScheduleParameterIds: ["crane_hours", "project_stage_count"],
    },
  }),
  resource({
    id: "resource-formwork-outbound-transport",
    rowId: "delivery:formwork:outbound-kit",
    ordinal: 16,
    section: "Логистика",
    category: "delivery",
    titleRu: "Доставка комплекта опалубки на объект",
    unitId: "t_km",
    formulaId: "formwork_outbound_transport_v1",
    procurementEligible: true,
    source: "PROJECT",
    resourceGraph: {
      supplyModeParameterId: "transport_supply_mode",
      direction: "OUTBOUND",
      sourceScheduleParameterIds: ["shipping_mass_t", "outbound_distance_km"],
    },
  }),
  resource({
    id: "resource-formwork-return-transport",
    rowId: "delivery:formwork:return-kit",
    ordinal: 17,
    section: "Логистика",
    category: "delivery",
    titleRu: "Возврат арендного комплекта опалубки поставщику",
    unitId: "t_km",
    formulaId: "formwork_return_transport_v1",
    procurementEligible: true,
    source: "PROJECT",
    resourceGraph: {
      supplyModeParameterId: "transport_supply_mode",
      direction: "RETURN",
      returnableEquipment: true,
      sourceScheduleParameterIds: ["shipping_mass_t", "return_distance_km"],
    },
  }),
  resource({
    id: "resource-formwork-stage-register",
    rowId: "information:formwork:installation-stages",
    ordinal: 18,
    section: "Основание расчёта",
    category: "service",
    titleRu: "Этапы установки и перестановки по утверждённой раскладке",
    unitId: "stage",
    formulaId: "formwork_stage_count_v1",
    procurementEligible: false,
    source: "PROJECT",
    costTreatment: "INFORMATIONAL_SCOPE",
  }),
  resource({
    id: "resource-formwork-working-platform-na",
    rowId: "information:formwork:working-platform-not-applicable",
    ordinal: 19,
    section: "Неприменимые позиции",
    category: "service",
    titleRu: "Отдельная рабочая площадка не требуется: фундамент выполняется с уровня земли",
    unitId: "item",
    formulaId: "formwork_explicit_not_applicable_v1",
    procurementEligible: false,
    source: "PROJECT",
    costTreatment: "INFORMATIONAL_SCOPE",
    resourceGraph: { applicabilityParameterId: "separate_working_platform_applicability" },
  }),
  resource({
    id: "resource-formwork-supporting-construction-na",
    rowId: "information:formwork:supporting-construction-not-applicable",
    ordinal: 20,
    section: "Неприменимые позиции",
    category: "service",
    titleRu: "Отдельная поддерживающая конструкция не требуется: схема двухсторонняя со стяжками",
    unitId: "item",
    formulaId: "formwork_explicit_not_applicable_v1",
    procurementEligible: false,
    source: "PROJECT",
    costTreatment: "INFORMATIONAL_SCOPE",
    resourceGraph: { applicabilityParameterId: "supporting_construction_applicability" },
  }),
  resource({
    id: "resource-formwork-compensation-insert-na",
    rowId: "information:formwork:compensation-insert-not-applicable",
    ordinal: 21,
    section: "Неприменимые позиции",
    category: "service",
    titleRu: "Компенсационные вставки не требуются: раскладка замкнута без доборных зазоров",
    unitId: "item",
    formulaId: "formwork_explicit_not_applicable_v1",
    procurementEligible: false,
    source: "PROJECT",
    costTreatment: "INFORMATIONAL_SCOPE",
    resourceGraph: { applicabilityParameterId: "compensation_insert_applicability" },
  }),
  resource({
    id: "resource-formwork-deposit-na",
    rowId: "information:formwork:rental-deposit-not-applicable",
    ordinal: 22,
    section: "Неприменимые позиции",
    category: "service",
    titleRu: "Отдельный арендный депозит отсутствует в коммерческом предложении поставщика",
    unitId: "item",
    formulaId: "formwork_explicit_not_applicable_v1",
    procurementEligible: false,
    source: "PROJECT",
    costTreatment: "INFORMATIONAL_SCOPE",
    resourceGraph: { applicabilityParameterId: "deposit_applicability" },
  }),
  resource({
    id: "resource-formwork-maintenance-service-na",
    rowId: "information:formwork:maintenance-service-not-applicable",
    ordinal: 23,
    section: "Неприменимые позиции",
    category: "service",
    titleRu: "Отдельная сервисная плата за обслуживание не требуется: условия возврата включены в аренду",
    unitId: "item",
    formulaId: "formwork_explicit_not_applicable_v1",
    procurementEligible: false,
    source: "PROJECT",
    costTreatment: "INFORMATIONAL_SCOPE",
    resourceGraph: { applicabilityParameterId: "separate_maintenance_service_applicability" },
  }),
]);

export const FORMWORK_FRAMI_XLIFE_EXACT_INPUT: Readonly<Record<string, FormworkFramiXlifeInputValue>> =
  Object.freeze({
    product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
    measured_formwork_contact_area_m2: 100,
    project_drawing_reference: "ACCEPTANCE-FW-PC-WZ-001-REV-A",
    element_type: "Два монолитных свайных ростверка; влажная зона; приёмочный тестовый проект",
    element_dimensions_and_face_count: "2 ростверка 5,0×2,0×0,8 м; измерены 8 вертикальных граней; итог 100 м² по ведомости",
    plain_or_special_finish: "PLAIN",
    vertical_battered_horizontal_or_curved_class: "VERTICAL",
    single_or_double_sided_scope: "DOUBLE_SIDED",
    openings_voids_and_deduction_rule: "PROJECT_RULE:no openings or voids; DEDUCTION_M2=0",
    permanent_or_removable_formwork: "REMOVABLE",
    project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:ACCEPTANCE-FW-PC-WZ-001-REV-A",
    estimator_approval_reference: "ACCEPTANCE-EST-FW-001-REV-A",
    formwork_system_profile_id: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    manufacturer_document_reference: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
    project_formwork_layout_reference: "ACCEPTANCE-FW-LAYOUT-001-REV-A",
    system_engineer_approval_reference: "ACCEPTANCE-FW-ENG-001-REV-A",
    foundation_wall_thickness_cm: 80,
    panel_specification: "Щит Doka Frami Xlife 0,90×1,50 м по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-A",
    corner_element_specification: "Наружный угловой элемент Doka Frami Xlife по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-A",
    panel_connector_specification: "Зажим соединительный Doka Frami по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-A",
    frami_xlife_panel_count: 24,
    frami_xlife_corner_element_count: 8,
    frami_clamp_count: 64,
    flat_tie_rod_10_80_count: 32,
    flat_tie_rod_clip_count: 64,
    foundation_clamp_count: 32,
    plumbing_strut_260_count: 8,
    perforated_tape_50x2_length_m: 50,
    joint_sealing_tape_specification: "Лента ПЭ закрытоячеистая 30×3 мм по проектной ведомости",
    joint_sealing_tape_length_m: 40,
    form_release_agent_specification: "Разделительный состав для ламинированной поверхности Xlife по ведомости поставщика",
    form_release_agent_l: 8,
    formwork_handling_worker_h: 16,
    assembly_alignment_worker_h: 72,
    stripping_cleaning_worker_h: 32,
    layout_review_document_count: 1,
    crane_hours: 6,
    shipping_mass_t: 2.4,
    outbound_distance_km: 25,
    return_distance_km: 25,
    rental_duration_days: 14,
    project_stage_count: 2,
    reusable_equipment_supply_mode: "RENTAL_RETURNABLE",
    consumables_supply_mode: "PURCHASE_FOR_PROJECT",
    labor_supply_mode: "CONTRACTOR_SEPARATE",
    crane_supply_mode: "RENTAL_SEPARATE",
    transport_supply_mode: "SEPARATE_OUTBOUND_AND_RETURN",
    separate_working_platform_applicability: "NOT_APPLICABLE_GROUND_LEVEL_FOUNDATION",
    supporting_construction_applicability: "NOT_APPLICABLE_DOUBLE_SIDED_TIED",
    compensation_insert_applicability: "NOT_APPLICABLE_APPROVED_LAYOUT_HAS_NO_GAPS",
    deposit_applicability: "NOT_APPLICABLE_NO_DEPOSIT_IN_SUPPLIER_QUOTE",
    separate_maintenance_service_applicability: "NOT_APPLICABLE_INCLUDED_IN_RETURN_CONDITION",
  });

export const FORMWORK_FRAMI_XLIFE_SENSITIVITY_INPUT: Readonly<Record<string, FormworkFramiXlifeInputValue>> =
  Object.freeze({
    ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
    measured_formwork_contact_area_m2: 120,
    element_dimensions_and_face_count: "2 ростверка по ревизии B; измерены вертикальные грани; итог 120 м² по ведомости",
    project_drawing_reference: "ACCEPTANCE-FW-PC-WZ-001-REV-B",
    project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:ACCEPTANCE-FW-PC-WZ-001-REV-B",
    estimator_approval_reference: "ACCEPTANCE-EST-FW-001-REV-B",
    project_formwork_layout_reference: "ACCEPTANCE-FW-LAYOUT-001-REV-B",
    system_engineer_approval_reference: "ACCEPTANCE-FW-ENG-001-REV-B",
    panel_specification: "Щит Doka Frami Xlife 0,90×1,50 м по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-B",
    corner_element_specification: "Наружный угловой элемент Doka Frami Xlife по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-B",
    panel_connector_specification: "Зажим соединительный Doka Frami по ведомости ACCEPTANCE-FW-LAYOUT-001-REV-B",
    frami_xlife_panel_count: 28,
    frami_xlife_corner_element_count: 8,
    frami_clamp_count: 72,
    flat_tie_rod_10_80_count: 40,
    flat_tie_rod_clip_count: 80,
    foundation_clamp_count: 40,
    plumbing_strut_260_count: 10,
    perforated_tape_50x2_length_m: 60,
    joint_sealing_tape_length_m: 48,
    form_release_agent_l: 9.6,
    formwork_handling_worker_h: 20,
    assembly_alignment_worker_h: 86,
    stripping_cleaning_worker_h: 38,
    crane_hours: 7.2,
    shipping_mass_t: 2.8,
  });

export function formworkFramiXlifePileCapAcceptanceInputR1(
  contextKey: FormworkFramiXlifePileCapContextKey,
): Readonly<Record<string, FormworkFramiXlifeInputValue>> {
  const target = FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`FORMWORK_PILE_CAP_CONTEXT_UNSUPPORTED:${contextKey}`);
  if (contextKey === "wet_zone") return FORMWORK_FRAMI_XLIFE_EXACT_INPUT;
  const referenceKey = contextKey.toUpperCase();
  return Object.freeze({
    ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
    project_drawing_reference: `ACCEPTANCE-FW-PC-${referenceKey}-001-REV-A`,
    element_type: `Два монолитных свайных ростверка; ${target.contextRu}; приёмочный тестовый проект`,
    project_measurement_rule_reference:
      `RICS_NRM2_WS11_CONFIRMED:ACCEPTANCE-FW-PC-${referenceKey}-001-REV-A`,
    estimator_approval_reference: `ACCEPTANCE-EST-FW-PC-${referenceKey}-001-REV-A`,
    project_formwork_layout_reference: `ACCEPTANCE-FW-LAYOUT-PC-${referenceKey}-001-REV-A`,
    system_engineer_approval_reference: `ACCEPTANCE-FW-ENG-PC-${referenceKey}-001-REV-A`,
    panel_specification:
      `Щит Doka Frami Xlife 0,90×1,50 м по ведомости ACCEPTANCE-FW-LAYOUT-PC-${referenceKey}-001-REV-A`,
    corner_element_specification:
      `Наружный угловой элемент Doka Frami Xlife по ведомости ACCEPTANCE-FW-LAYOUT-PC-${referenceKey}-001-REV-A`,
    panel_connector_specification:
      `Зажим соединительный Doka Frami по ведомости ACCEPTANCE-FW-LAYOUT-PC-${referenceKey}-001-REV-A`,
  });
}

export function formworkFramiXlifeStripFoundationAcceptanceInputR1(
  contextKey: FormworkFramiXlifeStripFoundationContextKey,
): Readonly<Record<string, FormworkFramiXlifeInputValue>> {
  const target = FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`FORMWORK_STRIP_FOUNDATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const referenceKey = contextKey.toUpperCase();
  return Object.freeze({
    ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
    project_drawing_reference: `ACCEPTANCE-FW-SF-${referenceKey}-001-REV-A`,
    element_type: `Монолитный ленточный фундамент; ${target.contextRu}; приёмочный тестовый проект`,
    element_dimensions_and_face_count:
      "Ленточный фундамент общей длиной 62,5 м, высотой 0,8 м; измерены две вертикальные грани; итог 100 м²",
    project_measurement_rule_reference:
      `RICS_NRM2_WS11_CONFIRMED:ACCEPTANCE-FW-SF-${referenceKey}-001-REV-A`,
    estimator_approval_reference: `ACCEPTANCE-EST-FW-SF-${referenceKey}-001-REV-A`,
    project_formwork_layout_reference: `ACCEPTANCE-FW-LAYOUT-SF-${referenceKey}-001-REV-A`,
    system_engineer_approval_reference: `ACCEPTANCE-FW-ENG-SF-${referenceKey}-001-REV-A`,
    panel_specification:
      `Щит Doka Frami Xlife 0,90×1,50 м по ведомости ACCEPTANCE-FW-LAYOUT-SF-${referenceKey}-001-REV-A`,
    corner_element_specification:
      `Наружный угловой элемент Doka Frami Xlife по ведомости ACCEPTANCE-FW-LAYOUT-SF-${referenceKey}-001-REV-A`,
    panel_connector_specification:
      `Зажим соединительный Doka Frami по ведомости ACCEPTANCE-FW-LAYOUT-SF-${referenceKey}-001-REV-A`,
  });
}

export function formworkFramiXlifeSlabFoundationAcceptanceInputR1(
  contextKey: FormworkFramiXlifeSlabFoundationContextKey,
): Readonly<Record<string, FormworkFramiXlifeInputValue>> {
  const target = FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`FORMWORK_SLAB_FOUNDATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const referenceKey = contextKey.toUpperCase();
  return Object.freeze({
    ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
    project_drawing_reference: `ACCEPTANCE-FW-SLAB-${referenceKey}-001-REV-A`,
    element_type: `Монолитный плитный фундамент; ${target.contextRu}; приёмочный тестовый проект`,
    element_dimensions_and_face_count:
      "Плитный фундамент с периметром 125 м, высотой борта 0,8 м; измерена наружная вертикальная грань; итог 100 м²",
    project_measurement_rule_reference:
      `RICS_NRM2_WS11_CONFIRMED:ACCEPTANCE-FW-SLAB-${referenceKey}-001-REV-A`,
    estimator_approval_reference: `ACCEPTANCE-EST-FW-SLAB-${referenceKey}-001-REV-A`,
    project_formwork_layout_reference: `ACCEPTANCE-FW-LAYOUT-SLAB-${referenceKey}-001-REV-A`,
    system_engineer_approval_reference: `ACCEPTANCE-FW-ENG-SLAB-${referenceKey}-001-REV-A`,
    panel_specification:
      `Щит Doka Frami Xlife 0,90×1,50 м по ведомости ACCEPTANCE-FW-LAYOUT-SLAB-${referenceKey}-001-REV-A`,
    corner_element_specification:
      `Наружный угловой элемент Doka Frami Xlife по ведомости ACCEPTANCE-FW-LAYOUT-SLAB-${referenceKey}-001-REV-A`,
    panel_connector_specification:
      `Зажим соединительный Doka Frami по ведомости ACCEPTANCE-FW-LAYOUT-SLAB-${referenceKey}-001-REV-A`,
  });
}

export async function compileFormworkFramiXlifeProjectKitR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID;
  if (!FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`FORMWORK_FRAMI_XLIFE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.formwork-frami-xlife-project-kit-r1",
    catalogId,
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    parameterDefinitions: [...FORMWORK_FRAMI_XLIFE_PARAMETERS],
    formulaDefinitions: [...FORMWORK_FRAMI_XLIFE_FORMULAS],
    resourceDefinitions: [...FORMWORK_FRAMI_XLIFE_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 30,
    hashJson: async (value) => JSON.stringify(value),
  });
}
