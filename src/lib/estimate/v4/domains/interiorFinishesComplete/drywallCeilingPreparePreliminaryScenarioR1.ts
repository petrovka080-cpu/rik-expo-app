export const DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID =
  "drywall_ceiling_interior_drywall_ceiling_prepare_large_area" as const;

export const DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID =
  `canonical-work:base:${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}` as const;

export const DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID =
  "KNAUF_ROTBAND_PASTA_PROFI_IL_2025_02" as const;

/**
 * A visible and editable first-estimate scenario for the selected preparation
 * work. Geometry is deliberately absent: it must come from the user or the
 * project. Surface damage, site logistics, access, protection and abrasive
 * productivity are also absent and remain refinements instead of invented
 * quantities. Silence about damage must never mean that repair is unnecessary.
 */
export const DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1 = Object.freeze({
  work_included: true,
  estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
  preparation_operation: "THIN_FINISH_PASTE",
  primer_requirement_state: "NOT_REQUIRED_BY_SELECTED_SYSTEM",
  finish_product_reference: "Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи",
  finish_paste_consumption_kg_m2: 0.48,
  finish_paste_order_reserve_percent: 0,
} as const);

export const DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1 = Object.freeze({
  work_included: "RUNTIME_STRUCTURAL_DEFAULT",
  estimate_scope_mode: "RUNTIME_STRUCTURAL_DEFAULT",
  preparation_operation: "ASSUMPTION",
  primer_requirement_state: "NORMATIVE",
  finish_product_reference: "NORMATIVE",
  finish_paste_consumption_kg_m2: "NORMATIVE",
  finish_paste_order_reserve_percent: "ASSUMPTION",
} as const);

export const DRYWALL_CEILING_PREPARE_PRELIMINARY_PROVENANCE_RU_R1 = Object.freeze({
  work_included: "Выбранная работа включена в первую смету; пользователь может исключить её уточнением.",
  estimate_scope_mode: "Первая смета показывает полный применимый состав выбранной работы, а не длинную обязательную анкету.",
  preparation_operation: "Для первой сметы выбран тонкий сплошной финишный слой; операция видна и редактируется после результата.",
  primer_requirement_state: "Для выбранной пасты и подготовленного основания информационный лист КНАУФ не требует грунтования.",
  finish_product_reference: "Выбран продукт КНАУФ-Ротбанд Паста Профи, к которому относится паспортный расход.",
  finish_paste_consumption_kg_m2: "Информационный лист КНАУФ, редакция 02/2025, стр. 2: 0,48 кг/м² при слое 0,3 мм.",
  finish_paste_order_reserve_percent: "Дополнительный резерв заказа не добавляется автоматически; пользователь может выбрать его явно.",
} as const);
