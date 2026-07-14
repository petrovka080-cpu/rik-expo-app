import type { ProfessionalBoqLineItemQuality, ProfessionalBoqLineItemRowType } from "./professionalBoqLineItemQualityContract";

export const PROFESSIONAL_BOQ_MAIN_UI_MAX_ROWS = 80;

export type ProfessionalBoqSectionId =
  | "materials"
  | "works"
  | "equipment"
  | "services"
  | "logistics"
  | "overhead"
  | "other";

export type ProfessionalBoqSectionPolicy = {
  sectionId: ProfessionalBoqSectionId;
  titleRu: string;
};

export type ProfessionalBoqGroupedSection = {
  id: ProfessionalBoqSectionId;
  title: string;
  rows: ProfessionalBoqLineItemQuality[];
  visibleRows: ProfessionalBoqLineItemQuality[];
  hiddenRowsCount: number;
};

export type ProfessionalBoqGroupedMainViewModel = {
  sections: ProfessionalBoqGroupedSection[];
  visibleRowsCount: number;
  rawRowsCount: number;
  hiddenRowsCount: number;
  noRawDump: boolean;
};

const SECTION_ORDER: ProfessionalBoqSectionId[] = [
  "materials",
  "works",
  "equipment",
  "services",
  "logistics",
  "overhead",
  "other",
];

const SECTION_BY_ROW_TYPE: Record<ProfessionalBoqLineItemRowType, ProfessionalBoqSectionPolicy> = {
  material: { sectionId: "materials", titleRu: "Материалы" },
  work: { sectionId: "works", titleRu: "Работы" },
  labor: { sectionId: "works", titleRu: "Работы" },
  equipment: { sectionId: "equipment", titleRu: "Оборудование" },
  service: { sectionId: "services", titleRu: "Услуги" },
  transport: { sectionId: "logistics", titleRu: "Транспорт и мобилизация" },
  mobilization: { sectionId: "logistics", titleRu: "Транспорт и мобилизация" },
  overhead: { sectionId: "overhead", titleRu: "Накладные" },
  document: { sectionId: "services", titleRu: "Услуги" },
  other: { sectionId: "other", titleRu: "Прочее" },
};

export function professionalBoqSectionForRowType(rowType: ProfessionalBoqLineItemRowType): ProfessionalBoqSectionPolicy {
  return SECTION_BY_ROW_TYPE[rowType] ?? SECTION_BY_ROW_TYPE.other;
}

export function buildProfessionalBoqGroupedMainViewModel(
  rows: readonly ProfessionalBoqLineItemQuality[],
  maxRows = PROFESSIONAL_BOQ_MAIN_UI_MAX_ROWS,
): ProfessionalBoqGroupedMainViewModel {
  const sections: ProfessionalBoqGroupedSection[] = [];
  let remaining = Math.max(0, maxRows);

  for (const sectionId of SECTION_ORDER) {
    const sectionRows = rows.filter((row) => professionalBoqSectionForRowType(row.rowType).sectionId === sectionId);
    if (sectionRows.length === 0) continue;
    const title = professionalBoqSectionForRowType(sectionRows[0].rowType).titleRu;
    const visibleRows = sectionRows.slice(0, remaining);
    remaining -= visibleRows.length;
    sections.push({
      id: sectionId,
      title,
      rows: sectionRows,
      visibleRows,
      hiddenRowsCount: sectionRows.length - visibleRows.length,
    });
  }

  const visibleRowsCount = sections.reduce((sum, section) => sum + section.visibleRows.length, 0);
  return {
    sections,
    visibleRowsCount,
    rawRowsCount: rows.length,
    hiddenRowsCount: Math.max(0, rows.length - visibleRowsCount),
    noRawDump: rows.length <= maxRows || visibleRowsCount < rows.length,
  };
}
