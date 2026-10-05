import { buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { WET_ZONE_COMPLETION_DEFINITION_S2735 as waterproofing, WET_ZONE_COMPLETION_SOURCE_METADATA_S2735 as source,
  WET_ZONE_COMPLETION_ROWS_S2735 as wp } from "./wetZoneWaterproofingCompletionS2735";
import { PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES as readyTile } from "./porcelainFloorTileInstallationR1";
import { CONCRETE_SLAB_REPAIR_PARAMETERS as repairParameters, CONCRETE_SLAB_REPAIR_FORMULAS as repairFormulas,
  CONCRETE_SLAB_REPAIR_RESOURCES as repairResources } from "./concreteSlabRepairR1";

export const WET_ROOM_PROFESSIONAL_CONTRACT_S2735 = "wet-room-professional:s27-35.v1";
export const WET_ROOM_PROFESSIONAL_CATALOG_ID_S2735 = "canonical-work:base:tile_stone_interior_porcelain_tile_lay_wet_zone";
export const WET_ROOM_PROFESSIONAL_SOURCE_ID_S2735 = "src_wet_room_professional_s27_35";
export const WET_ROOM_PROFESSIONAL_NORM_ID_S2735 = "norm:wet-room-professional:s27-35.v1";
export const WET_ROOM_PROFESSIONAL_SOURCE_METADATA_S2735 = Object.freeze({ ...source,
  source_document_version: WET_ROOM_PROFESSIONAL_CONTRACT_S2735, definition_hash: WET_ROOM_PROFESSIONAL_CONTRACT_S2735,
  source_title: "Пол санузла: повторное использование CL51 и плиточной операции; проверенные TDS и видимый предварительный профиль",
  use_restriction: "Предварительная ресурсная смета, без цен и без подтверждения обследования. Геометрия, раскладка, фактические проходки, применимость поставляемых продуктов и готовность основания требуют проверки. Труд и машино-часы не заменяются демонстрационными нормами.",
});
const profile = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
  defaultValue: string | number, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: "profile", defaultValue, ...extra });
const fact = (id: string, title: string, unitId: string | null, valueType: AutomaticParameterSpec["valueType"] = "decimal",
  extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id, title, unitId, valueType, kind: "conditional", min: valueType === "decimal" ? 0 : undefined, ...extra });
const preliminaryWp: Record<string, string | number> = {
  cl51_delivered_version: "EXPRESS_1K_EN_GL_03_2024", wet_zone_type: "bathroom", substrate_type: "cement_screed",
  area_scope_reference: "Площадь запроса — только пол. Заходы гидроизоляции на стены добавляются отдельно. Пока геометрия прямоугольная по видимому отношению сторон; периметр и высота захода требуют обмера. Ремонт, выравнивание, уклоны — по обследованию.",
  method_reference: "Предварительный профиль: подготовленная впитывающая цементная стяжка; CT17 PROFI ru_KZ один проход без разбавления; CL51 EXPRESS1-K en_GL03/2024 два слоя, сухая плёнка ≥0.5мм. Готовые углы CL86/87, лента CL152120мм, нахлёст≥50мм. Обследование и соответствие поставленных продуктов не подтверждены.",
  payment_scope_reference: "Оплата только отдельных ресурсов и фактических часов труда. Площадь облицовки и контроль — информационные, отдельной ставки нет. Материалы/оснастка/машино-часы исключены из ставки труда; оператор включён в фактический труд. Цены не заданы.",
  selected_bucket_size_kg: "5", primer_mode: "CT17", ct17_selected_total_consumption_l_m2: 0.2, ct17_application_count: 1,
  ct17_first_pass_water_ratio: "0", ct17_container_l: "5", tape_supplier_roll_length_m: 10,
  penetration_collar_count: 0, floor_collar_count: 0, internal_corner_count: 4, external_corner_count: 0,
  equipment_mode: "VACUUM_CLEANING", equipment_designation: "Строительный пылесос для подготовки; фактические часы уточнить",
  qa_interval_m2_per_test: 10, documentation_record_count: 1,
  delivery_mode: "SEPARATE_TRIPS", delivery_reference: "Единая доставка всех материалов пола; число рейсов и включение доставки поставщиком уточнить",
  brush_count: 1, roller_count: 1, tray_count: 1, scraper_count: 1, glove_pair_count: 2, filter_mask_count: 2,
};
const parameters: AutomaticParameterSpec[] = [
  profile("substrate_repair_mode", "Ремонт минерального основания: обследование ещё не выполнено; подключить только по выявленным повреждениям", "enum", null, "SURVEY_PENDING", { values: ["SURVEY_PENDING", "NOT_REQUIRED", "REQUIRED"] }),
  profile("floor_leveling_mode", "Выравнивание/формирование уклона: обследование ещё не выполнено; подключить по проектным отметкам", "enum", null, "SURVEY_PENDING", { values: ["SURVEY_PENDING", "NOT_REQUIRED", "REQUIRED"] }),
  fact("repair_additional_water_l", "Дополнительная чистая вода ремонта по фактическому способу;0 при сухой/готовой технологии", "l", "decimal", { requiredWhen: {kind:"equals",parameterId:"substrate_repair_mode",value:"REQUIRED"} }),
  fact("formation_additional_water_l", "Дополнительная чистая вода выравнивания/уклона по выбранной смеси и способу", "l", "decimal", { requiredWhen: {kind:"equals",parameterId:"floor_leveling_mode",value:"REQUIRED"} }),
  profile("applicability_mode", "Применимость CL51: предварительный профиль либо шесть подтверждённых фактов; геометрия и обследование всего пола отдельно", "enum", null, "PRELIMINARY_PROFILE", { values: ["PRELIMINARY_PROFILE", "CL51_CONFIRMED_FACTS"] }),
  profile("room_aspect_ratio", "Отношение сторон прямоугольного пола: предварительно 1; замените по обмеру", "decimal", null, 1, { min: 0.01, max: 100 }),
  profile("wall_upturn_height_m", "Высота захода гидроизоляции на стены: предварительно 0.15м, не норматив для всех санузлов", "decimal", "m", 0.15, { min: 0, max: 3 }),
  profile("tape_overlap_m", "Нахлёст ленты на готовые углы CL86/87: минимум50мм; выбранный предварительный размер", "decimal", "m", 0.05, { min: 0.05 }),
  profile("tape_additional_junction_m", "Дополнительные стыки/примыкания вне периметра: предварительно0м, уточнить по узлам", "decimal", "m", 0, { min: 0 }),
  profile("tile_length_mm", "Предварительно керамогранит600×600мм; формат заменить по спецификации", "decimal", "mm", 600, { min: 301, max: 1200 }),
  profile("tile_width_mm", "Ширина выбранной плитки, мм", "decimal", "mm", 600, { min: 301, max: 1200 }),
  profile("tile_thickness_mm", "Толщина плитки/глубина межплиточного шва: предварительно8мм", "decimal", "mm", 8, { min: 1, max: 20 }),
  profile("joint_width_mm", "Предварительная ширина межплиточного шва2мм; заменить по раскладке", "decimal", "mm", 2, { min: 1, max: 10 }),
  profile("tile_cut_allowance_percent", "Предварительный припуск плитки на подрезку10%; требует раскладки, это не норма изготовителя", "decimal", null, 10, { min: 0, max: 100 }),
  profile("tile_pack_piece", "Предварительная коробка4плитки; заменить по выбранному артикулу", "integer", "piece", 4, { min: 1 }),
  profile("porcelain_tile_designation", "Спецификация плитки: артикул/цвет/калибр/противоскольжение и коробка требуют выбора", "text", null, "Керамогранит для пола мокрой зоны; предварительный формат задан отдельно, артикул и пригодность уточнить"),
  profile("adhesive_total_rate_kg_m2", "CM17 en_GL04/2026: таблица3.7кг/м² при12мм; предварительно4.2 с0.5 на обратную сторону, подтвердить пробным нанесением", "decimal", "kg_per_m2", 4.2, { min: 3.7, max: 20 }),
  profile("adhesive_pack_kg", "Выбранный мешок CM17 en_GL04/2026,25кг", "integer", "kg", 25, { min: 25, max: 25 }),
  profile("adhesive_water_l_kg", "CM17 вода: предварительно0.35л/кг внутри диапазона8.5–9л/25кг", "decimal", "l_per_kg", 0.35, { min: 0.34, max: 0.36 }),
  profile("grout_wet_density_kg_l", "CE40 ru_KZ: выбранная плотность свежей смеси1.75кг/л, TDS1.75±0.1", "decimal", "kg_per_l", 1.75, { min: 1.65, max: 1.85 }),
  profile("grout_water_l_kg", "CE40 ru_KZ вода: предварительно0.29л/кг, TDS0.56–0.60л/2кг", "decimal", "l_per_kg", 0.29, { min: 0.28, max: 0.30 }),
  profile("grout_loss_percent", "Предварительный припуск затирки10%; не опубликованная норма расхода600×600", "decimal", null, 10, { min: 0, max: 100 }),
  profile("grout_color", "Цвет и единая партия CE40: предварительно серый07, согласовать с плиткой", "text", null, "CE40 Aquastatic ru_KZ, серый07, ведро2кг; цвет и партия уточнить"),
  profile("silicone_joint_width_mm", "Предварительная ширина герметизируемого примыкания6мм", "decimal", "mm", 6, { min: 6, max: 30 }),
  profile("silicone_joint_depth_mm", "Предварительная глубина герметика6мм; фактический узел уточнить", "decimal", "mm", 6, { min: 2, max: 15 }),
  profile("backer_rod_diameter_mm", "Предварительный диаметр закрытоячеистого шнура8мм; должен превышать ширину шва, подбор подтвердить узлом", "integer", "mm", 8, { min: 1, max: 50, numericPeerConstraints: { greaterThanParameter: "silicone_joint_width_mm" } }),
  profile("clip_per_tile_edge", "Предварительно2расходуемые клипсы на одну внутреннюю сторону плитки; не норма изготовителя", "integer", "piece", 2, { min: 0, max: 10 }),
  profile("clip_pack_piece", "Предварительная упаковка клипс100шт, уточнить выбранную систему", "integer", "piece", 100, { min: 1 }),
  profile("water_supply_quantum_l", "Общая чистая вода: предварительная кратность поставки5л; заменить условиями объекта", "decimal", "l", 5, { min: 0.001 }),
  profile("water_stock_l", "Доступная общая вода объекта: предварительно0л, уточнить", "decimal", "l", 0, { min: 0 }),
  profile("water_reserve_l", "Сохраняемый запас общей воды: предварительно0л", "decimal", "l", 0, { min: 0 }),
  profile("wp_cleanup_water_l_m2", "Предварительная вода уборки гидроизоляции0.2л/м², не норма изготовителя", "decimal", "l_per_m2", 0.2, { min: 0 }),
  profile("tile_cleanup_water_l_m2", "Предварительная вода мойки плитки/инструмента0.4л/м², не норма изготовителя", "decimal", "l_per_m2", 0.4, { min: 0 }),
  fact("tile_worker_h", "Фактический труд раскладки, резки, замешивания и укладки; оператор входит сюда", "man_hour"),
  fact("grout_worker_h", "Фактический труд очистки и заполнения швов", "man_hour"),
  fact("seal_worker_h", "Фактический труд герметизации примыканий", "man_hour"),
  fact("final_cleaning_worker_h", "Фактический труд окончательной уборки/защиты и сдачи; без второй оплаты межоперационной уборки", "man_hour"),
  fact("wet_tile_saw_machine_h", "Фактические машино-часы станка водяной резки; без оплаты оператора второй раз", "machine_hour"),
  fact("mixer_machine_h", "Фактические часы низкооборотного миксера400–800об/мин", "machine_hour"),
];
const perimeter = "2*(sqrt(area_m2*room_aspect_ratio)+sqrt(area_m2/room_aspect_ratio))";
const tileArea = "tile_length_mm*tile_width_mm/1000000";
const grout = "area_m2*(tile_length_mm+tile_width_mm)/(tile_length_mm*tile_width_mm)*joint_width_mm*tile_thickness_mm*grout_wet_density_kg_l/(1+grout_water_l_kg)*(1+grout_loss_percent/100)";
const wpWater = "(area_m2+waterproofing_wall_upturn_area_m2)*ct17_selected_total_consumption_l_m2*ct17_first_pass_water_ratio+area_m2*wp_cleanup_water_l_m2";
const tileWater = `area_m2*adhesive_total_rate_kg_m2*adhesive_water_l_kg+(${grout})*grout_water_l_kg+area_m2*tile_cleanup_water_l_m2`;
const rows: AutomaticRowSpec[] = [
  { rowId: "scope:wet-room:substrate-survey", formulaId: "wet_room_substrate_survey_requirement_v1", section: "Готовность основания", category: "construction_work",
    title: "Обследование основания: ремонт, выравнивание и уклон не подтверждены; условные операции подключаются только после выбора", unitId:"item",expression:"1",costTreatment:"INFORMATIONAL_SCOPE" },
  { rowId: "scope:wet-room:wall-upturn", formulaId: "wet_room_wall_upturn_v1", section: "Границы и геометрия", category: "construction_work", title: "Заходы гидроизоляции на стены сверх площади пола, по предварительной геометрии", unitId: "m2",
    expression: `(${perimeter})*wall_upturn_height_m`, costTreatment: "INFORMATIONAL_SCOPE", effectiveQuantityOutput: { parameterId: "waterproofing_wall_upturn_area_m2", unitId: "m2" } },
  { rowId: "scope:wet-room:tape-takeoff", formulaId: "wet_room_tape_takeoff_v1", section: "Границы и геометрия", category: "construction_work", title: "Лента: периметр + два нахлёста на каждый готовый угол + дополнительные примыкания", unitId: "m",
    expression: `(${perimeter})+2*(internal_corner_count+external_corner_count)*tape_overlap_m+tape_additional_junction_m`, costTreatment: "INFORMATIONAL_SCOPE", effectiveQuantityOutput: { parameterId: "junction_tape_length_m", unitId: "m" } },
];
function order(rowId: string, title: string, unitId: string, consumed: string, quantum: string, section: string, titleParameterIds?: string[]) {
  const stockId = `${rowId.replace(/[^a-z0-9]/giu,"_")}_stock`, reserveId = `${stockId}_reserve`;
  parameters.push(profile(stockId, `${title}: доступный остаток, предварительно0`, "decimal", unitId, 0, { min: 0 }),
    profile(reserveId, `${title}: сохраняемый резерв, предварительно0`, "decimal", unitId, 0, { min: 0 }));
  rows.push({ rowId, formulaId: rowId.replace(/[^a-z0-9]/giu,"_")+"_v1", section, category: "material", title, unitId,
    expression: `ceil(max(0,(${consumed})+${reserveId}-${stockId})/(${quantum}))*(${quantum})`, procurement: true, titleParameterIds,
    ...effectivePurchaseBalanceExpressionsR1({ ownerRowId: rowId, orderUnitId: unitId, consumed, stock: stockId, reserve: reserveId, quantum }) .owner });
}
function tileId(suffix: string) { const row = readyTile.find(row=>row.row_id===`rc09:${suffix}`);if(!row)throw Error("READY_TILE_OPERATION_MISSING:"+suffix);return row.row_id; }
order(tileId("porcelain_tile_600x600"), "Керамогранит пола: площадь с видимым припуском на подрезку; коробка по выбранному профилю", "m2", "area_m2*(1+tile_cut_allowance_percent/100)", `tile_pack_piece*(${tileArea})`, "Укладка плитки", ["porcelain_tile_designation", "tile_length_mm", "tile_width_mm", "tile_pack_piece"]);
order(tileId("c2te_s1_tile_adhesive"), "Ceresit CM17 SUPER FLEXIBLE en_GL04/2026, мешок25кг; общий выбранный расход включает обратную сторону", "kg", "area_m2*adhesive_total_rate_kg_m2", "adhesive_pack_kg", "Укладка плитки");
order(tileId("cement_grout_2mm_joint"), "Ceresit CE40 Aquastatic ru_KZ, ведро2кг; предварительная геометрия швов и выбранный припуск", "kg", grout, "2", "Затирка швов", ["grout_color"]);
order(tileId("tile_leveling_consumable_clip_2mm"), "Расходуемые клипсы СВП выбранного шва; геометрическая предварительная потребность", "piece", `ceil(area_m2/(${tileArea})*2*clip_per_tile_edge)`, "clip_pack_piece", "Укладка плитки");
order(tileId("neutral_silicone_movement_joint"), "Ceresit CS16 NEUTRAL UNIVERSAL uk_UA, прозрачный, картридж280мл; предварительный шов", "l", `(${perimeter})*silicone_joint_width_mm*silicone_joint_depth_mm/1000`, "0.28", "Герметизация примыканий");
order("material:wet-room:backer-rod", "Закрытоячеистый уплотнительный шнур; диаметр в мм по выбранному предварительному узлу", "m", perimeter, "1", "Герметизация примыканий", ["backer_rod_diameter_mm"]);
order("material:wet-room:masking-tape", "Малярная лента защиты двух кромок герметизируемого шва, рулон25м", "m", `2*(${perimeter})`, "25", "Герметизация примыканий");
order("material:wet-room:protection-film", "Защитная полиэтиленовая плёнка соседних поверхностей; предварительно20% площади пола", "m2", "area_m2*0.2", "1", "Защита и завершение");
const tools = [
  ["notched-trowel", "Зубчатый шпатель12мм по выбранному CM17", 1], ["flat-trowel", "Гладкий шпатель для обратной стороны плитки", 1],
  ["rubber-float", "Резиновая тёрка затирки", 1], ["sponge", "Губка гидрофильная для затирки/мойки", 2],
  ["mixing-bucket", "Ведро20л для замешивания клея/затирки", 2], ["wash-bucket", "Ведро мойки с отжимом", 1],
  ["mixing-paddle", "Совместимая насадка миксера для вязкой смеси", 1], ["silicone-gun", "Ручной пистолет картриджа280мл", 1],
  ["silicone-spatula", "Шпатель формирования герметизируемого шва", 1], ["diamond-disc", "Алмазный диск мокрой резки, совместимый со станком и керамогранитом", 1],
  ["level", "Уровень проверки плоскости облицовки", 1], ["svpp-wedges", "Многоразовые клинья выбранной СВП; предварительное число100, остатки объекта вычитаются", 100],
  ["eye-protection", "Защитные очки при замешивании и резке", 2], ["kneepads", "Наколенники плиточника, пара", 1],
  ["cleaning-wipes", "Салфетки очистки/окончательной сдачи", 10], ["waste-bags", "Мешки строительных остатков и упаковки", 3],
] as const;
for (const [id, title, count] of tools) {
  const parameterId = `tool_${id.replace(/-/gu,"_")}_required_count`;
  parameters.push(profile(parameterId, `${title}: предварительная потребность, уточнить наличие/поставку`, "integer", "piece", count, { min: 0 }));
  order(`material:wet-room:${id}`, title, "piece", parameterId, "1", "Поштучное оснащение и расходники");
}
for (const [rowId, title, expression, category, unitId, section] of [
  ["rc09:porcelain_floor_tile_lay", "Площадь облицовки пола; труд оплачивается отдельными фактическими часами", "area_m2", "construction_work", "m2", "Укладка плитки"],
  ["labor:wet-room:tile", "Раскладка, замешивание, резка и укладка плитки", "tile_worker_h", "labor", "man_hour", "Укладка плитки"],
  ["labor:wet-room:grout", "Очистка и затирка межплиточных швов", "grout_worker_h", "labor", "man_hour", "Затирка швов"],
  ["labor:wet-room:seal", "Шнур, маскирование и герметизация примыканий", "seal_worker_h", "labor", "man_hour", "Герметизация примыканий"],
  ["labor:wet-room:finish", "Окончательная уборка, защита и сдача", "final_cleaning_worker_h", "labor", "man_hour", "Защита и завершение"],
  ["rc09:wet_tile_saw", "Станок водяной резки; энергия в ставке, оператор в труде укладки", "wet_tile_saw_machine_h", "equipment", "machine_hour", "Укладка плитки"],
  ["equipment:wet-room:mixer", "Низкооборотный миксер400–800об/мин; энергия в ставке, оператор в труде", "mixer_machine_h", "equipment", "machine_hour", "Укладка плитки"],
] as const) rows.push({ rowId, formulaId: rowId.replace(/[^a-z0-9]/giu,"_")+"_v1", section, category, title, unitId, expression,
  costTreatment: category === "construction_work" ? "INFORMATIONAL_SCOPE" : "OWN_COST", procurement: category === "equipment" });
const sharedWater = "material:wet-room:shared-clean-water";
for (const repairRequired of [false,true]) for (const formationRequired of [false,true]) for (const mode of ["CT17","ALREADY_PRIMED"] as const) {
  const suffix = `${mode}${repairRequired?":repair":""}${formationRequired?":formation":""}`;
  const ownerRowId = mode==="CT17"&&!repairRequired&&!formationRequired ? sharedWater : `${sharedWater}:${suffix}`;
  const wpContribution = mode==="CT17" ? wpWater : "area_m2*wp_cleanup_water_l_m2";
  const branch = (parameterId:string,active:boolean) => active ? {kind:"equals" as const,parameterId,value:"REQUIRED"}
    : {kind:"or" as const,operands:[{kind:"equals" as const,parameterId,value:"SURVEY_PENDING"},{kind:"equals" as const,parameterId,value:"NOT_REQUIRED"}]};
  const inclusion = { kind: "and" as const, operands: [{kind:"equals" as const,parameterId:"primer_mode",value:mode},branch("substrate_repair_mode",repairRequired),branch("floor_leveling_mode",formationRequired)] };
  const formationWater = formationRequired ? "+formation_additional_water_l" : "", repairWater = repairRequired ? "+repair_additional_water_l" : "";
  rows.push({ rowId: ownerRowId, formulaId: `wet_room_shared_water_order_${mode}_v1`, section: "Общая совместимая поставка", category: "material",
    title: "Чистая вода: применимое грунтование + замешивание CM17/CE40 + уборка, одна закупка до округления", unitId: "l", procurement: true, inclusion,
    expression: `ceil(max(0,(${wpContribution})+(${tileWater})${formationWater}${repairWater}+water_reserve_l-water_stock_l)/water_supply_quantum_l)*water_supply_quantum_l`,
    ...effectivePurchaseBalanceExpressionsR1({ ownerRowId, orderUnitId: "l", consumed: `(${wpContribution})+(${tileWater})${formationWater}${repairWater}`, stock: "water_stock_l", reserve: "water_reserve_l", quantum: "water_supply_quantum_l" }).owner });
  rows[rows.length-1] = {...rows[rows.length-1],formulaId:`wet_room_shared_water_order_${suffix.replaceAll(":","_")}_v1`};
  const allocations=[ ["waterproofing", "Распределение общей воды: применимое грунтование и уборка гидроизоляции", wpContribution], ["tile", "Распределение общей воды: клей, затирка и мойка плитки", tileWater],
    ...(repairRequired ? [["repair","Распределение общей воды: выбранный ремонт","repair_additional_water_l"]] : []),
    ...(formationRequired ? [["formation","Распределение общей воды: выбранное выравнивание/уклон","formation_additional_water_l"]] : []) ];
  for (const [id, title, expression] of allocations)
    rows.push({ rowId: `allocation:wet-room:water:${id}:${suffix}`, formulaId: `wet_room_water_${id}_${suffix.replaceAll(":","_")}_allocation_v1`, section: "Распределение общей поставки по операциям",
      category: "material", title, unitId: "l", expression, inclusion, costTreatment: "INCLUDED_IN_RESOURCE_ROWS", procurement: false, purchaseBalanceOwnerRowId: ownerRowId });
}
const formation = {kind:"equals" as const,parameterId:"floor_leveling_mode",value:"REQUIRED"};
for (const [id,title,unit,type] of [
  ["formation_material_kg","Потребность выбранной смеси выравнивания/уклона по обследованию и толщине","kg","decimal"],
  ["formation_pack_kg","Фасовка выбранной смеси","kg","decimal"], ["formation_material_designation","Марка, область применения и толщина выбранной смеси по проекту","", "text"],
  ["formation_method_reference","Выравнивание или уклон: отметки/толщина, подготовка, грунт/контактный слой, уход и вода по технологической карте","","text"],
  ["formation_primer_l","Потребность отдельного грунта/контактного состава этого слоя;0 если он отсутствует по выбранному способу","l","decimal"],
  ["formation_primer_designation","Точный отдельный грунт/контактный состав этого слоя либо отсутствие по способу","","text"],
  ["formation_worker_h","Фактический труд выравнивания/формирования уклона","man_hour","decimal"],
  ["formation_machine_h","Фактические часы миксера/оснащения выравнивания","machine_hour","decimal"],
] as const) parameters.push(fact(id,title,unit||null,type,{requiredWhen:formation,...(id==="formation_pack_kg"?{min:0.001}:{})}));
rows.push({rowId:"rc09:floor_leveling_compound",formulaId:"floor_leveling_compound_mass_v1",section:"Условное выравнивание/уклон",category:"material",title:"Смесь подготовки плоскости/уклона по выбранной проектной технологии",unitId:"kg",expression:"ceil(formation_material_kg/formation_pack_kg)*formation_pack_kg",procurement:true,inclusion:formation,
  titleParameterIds:["formation_material_designation"],inputParameterIds:["formation_method_reference"],
  ...effectivePurchaseBalanceExpressionsR1({ownerRowId:"rc09:floor_leveling_compound",orderUnitId:"kg",consumed:"formation_material_kg",stock:"0",reserve:"0",quantum:"formation_pack_kg"}).owner});
for(const [id,title,expression,category,unit] of [["primer","Отдельный грунт/контактный состав слоя выравнивания","formation_primer_l","material","l"],
  ["labor","Выравнивание/формирование уклона по проектным отметкам","formation_worker_h","labor","man_hour"],
  ["machine","Оснащение выравнивания/уклона, оператор в труде","formation_machine_h","equipment","machine_hour"]] as const)
  rows.push({rowId:`${category}:wet-room:formation-${id}`,formulaId:`wet_room_formation_${id}_v1`,section:"Условное выравнивание/уклон",category,title,unitId:unit,expression,inclusion:formation,procurement:category!=="labor",
    inputParameterIds:["formation_method_reference",...(id==="primer"?["formation_primer_designation"]:[])],...(id==="primer"?{titleParameterIds:["formation_primer_designation"]}:{})});
const extra = buildAutomaticConstructionOwnerR1({ contract: WET_ROOM_PROFESSIONAL_CONTRACT_S2735, semanticOwner: "wet-room-professional",
  sourceId: WET_ROOM_PROFESSIONAL_SOURCE_ID_S2735, normId: WET_ROOM_PROFESSIONAL_NORM_ID_S2735, sourceMetadata: WET_ROOM_PROFESSIONAL_SOURCE_METADATA_S2735,
  applicabilityRu: WET_ROOM_PROFESSIONAL_SOURCE_METADATA_S2735.use_restriction, ordinary: [], profile: parameters.filter(p=>p.kind==="profile"),
  conditional: parameters.filter(p=>p.kind==="conditional"), rows, deferMissingProjectFactsToRows: true,
  excludedUnownedAssumptions: ["подтверждённое обследование", "универсальная выработка труда", "точная раскладка и артикул плитки", "опубликованная норма CE40 для600×600", "сертифицированная единая региональная система"] });
const removedWpParameters = new Set(["waterproofing_wall_upturn_area_m2", "junction_tape_length_m", "method_water_l", "cleaning_wipe_count", "waste_bag_count"]);
const removedWpRows = new Set(["material:wet-zone:method_water_l", "material:wet-zone:primer-dilution-water", "material:wet-zone:cleaning_wipe_count", "material:wet-zone:waste_bag_count"]);
const runtimeInput = { ...waterproofing.runtimeInput, ...preliminaryWp, ...extra.runtimeInput };
const wpParameters = waterproofing.parameters.filter(p=>!removedWpParameters.has(p.parameter_id)).map(parameter=> {
  const selected = runtimeInput[parameter.parameter_id as keyof typeof runtimeInput];
  const isConfirmation = parameter.value_type === "boolean";
  return { ...parameter, ...(isConfirmation ? { required: false, constraints_json: { ...parameter.constraints_json,
    requiredWhen: { kind: "equals", parameterId: "applicability_mode", value: "CL51_CONFIRMED_FACTS" } },
    title_ru: `${parameter.title_ru}: фактическое подтверждение отсутствует при предварительном профиле` }
    : {}), truth_metadata: { ...parameter.truth_metadata, ...(selected !== undefined ? {
      value_source_role: "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE", input_origin_class: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE", runtime_profile_value: true,
      source_confirmation_required: true, guide: { ...(parameter.truth_metadata.guide as Record<string,unknown>), guide_short_ru: `${parameter.title_ru}: предварительное выбранное значение ${selected}; требует проверки и замены по объекту.` },
    } : {}) } };
});
const retainedWpResources = waterproofing.resources.filter(row=>!removedWpRows.has(row.row_id));
const formulaIds = new Set(retainedWpResources.map(row=>row.formula_id));
// Existing project-specific mineral/concrete repair owner is an optional child.
// Its required facts stay required when selected; no acceptance fixture/defaults.
const repairMap = new Map(repairParameters.map(p=>[p.parameter_id,`preparation_repair_${p.parameter_id}`]));
const remap = (value:unknown):unknown => typeof value==="string" ? repairMap.get(value)??value : Array.isArray(value) ? value.map(remap)
  : value && typeof value==="object" ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v)])) : value;
const repairBranch={kind:"equals",parameterId:"substrate_repair_mode",value:"REQUIRED"};
const conditionalRepairParameters=repairParameters.filter(p=>p.parameter_id!=="material_delivery_trip_count").map(p=>({...p,parameter_id:repairMap.get(p.parameter_id)!,required:false,
  constraints_json:{...(remap(p.constraints_json) as Record<string,unknown>),
    ...(p.required || p.constraints_json?.requiredWhen ? {requiredWhen:p.constraints_json?.requiredWhen ? {kind:"and",operands:[repairBranch,remap(p.constraints_json.requiredWhen)]}:repairBranch}: {})},
  truth_metadata:{...p.truth_metadata,preliminary_compilation_allowed:true}}));
const conditionalRepairResources=repairResources.filter(r=>r.row_id!=="delivery:concrete:slab-repair-material").map(r=>({...r,
  inclusion_ast:{kind:"and",operands:[repairBranch,remap(r.inclusion_ast)]},resource_graph:remap(r.resource_graph) as Record<string,unknown>,
  source_metadata:{...r.source_metadata,projectApprovalClaimed:false}}));
const repairFormulaIds=new Set(conditionalRepairResources.map(r=>r.formula_id));
const conditionalRepairFormulas=repairFormulas.filter(f=>repairFormulaIds.has(f.formula_id)).map(f=>({...f,ast:remap(f.ast) as typeof f.ast,
  input_parameter_ids:f.input_parameter_ids.map(id=>repairMap.get(id)??id),expression_source:f.expression_source.replace(/[A-Za-z_][A-Za-z0-9_]*/gu,id=>repairMap.get(id)??id)}));
const resources = [...retainedWpResources, ...extra.resources,...conditionalRepairResources].map((row, ordinal)=> {
  const stage = ordinal < retainedWpResources.length ? "waterproofing" : row.row_id.startsWith(sharedWater) ? "shared-supply" : row.row_id.endsWith(":grout") || row.section==="Затирка швов" ? "grout" : row.section==="Герметизация примыканий" ? "seal" : row.row_id.includes("water:waterproofing") ? "waterproofing" : "tile";
  const completed = { ...row, ordinal, resource_graph: { ...row.resource_graph,
    ...(ordinal<retainedWpResources.length ? {inputParameterIds:[...((row.resource_graph as Record<string,unknown>)?.inputParameterIds as string[]??[]),"applicability_mode"]}:{}),
    operationCompositionV1: { contractVersion: "canonical-operation-resource/v1", groupId: "wet-room-floor", groupTitleRu: "Пол санузла: подготовка, гидроизоляция, плитка, швы и завершение",
      operationId: stage, operationTitleRu: ({waterproofing:"Гидроизоляция и грунтование",tile:"Плитка, оснащение и завершение",grout:"Затирка швов",seal:"Герметизация примыканий","shared-supply":"Совместимая общая поставка"})[stage],
      completionCriterionRu: "Количество предварительного профиля проверить по обследованию, фактической раскладке и поставляемому продукту" },
    ...(row.row_id.startsWith("allocation:") ? { includedInResourceOwnerRowId: (row.resource_graph as Record<string,unknown>)?.purchaseBalanceOwnerRowId,
      purchaseConsumptionAllocationV1: { contractVersion: "canonical-purchase-consumption-allocation/v1", ownerRowId: (row.resource_graph as Record<string,unknown>)?.purchaseBalanceOwnerRowId } } : {}),
  }, source_metadata: { ...row.source_metadata, projectApprovalClaimed: false, universal_productivity_claimed: false,
    operationReuse: ordinal < retainedWpResources.length || readyTile.some(r=>r.row_id===row.row_id),
    preliminaryProfileWithoutHiddenDemo: true } };
  return { ...completed, row_sha256: estimateDeterministicHash({ ...completed, row_sha256: "" }) };
});
export const WET_ROOM_PROFESSIONAL_DEFINITION_S2735 = Object.freeze({
  parameters: [...wpParameters, ...extra.parameters,...conditionalRepairParameters].map((p,ordinal)=>({ ...p, ordinal })),
  formulas: [...waterproofing.formulas.filter(f=>formulaIds.has(f.formula_id)), ...extra.formulas,...conditionalRepairFormulas], resources,
  runtimeInput, runtimeClassification: Object.fromEntries(Object.keys(runtimeInput).map(id=>[id,"ASSUMPTION" as const])),
  runtimeSourceIds: Object.fromEntries(Object.keys(runtimeInput).map(id=>[id,[WET_ROOM_PROFESSIONAL_SOURCE_ID_S2735]])), ordinaryParameterIds: ["area_m2"],
});
for (const key of ["parameters","formulas","resources"] as const) {
  const ids = WET_ROOM_PROFESSIONAL_DEFINITION_S2735[key].map(item=>key==="parameters" ? (item as {parameter_id:string}).parameter_id : key==="formulas" ? (item as {formula_id:string}).formula_id : (item as {row_id:string}).row_id);
  if(new Set(ids).size!==ids.length)throw Error("WET_ROOM_COMPONENT_ID_COLLISION:"+key);
}
export function compileWetRoomFloorProfessionalS2735(submittedParameters: Record<string,unknown>) {
  return compileAutomaticConstructionOwnerR1({ compilerVersion: WET_ROOM_PROFESSIONAL_CONTRACT_S2735, catalogId: WET_ROOM_PROFESSIONAL_CATALOG_ID_S2735,
    primaryMeasureParameterId: "area_m2", definition: WET_ROOM_PROFESSIONAL_DEFINITION_S2735, submittedParameters });
}
