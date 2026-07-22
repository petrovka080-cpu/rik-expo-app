export type AsphaltProfessionalCategoryV4 =
  | "MATERIAL"
  | "PRODUCT"
  | "LABOR"
  | "WORK"
  | "EQUIPMENT"
  | "MACHINERY"
  | "SERVICE"
  | "LOGISTICS"
  | "LAB_CONTROL"
  | "DOCUMENTATION"
  | "SUBTOTAL_INFORMATIONAL";

export type AsphaltProfessionalSectionIdV4 =
  | "asphalt_materials"
  | "asphalt_works"
  | "asphalt_labor"
  | "asphalt_machinery"
  | "asphalt_services"
  | "asphalt_logistics"
  | "asphalt_lab_control"
  | "asphalt_documentation"
  | "asphalt_informational";

export const ASPHALT_PUBLIC_SELECTION_LABELS_V4: Readonly<Record<string, string>> = {
  coarse_lower: "Асфальтобетонная смесь для нижнего связующего слоя, тип и марка по проекту",
  dense_fine: "Плотная мелкозернистая асфальтобетонная смесь для верхнего слоя, тип и марка по проекту",
  sma: "Щебёночно-мастичная асфальтобетонная смесь, тип и марка по проекту",
  porous: "Пористая асфальтобетонная смесь, тип и марка по проекту",
  project_spec: "Материал по проектной спецификации",
  surfacing_on_prepared_base: "Покрытие по готовому основанию",
  new_full_road_pavement: "Полное строительство автомобильной дороги",
  new_full_road_infrastructure: "Полное строительство автомобильной дороги с инфраструктурой",
  rehabilitation_with_milling: "Ремонт дороги с фрезерованием",
  overlay_on_existing_pavement: "Усиление существующего покрытия",
  local_patch_repair: "Локальный ремонт покрытия",
  parking_full_construction: "Полное строительство парковки",
  parking_surfacing_only: "Покрытие парковки по готовому основанию",
};

export function asphaltPublicSelectionLabelV4(value: string | null | undefined, schemaLabel?: string | null): string {
  if (!value) return "Спецификация по проекту";
  return ASPHALT_PUBLIC_SELECTION_LABELS_V4[value] ?? schemaLabel ?? "Спецификация по проекту";
}

const CATEGORY_PRESENTATION: Readonly<Record<AsphaltProfessionalCategoryV4, {
  sectionId: AsphaltProfessionalSectionIdV4;
  sectionTitleRu: string;
  itemLabelRu: string;
}>> = {
  MATERIAL: { sectionId: "asphalt_materials", sectionTitleRu: "Материалы", itemLabelRu: "Материал" },
  PRODUCT: { sectionId: "asphalt_materials", sectionTitleRu: "Товары", itemLabelRu: "Товар" },
  LABOR: { sectionId: "asphalt_labor", sectionTitleRu: "Труд", itemLabelRu: "Труд" },
  WORK: { sectionId: "asphalt_works", sectionTitleRu: "Работы", itemLabelRu: "Работа" },
  EQUIPMENT: { sectionId: "asphalt_machinery", sectionTitleRu: "Машины и механизмы", itemLabelRu: "Оборудование" },
  MACHINERY: { sectionId: "asphalt_machinery", sectionTitleRu: "Машины и механизмы", itemLabelRu: "Машина / механизм" },
  SERVICE: { sectionId: "asphalt_services", sectionTitleRu: "Услуги", itemLabelRu: "Услуга" },
  LOGISTICS: { sectionId: "asphalt_logistics", sectionTitleRu: "Логистика", itemLabelRu: "Логистика" },
  LAB_CONTROL: { sectionId: "asphalt_lab_control", sectionTitleRu: "Лабораторный контроль", itemLabelRu: "Лабораторный контроль" },
  DOCUMENTATION: { sectionId: "asphalt_documentation", sectionTitleRu: "Документация", itemLabelRu: "Документация" },
  SUBTOTAL_INFORMATIONAL: { sectionId: "asphalt_informational", sectionTitleRu: "Информационные строки", itemLabelRu: "Информационная строка" },
};

export const ASPHALT_PROFESSIONAL_SECTION_ORDER_V4: readonly AsphaltProfessionalSectionIdV4[] = [
  "asphalt_materials",
  "asphalt_works",
  "asphalt_labor",
  "asphalt_machinery",
  "asphalt_services",
  "asphalt_logistics",
  "asphalt_lab_control",
  "asphalt_documentation",
  "asphalt_informational",
];

export function isAsphaltProfessionalCategoryV4(value: unknown): value is AsphaltProfessionalCategoryV4 {
  return typeof value === "string" && Object.hasOwn(CATEGORY_PRESENTATION, value);
}

export function asphaltProfessionalCategoryFromSourceParametersV4(
  sourceParameters: Record<string, unknown> | null | undefined,
): AsphaltProfessionalCategoryV4 | null {
  const value = sourceParameters?.asphaltV4ProfessionalCategory;
  return isAsphaltProfessionalCategoryV4(value) ? value : null;
}

export function asphaltProfessionalCategoryPresentationV4(category: AsphaltProfessionalCategoryV4) {
  return CATEGORY_PRESENTATION[category];
}

export function isAsphaltProfessionalSectionIdV4(value: unknown): value is AsphaltProfessionalSectionIdV4 {
  return typeof value === "string" && ASPHALT_PROFESSIONAL_SECTION_ORDER_V4.includes(value as AsphaltProfessionalSectionIdV4);
}

export function asphaltProfessionalSectionTitleV4(sectionId: AsphaltProfessionalSectionIdV4): string {
  return Object.values(CATEGORY_PRESENTATION).find((item) => item.sectionId === sectionId)?.sectionTitleRu
    ?? "Раздел сметы";
}
