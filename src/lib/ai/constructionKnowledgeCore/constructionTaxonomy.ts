import {
  CONSTRUCTION_DISCIPLINES,
  CONSTRUCTION_PROJECT_TYPES,
  type ConstructionDiscipline,
  type ConstructionDocumentType,
  type ConstructionProjectType,
} from "./constructionKnowledgeTypes";

export type ConstructionDisciplineTaxonomyEntry = {
  discipline: ConstructionDiscipline;
  typicalWorksRu: string[];
  typicalDocuments: ConstructionDocumentType[];
  typicalRisksRu: string[];
  typicalEvidenceRu: string[];
  typicalMaterialsRu: string[];
  typicalActsRu: string[];
  typicalChecksRu: string[];
  estimateLinksRu: string[];
  warehouseLinksRu: string[];
  paymentLinksRu: string[];
};

export type ConstructionProjectTypeTaxonomyEntry = {
  projectType: ConstructionProjectType;
  labelsRu: string[];
  disciplines: ConstructionDiscipline[];
};

function disciplineEntry(
  discipline: ConstructionDiscipline,
  params: Partial<Omit<ConstructionDisciplineTaxonomyEntry, "discipline">> = {},
): ConstructionDisciplineTaxonomyEntry {
  return {
    discipline,
    typicalWorksRu: params.typicalWorksRu ?? ["работы по дисциплине", "подготовка основания", "контроль выполнения"],
    typicalDocuments: params.typicalDocuments ?? ["work_log", "daily_report", "completion_act"],
    typicalRisksRu: params.typicalRisksRu ?? ["нет подтверждающего документа", "не хватает фотофиксации", "не связана сметная строка"],
    typicalEvidenceRu: params.typicalEvidenceRu ?? ["фото", "акт", "отчет", "исполнительная запись"],
    typicalMaterialsRu: params.typicalMaterialsRu ?? ["материал по спецификации", "расходный материал"],
    typicalActsRu: params.typicalActsRu ?? ["акт выполненных работ"],
    typicalChecksRu: params.typicalChecksRu ?? ["объем", "качество", "соответствие проекту", "наличие источника"],
    estimateLinksRu: params.estimateLinksRu ?? ["сметная строка", "ведомость объемов"],
    warehouseLinksRu: params.warehouseLinksRu ?? ["материал", "остаток", "выдача"],
    paymentLinksRu: params.paymentLinksRu ?? ["акт", "счет", "основание оплаты"],
  };
}

export const CONSTRUCTION_DISCIPLINE_TAXONOMY: readonly ConstructionDisciplineTaxonomyEntry[] = [
  disciplineEntry("architecture", {
    typicalWorksRu: ["планировка", "узлы", "экспликация", "отделочные решения"],
    typicalDocuments: ["architecture_project", "material_specification", "completion_act"],
    typicalMaterialsRu: ["отделочные материалы", "двери", "окна"],
  }),
  disciplineEntry("structural", {
    typicalWorksRu: ["фундаменты", "каркас", "перекрытия", "узлы КР"],
    typicalDocuments: ["structural_project", "hidden_work_act", "as_built_scheme"],
    typicalRisksRu: ["скрытые работы без акта", "расхождение с конструктивным проектом"],
  }),
  disciplineEntry("civil"),
  disciplineEntry("road", {
    typicalWorksRu: ["земляное полотно", "основание", "асфальт", "брусчатка", "бордюр"],
    typicalMaterialsRu: ["щебень", "песок", "асфальтобетон", "брусчатка"],
  }),
  disciplineEntry("earthworks", {
    typicalWorksRu: ["разработка грунта", "обратная засыпка", "планировка", "уплотнение"],
    typicalActsRu: ["акт скрытых работ", "исполнительная схема"],
  }),
  disciplineEntry("concrete", {
    typicalWorksRu: ["армирование", "опалубка", "бетонирование", "уход за бетоном"],
    typicalMaterialsRu: ["бетон", "арматура", "опалубка"],
    typicalEvidenceRu: ["фото армирования", "акт скрытых работ", "накладная на бетон"],
  }),
  disciplineEntry("steel", {
    typicalWorksRu: ["монтаж металлоконструкций", "сварка", "болтовые соединения"],
    typicalMaterialsRu: ["металлопрокат", "крепеж", "сварочные материалы"],
  }),
  disciplineEntry("masonry", {
    typicalWorksRu: ["кладка стен", "перегородки", "перемычки"],
    typicalMaterialsRu: ["кирпич", "блок", "раствор"],
  }),
  disciplineEntry("roofing", {
    typicalWorksRu: ["пароизоляция", "утепление", "кровельное покрытие", "водосток"],
    typicalDocuments: ["engineering_project", "material_specification", "hidden_work_act"],
  }),
  disciplineEntry("facade", {
    typicalWorksRu: ["подсистема", "утепление", "облицовка", "герметизация"],
  }),
  disciplineEntry("finishing", {
    typicalWorksRu: ["штукатурка", "стяжка", "плитка", "покраска", "потолки"],
    typicalMaterialsRu: ["смеси", "плитка", "краска", "профиль"],
  }),
  disciplineEntry("mep", {
    typicalWorksRu: ["координация инженерных систем", "монтаж трасс", "пусконаладка"],
    typicalDocuments: ["engineering_project", "material_specification", "as_built_scheme"],
  }),
  disciplineEntry("hvac", {
    typicalWorksRu: ["вентиляция", "кондиционирование", "дымоудаление", "пусконаладка"],
    typicalMaterialsRu: ["воздуховоды", "вентиляторы", "клапаны", "изоляция"],
  }),
  disciplineEntry("plumbing", {
    typicalWorksRu: ["водопровод", "канализация", "насосное оборудование", "испытания"],
    typicalMaterialsRu: ["трубы", "фитинги", "арматура", "насосы"],
  }),
  disciplineEntry("electrical", {
    typicalWorksRu: ["кабельные трассы", "щиты", "освещение", "заземление"],
    typicalMaterialsRu: ["кабель", "лотки", "автоматы", "светильники"],
  }),
  disciplineEntry("low_voltage", {
    typicalWorksRu: ["СКС", "видеонаблюдение", "сигнализация", "диспетчеризация"],
  }),
  disciplineEntry("fire_safety", {
    typicalWorksRu: ["пожарная сигнализация", "огнезащита", "дымоудаление", "пожаротушение"],
    typicalRisksRu: ["нет проектного источника", "нет акта испытаний", "нет паспорта оборудования"],
  }),
  disciplineEntry("automation"),
  disciplineEntry("geodesy", {
    typicalWorksRu: ["разбивка", "исполнительная съемка", "контроль отметок"],
    typicalDocuments: ["as_built_scheme", "work_log", "completion_act"],
  }),
  disciplineEntry("landscaping", {
    typicalWorksRu: ["благоустройство", "озеленение", "малые формы", "наружное освещение"],
  }),
  disciplineEntry("hydraulic", {
    typicalWorksRu: ["гидротехнические сооружения", "водопропускные элементы", "защита откосов"],
  }),
  disciplineEntry("energy", {
    typicalWorksRu: ["подстанции", "кабельные линии", "котельные", "энергооборудование"],
  }),
  disciplineEntry("industrial", {
    typicalWorksRu: ["технологическое оборудование", "площадки обслуживания", "промышленные сети"],
  }),
  disciplineEntry("commissioning", {
    typicalWorksRu: ["испытания", "наладка", "протоколы", "передача в эксплуатацию"],
    typicalDocuments: ["as_built_scheme", "completion_act", "work_log"],
  }),
  disciplineEntry("as_built", {
    typicalWorksRu: ["исполнительная документация", "исполнительные схемы", "журнал работ"],
    typicalDocuments: ["as_built_scheme", "work_log", "completion_act", "hidden_work_act"],
  }),
  disciplineEntry("quality_control", {
    typicalWorksRu: ["приемка", "дефектовка", "контроль качества", "устранение замечаний"],
    typicalDocuments: ["defect_act", "completion_act", "daily_report"],
  }),
  disciplineEntry("safety", {
    typicalWorksRu: ["охрана труда", "допуски", "инструктажи", "опасные работы"],
    typicalDocuments: ["work_log", "technical_assignment"],
  }),
] as const;

export const CONSTRUCTION_PROJECT_TYPE_TAXONOMY: readonly ConstructionProjectTypeTaxonomyEntry[] = [
  { projectType: "residential", labelsRu: ["частный дом", "коттедж", "многоэтажное жилье", "жилой комплекс"], disciplines: ["architecture", "structural", "mep", "finishing", "facade", "roofing"] },
  { projectType: "commercial", labelsRu: ["офис", "торговый объект", "коммерческое здание"], disciplines: ["architecture", "structural", "mep", "fire_safety", "finishing"] },
  { projectType: "industrial", labelsRu: ["склад", "промышленное здание", "производство"], disciplines: ["industrial", "structural", "steel", "energy", "mep", "fire_safety"] },
  { projectType: "road", labelsRu: ["дорога", "брусчатка", "проезд", "тротуар"], disciplines: ["road", "earthworks", "geodesy", "landscaping"] },
  { projectType: "infrastructure", labelsRu: ["мост", "тоннель", "линейный объект", "инфраструктура"], disciplines: ["civil", "road", "structural", "geodesy", "hydraulic"] },
  { projectType: "energy", labelsRu: ["подстанция", "энергообъект", "кабельная линия"], disciplines: ["energy", "electrical", "automation", "commissioning"] },
  { projectType: "hydro", labelsRu: ["ГЭС", "гидротехническое сооружение"], disciplines: ["hydraulic", "energy", "concrete", "geodesy", "commissioning"] },
  { projectType: "thermal_power", labelsRu: ["ТЭЦ", "котельная", "теплоэнергетика"], disciplines: ["energy", "industrial", "hvac", "automation", "commissioning"] },
  { projectType: "utility_network", labelsRu: ["водопровод", "канализация", "теплосеть", "электросеть"], disciplines: ["plumbing", "electrical", "earthworks", "geodesy", "commissioning"] },
  { projectType: "landscaping", labelsRu: ["благоустройство", "озеленение", "площадка"], disciplines: ["landscaping", "road", "electrical", "geodesy"] },
  { projectType: "other", labelsRu: ["другой объект"], disciplines: [...CONSTRUCTION_DISCIPLINES] },
] as const;

export function listConstructionDisciplines(): ConstructionDiscipline[] {
  return [...CONSTRUCTION_DISCIPLINES];
}

export function listConstructionProjectTypes(): ConstructionProjectType[] {
  return [...CONSTRUCTION_PROJECT_TYPES];
}

export function listConstructionDisciplineTaxonomy(): ConstructionDisciplineTaxonomyEntry[] {
  return [...CONSTRUCTION_DISCIPLINE_TAXONOMY];
}

export function listConstructionProjectTypeTaxonomy(): ConstructionProjectTypeTaxonomyEntry[] {
  return [...CONSTRUCTION_PROJECT_TYPE_TAXONOMY];
}

export function getConstructionDisciplineTaxonomy(
  discipline: ConstructionDiscipline,
): ConstructionDisciplineTaxonomyEntry | null {
  return CONSTRUCTION_DISCIPLINE_TAXONOMY.find((entry) => entry.discipline === discipline) ?? null;
}

export function getConstructionProjectTypeTaxonomy(
  projectType: ConstructionProjectType,
): ConstructionProjectTypeTaxonomyEntry | null {
  return CONSTRUCTION_PROJECT_TYPE_TAXONOMY.find((entry) => entry.projectType === projectType) ?? null;
}
