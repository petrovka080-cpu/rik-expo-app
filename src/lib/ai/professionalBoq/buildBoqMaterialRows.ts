import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import { toVisibleEstimateLabel } from "../../estimatePresentation/visibleEstimateLabelPolicy";

function material(
  code: string,
  nameRu: string,
  factor: number,
  unitPrice: number,
  materialKey = code,
  unit: ProfessionalBoqRow["unit"] = "sq_m",
): ProfessionalBoqRow {
  return {
    sectionType: "materials",
    code,
    nameRu: toVisibleEstimateLabel({
      label: nameRu,
      materialKey,
      sectionType: "materials",
    }),
    unit,
    quantityFactor: factor,
    unitPrice,
    materialKey,
    rateKey: `world_${code}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "candidate_or_gap_warning",
    commentRu: "Материал должен быть связан с catalog_items или получить catalog_gap_warning.",
  };
}

export function buildBoqMaterialRows(workKey: string | null): ProfessionalBoqRow[] {
  if (workKey === "micro_hydro_preparation") {
    return [
      material("hydro_turbine", "Турбина для ГЭС 100 кВт", 1, 250000, "hydro_turbine"),
      material("hydro_generator", "Генератор", 1, 85000, "generator"),
      material("hydro_regulator", "Регулятор / направляющий аппарат", 1, 32000, "regulator"),
      material("hydro_frame", "Рама агрегата", 1, 18000, "steel_frame"),
      material("hydro_coupling", "Муфта", 1, 12000, "coupling"),
      material("hydro_vibration_mounts", "Виброопоры", 1, 6500, "vibration_mount"),
      material("hydro_valves", "Запорная арматура", 1, 28000, "valve"),
      material("hydro_flanged_pipes", "Патрубки / фланцы", 1, 22000, "flange_pipe"),
      material("hydro_compensators", "Компенсаторы", 1, 9000, "compensator"),
      material("hydro_bypass_drain_air", "Байпас / дренаж / воздухоспуск", 1, 15000, "hydromechanical_aux"),
      material("hydro_control_cabinet", "Шкаф управления", 1, 45000, "control_cabinet"),
      material("hydro_plc_hmi", "PLC/HMI", 1, 28000, "plc_hmi"),
      material("hydro_relay_protection", "Релейная защита", 1, 24000, "relay_protection"),
      material("hydro_sync", "Синхронизация", 1, 18000, "synchronization"),
      material("hydro_switchboard", "Щит 0,4 кВ", 1, 30000, "switchboard"),
      material("hydro_power_cables", "Силовые кабели", 1, 22000, "power_cable"),
      material("hydro_control_cables", "Контрольные кабели", 1, 9000, "control_cable"),
      material("hydro_cable_trays", "Кабельные лотки", 1, 7000, "cable_tray"),
      material("hydro_energy_meter", "Учет энергии", 1, 8000, "energy_meter"),
      material("hydro_metal_structures", "Металлоконструкции", 1, 26000, "steel_structure"),
      material("hydro_anchors_embeds", "Анкера / закладные", 1, 6500, "anchor_embed"),
      material("hydro_grout_foundation", "Подливка / фундамент под агрегат", 1, 12000, "grout"),
    ].map((row) => ({
      ...row,
      unit:
        /cable|tray|pipe|flange/i.test(row.code) ? "linear_m" :
          /metal|frame|structure/i.test(row.code) ? "kg" :
            /anchor|embed|valve|meter|mount/i.test(row.code) ? "pcs" :
              "set",
    }));
  }

  if (workKey === "roof_waterproofing") {
    return [
      material("roof_primer", "Праймер / грунтовка основания кровли", 1.05, 3.5, "primer"),
      material("roof_roll_membrane", "Рулонная гидроизоляция / мембрана / мастика", 1.12, 12, "roof_membrane"),
      material("roof_detail_tape", "Усиление примыканий: лента и герметик", 0.25, 7, "detail_tape"),
      material("roof_penetration_sealant", "Герметик для проходок, воронок и узлов", 0.08, 9, "sealant"),
      material("roof_quality_supplies", "Расходники для проверки герметичности", 0.03, 4, "quality_supplies"),
    ];
  }

  const genericByWork: Record<string, ProfessionalBoqRow[]> = {
    laminate_laying: [
      material("laminate_board", "Ламинат с запасом", 1.1, 18, "laminate"),
      material("underlayment", "Подложка", 1.05, 2.2, "underlayment"),
      material("baseboard", "Плинтус", 0.8, 3.5, "baseboard"),
      material("thresholds", "Порожки / стыки", 0.05, 18, "threshold"),
    ],
    carpet_laying: [
      material("carpet", "Ковролин с запасом", 1.08, 10, "carpet"),
      material("carpet_underlay", "Подложка под ковролин", 1.05, 2, "underlay"),
      material("carpet_glue", "Клей / фиксатор", 0.25, 3, "glue"),
      material("baseboard", "Плинтус", 0.8, 3.5, "baseboard"),
    ],
    drywall_wall_cladding: [
      material("drywall_sheets", "Листы ГКЛ", 1.05, 7, "drywall_sheet"),
      material("drywall_track_profile", "Направляющий профиль", 0.45, 2, "track_profile"),
      material("drywall_stud_profile", "Стоечный профиль", 1.1, 2.5, "stud_profile"),
      material("drywall_fasteners", "Крепеж", 1, 1.2, "fasteners"),
      material("drywall_joint_tape", "Лента для швов", 0.35, 0.8, "joint_tape"),
      material("drywall_joint_putty", "Шпаклевка швов", 0.5, 1.8, "joint_putty"),
    ],
    drywall_partition: [
      material("drywall_sheets", "Листы ГКЛ", 2.1, 7, "drywall_sheet"),
      material("drywall_track_profile", "Направляющий профиль", 0.5, 2, "track_profile"),
      material("drywall_stud_profile", "Стоечный профиль", 1.2, 2.5, "stud_profile"),
      material("drywall_fasteners", "Крепеж", 1, 1.2, "fasteners"),
      material("drywall_joint_tape", "Лента для швов", 0.35, 0.8, "joint_tape"),
      material("drywall_joint_putty", "Шпаклевка швов", 0.5, 1.8, "joint_putty"),
    ],
    asphalt_paving: [
      material("sand_base", "Песчаное основание", 0.12, 28, "sand", "m3"),
      material("crushed_stone_base", "Щебеночное основание", 0.18, 34, "crushed_stone", "m3"),
      material("bitumen_emulsion", "Битумная эмульсия / праймер", 1, 0.8, "bitumen_emulsion"),
      material("asphalt_concrete", "Асфальтобетон", 0.12, 90, "asphalt_concrete", "ton"),
      material("geotextile", "Геотекстиль", 1.05, 1.1, "geotextile"),
    ],
    window_installation: [
      material("window_unit", "Оконный блок", 1, 180, "window_unit"),
      material("sill", "Подоконник", 1, 25, "sill"),
      material("flashing", "Отлив", 1, 18, "flashing"),
      material("foam", "Монтажная пена", 1, 6, "foam"),
      material("fasteners", "Крепеж и пластины", 1, 8, "fasteners"),
      material("sealant", "Герметик", 1, 5, "sealant"),
    ].map((row) => ({ ...row, unit: "pcs" })),
    gable_roof_installation: [
      material("mauerlat", "Мауэрлат / брус", 0.25, 12, "timber"),
      material("rafters", "Стропила", 0.55, 15, "rafter"),
      material("roof_membrane", "Гидроизоляция / мембрана", 1.15, 3.2, "roof_membrane"),
      material("battens", "Обрешетка", 1.1, 4, "batten"),
      material("roof_covering", "Кровельное покрытие", 1.12, 18, "roof_covering"),
      material("flashings", "Доборные элементы", 0.12, 10, "flashing"),
    ],
    ventilation_installation: [
      material("ducts", "Воздуховоды", 0.7, 12, "duct"),
      material("grilles", "Решетки и диффузоры", 0.08, 18, "grille"),
      material("fan", "Вентилятор / установка", 0.02, 250, "fan"),
      material("dampers", "Клапаны и шумоглушители", 0.04, 70, "damper"),
      material("insulation", "Тепло/шумоизоляция воздуховодов", 0.35, 5, "duct_insulation"),
    ],
    facade_insulation: [
      material("facade_insulation_board", "РўРµРїР»РѕРёР·РѕР»СЏС†РёРѕРЅРЅС‹Рµ РїР»РёС‚С‹ / РјР°С‚С‹", 1.08, 9, "insulation"),
      material("insulation_membrane", "РњРµРјР±СЂР°РЅР° / РІРµС‚СЂРѕР·Р°С‰РёС‚Р° РґР»СЏ СѓС‚РµРїР»РµРЅРёСЏ", 1.05, 2.4, "membrane"),
      material("insulation_fasteners", "РљСЂРµРїРµР¶ / РґСЋР±РµР»Рё РґР»СЏ СѓС‚РµРїР»РёС‚РµР»СЏ", 1, 1.8, "fasteners"),
      material("reinforcing_mesh", "РђСЂРјРёСЂСѓСЋС‰Р°СЏ СЃРµС‚РєР°", 1.05, 1.6, "reinforcing_mesh"),
      material("base_coat", "Р‘Р°Р·РѕРІС‹Р№ РєР»РµРµРІРѕР№ / С€С‚СѓРєР°С‚СѓСЂРЅС‹Р№ СЃР»РѕР№", 0.25, 6, "base_coat"),
    ],
    electrical_basic: [
      material("electrical_cable", "РЎРёР»РѕРІРѕР№ РєР°Р±РµР»СЊ Рё РїСЂРѕРІРѕРґР°", 1.15, 4.5, "cable"),
      material("electrical_conduit", "Р“РѕС„СЂР° / РєР°Р±РµР»СЊ-РєР°РЅР°Р» / Р»РѕС‚РєРё", 1.05, 2.2, "conduit"),
      material("electrical_protection", "РђРІС‚РѕРјР°С‚С‹, РЈР—Рћ Рё Р·Р°С‰РёС‚РЅР°СЏ Р°РїРїР°СЂР°С‚СѓСЂР°", 0.08, 120, "protection"),
      material("electrical_devices", "Р РѕР·РµС‚РєРё / РІС‹РєР»СЋС‡Р°С‚РµР»Рё / СѓСЃС‚Р°РЅРѕРІРѕС‡РЅС‹Рµ РєРѕСЂРѕР±РєРё", 0.12, 35, "devices"),
      material("electrical_labels_consumables", "РњР°СЂРєРёСЂРѕРІРєР°, РЅР°РєРѕРЅРµС‡РЅРёРєРё Рё СЂР°СЃС…РѕРґРЅРёРєРё", 0.2, 3, "electrical_consumables"),
    ],
    maintenance_repair_professional: [
      material("maintenance_patch_materials", "РњР°С‚РµСЂРёР°Р»С‹ РґР»СЏ Р»РѕРєР°Р»СЊРЅРѕРіРѕ СЂРµРјРѕРЅС‚Р°", 1, 6, "repair_materials"),
      material("maintenance_fasteners", "РљСЂРµРїРµР¶ Рё РјРµР»РєРёРµ СЂР°СЃС…РѕРґРЅРёРєРё", 0.2, 4, "fasteners"),
      material("maintenance_protection", "Р—Р°С‰РёС‚Р° СЃРјРµР¶РЅС‹С… РїРѕРІРµСЂС…РЅРѕСЃС‚РµР№", 0.15, 3, "surface_protection"),
      material("maintenance_cleaning_supplies", "РњР°С‚РµСЂРёР°Р»С‹ РґР»СЏ СѓР±РѕСЂРєРё Рё СЃРґР°С‡Рё", 0.1, 2.5, "cleaning_supplies"),
    ],
    warehouse_steel_frame: [
      material("warehouse_steel_columns", "РњРµС‚Р°Р»Р»РёС‡РµСЃРєРёРµ РєРѕР»РѕРЅРЅС‹ Рё СЂР°РјС‹", 0.18, 48, "steel_columns"),
      material("warehouse_steel_beams", "Р‘Р°Р»РєРё, С„РµСЂРјС‹ Рё СЃРІСЏР·Рё РєР°СЂРєР°СЃР°", 0.22, 52, "steel_beams"),
      material("warehouse_anchor_bolts", "РђРЅРєРµСЂРЅС‹Рµ Р±РѕР»С‚С‹ Рё Р·Р°РєР»Р°РґРЅС‹Рµ РґРµС‚Р°Р»Рё", 0.05, 18, "anchor_bolts"),
      material("warehouse_cladding_panels", "РџСЂРѕС„Р»РёСЃС‚ / СЌРЅРµСЂРіРѕСЌС„С„РµРєС‚РёРІРЅС‹Рµ РїР°РЅРµР»Рё РѕРіСЂР°Р¶РґРµРЅРёСЏ", 1.05, 16, "cladding_panel"),
      material("warehouse_roof_panels", "РљСЂРѕРІРµР»СЊРЅС‹Рµ РїР°РЅРµР»Рё / РїСЂРѕС„РёР»РёСЂРѕРІР°РЅРЅС‹Р№ Р»РёСЃС‚", 1.08, 18, "roof_panel"),
      material("warehouse_fasteners", "РљСЂРµРїРµР¶, СѓРїР»РѕС‚РЅРёС‚РµР»Рё Рё РіРµСЂРјРµС‚РёРєРё", 1, 3.5, "fasteners"),
    ],
    solar_panel_installation: [
      material("solar_panels", "Солнечные панели", 1, 180, "solar_panel"),
      material("inverter", "Инвертор", 0.05, 900, "inverter"),
      material("mounting", "Крепежная система", 1, 45, "solar_mounting"),
      material("dc_cable", "DC/AC кабели", 1, 12, "cable"),
      material("protection", "Защита и автоматика", 0.1, 180, "protection"),
    ],
    well_drilling_professional: [
      material("casing", "Обсадная труба", 1, 18, "casing"),
      material("filter", "Фильтр скважины", 0.1, 65, "well_filter"),
      material("gravel_pack", "Гравийная обсыпка", 0.25, 12, "gravel_pack"),
      material("head", "Оголовок", 0.02, 90, "well_head"),
      material("pump", "Насос (опция / уточнить)", 0.02, 450, "pump"),
    ].map((row) => ({ ...row, unit: "linear_m" })),
  };

  if (workKey === "brick_masonry") {
    return [
      { ...material("brick", "Кирпич", 52, 0.35, "brick"), unit: "pcs" },
      material("mortar", "Раствор / кладочная смесь", 0.12, 45, "mortar"),
      material("masonry_mesh", "Кладочная сетка / армирование", 0.2, 3.5, "masonry_mesh"),
      material("joint_tools", "Расходники для расшивки швов", 0.02, 4, "joint_tools"),
    ];
  }

  return genericByWork[workKey ?? ""] ?? [
    material("main_material", "Основной материал по выбранной технологии", 1, 10, "main_material"),
    material("auxiliary_material", "Вспомогательные материалы и крепеж", 0.15, 4, "auxiliary_material"),
  ];
}
