import sourcePack from "../../../../../../data/estimate-benchmarks/source-packs/drywall-ceiling-preparation-preliminary-profile-r2.json";

export const DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID =
  "drywall_ceiling_interior_drywall_ceiling_prepare_large_area" as const;

export const DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID =
  `canonical-work:base:${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}` as const;

export const DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID =
  "KNAUF_ROTBAND_PASTA_PROFI_IL_2025_02" as const;

export const DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256 =
  "f8d5c542aba0e08f4e1494fca9c11854cf44230a54af4e33d65a50f68d4acfc0" as const;

export const DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_ID =
  "drywall_ceiling_preparation_preliminary_profile_r2" as const;

export const DRYWALL_CEILING_PREPARE_PROFILE_NORM_ID =
  "profile:drywall-ceiling-preparation:thin-finish-paste:r2" as const;

export const DRYWALL_CEILING_PREPARE_PROFILE_SOURCE_METADATA = Object.freeze({
  source_title: "Полный предварительный профиль подготовки существующего потолка из ГКЛ",
  source_authority: "КНАУФ; нормативная система Кыргызской Республики; согласованный MASTER S27.21",
  source_document_version: "DRYWALL_CEILING_PREPARATION_PRELIMINARY_PROFILE_R2_V2_2026-09-30",
  definition_hash: DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
  source_kind: "COMPOSITE_TECHNOLOGY_PROFILE",
  official_url: "https://www.knauf.ru/upload/iblock/ab4/nh124j9e1rc8oe5tn6d1z1yey4pwcgpb/36_IL_KNAUF_Rotband_Pasta_Profi_25_03_2025_v01_Preview.pdf",
  artifact_sha256: DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
  effective_from: "2026-09-30",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join("; "),
  use_restriction: sourcePack.scope,
});

export const DRYWALL_CEILING_PREPARE_INDEPENDENT_REQUIRED_COMPONENTS = Object.freeze(
  sourcePack.independentRequiredComposition.map((component) => Object.freeze({
    ...component,
    rowId: `${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}:successor-r56:row:${component.rowKey}`,
    formulaId: `${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}:successor-r56:formula:${component.rowKey}`,
  })),
);

export const DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_COMPONENTS = Object.freeze(
  sourcePack.conditionalRequiredComposition.map((component) => Object.freeze({
    ...component,
    rowId: `${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}:successor-r56:row:${component.rowKey}`,
    formulaId: `${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}:successor-r56:formula:${component.rowKey}`,
  })),
);

export const DRYWALL_CEILING_PREPARE_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PRODUCT_SYSTEM_TDS",
  generatedFromCurrentRows: false,
  evidenceSha256: DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
  sourcePackPath:
    "data/estimate-benchmarks/source-packs/drywall-ceiling-preparation-preliminary-profile-r2.json",
  entries: [
    ...DRYWALL_CEILING_PREPARE_INDEPENDENT_REQUIRED_COMPONENTS.map((component) => ({
    operationId: "PREPARE_THIN_FINISH_PASTE_EXISTING_DRYWALL_CEILING",
    expectedResourceId: `required-component:${component.componentId}`,
    category: component.category,
    specification: component.rowKey,
    condition: "DEFAULT_PRELIMINARY_PROFILE",
    sourceId: component.sourceId,
    quantityRule: component.quantityBasis,
    formulaId: component.formulaId,
    resolution: { kind: "ROW", rowId: component.rowId },
    })),
    ...DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_COMPONENTS.map((component) => ({
      operationId: "CONDITIONAL_REPAIR_EXISTING_DRYWALL_CEILING",
      expectedResourceId: `conditional-component:${component.componentId}`,
      category: component.category,
      specification: component.rowKey,
      condition: component.condition,
      sourceId: component.sourceId,
      quantityRule: component.quantityBasis,
      formulaId: component.formulaId,
      resolution: { kind: "ROW", rowId: component.rowId },
    })),
  ],
});

export const DRYWALL_CEILING_PREPARE_DEFAULT_REQUIRED_ROW_IDS = Object.freeze(
  DRYWALL_CEILING_PREPARE_INDEPENDENT_REQUIRED_COMPONENTS.map((component) => component.rowId),
);

export const DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS = Object.freeze(
  DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_COMPONENTS.map((component) => component.rowId),
);

export function drywallCeilingPrepareMissingRequiredRows(
  actualRowIds: ReadonlySet<string>,
): string[] {
  return DRYWALL_CEILING_PREPARE_DEFAULT_REQUIRED_ROW_IDS.filter((rowId) => !actualRowIds.has(rowId));
}

/**
 * Visible and editable first-estimate profile for the exact P.6 control
 * scenario in MASTER S27.21: the old ceiling condition is unknown until the
 * survey, so the base 0.3 mm finish coat remains calculable while repair rows
 * stay visible as localized preliminary needs. Geometry remains user/project
 * input. Manufacturer values and replaceable planning assumptions are kept in
 * separate classifications so neither can masquerade as the other.
 */
export const DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1 = Object.freeze({
  work_included: true,
  estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
  preparation_operation: "THIN_FINISH_PASTE",
  primer_requirement_state: "NOT_REQUIRED_BY_SELECTED_SYSTEM",
  finish_product_reference: "Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи, ведро 18 кг",
  finish_paste_consumption_kg_m2: 0.48,
  finish_paste_order_reserve_percent: 5,
  finish_paste_package_kg: 18,
  finish_abrasive_product_reference: "Абразивный круг P240 для выбранной шлифовальной машины",
  finish_abrasive_productivity_m2_per_item: 25,
  repair_requirement_state: "NEEDS_SITE_INPUT",
  protected_area_ratio_to_ceiling: 1,
  protective_film_overlap_factor: 1.1,
  protective_film_roll_coverage_m2: 200,
  protection_tape_m_per_ceiling_m2: 0.24,
  masking_tape_roll_length_m: 50,
  waste_bag_coverage_m2_per_item: 50,
  dust_extractor_requirement_state: "REQUIRED",
  preliminary_area_m2_per_shift: 250,
  elevated_work_requirement_state: "REQUIRED",
  working_height_m: 3,
  access_environment: "INDOOR",
  access_system_type: "MOBILE_TOWER",
  access_platform_height_m: 2,
  access_horizontal_reach_m: 0,
  access_route_clear_width_m: 0.8,
  access_base_load_capacity_kg_m2: 500,
  access_platform_load_kg: 200,
  access_restrictions: "NONE",
  access_supply_mode: "RENTAL",
  fall_protection_requirement_state: "INCLUDED_IN_ACCESS_SYSTEM",
  height_worker_count: 2,
  ppe_glove_pairs_per_worker_shift: 1,
  ppe_respirators_per_worker_shift: 1,
  material_delivery_trip_count: 1,
  access_transport_pricing_mode: "SEPARATE_LEGS",
  access_delivery_trip_count: 1,
  access_return_trip_count: 1,
  waste_removal_trip_count: 1,
} as const);

export const DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1 = Object.freeze({
  work_included: "RUNTIME_STRUCTURAL_DEFAULT",
  estimate_scope_mode: "RUNTIME_STRUCTURAL_DEFAULT",
  preparation_operation: "ASSUMPTION",
  primer_requirement_state: "NORMATIVE",
  finish_product_reference: "NORMATIVE",
  finish_paste_consumption_kg_m2: "NORMATIVE",
  finish_paste_order_reserve_percent: "ASSUMPTION",
  finish_paste_package_kg: "ASSUMPTION",
  finish_abrasive_product_reference: "NORMATIVE",
  finish_abrasive_productivity_m2_per_item: "ASSUMPTION",
  repair_requirement_state: "DERIVED",
  protected_area_ratio_to_ceiling: "ASSUMPTION",
  protective_film_overlap_factor: "ASSUMPTION",
  protective_film_roll_coverage_m2: "ASSUMPTION",
  protection_tape_m_per_ceiling_m2: "ASSUMPTION",
  masking_tape_roll_length_m: "ASSUMPTION",
  waste_bag_coverage_m2_per_item: "ASSUMPTION",
  dust_extractor_requirement_state: "ASSUMPTION",
  preliminary_area_m2_per_shift: "ASSUMPTION",
  elevated_work_requirement_state: "ASSUMPTION",
  working_height_m: "ASSUMPTION",
  access_environment: "ASSUMPTION",
  access_system_type: "ASSUMPTION",
  access_platform_height_m: "ASSUMPTION",
  access_horizontal_reach_m: "ASSUMPTION",
  access_route_clear_width_m: "ASSUMPTION",
  access_base_load_capacity_kg_m2: "ASSUMPTION",
  access_platform_load_kg: "ASSUMPTION",
  access_restrictions: "ASSUMPTION",
  access_supply_mode: "ASSUMPTION",
  fall_protection_requirement_state: "DERIVED",
  height_worker_count: "ASSUMPTION",
  ppe_glove_pairs_per_worker_shift: "ASSUMPTION",
  ppe_respirators_per_worker_shift: "ASSUMPTION",
  material_delivery_trip_count: "ASSUMPTION",
  access_transport_pricing_mode: "ASSUMPTION",
  access_delivery_trip_count: "ASSUMPTION",
  access_return_trip_count: "ASSUMPTION",
  waste_removal_trip_count: "ASSUMPTION",
} as const);

export const DRYWALL_CEILING_PREPARE_PRELIMINARY_PROVENANCE_RU_R1 = Object.freeze({
  work_included: "Выбранная работа включена в первую смету; пользователь может исключить её уточнением.",
  estimate_scope_mode: "Первая смета показывает полный применимый состав выбранной работы, а не длинную обязательную анкету.",
  preparation_operation: "Для первой сметы выбран тонкий сплошной финишный слой; операция видна и редактируется после результата.",
  primer_requirement_state: "Для выбранной пасты и подготовленного основания информационный лист КНАУФ не требует грунтования.",
  finish_product_reference: "Выбран продукт КНАУФ-Ротбанд Паста Профи, к которому относится паспортный расход.",
  finish_paste_consumption_kg_m2: "Информационный лист КНАУФ, редакция 02/2025, стр. 2: 0,48 кг/м² при слое 0,3 мм.",
  finish_paste_order_reserve_percent: "Для контрольного сценария явно принят резерв заказа 5%; это редактируемое допущение, не норма производителя.",
  finish_paste_package_kg: "Выбрано ведро 18 кг из фасовок 5, 18 и 25 кг, перечисленных в информационном листе КНАУФ.",
  finish_abrasive_product_reference: "Информационный лист КНАУФ требует после высыхания P240 или более мелкое зерно.",
  finish_abrasive_productivity_m2_per_item: "Предварительно принято 25 м² на круг; заменить ресурсом выбранного абразива.",
  repair_requirement_state: "До обследования состояние старого потолка неизвестно: базовая подготовка рассчитана, а ремонтная ветвь ждёт только площадь дефектов и длину повреждённых швов.",
  protected_area_ratio_to_ceiling: "Предварительно площадь укрытия равна площади потолка; заменить фактическим обмером пола и оборудования.",
  protective_film_overlap_factor: "Для раскладки укрывной плёнки предварительно принят коэффициент нахлёстов 1,10.",
  protective_film_roll_coverage_m2: "Выбрана учебная фасовка плёнки 4×50 м, то есть 200 м² в рулоне.",
  protection_tape_m_per_ceiling_m2: "Для контрольных 500 м² задана раскладка 120 м, то есть 0,24 м/м².",
  masking_tape_roll_length_m: "Выбрана учебная фасовка малярной ленты 50 м в рулоне.",
  waste_bag_coverage_m2_per_item: "Предварительно принят один мешок на 50 м²; заменить планом обращения с отходами.",
  dust_extractor_requirement_state: "Для выбранного механизированного шлифования принят отдельный промышленный пылесос.",
  preliminary_area_m2_per_shift: "Предварительно принято 250 м² за смену для планирования механизмов; заменить ППР и выбранной техникой.",
  elevated_work_requirement_state: "Для предварительного профиля принят доступ с передвижной вышки-туры; заменить условиями объекта и ППР.",
  working_height_m: "Предварительно принята высота 3 м; заменить обмером.",
  access_environment: "Предварительно принято сухое внутреннее помещение.",
  access_system_type: "Предварительно выбрана передвижная вышка-тура с ограждением.",
  access_platform_height_m: "Предварительно принята площадка на высоте 2 м; заменить паспортом выбранной вышки.",
  access_horizontal_reach_m: "Для вышки не заложен горизонтальный вылет; заменить фактической схемой доступа.",
  access_route_clear_width_m: "Предварительно принят свободный маршрут шириной 0,8 м.",
  access_base_load_capacity_kg_m2: "Предварительно принято основание с допустимой нагрузкой 500 кг/м²; подтвердить по объекту.",
  access_platform_load_kg: "Предварительно принята нагрузка рабочей площадки 200 кг; подтвердить паспортом вышки.",
  access_restrictions: "В предварительном сценарии специальные ограничения маршрута не заданы.",
  access_supply_mode: "Предварительно принята аренда вышки-туры.",
  fall_protection_requirement_state: "Предварительно отдельная система не закупается: защита включена в выбранную ограждённую вышку; заменить по ППР.",
  height_worker_count: "Предварительно приняты два одновременно работающих человека.",
  ppe_glove_pairs_per_worker_shift: "Предварительно одна пара защитных перчаток на работника за смену.",
  ppe_respirators_per_worker_shift: "Предварительно один подходящий респиратор на работника за смену.",
  material_delivery_trip_count: "Предварительно принят один консолидированный рейс материалов.",
  access_transport_pricing_mode: "Доставка и возврат арендованной вышки показаны отдельными рейсами.",
  access_delivery_trip_count: "Предварительно принят один рейс доставки вышки.",
  access_return_trip_count: "Предварительно принят один рейс возврата вышки.",
  waste_removal_trip_count: "Предварительно принят один рейс вывоза упаковки и пыли.",
} as const);
