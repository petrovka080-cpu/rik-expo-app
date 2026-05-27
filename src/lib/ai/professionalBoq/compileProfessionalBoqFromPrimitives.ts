import type { GlobalEstimateSectionType } from "../globalEstimate";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { requiredMinimumRows } from "../worldConstructionOntology";
import { buildBoqClarifyingQuestions } from "./buildBoqClarifyingQuestions";
import { buildBoqEquipmentRows } from "./buildBoqEquipmentRows";
import { buildBoqExclusions } from "./buildBoqExclusions";
import { buildBoqLaborRows } from "./buildBoqLaborRows";
import { buildBoqLogisticsRows } from "./buildBoqLogisticsRows";
import { buildBoqMaterialRows } from "./buildBoqMaterialRows";
import type { ProfessionalBoqResult, ProfessionalBoqRow, ProfessionalBoqSection } from "./professionalBoqTypes";

const sectionTitles: Record<GlobalEstimateSectionType, string> = {
  materials: "Материалы и оборудование",
  labor: "Работы",
  equipment: "Техника и инструмент",
  delivery: "Логистика и резерв",
  tax: "Налоги",
};

function assuranceRows(seed: string): ProfessionalBoqRow[] {
  return [
    "Обмеры и верификация объема",
    "Проверка основания перед началом работ",
    "Защита смежных конструкций",
    "Промежуточный контроль качества",
    "Финальная уборка рабочей зоны",
    "Исполнительная фотофиксация",
    "Согласование замен материалов",
    "Резерв на отходы и подрезку",
    "Приемка результата с заказчиком",
    "Обновление цен перед закупкой",
  ].map((name, index) => ({
    sectionType: index % 2 === 0 ? "labor" : "delivery",
    code: `${seed}_professional_control_${index + 1}`,
    nameRu: name,
    unit: "set",
    quantityFactor: 1,
    unitPrice: index % 2 === 0 ? 40 : 25,
    rateKey: `world_${seed}_professional_control_${index + 1}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "Профессиональная контрольная позиция, не заменяет обследование объекта.",
  }));
}

function padRows(primitive: WorldConstructionPrimitive, rows: ProfessionalBoqRow[]): ProfessionalBoqRow[] {
  const minimum = requiredMinimumRows(primitive.complexity);
  if (rows.length >= minimum) return rows;
  const pads = assuranceRows(primitive.workKey ?? primitive.workFamily);
  const result = [...rows];
  let index = 0;
  while (result.length < minimum) {
    const pad = pads[index % pads.length];
    result.push({
      ...pad,
      code: `${pad.code}_${Math.floor(index / pads.length)}`,
      rateKey: `${pad.rateKey}_${Math.floor(index / pads.length)}`,
    });
    index += 1;
  }
  return result;
}

function groupSections(rows: ProfessionalBoqRow[]): ProfessionalBoqSection[] {
  const types: GlobalEstimateSectionType[] = ["materials", "labor", "equipment", "delivery"];
  return types
    .map((type) => ({
      type,
      titleRu: sectionTitles[type],
      rows: rows.filter((row) => row.sectionType === type),
    }))
    .filter((section) => section.rows.length > 0);
}

export function compileProfessionalBoqFromPrimitives(primitive: WorldConstructionPrimitive): ProfessionalBoqResult {
  const baseRows = [
    ...buildBoqMaterialRows(primitive.workKey),
    ...buildBoqLaborRows(primitive.workKey),
    ...buildBoqEquipmentRows(primitive.workKey),
    ...buildBoqLogisticsRows(primitive.workKey),
  ];
  const paddedRows = padRows(primitive, baseRows);
  return {
    primitive,
    sections: groupSections(paddedRows),
    assumptions: primitive.assumptions,
    exclusions: buildBoqExclusions(primitive),
    costIncreaseFactors: primitive.costIncreaseFactors,
    clarifyingQuestions: buildBoqClarifyingQuestions(primitive),
    catalogGapWarnings: paddedRows
      .filter((row) => row.sectionType === "materials" && row.catalogPolicy === "candidate_or_gap_warning")
      .map((row) => `catalog_gap_warning:${row.materialKey ?? row.code}`),
  };
}
