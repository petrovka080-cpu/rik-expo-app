import type { CanonicalEstimateParameterDefinition } from "../backendPlatform/canonicalEstimateCompileCore";
import { REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID } from "./reinforcementBarScheduleProfileIdentityV1";

export const STRIP_FOUNDATION_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_standard", titleRu: "Армирование ленточного фундамента в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_high_load", titleRu: "Армирование ленточного фундамента в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_repair", titleRu: "Армирование ремонтного участка ленточного фундамента", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_technical_room", titleRu: "Армирование ленточного фундамента технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_wet_zone", titleRu: "Армирование ленточного фундамента во влажной зоне", contextRu: "влажная зона" },
] as const);

export const SLAB_FOUNDATION_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_standard", titleRu: "Армирование плитного фундамента в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_high_load", titleRu: "Армирование плитного фундамента в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_repair", titleRu: "Армирование ремонтного участка плитного фундамента", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_technical_room", titleRu: "Армирование плитного фундамента технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_reinforce_wet_zone", titleRu: "Армирование плитного фундамента во влажной зоне", contextRu: "влажная зона" },
] as const);

export const CONCRETE_SLAB_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_standard", titleRu: "Армирование бетонной плиты в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_high_load", titleRu: "Армирование бетонной плиты в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_repair", titleRu: "Армирование ремонтного участка бетонной плиты", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_technical_room", titleRu: "Армирование бетонной плиты технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_reinforce_wet_zone", titleRu: "Армирование бетонной плиты во влажной зоне", contextRu: "влажная зона" },
] as const);

export const PILE_CAP_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_standard", titleRu: "Армирование ростверка в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_high_load", titleRu: "Армирование ростверка в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_repair", titleRu: "Армирование ремонтного участка ростверка", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_technical_room", titleRu: "Армирование ростверка технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_reinforce_wet_zone", titleRu: "Армирование ростверка во влажной зоне", contextRu: "влажная зона" },
] as const);

export const PEDESTAL_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_standard", titleRu: "Армирование бетонного пьедестала в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_high_load", titleRu: "Армирование бетонного пьедестала в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_repair", titleRu: "Армирование ремонтного участка бетонного пьедестала", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_technical_room", titleRu: "Армирование бетонного пьедестала технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_reinforce_wet_zone", titleRu: "Армирование бетонного пьедестала во влажной зоне", contextRu: "влажная зона" },
] as const);

export const STAIRS_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_standard", titleRu: "Армирование бетонной лестницы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_high_load", titleRu: "Армирование бетонной лестницы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_repair", titleRu: "Армирование ремонтного участка бетонной лестницы", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_technical_room", titleRu: "Армирование бетонной лестницы технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_reinforce_wet_zone", titleRu: "Армирование бетонной лестницы во влажной зоне", contextRu: "влажная зона" },
] as const);

export const REINFORCEMENT_FRAME_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_standard", titleRu: "Армирование армокаркаса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_high_load", titleRu: "Армирование армокаркаса в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_repair", titleRu: "Армирование ремонтного участка армокаркаса", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_technical_room", titleRu: "Армирование армокаркаса технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_wet_zone", titleRu: "Армирование армокаркаса во влажной зоне", contextRu: "влажная зона" },
] as const);

export const REINFORCEMENT_FRAME_ASSEMBLY_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_form_standard", titleRu: "Устройство армокаркаса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_form_high_load", titleRu: "Устройство армокаркаса для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_form_repair", titleRu: "Устройство армокаркаса с локальным ремонтом основания", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_form_technical_room", titleRu: "Устройство армокаркаса в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_reinforcement_frame_form_wet_zone", titleRu: "Устройство армокаркаса во влажной зоне", contextRu: "влажная зона" },
] as const);

export const COLUMN_BASE_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_standard", titleRu: "Армирование столбчатого основания в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_high_load", titleRu: "Армирование столбчатого основания в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_repair", titleRu: "Армирование ремонтного участка столбчатого основания", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_technical_room", titleRu: "Армирование столбчатого основания технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_reinforce_wet_zone", titleRu: "Армирование столбчатого основания во влажной зоне", contextRu: "влажная зона" },
] as const);

export const ANCHOR_GROUP_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_reinforce_standard", titleRu: "Армирование анкерной группы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_reinforce_high_load", titleRu: "Армирование анкерной группы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_reinforce_repair", titleRu: "Армирование ремонтного участка анкерной группы", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_reinforce_technical_room", titleRu: "Армирование анкерной группы технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_reinforce_wet_zone", titleRu: "Армирование анкерной группы во влажной зоне", contextRu: "влажная зона" },
] as const);

export const BELT_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_standard", titleRu: "Армирование монолитного пояса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_high_load", titleRu: "Армирование монолитного пояса в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_repair", titleRu: "Армирование ремонтного участка монолитного пояса", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_technical_room", titleRu: "Армирование монолитного пояса технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_belt_reinforce_wet_zone", titleRu: "Армирование монолитного пояса во влажной зоне", contextRu: "влажная зона" },
] as const);

export const JOINT_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_joint_reinforce_standard", titleRu: "Армирование краёв деформационного шва в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_joint_reinforce_high_load", titleRu: "Армирование краёв деформационного шва в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_joint_reinforce_repair", titleRu: "Армирование краёв деформационного шва на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_joint_reinforce_technical_room", titleRu: "Армирование краёв деформационного шва технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_joint_reinforce_wet_zone", titleRu: "Армирование краёв деформационного шва во влажной зоне", contextRu: "влажная зона" },
] as const);

export const FORMWORK_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_standard", titleRu: "Монтаж арматуры монолитной конструкции в опалубке стандартной зоны", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_high_load", titleRu: "Монтаж арматуры монолитной конструкции в опалубке зоны высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_repair", titleRu: "Монтаж арматуры монолитной конструкции в опалубке ремонтного участка", contextRu: "ремонтный участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_technical_room", titleRu: "Монтаж арматуры монолитной конструкции в опалубке технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_formwork_reinforce_wet_zone", titleRu: "Монтаж арматуры монолитной конструкции в опалубке влажной зоны", contextRu: "влажная зона" },
] as const);

export const STRIP_FOUNDATION_REINFORCEMENT_PARAMETER_SPECS = Object.freeze([
  ["product_profile_id", "Правило определения массы арматуры", "enum", null, [REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID]],
  ["approved_reinforcement_schedule_weight_kg", "Масса по утверждённой ведомости стержней", "decimal", "kg", null],
  ["bar_bending_schedule_reference", "Утверждённая ведомость стержней", "text", null, null],
  ["structural_drawing_and_revision_reference", "Конструктивный чертёж и ревизия", "text", null, null],
  ["bar_standard_and_grade", "Стандарт и класс арматуры", "text", null, null],
  ["bar_size_designation", "Обозначение размера стержня", "text", null, null],
  ["nominal_diameter_mm", "Номинальный диаметр стержня", "decimal", "mm", null],
  ["shape_straight_bent_curved_or_link", "Форма стержня", "text", null, null],
  ["bar_count_and_cut_length_m", "Число стержней и длины резки", "text", null, null],
  ["selected_standard_mass_kg_per_m", "Масса погонного метра по выбранной таблице", "decimal", "kg_per_m", null],
  ["laps_hooks_chairs_connectors_and_accessories_scope", "Состав нахлёстов, крюков, фиксаторов и соединителей", "text", null, null],
  ["fabrication_allowance_if_documented", "Документированный запас изготовления", "text", null, null],
  ["supplier_bundle_or_length_constraints", "Ограничения поставщика по длинам и пакетам", "text", null, null],
  ["estimator_approval_reference", "Согласование ведомости сметчиком", "text", null, null],
  ["fabrication_mode", "Способ изготовления арматурных каркасов", "enum", null, ["READY_CAGES", "SITE_FABRICATED"]],
  ["binding_wire_specification", "Спецификация вязальной проволоки", "text", null, null],
  ["binding_wire_mass_kg", "Масса вязальной проволоки", "decimal", "kg", null],
  ["spacer_chair_designation", "Обозначение фиксаторов защитного слоя", "text", null, null],
  ["spacer_chair_quantity_piece", "Количество фиксаторов защитного слоя", "decimal", "piece", null],
  ["mechanical_couplers_applicable", "Механические муфты применяются", "boolean", null, null],
  ["mechanical_coupler_designation", "Обозначение механических муфт", "text", null, null],
  ["mechanical_coupler_quantity_piece", "Количество механических муфт", "decimal", "piece", null],
  ["unloading_and_storage_worker_h", "Трудозатраты на разгрузку и складирование", "decimal", "man_hour", null],
  ["site_cutting_worker_h", "Трудозатраты на резку стержней", "decimal", "man_hour", null],
  ["site_bending_worker_h", "Трудозатраты на гибку стержней", "decimal", "man_hour", null],
  ["cage_assembly_worker_h", "Трудозатраты на сборку каркасов", "decimal", "man_hour", null],
  ["installation_worker_h", "Трудозатраты на установку и вязку каркасов", "decimal", "man_hour", null],
  ["cover_control_worker_h", "Трудозатраты на контроль защитного слоя и геометрии", "decimal", "man_hour", null],
  ["rebar_cutting_machine_h", "Работа станка резки арматуры", "decimal", "machine_hour", null],
  ["rebar_bending_machine_h", "Работа станка гибки арматуры", "decimal", "machine_hour", null],
  ["lifting_equipment_applicable", "Подъёмное оборудование применяется", "boolean", null, null],
  ["lifting_equipment_designation", "Обозначение подъёмного оборудования", "text", null, null],
  ["lifting_machine_h", "Работа подъёмного оборудования", "decimal", "machine_hour", null],
  ["reinforcement_inspection_service_h", "Инженерный контроль армирования", "decimal", "service_hour", null],
  ["mill_certificate_package_count", "Комплект сертификатов на арматурную сталь", "decimal", "document", null],
  ["delivery_pricing_mode", "Учёт доставки арматуры", "enum", null, ["SEPARATE", "INCLUDED_IN_SUPPLY"]],
  ["reinforcement_delivery_distance_km", "Расстояние доставки арматуры", "decimal", "km", null],
] as const);

// A projection of the single original input specification, without normative assembly.
export const STRIP_FOUNDATION_REINFORCEMENT_PROMPT_PARAMETERS: readonly (
  Pick<CanonicalEstimateParameterDefinition, "parameter_id" | "value_type" | "required"> & { title_ru: string }
)[] = Object.freeze(
  STRIP_FOUNDATION_REINFORCEMENT_PARAMETER_SPECS.map(([parameter_id, title_ru, value_type]) => ({
    parameter_id, title_ru, value_type, required: true,
  })),
);
