import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import {
  toVisibleEstimateLabel,
  visibleEstimateLabelViolations,
} from "../../estimatePresentation/visibleEstimateLabelPolicy";

const FALLBACK_LABOR_LABELS_RU: Record<string, string> = {
  electrical_route_layout: "\u0420\u0430\u0437\u043c\u0435\u0442\u043a\u0430 \u044d\u043b\u0435\u043a\u0442\u0440\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0442\u0440\u0430\u0441\u0441",
  electrical_chasing_or_tray: "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u0448\u0442\u0440\u043e\u0431, \u043b\u043e\u0442\u043a\u043e\u0432 \u0438 \u043a\u0430\u0431\u0435\u043b\u044c-\u043a\u0430\u043d\u0430\u043b\u043e\u0432",
  electrical_cable_install: "\u041f\u0440\u043e\u043a\u043b\u0430\u0434\u043a\u0430 \u044d\u043b\u0435\u043a\u0442\u0440\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043a\u0430\u0431\u0435\u043b\u044f",
  electrical_devices_install: "\u041c\u043e\u043d\u0442\u0430\u0436 \u0440\u043e\u0437\u0435\u0442\u043e\u043a, \u0432\u044b\u043a\u043b\u044e\u0447\u0430\u0442\u0435\u043b\u0435\u0439 \u0438 \u043a\u043e\u0440\u043e\u0431\u043e\u043a",
  electrical_protection_install: "\u0421\u0431\u043e\u0440\u043a\u0430 \u0438 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435 \u0437\u0430\u0449\u0438\u0442\u044b",
  electrical_testing: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0438 \u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0438",
};

function visibleLaborName(code: string, nameRu: string): string {
  if (visibleEstimateLabelViolations(nameRu).length > 0 && FALLBACK_LABOR_LABELS_RU[code]) {
    return FALLBACK_LABOR_LABELS_RU[code];
  }
  return toVisibleEstimateLabel({
    label: nameRu,
    sectionType: "labor",
  });
}

function labor(code: string, nameRu: string, factor: number, unitPrice: number): ProfessionalBoqRow {
  return {
    sectionType: "labor",
    code,
    nameRu: visibleLaborName(code, nameRu),
    unit: "sq_m",
    quantityFactor: factor,
    unitPrice,
    rateKey: `world_${code}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "Работа рассчитана по справочной ставке и требует подтверждения подрядчиком.",
  };
}

export function buildBoqLaborRows(workKey: string | null): ProfessionalBoqRow[] {
  if (workKey === "micro_hydro_preparation") {
    return [
      labor("hydro_site_survey", "Обследование площадки", 1, 6500),
      labor("hydro_head_flow_measurement", "Замер напора и расхода", 1, 8500),
      labor("hydro_hydraulic_calculation", "Гидравлический расчет", 1, 12000),
      labor("hydro_geodesy", "Геодезия / обмеры", 1, 9000),
      labor("hydro_working_tie_in", "Рабочая привязка", 1, 14000),
      labor("hydro_method_statement", "ППР", 1, 11000),
      labor("hydro_powerhouse_prep", "Подготовка машинного зала", 1, 18000),
      labor("hydro_mechanical_install", "Механический монтаж", 1, 42000),
      labor("hydro_alignment", "Центровка агрегата", 1, 16000),
      labor("hydro_welding", "Сварочные работы", 1, 22000),
      labor("hydro_electrical_install", "Электромонтаж", 1, 35000),
      labor("hydro_automation_install", "Монтаж автоматики", 1, 24000),
      labor("hydro_dry_checks", "Сухие проверки", 1, 9000),
      labor("hydro_hydrotests", "Гидроиспытания", 1, 18000),
      labor("hydro_protection_setup", "Настройка защит", 1, 15000),
      labor("hydro_commissioning", "ПНР: пусконаладка и сдача", 1, 32000),
      labor("hydro_training", "Обучение персонала", 1, 8000),
    ].map((row) => ({ ...row, unit: "set" }));
  }

  const byWork: Record<string, ProfessionalBoqRow[]> = {
    roof_waterproofing: [
      labor("roof_cleaning", "Очистка кровли", 1, 1.5),
      labor("roof_local_defect_repair", "Ремонт локальных дефектов основания или предупреждение", 0.2, 6),
      labor("roof_priming", "Нанесение праймера", 1, 2),
      labor("roof_waterproofing_application", "Монтаж рулонной гидроизоляции / мембраны / мастики", 1, 8),
      labor("roof_details", "Усиление примыканий, парапетов и проходок", 0.25, 9),
      labor("roof_drains", "Воронки / проходки: герметизация узлов", 0.08, 12),
      labor("roof_leak_test", "Проверка герметичности", 1, 1.2),
    ],
    laminate_laying: [
      labor("subfloor_preparation", "Подготовка основания", 1, 1.2),
      labor("underlayment_install", "Настил подложки", 1, 0.8),
      labor("laminate_install", "Укладка ламината", 1, 3.8),
      labor("cutting_transitions", "Подрезка / примыкания", 0.25, 3),
      labor("baseboard_install", "Монтаж плинтуса", 0.8, 2.5),
    ],
    carpet_laying: [
      labor("subfloor_preparation", "Подготовка основания", 1, 1.2),
      labor("carpet_layout", "Раскрой ковролина", 1, 1.6),
      labor("carpet_install", "Укладка ковролина", 1, 3.4),
      labor("edge_trim", "Подрезка и примыкания", 0.25, 3),
      labor("baseboard_install", "Монтаж плинтуса", 0.8, 2.5),
    ],
    brick_masonry: [
      labor("masonry_layout", "Разметка кладки и нивелировка", 1, 1.5),
      labor("mortar_preparation", "Приготовление раствора", 1, 2.2),
      labor("brick_laying", "Кладка", 1, 18),
      labor("masonry_reinforcement", "Армирование / кладочная сетка", 0.2, 4),
      labor("jointing", "Перевязка / расшивка швов", 1, 3.5),
    ],
    drywall_wall_cladding: [
      labor("frame_install", "Монтаж каркаса", 1, 4),
      labor("drywall_sheet_install", "Обшивка ГКЛ", 1, 4),
      labor("joint_finishing", "Шпаклевка швов", 1, 2.5),
      labor("openings_trim", "Примыкания и проемы", 0.15, 3),
    ],
    drywall_partition: [
      labor("frame_install", "Монтаж каркаса", 1, 4.5),
      labor("drywall_sheet_install", "Обшивка ГКЛ", 2, 4),
      labor("joint_finishing", "Шпаклевка швов", 1, 2.5),
      labor("openings_trim", "Примыкания и проемы", 0.15, 3),
    ],
    asphalt_paving: [
      labor("site_cleaning", "Очистка и подготовка площадки", 1, 0.7),
      labor("base_grading", "Планировка основания", 1, 1.4),
      labor("sand_base_install", "Устройство песчаного основания", 1, 1.4),
      labor("crushed_stone_base_install", "Устройство щебеночного основания", 1, 1.8),
      labor("bitumen_prime", "Нанесение битумной эмульсии / праймера", 1, 0.6),
      labor("asphalt_laying", "Укладка асфальтобетона", 1, 3.4),
      labor("asphalt_compaction", "Уплотнение", 1, 1.1),
      labor("quality_control", "Геодезия и контроль качества", 1, 0.5),
    ],
    window_installation: [
      labor("old_window_removal", "Демонтаж старого окна, если требуется", 1, 25),
      labor("opening_preparation", "Подготовка проема", 1, 18),
      labor("window_mount", "Монтаж окна", 1, 55),
      labor("joint_sealing", "Герметизация монтажного шва", 1, 18),
      labor("slopes_warning", "Откосы: включить отдельной строкой или дать предупреждение", 1, 20),
    ].map((row) => ({ ...row, unit: "pcs" })),
    gable_roof_installation: [
      labor("mauerlat_install", "Монтаж мауэрлата", 1, 3),
      labor("rafter_system_install", "Монтаж стропильной системы", 1, 10),
      labor("membrane_install", "Монтаж гидроизоляции / мембраны", 1, 2.5),
      labor("batten_install", "Монтаж обрешетки", 1, 3.5),
      labor("roof_covering_install", "Монтаж кровли", 1, 8),
      labor("flashings_install", "Монтаж доборных элементов", 0.15, 12),
    ],
    ventilation_installation: [
      labor("duct_layout", "Разметка трасс вентиляции", 1, 1.2),
      labor("duct_mount", "Монтаж воздуховодов", 1, 8),
      labor("equipment_mount", "Монтаж вентилятора / установки", 0.03, 180),
      labor("balancing", "Пусконаладка и балансировка", 1, 2.5),
    ],
    facade_insulation: [
      labor("insulation_base_check", "РџСЂРѕРІРµСЂРєР° Рё РїРѕРґРіРѕС‚РѕРІРєР° РѕСЃРЅРѕРІР°РЅРёСЏ РїРѕРґ СѓС‚РµРїР»РµРЅРёРµ", 1, 1.4),
      labor("insulation_board_install", "РњРѕРЅС‚Р°Р¶ СѓС‚РµРїР»РёС‚РµР»СЏ", 1, 4.8),
      labor("insulation_fastening", "РњРµС…Р°РЅРёС‡РµСЃРєРѕРµ РєСЂРµРїР»РµРЅРёРµ", 1, 1.6),
      labor("insulation_membrane_install", "РњРѕРЅС‚Р°Р¶ РјРµРјР±СЂР°РЅС‹ / РІРµС‚СЂРѕР·Р°С‰РёС‚С‹", 1, 1.8),
      labor("insulation_mesh_basecoat", "РђСЂРјРёСЂСѓСЋС‰РёР№ СЃР»РѕР№ Рё Р±Р°Р·РѕРІР°СЏ РѕС‚РґРµР»РєР°", 1, 3.5),
    ],
    electrical_basic: [
      labor("electrical_route_layout", "Р Р°Р·РјРµС‚РєР° СЌР»РµРєС‚СЂРёС‡РµСЃРєРёС… С‚СЂР°СЃСЃ", 1, 1.2),
      labor("electrical_chasing_or_tray", "РџРѕРґРіРѕС‚РѕРІРєР° С€С‚СЂРѕР± / Р»РѕС‚РєРѕРІ / РєР°РЅР°Р»РѕРІ", 1, 2.4),
      labor("electrical_cable_install", "РџСЂРѕРєР»Р°РґРєР° РєР°Р±РµР»СЏ", 1, 4.5),
      labor("electrical_devices_install", "РњРѕРЅС‚Р°Р¶ СѓСЃС‚Р°РЅРѕРІРѕС‡РЅС‹С… СѓСЃС‚СЂРѕР№СЃС‚РІ", 0.12, 45),
      labor("electrical_protection_install", "РЎР±РѕСЂРєР° Рё РїРѕРґРєР»СЋС‡РµРЅРёРµ Р·Р°С‰РёС‚С‹", 0.08, 90),
      labor("electrical_testing", "РџСЂРѕРІРµСЂРєР° Рё РёСЃРїС‹С‚Р°РЅРёСЏ СЌР»РµРєС‚СЂРёРєРё", 1, 1.8),
    ],
    maintenance_repair_professional: [
      labor("maintenance_survey", "РћР±СЃР»РµРґРѕРІР°РЅРёРµ Рё РґРµС„РµРєС‚РѕРІРєР°", 1, 2.5),
      labor("maintenance_local_protection", "Р›РѕРєР°Р»СЊРЅР°СЏ Р·Р°С‰РёС‚Р° Р·РѕРЅС‹ СЂР°Р±РѕС‚", 1, 1.2),
      labor("maintenance_repair_work", "РџСЂРѕС„РёР»СЊРЅС‹Р№ Р»РѕРєР°Р»СЊРЅС‹Р№ СЂРµРјРѕРЅС‚", 1, 6.5),
      labor("maintenance_quality_acceptance", "РџСЂРѕРІРµСЂРєР° РєР°С‡РµСЃС‚РІР° Рё СЃРґР°С‡Р°", 1, 1.5),
    ],
    warehouse_steel_frame: [
      labor("warehouse_site_layout", "Р Р°Р·РјРµС‚РєР° РѕСЃРµР№ Рё РїСЂРѕРІРµСЂРєР° Р·Р°РєР»Р°РґРЅС‹С…", 1, 3.5),
      labor("warehouse_anchor_install", "РњРѕРЅС‚Р°Р¶ Р°РЅРєРµСЂРѕРІ Рё Р·Р°РєР»Р°РґРЅС‹С… РґРµС‚Р°Р»РµР№", 0.12, 12),
      labor("warehouse_frame_erection", "РњРѕРЅС‚Р°Р¶ РјРµС‚Р°Р»Р»РёС‡РµСЃРєРёС… РєРѕР»РѕРЅРЅ, Р±Р°Р»РѕРє Рё С„РµСЂРј", 0.4, 32),
      labor("warehouse_bolting_welding", "Р‘РѕР»С‚РѕРІС‹Рµ СЃРѕРµРґРёРЅРµРЅРёСЏ / Р»РѕРєР°Р»СЊРЅР°СЏ СЃРІР°СЂРєР°", 0.2, 24),
      labor("warehouse_cladding_install", "РњРѕРЅС‚Р°Р¶ СЃС‚РµРЅРѕРІС‹С… РїР°РЅРµР»РµР№ / РїСЂРѕС„Р»РёСЃС‚Р°", 1, 7.5),
      labor("warehouse_roof_install", "РњРѕРЅС‚Р°Р¶ РєСЂРѕРІРµР»СЊРЅС‹С… РїР°РЅРµР»РµР№", 1, 8.5),
      labor("warehouse_quality_torque", "РљРѕРЅС‚СЂРѕР»СЊ РјРѕРјРµРЅС‚РѕРІ Р·Р°С‚СЏР¶РєРё Рё РіРµРѕРјРµС‚СЂРёРё РєР°СЂРєР°СЃР°", 1, 2),
    ],
    solar_panel_installation: [
      labor("solar_layout", "Разметка и обследование кровли/площадки", 1, 2),
      labor("solar_mounting_install", "Монтаж крепежной системы", 1, 10),
      labor("solar_panel_mount", "Монтаж солнечных панелей", 1, 8),
      labor("solar_electrical", "Электромонтаж и защита", 1, 12),
      labor("solar_commissioning", "Пусконаладка", 1, 4),
    ],
    well_drilling_professional: [
      labor("well_mobilization_setup", "Развертывание буровой установки", 0.02, 600),
      labor("well_drilling", "Бурение скважины", 1, 35),
      labor("well_casing_install", "Монтаж обсадной трубы", 1, 12),
      labor("well_flushing", "Промывка и прокачка", 1, 6),
      labor("well_debit_test", "Проверка дебита", 0.05, 150),
    ].map((row) => ({ ...row, unit: "linear_m" })),
  };

  return byWork[workKey ?? ""] ?? [
    labor("professional_preparation", "Профессиональная подготовка основания", 1, 3),
    labor("professional_installation", "Профильные монтажные работы", 1, 8),
    labor("quality_control", "Контроль качества", 1, 1.5),
  ];
}
