import type { CapitalRenovationDerivedGeometry } from "./capitalRenovationGeometry";

export type CapitalRenovationGroupId =
  | "demolition"
  | "rough_floors"
  | "walls"
  | "painting"
  | "floor_finishes"
  | "bathrooms"
  | "electrical"
  | "plumbing"
  | "doors"
  | "logistics";

export type CapitalRenovationLineType = "material" | "work" | "service" | "equipment";

export type CapitalRenovationEstimateRow = {
  code: string;
  groupId: CapitalRenovationGroupId;
  groupTitle: string;
  lineType: CapitalRenovationLineType;
  titleRu: string;
  quantity: number;
  unit: string;
  formula: string;
  materialKey?: string;
  includedInProcurement: boolean;
};

export const CAPITAL_RENOVATION_GROUP_TITLES: Record<CapitalRenovationGroupId, string> = {
  demolition: "Демонтаж и подготовка",
  rough_floors: "Черновые полы",
  walls: "Стены",
  painting: "Покраска",
  floor_finishes: "Полы",
  bathrooms: "Санузлы",
  electrical: "Электрика",
  plumbing: "Сантехника",
  doors: "Двери",
  logistics: "Услуги / логистика",
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ceil(value: number): number {
  return Math.ceil(value);
}

function row(input: Omit<CapitalRenovationEstimateRow, "groupTitle">): CapitalRenovationEstimateRow {
  return {
    ...input,
    groupTitle: CAPITAL_RENOVATION_GROUP_TITLES[input.groupId],
  };
}

export function buildCapitalRenovationRows(g: CapitalRenovationDerivedGeometry): CapitalRenovationEstimateRow[] {
  const screedThicknessMm = 50;
  const screedVolumeM3 = round(g.areaM2 * screedThicknessMm / 1000, 1);
  const screedMixKg = ceil(g.areaM2 * 5 * 18 * 1.1);
  const selfLevelingMixKg = ceil(g.dryFloorAreaM2 * 5 * 1.6 * 1.1);
  const plasterMixKg = Math.round(g.netWallAreaM2 * 20 * 0.9 * 1.1);
  const puttyArea = g.paintTotalAreaM2;
  const startPuttyKg = ceil(puttyArea * 2.4 * 1.1);
  const finishPuttyKg = ceil(puttyArea * 0.8 * 1.1);
  const primerBeforePaintL = ceil(puttyArea * 0.1 * 1.1);
  const paintL = ceil(puttyArea * 2 * 0.14 * 1.1);
  const flooringPurchaseM2 = round(g.dryFloorFinishAreaM2 * 1.05, 1);
  const tileTotalAreaM2 = round(g.bathroomFloorAreaM2 + g.bathroomWallTileAreaM2, 1);
  const bathroomFloorTilePurchaseM2 = round(g.bathroomFloorAreaM2 * 1.1, 1);
  const bathroomWallTilePurchaseM2 = round(g.bathroomWallTileAreaM2 * 1.1, 1);
  const tileAdhesiveKg = ceil(tileTotalAreaM2 * 4.5 * 1.1);
  const groutKg = ceil(tileTotalAreaM2 * 0.38);
  const waterproofingAreaM2 = round(g.bathroomFloorAreaM2 + g.bathroomsCount * 18, 1);
  const waterproofingKg = ceil(waterproofingAreaM2 * 1.5 * 1.1);
  const cableM = g.electricalPoints * 7;
  const conduitM = g.electricalPoints * 6;
  const waterPipeM = round(g.waterPoints * 6.5, 0);
  const sewerPipeM = round(g.sewerPoints * 5.5, 0);
  const deliveryTrips = Math.max(1, ceil(g.areaM2 / 25));

  return [
    row({ code: "capreno_demolish_floor_covering", groupId: "demolition", lineType: "work", titleRu: "Демонтаж старых покрытий пола", quantity: g.areaM2, unit: "sq_m", formula: "area_m2", includedInProcurement: false }),
    row({ code: "capreno_demolish_wall_finish", groupId: "demolition", lineType: "work", titleRu: "Демонтаж старой отделки стен", quantity: g.netWallAreaM2, unit: "sq_m", formula: "net_wall_area_m2", includedInProcurement: false }),
    row({ code: "capreno_demolish_bathroom_tile", groupId: "demolition", lineType: "work", titleRu: "Демонтаж плитки в санузлах", quantity: tileTotalAreaM2, unit: "sq_m", formula: "bathroom_floor_area_m2 + bathroom_wall_tile_area_m2", includedInProcurement: false }),
    row({ code: "capreno_site_protection", groupId: "demolition", lineType: "material", titleRu: "Пленка, мешки и защита проходов", quantity: ceil(g.areaM2 / 20), unit: "pack", formula: "ceil(area_m2 / 20)", materialKey: "site_protection_consumables", includedInProcurement: true }),
    row({ code: "capreno_debris_volume", groupId: "demolition", lineType: "service", titleRu: "Вынос / вывоз строительного мусора", quantity: g.wasteVolumeM3, unit: "m3", formula: "area_m2 * 0.25", includedInProcurement: true }),

    row({ code: "capreno_screed_work_50mm", groupId: "rough_floors", lineType: "work", titleRu: "Устройство цементно-песчаной стяжки 50 мм", quantity: g.areaM2, unit: "sq_m", formula: "area_m2", includedInProcurement: false }),
    row({ code: "capreno_screed_volume", groupId: "rough_floors", lineType: "material", titleRu: "Объем стяжки 50 мм", quantity: screedVolumeM3, unit: "m3", formula: "area_m2 * thickness_mm / 1000", materialKey: "screed_volume_reference", includedInProcurement: false }),
    row({ code: "capreno_screed_mix_kg", groupId: "rough_floors", lineType: "material", titleRu: "Сухая смесь для стяжки", quantity: screedMixKg, unit: "kg", formula: "area_m2 * 5 * 18 * 1.1", materialKey: "screed_dry_mix_kg", includedInProcurement: true }),
    row({ code: "capreno_screed_mix_bags_25kg", groupId: "rough_floors", lineType: "material", titleRu: "Мешки смеси для стяжки 25 кг", quantity: ceil(screedMixKg / 25), unit: "bag", formula: "ceil(screed_mix_kg / 25)", materialKey: "screed_dry_mix_25kg_bag", includedInProcurement: true }),
    row({ code: "capreno_damper_tape", groupId: "rough_floors", lineType: "material", titleRu: "Демпферная лента", quantity: g.baseboardLm, unit: "linear_m", formula: "baseboard_lm", materialKey: "damper_tape", includedInProcurement: true }),
    row({ code: "capreno_floor_primer_l", groupId: "rough_floors", lineType: "material", titleRu: "Грунтовка основания пола", quantity: ceil(g.areaM2 * 0.1 * 1.1), unit: "l", formula: "area_m2 * 0.1 * 1.1", materialKey: "floor_primer", includedInProcurement: true }),
    row({ code: "capreno_self_leveling_work_5mm", groupId: "rough_floors", lineType: "work", titleRu: "Наливной пол 5 мм", quantity: g.dryFloorAreaM2, unit: "sq_m", formula: "dry_floor_area_m2", includedInProcurement: false }),
    row({ code: "capreno_self_leveling_mix_kg", groupId: "rough_floors", lineType: "material", titleRu: "Самовыравнивающаяся смесь", quantity: selfLevelingMixKg, unit: "kg", formula: "dry_floor_area_m2 * 5 * 1.6 * 1.1", materialKey: "self_leveling_mix_kg", includedInProcurement: true }),
    row({ code: "capreno_self_leveling_bags_25kg", groupId: "rough_floors", lineType: "material", titleRu: "Мешки наливного пола 25 кг", quantity: ceil(selfLevelingMixKg / 25), unit: "bag", formula: "ceil(self_leveling_mix_kg / 25)", materialKey: "self_leveling_mix_25kg_bag", includedInProcurement: true }),

    row({ code: "capreno_wall_primer_before_plaster_l", groupId: "walls", lineType: "material", titleRu: "Грунтовка перед штукатуркой", quantity: ceil(g.netWallAreaM2 * 0.12 * 1.1), unit: "l", formula: "net_wall_area_m2 * 0.12 * 1.1", materialKey: "wall_primer_before_plaster", includedInProcurement: true }),
    row({ code: "capreno_plaster_work_20mm", groupId: "walls", lineType: "work", titleRu: "Штукатурка стен 20 мм", quantity: g.netWallAreaM2, unit: "sq_m", formula: "net_wall_area_m2", includedInProcurement: false }),
    row({ code: "capreno_plaster_mix_kg", groupId: "walls", lineType: "material", titleRu: "Штукатурная смесь", quantity: plasterMixKg, unit: "kg", formula: "net_wall_area_m2 * 20 * 0.9 * 1.1", materialKey: "plaster_mix_kg", includedInProcurement: true }),
    row({ code: "capreno_plaster_bags_30kg", groupId: "walls", lineType: "material", titleRu: "Мешки штукатурки 30 кг", quantity: ceil(plasterMixKg / 30), unit: "bag", formula: "ceil(plaster_mix_kg / 30)", materialKey: "plaster_mix_30kg_bag", includedInProcurement: true }),
    row({ code: "capreno_start_putty_work", groupId: "walls", lineType: "work", titleRu: "Стартовая шпаклевка стен и потолков", quantity: puttyArea, unit: "sq_m", formula: "paint_total_area_m2", includedInProcurement: false }),
    row({ code: "capreno_start_putty_kg", groupId: "walls", lineType: "material", titleRu: "Стартовая шпаклевка", quantity: startPuttyKg, unit: "kg", formula: "paint_total_area_m2 * 2.4 * 1.1", materialKey: "start_putty_kg", includedInProcurement: true }),
    row({ code: "capreno_start_putty_bags_25kg", groupId: "walls", lineType: "material", titleRu: "Мешки стартовой шпаклевки 25 кг", quantity: ceil(startPuttyKg / 25), unit: "bag", formula: "ceil(start_putty_kg / 25)", materialKey: "start_putty_25kg_bag", includedInProcurement: true }),
    row({ code: "capreno_finish_putty_work", groupId: "walls", lineType: "work", titleRu: "Финишная шпаклевка стен и потолков", quantity: puttyArea, unit: "sq_m", formula: "paint_total_area_m2", includedInProcurement: false }),
    row({ code: "capreno_finish_putty_kg", groupId: "walls", lineType: "material", titleRu: "Финишная шпаклевка", quantity: finishPuttyKg, unit: "kg", formula: "paint_total_area_m2 * 0.8 * 1.1", materialKey: "finish_putty_kg", includedInProcurement: true }),
    row({ code: "capreno_finish_putty_bags_25kg", groupId: "walls", lineType: "material", titleRu: "Мешки финишной шпаклевки 25 кг", quantity: ceil(finishPuttyKg / 25), unit: "bag", formula: "ceil(finish_putty_kg / 25)", materialKey: "finish_putty_25kg_bag", includedInProcurement: true }),
    row({ code: "capreno_sanding_work", groupId: "walls", lineType: "work", titleRu: "Шлифовка поверхностей", quantity: puttyArea, unit: "sq_m", formula: "paint_total_area_m2", includedInProcurement: false }),

    row({ code: "capreno_primer_before_paint_l", groupId: "painting", lineType: "material", titleRu: "Грунтовка перед покраской", quantity: primerBeforePaintL, unit: "l", formula: "paint_total_area_m2 * 0.10 * 1.1", materialKey: "paint_primer_l", includedInProcurement: true }),
    row({ code: "capreno_paint_work_two_coats", groupId: "painting", lineType: "work", titleRu: "Покраска стен и потолков в 2 слоя", quantity: puttyArea, unit: "sq_m", formula: "paint_total_area_m2", includedInProcurement: false }),
    row({ code: "capreno_interior_paint_l", groupId: "painting", lineType: "material", titleRu: "Краска интерьерная", quantity: paintL, unit: "l", formula: "paint_total_area_m2 * 2 * 0.14 * 1.1", materialKey: "interior_paint_l", includedInProcurement: true }),

    row({ code: "capreno_flooring_work", groupId: "floor_finishes", lineType: "work", titleRu: "Укладка ламината / SPC", quantity: g.dryFloorFinishAreaM2, unit: "sq_m", formula: "dry_floor_finish_area_m2", includedInProcurement: false }),
    row({ code: "capreno_flooring_purchase_m2", groupId: "floor_finishes", lineType: "material", titleRu: "Ламинат / SPC покрытие", quantity: flooringPurchaseM2, unit: "sq_m", formula: "dry_floor_finish_area_m2 * 1.05", materialKey: "laminate_spc_flooring_m2", includedInProcurement: true }),
    row({ code: "capreno_underlay_m2", groupId: "floor_finishes", lineType: "material", titleRu: "Подложка под напольное покрытие", quantity: flooringPurchaseM2, unit: "sq_m", formula: "dry_floor_finish_area_m2 * 1.05", materialKey: "floor_underlay_m2", includedInProcurement: true }),
    row({ code: "capreno_baseboard_work", groupId: "floor_finishes", lineType: "work", titleRu: "Монтаж плинтуса", quantity: g.baseboardLm, unit: "linear_m", formula: "baseboard_lm", includedInProcurement: false }),
    row({ code: "capreno_baseboard_lm", groupId: "floor_finishes", lineType: "material", titleRu: "Плинтус напольный", quantity: g.baseboardLm, unit: "linear_m", formula: "baseboard_lm", materialKey: "floor_baseboard_lm", includedInProcurement: true }),
    row({ code: "capreno_threshold_profiles_pcs", groupId: "floor_finishes", lineType: "material", titleRu: "Порог / профиль стыковочный", quantity: g.doorsCount, unit: "pcs", formula: "doors_count", materialKey: "threshold_profiles_pcs", includedInProcurement: true }),

    row({ code: "capreno_bath_waterproofing_work", groupId: "bathrooms", lineType: "work", titleRu: "Гидроизоляция санузлов", quantity: waterproofingAreaM2, unit: "sq_m", formula: "bathroom_floor_area_m2 + bathrooms_count * 18", includedInProcurement: false }),
    row({ code: "capreno_bath_floor_tile_work", groupId: "bathrooms", lineType: "work", titleRu: "Укладка плитки на пол санузлов", quantity: g.bathroomFloorAreaM2, unit: "sq_m", formula: "bathroom_floor_area_m2", includedInProcurement: false }),
    row({ code: "capreno_bath_wall_tile_work", groupId: "bathrooms", lineType: "work", titleRu: "Укладка плитки на стены санузлов", quantity: g.bathroomWallTileAreaM2, unit: "sq_m", formula: "bathroom_wall_tile_area_m2", includedInProcurement: false }),
    row({ code: "capreno_bath_floor_tile_purchase_m2", groupId: "bathrooms", lineType: "material", titleRu: "Плитка напольная для санузлов", quantity: bathroomFloorTilePurchaseM2, unit: "sq_m", formula: "bathroom_floor_area_m2 * 1.1", materialKey: "bathroom_floor_tile_m2", includedInProcurement: true }),
    row({ code: "capreno_bath_wall_tile_purchase_m2", groupId: "bathrooms", lineType: "material", titleRu: "Плитка настенная для санузлов", quantity: bathroomWallTilePurchaseM2, unit: "sq_m", formula: "bathroom_wall_tile_area_m2 * 1.1", materialKey: "bathroom_wall_tile_m2", includedInProcurement: true }),
    row({ code: "capreno_tile_adhesive_kg", groupId: "bathrooms", lineType: "material", titleRu: "Плиточный клей", quantity: tileAdhesiveKg, unit: "kg", formula: "(bathroom_floor_area_m2 + bathroom_wall_tile_area_m2) * 4.5 * 1.1", materialKey: "tile_adhesive_kg", includedInProcurement: true }),
    row({ code: "capreno_tile_adhesive_bags_25kg", groupId: "bathrooms", lineType: "material", titleRu: "Мешки плиточного клея 25 кг", quantity: ceil(tileAdhesiveKg / 25), unit: "bag", formula: "ceil(tile_adhesive_kg / 25)", materialKey: "tile_adhesive_25kg_bag", includedInProcurement: true }),
    row({ code: "capreno_tile_grout_kg", groupId: "bathrooms", lineType: "material", titleRu: "Затирка для плитки", quantity: groutKg, unit: "kg", formula: "tile_total_area_m2 * 0.38", materialKey: "tile_grout_kg", includedInProcurement: true }),
    row({ code: "capreno_waterproofing_kg", groupId: "bathrooms", lineType: "material", titleRu: "Обмазочная гидроизоляция", quantity: waterproofingKg, unit: "kg", formula: "waterproofing_area_m2 * 1.5 * 1.1", materialKey: "waterproofing_kg", includedInProcurement: true }),
    row({ code: "capreno_waterproofing_tape_lm", groupId: "bathrooms", lineType: "material", titleRu: "Гидроизоляционная лента", quantity: g.bathroomsCount * 20, unit: "linear_m", formula: "bathrooms_count * 20", materialKey: "waterproofing_tape_lm", includedInProcurement: true }),

    row({ code: "capreno_electrical_install_work", groupId: "electrical", lineType: "work", titleRu: "Монтаж электрики", quantity: g.electricalPoints, unit: "pcs", formula: "electrical_points", includedInProcurement: false }),
    row({ code: "capreno_electrical_cable_m", groupId: "electrical", lineType: "material", titleRu: "Кабель силовой и слаботочный", quantity: cableM, unit: "linear_m", formula: "electrical_points * 7", materialKey: "electrical_cable_m", includedInProcurement: true }),
    row({ code: "capreno_electrical_conduit_m", groupId: "electrical", lineType: "material", titleRu: "Гофра / кабель-канал", quantity: conduitM, unit: "linear_m", formula: "electrical_points * 6", materialKey: "electrical_conduit_m", includedInProcurement: true }),
    row({ code: "capreno_socket_boxes_pcs", groupId: "electrical", lineType: "material", titleRu: "Подрозетники и монтажные коробки", quantity: g.electricalPoints, unit: "pcs", formula: "electrical_points", materialKey: "socket_boxes_pcs", includedInProcurement: true }),
    row({ code: "capreno_electrical_panel_pcs", groupId: "electrical", lineType: "material", titleRu: "Электрощит квартирный", quantity: 1, unit: "pcs", formula: "1", materialKey: "electrical_panel_pcs", includedInProcurement: true }),
    row({ code: "capreno_breakers_pcs", groupId: "electrical", lineType: "material", titleRu: "Автоматы защиты", quantity: 18, unit: "pcs", formula: "default_breakers_count", materialKey: "breakers_pcs", includedInProcurement: true }),

    row({ code: "capreno_water_points_work", groupId: "plumbing", lineType: "work", titleRu: "Монтаж водоснабжения", quantity: g.waterPoints, unit: "pcs", formula: "water_points", includedInProcurement: false }),
    row({ code: "capreno_sewer_points_work", groupId: "plumbing", lineType: "work", titleRu: "Монтаж канализации", quantity: g.sewerPoints, unit: "pcs", formula: "sewer_points", includedInProcurement: false }),
    row({ code: "capreno_water_pipe_m", groupId: "plumbing", lineType: "material", titleRu: "Труба водоснабжения", quantity: waterPipeM, unit: "linear_m", formula: "water_points * 6.5", materialKey: "water_pipe_m", includedInProcurement: true }),
    row({ code: "capreno_sewer_pipe_m", groupId: "plumbing", lineType: "material", titleRu: "Труба канализации", quantity: sewerPipeM, unit: "linear_m", formula: "sewer_points * 5.5", materialKey: "sewer_pipe_m", includedInProcurement: true }),
    row({ code: "capreno_plumbing_fittings_set", groupId: "plumbing", lineType: "material", titleRu: "Фитинги и крепеж сантехнический", quantity: g.waterPoints + g.sewerPoints, unit: "pcs", formula: "water_points + sewer_points", materialKey: "plumbing_fittings_pcs", includedInProcurement: true }),
    row({ code: "capreno_valves_pcs", groupId: "plumbing", lineType: "material", titleRu: "Краны и запорная арматура", quantity: g.bathroomsCount * 10, unit: "pcs", formula: "bathrooms_count * 10", materialKey: "plumbing_valves_pcs", includedInProcurement: true }),

    row({ code: "capreno_doors_install_work", groupId: "doors", lineType: "work", titleRu: "Монтаж дверей", quantity: g.doorsCount, unit: "pcs", formula: "doors_count", includedInProcurement: false }),
    row({ code: "capreno_door_blocks_pcs", groupId: "doors", lineType: "material", titleRu: "Дверные блоки межкомнатные", quantity: g.doorsCount, unit: "pcs", formula: "doors_count", materialKey: "interior_door_blocks_pcs", includedInProcurement: true }),
    row({ code: "capreno_door_hardware_sets", groupId: "doors", lineType: "material", titleRu: "Фурнитура дверная", quantity: g.doorsCount, unit: "set", formula: "doors_count", materialKey: "door_hardware_sets", includedInProcurement: true }),
    row({ code: "capreno_foam_cans", groupId: "doors", lineType: "material", titleRu: "Монтажная пена", quantity: g.doorsCount, unit: "canister", formula: "doors_count", materialKey: "mounting_foam_cans", includedInProcurement: true }),

    row({ code: "capreno_material_delivery_trips", groupId: "logistics", lineType: "service", titleRu: "Доставка материалов", quantity: deliveryTrips, unit: "trip", formula: "ceil(area_m2 / 25)", includedInProcurement: true }),
    row({ code: "capreno_material_lifting", groupId: "logistics", lineType: "service", titleRu: "Подъем материалов", quantity: deliveryTrips, unit: "trip", formula: "delivery_trips", includedInProcurement: true }),
    row({ code: "capreno_debris_container_trips", groupId: "logistics", lineType: "service", titleRu: "Контейнер / рейсы на вывоз мусора", quantity: Math.max(1, ceil(g.wasteVolumeM3 / 8)), unit: "trip", formula: "ceil(waste_volume_m3 / 8)", includedInProcurement: true }),
    row({ code: "capreno_final_cleaning", groupId: "logistics", lineType: "service", titleRu: "Финальная уборка после ремонта", quantity: g.areaM2, unit: "sq_m", formula: "area_m2", includedInProcurement: true }),
  ];
}
