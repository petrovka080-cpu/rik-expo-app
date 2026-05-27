import type { ProfessionalBoqRow } from "./professionalBoqTypes";

function equipment(code: string, nameRu: string, factor: number, unitPrice: number): ProfessionalBoqRow {
  return {
    sectionType: "equipment",
    code,
    nameRu,
    unit: "set",
    quantityFactor: factor,
    unitPrice,
    rateKey: `world_${code}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "Оборудование уточняется по доступу к объекту и технологии работ.",
  };
}

export function buildBoqEquipmentRows(workKey: string | null): ProfessionalBoqRow[] {
  if (workKey === "micro_hydro_preparation") {
    return [
      equipment("hydro_delivery_unloading", "Разгрузка оборудования", 1, 18000),
      equipment("hydro_rigging_equipment", "Такелажное оборудование", 1, 26000),
      equipment("hydro_crane", "Кран / подъемное оборудование", 1, 42000),
      equipment("hydro_welding_equipment", "Сварочное оборудование", 1, 9000),
      equipment("hydro_testing_equipment", "Оборудование для испытаний", 1, 11000),
    ];
  }
  if (workKey === "asphalt_paving") {
    return [
      equipment("paver", "Асфальтоукладчик / техника", 1, 0.9),
      equipment("roller", "Каток для уплотнения", 1, 0.8),
      equipment("loader", "Погрузчик / доставка смеси", 1, 0.5),
    ].map((row) => ({ ...row, unit: "sq_m" }));
  }
  if (workKey === "roof_waterproofing" || workKey === "gable_roof_installation") {
    return [
      equipment("roof_safety", "Страховка / доступ на кровлю", 1, 180),
      equipment("roof_tools", "Инструмент для кровельных работ", 1, 120),
    ];
  }
  if (workKey === "well_drilling_professional") {
    return [
      equipment("drilling_rig", "Буровая установка", 1, 900),
      equipment("compressor", "Компрессор / насос", 1, 280),
    ];
  }
  return [
    equipment("small_tools", "Профессиональный инструмент и малая механизация", 1, 80),
  ];
}
