type ProfessionalRowDisplayInput = {
  visibleName?: string | null;
  name?: string | null;
  sectionType?: string | null;
  code?: string | null;
  rowNumber?: string | null;
  sourceParameters?: Record<string, unknown> | null;
};

const CHILD_TITLES: Record<string, string> = {
  demolition_tile: "Демонтаж плитки",
  demolition_flooring: "Демонтаж напольного покрытия",
  floor_screed: "Цементно-песчаная стяжка пола",
  self_leveling_floor: "Самовыравнивающийся слой пола",
  floor_primer: "Грунтование основания пола",
  waterproofing_wet_zones: "Гидроизоляция мокрых зон",
  tile_laying: "Укладка плитки и керамогранита",
  flooring_laminate_spc: "Ламинат / SPC покрытие",
  baseboard_install: "Монтаж напольного плинтуса",
  wall_plaster: "Штукатурка стен",
  wall_putty_start: "Стартовая шпаклевка стен",
  wall_putty_finish: "Финишная шпаклевка стен",
  wall_primer: "Грунтование стен и потолков",
  wall_paint: "Покраска стен",
  ceiling_paint: "Покраска потолков",
  drywall_local_ceiling: "Локальный потолок / короб из ГКЛ",
  door_blocks: "Дверные блоки",
  electrical_points: "Электрические точки",
  cable_routing: "Кабельные линии",
  lighting_points: "Освещение",
  plumbing_water_points: "Водоснабжение",
  plumbing_sewer_points: "Канализация",
  plumbing_fixtures: "Сантехнические приборы",
};

const ROW_CODE_TITLES: Record<string, string> = {
  apartment_screed_dry_mix: "Сухая смесь для цементно-песчаной стяжки 50 мм",
  apartment_ceramic_tile_wet_zones: "Плитка / керамогранит мокрых зон с запасом",
  apartment_tile_adhesive: "Плиточный клей C1/C2",
  apartment_floor_baseboard: "Плинтус напольный",
  apartment_wall_plaster_mix: "Штукатурная смесь для стен",
  apartment_base_putty: "Шпаклевка стартовая",
  apartment_finish_putty: "Шпаклевка финишная",
  apartment_wall_primer: "Грунтовка стен и потолков",
  apartment_wall_paint: "Краска интерьерная для стен",
  apartment_ceiling_paint: "Краска для потолков",
  apartment_socket_boxes: "Подрозетники и монтажные коробки",
  apartment_sockets_switches: "Розетки и выключатели чистовые",
  apartment_debris_removal: "Вывоз строительного мусора",
  apartment_material_delivery: "Доставка черновых и финишных материалов",
};

function text(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function estimateRowCode(input: ProfessionalRowDisplayInput): string {
  return text(input.sourceParameters?.rowCode ?? input.code);
}

export function estimateRowChildTemplateId(input: ProfessionalRowDisplayInput): string {
  return text(input.sourceParameters?.projectTemplateGroupChildId);
}

export function professionalEstimateRowChildTitle(input: ProfessionalRowDisplayInput): string {
  return CHILD_TITLES[estimateRowChildTemplateId(input)] ?? "";
}

function looksLikeGenericEstimateName(value: string): boolean {
  return /^\d+(?:\.\d+)*\s+/.test(value)
    ? looksLikeGenericEstimateName(value.replace(/^\d+(?:\.\d+)*\s+/, ""))
    : /^Комплект расходных изделий(?::|\b)/i.test(value)
      || /^Подготовка основания(?::|\b)/i.test(value)
      || /^Малая механизация(?::|\b)/i.test(value)
      || /^Доставка и разгрузка(?::|\b)/i.test(value)
      || /работы на объекте/i.test(value);
}

export function isProfessionalEstimateHelperRow(input: ProfessionalRowDisplayInput): boolean {
  const rowCode = estimateRowCode(input);
  const visibleName = text(input.visibleName ?? input.name);
  return looksLikeGenericEstimateName(visibleName)
    || /_standard_(?:materials|components|consumables|waste|preparation|equipment|logistics|quality_control|overhead|assurance)_\d+$/u.test(rowCode);
}

function helperKind(rowCode: string, sectionType: string | null | undefined): string {
  if (/_standard_components_/u.test(rowCode)) return "комплектующие";
  if (/_standard_consumables_/u.test(rowCode)) return "расходные материалы по норме";
  if (/_standard_waste_/u.test(rowCode)) return "запас и отходы";
  if (/_standard_preparation_/u.test(rowCode)) return "подготовка основания";
  if (/_standard_equipment_/u.test(rowCode) || sectionType === "equipment") return "оборудование и механизация";
  if (/_standard_logistics_/u.test(rowCode) || sectionType === "delivery") return "логистика";
  if (sectionType === "labor") return "работы";
  return "основные материалы по норме";
}

export function professionalEstimateRowVisibleName(input: ProfessionalRowDisplayInput): string {
  const rowCode = estimateRowCode(input);
  const explicit = ROW_CODE_TITLES[rowCode];
  if (explicit) return explicit;

  const visibleName = text(input.visibleName ?? input.name);
  if (visibleName && !looksLikeGenericEstimateName(visibleName)) {
    return visibleName.replace(/^\d+(?:\.\d+)*\s+/, "").trim();
  }

  const childTitle = CHILD_TITLES[estimateRowChildTemplateId(input)] ?? "Работы по смете";
  return `${childTitle}: ${helperKind(rowCode, input.sectionType)}`;
}
