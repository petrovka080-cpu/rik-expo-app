/* Generated from the independently frozen BATCH-003 expected-resource scope.
 * The production builder consumes this implementation contract; the independent
 * auditor reads the frozen evidence directly and never imports this module.
 */

export type DrywallFlatCeilingOperationV6 = "PREPARE" | "FRAME" | "ALIGN" | "INSULATE" | "CLAD" | "FINISH_JOINT" | "REPAIR";
export type DrywallFlatCeilingVariantV6 = "standard" | "large_area" | "small_area" | "technical_room" | "wet_zone" | "high_load";
export type DrywallFlatCeilingExpectedCandidateV6 = {
  candidateId: string;
  category: "material" | "labor" | "equipment" | "transport" | "testing" | "documentation" | "subcontract_service" | "temporary_work" | "waste";
  titleRu: string;
  unitId: string;
  applicability: "APPLICABLE" | "CONDITIONAL";
  basis?: string;
};

export const DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6: readonly string[] = Object.freeze([
  "drywall_ceiling_interior_drywall_ceiling_align_large_area",
  "drywall_ceiling_interior_drywall_ceiling_align_small_area",
  "drywall_ceiling_interior_drywall_ceiling_align_standard",
  "drywall_ceiling_interior_drywall_ceiling_align_technical_room",
  "drywall_ceiling_interior_drywall_ceiling_align_wet_zone",
  "drywall_ceiling_interior_drywall_ceiling_clad_high_load",
  "drywall_ceiling_interior_drywall_ceiling_clad_large_area",
  "drywall_ceiling_interior_drywall_ceiling_clad_small_area",
  "drywall_ceiling_interior_drywall_ceiling_clad_standard",
  "drywall_ceiling_interior_drywall_ceiling_clad_technical_room",
  "drywall_ceiling_interior_drywall_ceiling_clad_wet_zone",
  "drywall_ceiling_interior_drywall_ceiling_finish_joint_large_area",
  "drywall_ceiling_interior_drywall_ceiling_finish_joint_small_area",
  "drywall_ceiling_interior_drywall_ceiling_finish_joint_standard",
  "drywall_ceiling_interior_drywall_ceiling_finish_joint_technical_room",
  "drywall_ceiling_interior_drywall_ceiling_finish_joint_wet_zone",
  "drywall_ceiling_interior_drywall_ceiling_frame_large_area",
  "drywall_ceiling_interior_drywall_ceiling_frame_small_area",
  "drywall_ceiling_interior_drywall_ceiling_frame_standard",
  "drywall_ceiling_interior_drywall_ceiling_frame_technical_room",
  "drywall_ceiling_interior_drywall_ceiling_frame_wet_zone",
  "drywall_ceiling_interior_drywall_ceiling_insulate_large_area",
  "drywall_ceiling_interior_drywall_ceiling_insulate_small_area",
  "drywall_ceiling_interior_drywall_ceiling_insulate_standard",
  "drywall_ceiling_interior_drywall_ceiling_insulate_technical_room",
  "drywall_ceiling_interior_drywall_ceiling_insulate_wet_zone",
  "drywall_ceiling_interior_drywall_ceiling_prepare_large_area",
  "drywall_ceiling_interior_drywall_ceiling_prepare_small_area",
  "drywall_ceiling_interior_drywall_ceiling_prepare_standard",
  "drywall_ceiling_interior_drywall_ceiling_prepare_technical_room",
  "drywall_ceiling_interior_drywall_ceiling_prepare_wet_zone",
  "drywall_ceiling_interior_drywall_ceiling_repair_large_area",
  "drywall_ceiling_interior_drywall_ceiling_repair_small_area",
  "drywall_ceiling_interior_drywall_ceiling_repair_standard",
  "drywall_ceiling_interior_drywall_ceiling_repair_technical_room",
  "drywall_ceiling_interior_drywall_ceiling_repair_wet_zone"
]);

const COMMON: readonly DrywallFlatCeilingExpectedCandidateV6[] = Object.freeze([
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "scope_condition_survey",
    "category": "testing",
    "titleRu": "Обследование фронта и подтверждение исходных условий",
    "unitId": "test"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "approved_shop_drawing_review",
    "category": "subcontract_service",
    "titleRu": "Инженерная проверка рабочей раскладки и узлов",
    "unitId": "service"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "mep_interface_coordination",
    "category": "subcontract_service",
    "titleRu": "Координация светильников, решеток, проходок и люков с MEP",
    "unitId": "service"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "material_submittal_approval",
    "category": "documentation",
    "titleRu": "Согласование материалов и комплектной системы",
    "unitId": "document"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "existing_finish_protection",
    "category": "material",
    "titleRu": "Защита существующих полов, стен и оборудования",
    "unitId": "m2"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "dust_partition_and_extraction",
    "category": "temporary_work",
    "titleRu": "Локальная пылезащитная зона и пылеудаление",
    "unitId": "service"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "access_tower_delivery",
    "category": "transport",
    "titleRu": "Доставка сертифицированной вышки или подмащивания",
    "unitId": "trip"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "access_tower_assembly",
    "category": "temporary_work",
    "titleRu": "Монтаж и приемка средств доступа",
    "unitId": "service"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "access_tower_operation",
    "category": "equipment",
    "titleRu": "Эксплуатация и перестановка средств доступа",
    "unitId": "machine_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "access_tower_dismantle",
    "category": "temporary_work",
    "titleRu": "Демонтаж и возврат средств доступа",
    "unitId": "service"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "material_delivery",
    "category": "transport",
    "titleRu": "Доставка материалов на объект",
    "unitId": "t_km"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "supplier_loading",
    "category": "labor",
    "titleRu": "Погрузка материалов у поставщика",
    "unitId": "man_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "site_unloading",
    "category": "labor",
    "titleRu": "Разгрузка материалов на объекте",
    "unitId": "man_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "horizontal_material_movement",
    "category": "labor",
    "titleRu": "Внутриплощадочное горизонтальное перемещение",
    "unitId": "man_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "vertical_material_lift",
    "category": "equipment",
    "titleRu": "Механизированный или ручной подъем к рабочему горизонту",
    "unitId": "machine_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "temporary_protected_power",
    "category": "equipment",
    "titleRu": "Временное защищенное питание инструмента",
    "unitId": "machine_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "temporary_task_lighting",
    "category": "equipment",
    "titleRu": "Временное рабочее освещение зоны",
    "unitId": "machine_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "ppe_consumables",
    "category": "material",
    "titleRu": "СИЗ дыхания, глаз, рук и слуха",
    "unitId": "person_shift"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "barriers_and_warning_signs",
    "category": "material",
    "titleRu": "Ограждения и предупреждающие знаки",
    "unitId": "set"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "incoming_material_inspection",
    "category": "testing",
    "titleRu": "Входной контроль партий материалов",
    "unitId": "test"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "waste_collection",
    "category": "labor",
    "titleRu": "Сбор отходов по месту образования",
    "unitId": "man_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "waste_sorting",
    "category": "labor",
    "titleRu": "Раздельная сортировка отходов и возвратных ресурсов",
    "unitId": "man_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "waste_loading",
    "category": "labor",
    "titleRu": "Погрузка отходов для вывоза",
    "unitId": "man_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "waste_haul",
    "category": "transport",
    "titleRu": "Вывоз отходов подтвержденному получателю",
    "unitId": "t_km"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "waste_receiver_service",
    "category": "waste",
    "titleRu": "Прием и учет отходов уполномоченным получателем",
    "unitId": "t"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "final_work_zone_cleaning",
    "category": "labor",
    "titleRu": "Финишная уборка и обеспыливание",
    "unitId": "man_hour"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "stage_photo_record",
    "category": "documentation",
    "titleRu": "Фотофиксация контрольной стадии",
    "unitId": "document"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "work_journal_entry",
    "category": "documentation",
    "titleRu": "Запись в журнале производства работ",
    "unitId": "document"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "certificate_register",
    "category": "documentation",
    "titleRu": "Реестр сертификатов и паспортов примененных материалов",
    "unitId": "document"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "hidden_or_stage_acceptance_act",
    "category": "documentation",
    "titleRu": "Акт освидетельствования скрытой или самостоятельной стадии",
    "unitId": "document"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "executive_measurement_scheme",
    "category": "documentation",
    "titleRu": "Исполнительная схема и карта контрольных замеров",
    "unitId": "document"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "quality_control_protocol",
    "category": "documentation",
    "titleRu": "Протокол контроля качества самостоятельной стадии",
    "unitId": "document"
  },
  {
    "applicability": "APPLICABLE",
    "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
    "candidateId": "owner_handover_act",
    "category": "documentation",
    "titleRu": "Акт передачи результата следующему владельцу или заказчику",
    "unitId": "document"
  }
] as DrywallFlatCeilingExpectedCandidateV6[]);
const OPERATION: Readonly<Record<DrywallFlatCeilingOperationV6, readonly DrywallFlatCeilingExpectedCandidateV6[]>> = Object.freeze({
  "ALIGN": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "adjustable_hanger_parts",
      "category": "material",
      "titleRu": "Регулировочные детали подвесов",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "corrective_connectors",
      "category": "material",
      "titleRu": "Корректирующие соединители",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "system_shims",
      "category": "material",
      "titleRu": "Системные регулировочные прокладки",
      "unitId": "item"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "local_cross_profiles",
      "category": "material",
      "titleRu": "Локальные дополнительные перемычки",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "correction_fasteners",
      "category": "material",
      "titleRu": "Крепеж корректирующих элементов",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "reference_grid_setout",
      "category": "labor",
      "titleRu": "Разбивка контрольной сетки отметок",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "hanger_adjustment",
      "category": "labor",
      "titleRu": "Регулировка подвесов по контрольной сетке",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "local_reinforcement_installation",
      "category": "labor",
      "titleRu": "Установка локальных усилений",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "node_refastening",
      "category": "labor",
      "titleRu": "Перефиксация ослабленных соединений",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "laser_plane_survey",
      "category": "equipment",
      "titleRu": "Лазерная съемка плоскости",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "deviation_gauge",
      "category": "equipment",
      "titleRu": "Контрольный измерительный инструмент",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "final_deviation_survey",
      "category": "testing",
      "titleRu": "Итоговая съемка отклонений",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "deviation_map",
      "category": "documentation",
      "titleRu": "Карта отклонений и корректировок",
      "unitId": "document"
    }
  ],
  "CLAD": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "first_layer_gypsum_board",
      "category": "material",
      "titleRu": "Гипсокартонная плита первого слоя",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "additional_layer_gypsum_board",
      "category": "material",
      "titleRu": "Гипсокартонные плиты дополнительных слоев",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "first_layer_screws",
      "category": "material",
      "titleRu": "Винты крепления первого слоя",
      "unitId": "item"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "additional_layer_screws",
      "category": "material",
      "titleRu": "Винты крепления дополнительных слоев",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "separation_tape",
      "category": "material",
      "titleRu": "Разделительная лента примыканий",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "elastic_perimeter_sealant",
      "category": "material",
      "titleRu": "Эластичный герметик периметра",
      "unitId": "kg"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "opening_sleeves_and_edges",
      "category": "material",
      "titleRu": "Обрамление и гильзы отверстий",
      "unitId": "item"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "movement_joint_component",
      "category": "material",
      "titleRu": "Компонент деформационного шва",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "surface_protection_sheet",
      "category": "material",
      "titleRu": "Защита смонтированной обшивки до сдачи",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "frame_readiness_survey",
      "category": "testing",
      "titleRu": "Приемка каркаса перед закрытием",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "board_layout_and_stagger_plan",
      "category": "documentation",
      "titleRu": "Карта раскладки и разбежки швов",
      "unitId": "document"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "board_cutting",
      "category": "labor",
      "titleRu": "Раскрой плит по карте",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "edge_preparation",
      "category": "labor",
      "titleRu": "Обработка заводских и резаных кромок",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "first_layer_installation",
      "category": "labor",
      "titleRu": "Монтаж первого слоя плит",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "additional_layer_installation",
      "category": "labor",
      "titleRu": "Монтаж дополнительных слоев",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "opening_cutouts",
      "category": "labor",
      "titleRu": "Вырезы под люки, светильники и MEP",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "board_lift",
      "category": "equipment",
      "titleRu": "Подъемник листов",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "board_saw",
      "category": "equipment",
      "titleRu": "Инструмент раскроя плит",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cladding_screwdriver",
      "category": "equipment",
      "titleRu": "Шуруповерт с ограничителем глубины",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "fastener_depth_test",
      "category": "testing",
      "titleRu": "Контроль глубины и шага крепежа",
      "unitId": "test"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "layer_stagger_test",
      "category": "testing",
      "titleRu": "Контроль разбежки стыков слоев",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cladding_handover",
      "category": "documentation",
      "titleRu": "Передача обшивки владельцу заделки швов",
      "unitId": "document"
    }
  ],
  "FINISH_JOINT": [
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "edge_primer",
      "category": "material",
      "titleRu": "Грунтовка резаных кромок",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "base_joint_compound",
      "category": "material",
      "titleRu": "Базовый состав заделки швов",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "finish_joint_compound",
      "category": "material",
      "titleRu": "Финишный состав швов",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "paper_joint_tape",
      "category": "material",
      "titleRu": "Бумажная армирующая лента",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "internal_corner_tape",
      "category": "material",
      "titleRu": "Лента внутренних углов",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "external_corner_profile",
      "category": "material",
      "titleRu": "Профиль наружных углов",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "separation_tape_joint",
      "category": "material",
      "titleRu": "Разделительная лента примыканий",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "elastic_joint_sealant",
      "category": "material",
      "titleRu": "Эластичный герметик примыканий",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "screw_head_compound",
      "category": "material",
      "titleRu": "Состав обработки головок крепежа",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "coarse_abrasive",
      "category": "material",
      "titleRu": "Абразив промежуточного шлифования",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "fine_abrasive",
      "category": "material",
      "titleRu": "Абразив финишного шлифования",
      "unitId": "item"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cut_edge_bevel",
      "category": "labor",
      "titleRu": "Формирование фаски резаных кромок",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "edge_dedusting",
      "category": "labor",
      "titleRu": "Обеспыливание кромок",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "gap_prefill",
      "category": "labor",
      "titleRu": "Предварительное заполнение раскрытых зазоров",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "base_layer_application",
      "category": "labor",
      "titleRu": "Нанесение базового слоя состава",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "tape_embedding",
      "category": "labor",
      "titleRu": "Втапливание армирующей ленты",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "second_layer_application",
      "category": "labor",
      "titleRu": "Нанесение второго слоя",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "finish_layer_application",
      "category": "labor",
      "titleRu": "Нанесение финишного слоя",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "screw_head_treatment",
      "category": "labor",
      "titleRu": "Послойная обработка головок винтов",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "corner_treatment",
      "category": "labor",
      "titleRu": "Обработка внутренних и наружных углов",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "technological_drying",
      "category": "temporary_work",
      "titleRu": "Выдержка технологических интервалов с контролем условий",
      "unitId": "service"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "joint_mixer",
      "category": "equipment",
      "titleRu": "Миксер приготовления состава",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "sander_with_dust_extraction",
      "category": "equipment",
      "titleRu": "Шлифмашина с пылеудалением",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "surface_quality_test",
      "category": "testing",
      "titleRu": "Контроль плоскости, полос и качества поверхности",
      "unitId": "test"
    }
  ],
  "FRAME": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "perimeter_track",
      "category": "material",
      "titleRu": "Периметральный направляющий профиль",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "primary_ceiling_profile",
      "category": "material",
      "titleRu": "Несущий профиль первого уровня",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "secondary_ceiling_profile",
      "category": "material",
      "titleRu": "Поперечный профиль второго уровня",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "profile_splice_connectors",
      "category": "material",
      "titleRu": "Соединители продольных стыков профиля",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cross_profile_connectors",
      "category": "material",
      "titleRu": "Одно- или двухуровневые соединители пересечений",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "adjustable_hangers",
      "category": "material",
      "titleRu": "Регулируемые подвесы проектного типа",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "hanger_rods_or_wire",
      "category": "material",
      "titleRu": "Тяги, проволока или резьбовые шпильки подвесов",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "hanger_clips_and_nuts",
      "category": "material",
      "titleRu": "Зажимы, гайки, шайбы и контргайки подвесов",
      "unitId": "set"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "slab_hanger_anchors",
      "category": "material",
      "titleRu": "Анкеры подвесов к несущему основанию",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "perimeter_track_anchors",
      "category": "material",
      "titleRu": "Анкеры периметрального профиля",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "metal_to_metal_screws",
      "category": "material",
      "titleRu": "Винты металл-металл",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "acoustic_perimeter_tape",
      "category": "material",
      "titleRu": "Уплотнительная или акустическая лента периметра",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "access_hatch_reinforcement_profile",
      "category": "material",
      "titleRu": "Профиль усиления ревизионных люков",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "mep_opening_reinforcement_profile",
      "category": "material",
      "titleRu": "Профиль усиления MEP-проходок и оборудования",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "movement_joint_profile",
      "category": "material",
      "titleRu": "Профиль деформационного или контрольного шва",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cut_edge_corrosion_protection",
      "category": "material",
      "titleRu": "Защита мест реза металлического профиля",
      "unitId": "l"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "frame_hidden_labels",
      "category": "material",
      "titleRu": "Маркировка скрытых элементов и зон нагрузок",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "anchor_point_layout",
      "category": "labor",
      "titleRu": "Разметка точек анкеров и подвесов",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "anchor_hole_drilling",
      "category": "labor",
      "titleRu": "Сверление отверстий с пылеудалением",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "anchor_installation",
      "category": "labor",
      "titleRu": "Установка и контроль анкеров",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "profile_cutting",
      "category": "labor",
      "titleRu": "Раскрой профилей по карте",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "perimeter_track_installation",
      "category": "labor",
      "titleRu": "Монтаж направляющего периметра",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "hanger_installation",
      "category": "labor",
      "titleRu": "Монтаж подвесов и тяг",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "primary_profile_installation",
      "category": "labor",
      "titleRu": "Монтаж несущих профилей",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "secondary_profile_installation",
      "category": "labor",
      "titleRu": "Монтаж поперечных профилей",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "opening_reinforcement_installation",
      "category": "labor",
      "titleRu": "Усиление люков и инженерных отверстий",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "frame_level_adjustment",
      "category": "labor",
      "titleRu": "Пространственная выверка каркаса",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "profile_cut_treatment",
      "category": "labor",
      "titleRu": "Обработка мест реза профиля",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "laser_level",
      "category": "equipment",
      "titleRu": "Лазерный нивелир",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "utility_locator",
      "category": "equipment",
      "titleRu": "Трассоискатель скрытых коммуникаций",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "rotary_hammer",
      "category": "equipment",
      "titleRu": "Перфоратор для анкеровки",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "dust_extractor",
      "category": "equipment",
      "titleRu": "Промышленное пылеудаление при сверлении",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "profile_cutting_tool",
      "category": "equipment",
      "titleRu": "Механизированный инструмент раскроя профиля",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "screwdriver",
      "category": "equipment",
      "titleRu": "Шуруповерт монтажа каркаса",
      "unitId": "machine_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "anchor_pull_test",
      "category": "testing",
      "titleRu": "Выборочное испытание или контроль анкеров",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "hanger_spacing_check",
      "category": "testing",
      "titleRu": "Контроль шага подвесов и профилей",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "frame_level_and_plane_survey",
      "category": "testing",
      "titleRu": "Приемочная съемка уровня, плоскости и жесткости",
      "unitId": "test"
    }
  ],
  "INSULATE": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "primary_insulation_layer",
      "category": "material",
      "titleRu": "Изоляция основного проектного слоя",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "additional_insulation_layers",
      "category": "material",
      "titleRu": "Изоляция дополнительных слоев",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "acoustic_membrane",
      "category": "material",
      "titleRu": "Акустическая мембрана",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "vapour_control_membrane",
      "category": "material",
      "titleRu": "Пароизоляционная мембрана",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "support_mesh",
      "category": "material",
      "titleRu": "Поддерживающая сетка изоляции",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "disc_fasteners",
      "category": "material",
      "titleRu": "Тарельчатые или системные фиксаторы",
      "unitId": "item"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "membrane_tape",
      "category": "material",
      "titleRu": "Лента герметизации мембраны",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "perimeter_sealant",
      "category": "material",
      "titleRu": "Герметик периметра изоляционного контура",
      "unitId": "kg"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "penetration_cuffs",
      "category": "material",
      "titleRu": "Манжеты инженерных проходок",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cavity_dryness_test",
      "category": "testing",
      "titleRu": "Контроль сухости полости до закрытия",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "insulation_cutting",
      "category": "labor",
      "titleRu": "Раскрой изоляции без щелей",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "mep_fitting",
      "category": "labor",
      "titleRu": "Подгонка изоляции вокруг MEP-элементов",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "layer_installation",
      "category": "labor",
      "titleRu": "Послойная установка изоляции",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "membrane_installation",
      "category": "labor",
      "titleRu": "Монтаж и герметизация мембраны",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "insulation_cutting_tool",
      "category": "equipment",
      "titleRu": "Инструмент точного раскроя изоляции",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "insulation_dust_extractor",
      "category": "equipment",
      "titleRu": "Пылеудаление при раскрое",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "insulation_continuity_test",
      "category": "testing",
      "titleRu": "Контроль сплошности и отсутствия щелей",
      "unitId": "test"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "membrane_integrity_test",
      "category": "testing",
      "titleRu": "Контроль герметичности мембраны",
      "unitId": "test"
    }
  ],
  "PREPARE": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "substrate_plane_survey",
      "category": "testing",
      "titleRu": "Инструментальная съемка плоскости и отметок",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "substrate_moisture_test",
      "category": "testing",
      "titleRu": "Контроль влажности основания и помещения",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "hidden_utility_detection",
      "category": "equipment",
      "titleRu": "Поиск скрытых коммуникаций перед сверлением или ремонтом",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "ceiling_axis_laser_setout",
      "category": "labor",
      "titleRu": "Лазерная разбивка осей и проектной отметки потолка",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "control_benchmark_markers",
      "category": "material",
      "titleRu": "Реперы и контрольные метки",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "floor_protection_board",
      "category": "material",
      "titleRu": "Жесткая защита пола",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "protective_film",
      "category": "material",
      "titleRu": "Защитная пленка поверхностей и оборудования",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "masking_sealing_tape",
      "category": "material",
      "titleRu": "Лента герметизации защитных укрытий",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "substrate_vacuum_cleaning",
      "category": "labor",
      "titleRu": "Очистка и обеспыливание основания",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "loose_layer_removal",
      "category": "labor",
      "titleRu": "Удаление непрочных локальных участков",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "local_base_repair",
      "category": "labor",
      "titleRu": "Локальное восстановление допустимых дефектов основания",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "base_repair_compound",
      "category": "material",
      "titleRu": "Ремонтный состав для локальных дефектов",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "compatible_substrate_primer",
      "category": "material",
      "titleRu": "Совместимая грунтовка основания",
      "unitId": "kg"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "trial_area_material",
      "category": "material",
      "titleRu": "Материалы пробного участка",
      "unitId": "set"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "trial_area_execution",
      "category": "labor",
      "titleRu": "Устройство и оценка пробного участка",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "base_readiness_acceptance",
      "category": "testing",
      "titleRu": "Приемка готовности основания и фронта",
      "unitId": "test"
    }
  ],
  "REPAIR": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "defect_survey",
      "category": "testing",
      "titleRu": "Детальное обследование дефектов",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cause_determination",
      "category": "subcontract_service",
      "titleRu": "Диагностика причины повреждения",
      "unitId": "service"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "moisture_survey",
      "category": "testing",
      "titleRu": "Карта влажности ремонтной зоны",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "frame_support_survey",
      "category": "testing",
      "titleRu": "Обследование каркаса, подвесов и основания",
      "unitId": "test"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_mep_coordination",
      "category": "subcontract_service",
      "titleRu": "Координация ремонта с MEP-владельцами",
      "unitId": "service"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_equipment_protection",
      "category": "material",
      "titleRu": "Защита оборудования и отделки",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_dust_enclosure",
      "category": "temporary_work",
      "titleRu": "Герметичная пылезащитная зона ремонта",
      "unitId": "service"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "temporary_frame_support",
      "category": "temporary_work",
      "titleRu": "Временное поддержание ослабленной конструкции",
      "unitId": "service"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "demolition_boundary_marking",
      "category": "labor",
      "titleRu": "Разметка границ контролируемого вскрытия",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "local_controlled_opening",
      "category": "labor",
      "titleRu": "Контролируемое вскрытие конструкции",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "finish_layer_removal",
      "category": "labor",
      "titleRu": "Удаление поврежденного финишного слоя",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "board_layer_removal",
      "category": "labor",
      "titleRu": "Послойный демонтаж поврежденных плит",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "joint_and_corner_removal",
      "category": "labor",
      "titleRu": "Удаление поврежденных швов и углов",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "insulation_removal",
      "category": "labor",
      "titleRu": "Извлечение загрязненной изоляции",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "fastener_removal",
      "category": "labor",
      "titleRu": "Демонтаж поврежденного крепежа",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "profile_removal",
      "category": "labor",
      "titleRu": "Демонтаж поврежденных профилей",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "reusable_resource_sorting",
      "category": "labor",
      "titleRu": "Отбор и учет пригодных возвратных материалов",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_profile",
      "category": "material",
      "titleRu": "Новый профиль точного типа",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_connectors",
      "category": "material",
      "titleRu": "Новые соединители ремонтного контура",
      "unitId": "item"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_anchors_hangers",
      "category": "material",
      "titleRu": "Новые анкеры и подвесы",
      "unitId": "item"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_contour_reinforcement",
      "category": "material",
      "titleRu": "Профиль усиления ремонтного контура",
      "unitId": "m"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_insulation",
      "category": "material",
      "titleRu": "Новая изоляция",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_membrane",
      "category": "material",
      "titleRu": "Новая мембрана и герметизирующая лента",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_board_first_layer",
      "category": "material",
      "titleRu": "Плита первого восстанавливаемого слоя",
      "unitId": "m2"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_board_additional_layers",
      "category": "material",
      "titleRu": "Плиты дополнительных слоев",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replacement_layer_fasteners",
      "category": "material",
      "titleRu": "Крепеж восстановленных слоев",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_joint_tape",
      "category": "material",
      "titleRu": "Лента ремонтных швов",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_base_compound",
      "category": "material",
      "titleRu": "Базовый ремонтный состав",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_finish_compound",
      "category": "material",
      "titleRu": "Финишный ремонтный состав",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_compatible_primer",
      "category": "material",
      "titleRu": "Совместимая грунтовка ремонтной зоны",
      "unitId": "kg"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "frame_reinstatement",
      "category": "labor",
      "titleRu": "Восстановление каркаса и подвесов",
      "unitId": "man_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "insulation_reinstatement",
      "category": "labor",
      "titleRu": "Восстановление изоляции и мембраны",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "board_reinstatement",
      "category": "labor",
      "titleRu": "Послойное восстановление обшивки",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "joint_reinstatement",
      "category": "labor",
      "titleRu": "Восстановление швов и углов",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_demolition_saw",
      "category": "equipment",
      "titleRu": "Пила контролируемого вскрытия",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_dust_extractor",
      "category": "equipment",
      "titleRu": "Пылеудаление ремонта",
      "unitId": "machine_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_moisture_meter",
      "category": "equipment",
      "titleRu": "Измеритель влажности",
      "unitId": "machine_hour"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_frame_tool",
      "category": "equipment",
      "titleRu": "Инструмент восстановления каркаса",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_board_tool",
      "category": "equipment",
      "titleRu": "Инструмент раскроя и крепления плит",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "cause_elimination_test",
      "category": "testing",
      "titleRu": "Подтверждение устранения причины дефекта",
      "unitId": "test"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "preclosure_moisture_test",
      "category": "testing",
      "titleRu": "Контроль влажности до закрытия",
      "unitId": "test"
    },
    {
      "applicability": "CONDITIONAL",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "anchor_support_test",
      "category": "testing",
      "titleRu": "Контроль восстановленных анкеров и подвесов",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_plane_test",
      "category": "testing",
      "titleRu": "Контроль плоскости и отметки ремонта",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "hidden_layer_test",
      "category": "testing",
      "titleRu": "Контроль восстановленных скрытых слоев",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "before_during_after_photo",
      "category": "documentation",
      "titleRu": "Фотофиксация до, во время и после ремонта",
      "unitId": "document"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "replaced_reused_schedule",
      "category": "documentation",
      "titleRu": "Ведомость замененных и сохраненных ресурсов",
      "unitId": "document"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_as_built_record",
      "category": "documentation",
      "titleRu": "Исполнительная запись ремонтного контура",
      "unitId": "document"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "repair_final_acceptance",
      "category": "testing",
      "titleRu": "Итоговая приемка устраненного дефекта",
      "unitId": "test"
    }
  ]
} as Record<DrywallFlatCeilingOperationV6, DrywallFlatCeilingExpectedCandidateV6[]>);
const VARIANT: Readonly<Record<DrywallFlatCeilingVariantV6, readonly DrywallFlatCeilingExpectedCandidateV6[]>> = Object.freeze({
  "standard": [],
  "large_area": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "large_area_control_zones",
      "category": "testing",
      "titleRu": "Дополнительные контрольные захватки большой площади",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "large_area_joint_review",
      "category": "subcontract_service",
      "titleRu": "Проверка деформационных и контрольных швов",
      "unitId": "service"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "large_area_internal_logistics",
      "category": "transport",
      "titleRu": "Логистика между захватками",
      "unitId": "t_m"
    }
  ],
  "small_area": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "small_area_manual_feed",
      "category": "labor",
      "titleRu": "Ручная подача в стесненной зоне",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "small_area_local_cutting",
      "category": "labor",
      "titleRu": "Локальный раскрой в стесненной зоне",
      "unitId": "man_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "small_area_compact_enclosure",
      "category": "temporary_work",
      "titleRu": "Компактная пылезащитная зона",
      "unitId": "service"
    }
  ],
  "technical_room": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "technical_room_permit_loto",
      "category": "documentation",
      "titleRu": "Permit/LOTO решение владельца оборудования",
      "unitId": "document"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "technical_equipment_protection",
      "category": "material",
      "titleRu": "Защита действующего оборудования",
      "unitId": "m2"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "technical_extra_utility_detection",
      "category": "equipment",
      "titleRu": "Расширенный поиск коммуникаций",
      "unitId": "machine_hour"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "technical_interface_scheme",
      "category": "documentation",
      "titleRu": "Исполнительная схема MEP-интерфейсов",
      "unitId": "document"
    }
  ],
  "wet_zone": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "wet_zone_material_compatibility",
      "category": "testing",
      "titleRu": "Проверка совместимости материалов влажной зоны",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "wet_zone_corrosion_resistant_fasteners",
      "category": "material",
      "titleRu": "Коррозионностойкий крепеж",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "wet_zone_cut_protection",
      "category": "material",
      "titleRu": "Защита мест реза и обработки",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "wet_zone_moisture_control",
      "category": "testing",
      "titleRu": "Контроль влажности перед закрытием",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "wet_zone_edge_penetration_seal",
      "category": "material",
      "titleRu": "Герметизация кромок и проходок",
      "unitId": "kg"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "wet_zone_protocol",
      "category": "documentation",
      "titleRu": "Протокол условий влажной зоны",
      "unitId": "document"
    }
  ],
  "high_load": [
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_engineering_check",
      "category": "subcontract_service",
      "titleRu": "Инженерная проверка расчетной нагрузки",
      "unitId": "service"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_primary_profile",
      "category": "material",
      "titleRu": "Усиленный несущий профиль",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_supplemental_hangers",
      "category": "material",
      "titleRu": "Дополнительные подвесы",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_supplemental_anchors",
      "category": "material",
      "titleRu": "Дополнительные анкеры",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_local_reinforcement",
      "category": "material",
      "titleRu": "Локальные усиления в точках нагрузок",
      "unitId": "m"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_connection_fasteners",
      "category": "material",
      "titleRu": "Усиленный крепеж соединений",
      "unitId": "item"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_proof_test",
      "category": "testing",
      "titleRu": "Контрольная проверка усиленных узлов",
      "unitId": "test"
    },
    {
      "applicability": "APPLICABLE",
      "basis": "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
      "candidateId": "high_load_capacity_protocol",
      "category": "documentation",
      "titleRu": "Протокол допустимой нагрузки и зон крепления",
      "unitId": "document"
    }
  ]
} as Record<DrywallFlatCeilingVariantV6, DrywallFlatCeilingExpectedCandidateV6[]>);

export function drywallFlatCeilingExpectedCandidatesV6(operation: DrywallFlatCeilingOperationV6, variant: DrywallFlatCeilingVariantV6): readonly DrywallFlatCeilingExpectedCandidateV6[] {
  return [...COMMON, ...OPERATION[operation], ...VARIANT[variant]];
}
