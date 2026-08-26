import type { DrywallArchitecturalElementOperationV4 } from "./drywallArchitecturalElementsContractV4";

export type Batch002EngineeringSourceR4 = {
  sourceId: string;
  title: string;
  publisher: string;
  editionOrDate: string;
  url: string | null;
  exactLocator: string;
  confirms: readonly string[];
  checkedAt: "2026-08-19";
  applicabilityRu: string;
  authoritativeReplayRequired: boolean;
};

export const BATCH002_ENGINEERING_SOURCES_R4: readonly Batch002EngineeringSourceR4[] = Object.freeze([
  {
    sourceId: "KG_SP_KR_65_101_2025",
    title: "СП КР 65-101:2025",
    publisher: "Уполномоченный орган строительного нормирования Кыргызской Республики",
    editionOrDate: "2025",
    url: "https://minstroy.gov.kg/index.php/ru/state_program/download-pdf/obedinennyeizolacionnye-61267ac76cb3f36a0.49346677.pdf",
    exactLocator: "раздел 7.7, пп. 7.7.1, 7.7.2, 7.7.4, 7.7.5 и таблица 7.8",
    confirms: ["монтаж облицовки после принятия и проверки каркаса", "недопустимость непроектных стыков", "требования к ровности и устойчивости готовой облицовки"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Официальный документ Минстроя КР подтверждает последовательность и критерии готового результата; численные расходы материалов по нему не подменяются и берутся из выбранной системы.",
    authoritativeReplayRequired: false,
  },
  {
    sourceId: "KG_KRERR_2015_APPLICATION_GUIDANCE",
    title: "КРЕРр-2015 — методические указания по ремонтным работам",
    publisher: "Уполномоченный орган сметного нормирования Кыргызской Республики",
    editionOrDate: "2015",
    url: "https://minstroy.gov.kg/kg/state_program/download-pdf/remontnostroitelnyeraboty-5096900591f05e894.51801202.pdf",
    exactLocator: "раздел 3, пп. 3.3–3.3.4",
    confirms: ["раздельный учёт разборки и устройства новой конструкции", "дополнительный учёт проектных операций демонтажа при отсутствии готовой расценки"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Используется как маршрут применимости ремонта; количества материалов задаются дефектной ведомостью и паспортом выбранной системы.",
    authoritativeReplayRequired: false,
  },
  {
    sourceId: "KNAUF_SYSTEMS_PLUS_PLASTERBOARD_2024",
    title: "Systems+ Plasterboard Systems Manual",
    publisher: "Knauf Gypsum Philippines, Inc.",
    editionOrDate: "2024",
    url: "https://knauf.com/api/download-center/v1/assets/4fe6a7ed-822b-4785-9e70-7809c6ba5b97?download=true",
    exactLocator: "General Information; Wet Areas; Waterproofing of Joints and Junctions; system installation tables",
    confirms: ["системный состав листов, каркаса, крепежа и изоляции", "влагостойкие листы и герметизация примыканий", "условия применения во влажных зонах"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Официальное руководство производителя подтверждает последовательность и совместимость компонентов; проект КР выбирает конкретную сертифицированную систему и её нормы расхода.",
    authoritativeReplayRequired: false,
  },
  {
    sourceId: "KNAUF_FLEXIBOARD_TDS_2025",
    title: "Knauf Flexiboard Specialty Board — Product Datasheet",
    publisher: "Knauf Australia",
    editionOrDate: "09/2025",
    url: "https://knauf.com/api/download-center/v1/assets/aa39e2ad-4afd-4a94-a5da-15d66eca33c9?download=true",
    exactLocator: "Description, Advantages, Specification and Application sections",
    confirms: ["применение гибкого листа на криволинейных стенах и потолках", "толщину 6,5 мм", "массу 4,1 кг/м²", "применимость к выпуклым и вогнутым поверхностям"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Подтверждает существование и назначение физического изделия. Допустимый радиус и конкретная раскладка принимаются из выбранного проектного паспорта партии.",
    authoritativeReplayRequired: false,
  },
  {
    sourceId: "KNAUF_PAPER_TAPE_JOINTING_2025",
    title: "Knauf Paper Joint Tape — Applications, Jointing and Finishing",
    publisher: "Knauf Malaysia",
    editionOrDate: "07/2025",
    url: "https://knauf.com/api/download-center/v1/assets/1a65558a-9d35-4fdc-90cb-b7c3d53d99e6?country=my&download=true",
    exactLocator: "Accessories, Knauf Paper Joint Tape, First Coat / Second Coat / Finishing Coat",
    confirms: ["армирование стыков бумажной лентой", "послойное нанесение составов", "обработку головок крепежа и углов", "финишное шлифование"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Подтверждает технологическую последовательность. Расход смеси и ширина обработки берутся из паспорта фактически выбранного продукта и уровня отделки.",
    authoritativeReplayRequired: false,
  },
  {
    sourceId: "KNAUF_CEILING_INSULATION_INSTALL_2024",
    title: "Knauf Insulation Ceiling Installation Instructions",
    publisher: "Knauf Insulation",
    editionOrDate: "10/2024",
    url: "https://knauf.com/api/download-center/v1/assets/625498bd-529b-48e2-9b5d-4897812e162c?download=true",
    exactLocator: "Installation Instructions; fitting around pipes and obstructions; continuous layer without gaps or voids",
    confirms: ["раскрой вокруг препятствий без недопустимого сжатия", "укладку сплошным слоем без щелей", "сохранение требуемых зазоров"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Подтверждает физические операции изоляции; тип, плотность, толщина и крепление определяются проектом конкретной полости.",
    authoritativeReplayRequired: false,
  },
  {
    sourceId: "KNAUF_MOISTURE_RESISTANT_BOARD_TDS_2023",
    title: "Moisture Resistant Gypsum Board (WR) — Technical Data Sheet",
    publisher: "Knauf",
    editionOrDate: "12/2023",
    url: "https://knauf.com/api/download-center/v1/assets/1fbb509e-10ab-4d8d-831c-45e36de2a3b4?download=true",
    exactLocator: "Product Description, Standard and Fields of Application",
    confirms: ["применение влагостойкого листа во влажных внутренних помещениях", "применение в подвесных потолках", "тип H по TS EN 520+A1"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Подтверждает класс физического материала, но не заменяет проверку сертификата конкретной партии для проекта КР.",
    authoritativeReplayRequired: false,
  },
  {
    sourceId: "USG_SHEETROCK_J371_2021",
    title: "USG Sheetrock Brand Gypsum Panels Installation and Finishing Guide J371",
    publisher: "United States Gypsum Company",
    editionOrDate: "2021",
    url: "https://www.usg.com/content/dam/USG/pdpmovedocuments/sheetrock-gypsum-panels-installation-guide-en-J371.pdf",
    exactLocator: "Repairing Damaged Panels; Patching Dents, Voids, Holes, Popped Nails and Cracks",
    confirms: ["удаление непрочного материала", "установку ремонтного листа", "применение шовного состава и ленты", "сушку, шлифование и грунтование ремонтной карты"],
    checkedAt: "2026-08-19",
    applicabilityRu: "Подтверждает технологию ремонта листовой системы. Проектный тип листа, число слоёв и граница ремонта задаются существующей конструкцией и дефектной ведомостью.",
    authoritativeReplayRequired: false,
  },
]);

const SOURCE_BY_ID = new Map(BATCH002_ENGINEERING_SOURCES_R4.map((source) => [source.sourceId, source]));

export function batch002EngineeringSourceIdsR4(input: {
  operation: DrywallArchitecturalElementOperationV4;
  wetZone: boolean;
}): readonly string[] {
  const ids = new Set<string>(["KG_SP_KR_65_101_2025", "KNAUF_SYSTEMS_PLUS_PLASTERBOARD_2024"]);
  if (["FRAME", "ALIGN", "CLAD"].includes(input.operation)) ids.add("KNAUF_FLEXIBOARD_TDS_2025");
  if (input.operation === "FINISH_JOINT") ids.add("KNAUF_PAPER_TAPE_JOINTING_2025");
  if (input.operation === "INSULATE") ids.add("KNAUF_CEILING_INSULATION_INSTALL_2024");
  if (input.operation === "REPAIR") {
    ids.add("KG_KRERR_2015_APPLICATION_GUIDANCE");
    ids.add("USG_SHEETROCK_J371_2021");
  }
  if (input.wetZone) ids.add("KNAUF_MOISTURE_RESISTANT_BOARD_TDS_2023");
  return [...ids];
}

export function resolveBatch002EngineeringSourcesR4(sourceIds: readonly string[]): readonly Batch002EngineeringSourceR4[] {
  return sourceIds.map((sourceId) => {
    const source = SOURCE_BY_ID.get(sourceId);
    if (!source) throw new Error(`BATCH002_R4_ENGINEERING_SOURCE_MISSING:${sourceId}`);
    return source;
  });
}
